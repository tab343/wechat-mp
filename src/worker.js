const { handleText, handleImage, handleVoice, handleVideo, handleLocation, handleLink, handleEvent } = require("./services/handlers");
const keywordCache = require("./services/keyword-cache");
const apiConfigCache = require("./services/api-config-cache");
const { registerSysActions } = require("./services/actions/sys-actions");
const { registerBusinessActions } = require("./services/actions");

let initialized = false;
let initError = null;

async function ensureInit() {
  if (initialized) return;
  try {
    console.log("[init] 开始初始化...");
    console.log("[init] WECHAT_TOKEN:", process.env.WECHAT_TOKEN ? "已设置" : "未设置");
    console.log("[init] WECHAT_APPID:", process.env.WECHAT_APPID ? "已设置" : "未设置");
    console.log("[init] CLOUDFLARE_ACCOUNT_ID:", process.env.CLOUDFLARE_ACCOUNT_ID ? "已设置" : "未设置");

    await keywordCache.loadFromDatabase();
    console.log("[init] 关键字缓存加载完成");

    await apiConfigCache.loadApiConfigs();
    console.log("[init] API 配置缓存加载完成");

    registerSysActions();
    console.log("[init] 系统功能注册完成");

    registerBusinessActions();
    console.log("[init] 业务功能注册完成");

    initialized = true;
    console.log("[init] 初始化全部完成");
  } catch (err) {
    initError = err.message;
    console.error("[init] 初始化失败:", err.message);
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      console.log(`[worker] ${request.method} ${path}`);

      const isWechatPath = path === "/" || path === "/wechat";

      if (request.method === "GET" && isWechatPath) {
        return handleVerify(request);
      }

      if (request.method === "POST" && isWechatPath) {
        return handleMessage(request);
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
    console.log("[verify] 缺少签名参数，直接返回 echostr");
    return new Response(echostr || "", { status: 200 });
  }

  const token = process.env.WECHAT_TOKEN || "";
  console.log("[verify] TOKEN 长度:", token.length);

  const arr = [token, timestamp, nonce].sort();
  const hashBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(arr.join("")));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  console.log("[verify] 计算签名:", hashHex, "微信签名:", signature);

  if (hashHex === signature) {
    console.log("[verify] 签名验证通过");
    return new Response(echostr, { status: 200 });
  }
  console.log("[verify] 签名验证失败");
  return new Response("Invalid signature", { status: 401 });
}

async function handleMessage(request) {
  let msg = null;
  try {
    await ensureInit();

    const xml = await request.text();
    console.log("[worker] === 收到原始 XML (完整) ===");
    console.log(xml);
    console.log("[worker] === XML 结束 ===");

    msg = parseWechatXml(xml);

    if (msg.Encrypt) {
      console.log("[worker] 检测到加密消息，开始解密...");
      try {
        msg = await decryptMsg(xml);
        console.log("[worker] 解密成功");
      } catch (err) {
        console.error("[worker] AES 解密失败:", err.message, err.stack);
        return new Response("success", { status: 200 });
      }
    }

    console.log("[worker] MsgType:", msg.MsgType, "Content:", msg.Content, "FromUserName:", msg.FromUserName);

    if (!msg.MsgType) {
      console.error("[worker] MsgType 为空，无法路由消息");
      return new Response("success", { status: 200 });
    }

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
    console.log(`[worker] 消息类型: ${msg.MsgType}, handler: ${handler ? "已找到" : "未找到"}`);

    let reply = "success";

    if (handler) {
      try {
        console.log("[worker] 开始调用 handler...");
        reply = await handler(msg);
        console.log("[worker] handler 返回:", typeof reply, JSON.stringify(reply).substring(0, 300));
      } catch (err) {
        console.error(`[worker] handler 异常 [${msg.MsgType}]:`, err.message, err.stack);
        reply = `处理失败：${err.message}`;
      }
    } else {
      console.log(`[worker] 未找到消息类型 ${msg.MsgType} 的处理器`);
    }

    const xmlReply = buildReplyXml(msg, reply);
    console.log("[worker] === 回复 XML ===");
    console.log(xmlReply);
    console.log("[worker] === 回复结束 ===");

    return new Response(xmlReply, {
      headers: { "Content-Type": "text/xml" },
      status: 200,
    });
  } catch (err) {
    console.error("[worker] handleMessage 异常:", err.message, err.stack);
    return new Response("success", { status: 200 });
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
  console.log("[decrypt] 解密后 XML:", msgStr);
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
  const msg = {};
  const tagRegex = /<(\w+)>\s*(?:\<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/\1>/gi;
  let match;
  while ((match = tagRegex.exec(xml)) !== null) {
    if (!msg[match[1]]) {
      msg[match[1]] = match[2];
    }
  }
  console.log("[parse] 解析结果:", JSON.stringify(msg));
  return msg;
}

function buildReplyXml(msg, reply) {
  const time = Math.floor(Date.now() / 1000);
  const toUser = msg.FromUserName || "";
  const fromUser = msg.ToUserName || "";

  if (typeof reply === "string") {
    return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${time}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${reply}]]></Content>
</xml>`;
  }

  if (reply && typeof reply === "object") {
    if (reply.MsgType === "text") {
      return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${time}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${reply.Content || ""}]]></Content>
</xml>`;
    }

    if (reply.type === "image" || reply.MsgType === "image") {
      const mediaId = reply.mediaId || (reply.Image && reply.Image.MediaId) || reply.MediaId || "";
      return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${time}</CreateTime>
<MsgType><![CDATA[image]]></MsgType>
<Image>
<MediaId><![CDATA[${mediaId}]]></MediaId>
</Image>
</xml>`;
    }
  }

  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${time}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[success]]></Content>
</xml>`;
}
