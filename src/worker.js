const { handleText, handleImage, handleVoice, handleVideo, handleLocation, handleLink, handleEvent } = require("./services/handlers");
const keywordCache = require("./services/keyword-cache");
const apiConfigCache = require("./services/api-config-cache");
const { registerSysActions } = require("./services/actions/sys-actions");
const { registerBusinessActions } = require("./services/actions");

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  await keywordCache.loadFromDatabase();
  await apiConfigCache.loadApiConfigs();
  registerSysActions();
  registerBusinessActions();
  initialized = true;
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      const isWechatPath = path === "/" || path === "/wechat";

      if (request.method === "GET" && isWechatPath) {
        return handleVerify(request);
      }

      if (request.method === "POST" && isWechatPath) {
        return handleMessage(request);
      }

      if (path === "/api/health") {
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("WeChat MP Service", { status: 200 });
    } catch (err) {
      console.error("[worker] 顶层异常:", err.message, err.stack);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

async function handleVerify(request) {
  const url = new URL(request.url);
  const { echostr, signature, timestamp, nonce } = Object.fromEntries(url.searchParams);

  if (!signature || !timestamp || !nonce) {
    return new Response(echostr || "", { status: 200 });
  }

  const token = process.env.WECHAT_TOKEN || "";
  const arr = [token, timestamp, nonce].sort();
  const hashBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(arr.join("")));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hashHex === signature) {
    return new Response(echostr, { status: 200 });
  }
  return new Response("Invalid signature", { status: 401 });
}

async function handleMessage(request) {
  try {
    await ensureInit();

    const xml = await request.text();
    console.log("[worker] 收到原始 XML:", xml.substring(0, 200));

    let msg = parseWechatXml(xml);

    if (msg.Encrypt) {
      console.log("[worker] 检测到加密消息，开始解密...");
      try {
        msg = await decryptMsg(xml);
      } catch (err) {
        console.error("[worker] AES 解密失败:", err.message);
        return new Response("success", { status: 200 });
      }
    }

    console.log("[worker] 解析后消息:", JSON.stringify(msg));

    const handlers = {
      text: handleText,
      image: handleImage,
      voice: handleVoice,
      video: handleVideo,
      shortvideo: handleVideo,
      location: handleLocation,
      link: handleLink,
      event: handleEvent,
    };

    const handler = handlers[msg.MsgType];
    let reply = "success";

    if (handler) {
      try {
        reply = await handler(msg);
      } catch (err) {
        console.error(`[worker] 消息处理失败 [${msg.MsgType}]:`, err.message);
      }
    }

    const xmlReply = buildReplyXml(msg, reply);
    return new Response(xmlReply, {
      headers: { "Content-Type": "text/xml" },
      status: 200,
    });
  } catch (err) {
    console.error("[worker] 请求处理失败:", err.message);
    return new Response("error", { status: 500 });
  }
}

async function decryptMsg(rawXml) {
  const encodingAESKey = process.env.WECHAT_ENCODING_AES_KEY || "";
  if (!encodingAESKey) {
    throw new Error("未配置 WECHAT_ENCODING_AES_KEY 环境变量");
  }

  const xmlObj = parseWechatXml(rawXml);
  const encryptStr = xmlObj.Encrypt;
  if (!encryptStr) {
    throw new Error("加密消息中未找到 Encrypt 字段");
  }

  const keyBuffer = base64Decode(encodingAESKey + "=");
  if (keyBuffer.byteLength !== 32) {
    throw new Error(`EncodingAESKey 解码后长度错误: ${keyBuffer.byteLength}`);
  }

  const encryptedBuffer = base64Decode(encryptStr);
  const iv = keyBuffer.slice(0, 16);

  const key = await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-CBC" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, encryptedBuffer);

  const buf = new Uint8Array(decrypted);
  const unpadded = pkcs7Unpad(buf);
  const msgLen = (unpadded[16] << 24) | (unpadded[17] << 16) | (unpadded[18] << 8) | unpadded[19];
  const msgStr = new TextDecoder().decode(unpadded.slice(20, 20 + msgLen));
  return parseWechatXml(msgStr);
}

function pkcs7Unpad(buf) {
  const padLen = buf[buf.length - 1];
  if (padLen < 1 || padLen > 32) return buf;
  return buf.slice(0, buf.length - padLen);
}

function base64Decode(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function parseWechatXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const root = doc.documentElement;
  const msg = {};

  const children = root.children;
  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    msg[el.tagName] = el.textContent || "";
  }

  return msg;
}

function buildReplyXml(msg, reply) {
  const time = Math.floor(Date.now() / 1000);

  if (typeof reply === "string") {
    return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${reply}]]></Content>
</xml>`;
  }

  if (reply && typeof reply === "object") {
    if (reply.MsgType === "text") {
      return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${reply.Content || ""}]]></Content>
</xml>`;
    }

    if (reply.type === "image" || reply.MsgType === "image") {
      return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[image]]></MsgType>
  <Image>
    <MediaId><![CDATA[${reply.mediaId || reply.MediaId}]]></MediaId>
  </Image>
</xml>`;
    }
  }

  return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[success]]></Content>
</xml>`;
}
