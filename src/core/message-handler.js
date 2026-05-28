/**
 * 微信公众号核心消息处理器
 * 同时支持本地 Express 和 Cloudflare Worker 环境
 */

const { handleText, handleImage, handleVoice, handleVideo, handleLocation, handleLink, handleEvent } = require("../services/handlers");
const keywordCache = require("../services/keyword-cache");
const apiConfigCache = require("../services/api-config-cache");
const { registerSysActions } = require("../services/actions/sys-actions");
const { registerBusinessActions } = require("../services/actions");
const sysConfigCache = require("../services/sys-config-cache");
const config = require("../config");

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  try {
    console.log("[init] 从数据库加载系统配置...");
    await sysConfigCache.loadFromDatabase();

    console.log("[init] 加载关键字缓存...");
    await keywordCache.loadFromDatabase();

    console.log("[init] 加载 API 配置缓存...");
    await apiConfigCache.loadApiConfigs();

    console.log("[init] 注册系统功能...");
    registerSysActions();

    console.log("[init] 注册业务功能...");
    registerBusinessActions();

    initialized = true;
    console.log("[init] 初始化完成");
  } catch (err) {
    console.error("[init] 初始化失败:", err.message);
    throw err;
  }
}

function getHandlers() {
  return {
    text: handleText,
    image: handleImage,
    voice: handleVoice,
    video: handleVideo,
    shortvideo: handleVideo,
    location: handleLocation,
    link: handleLink,
    event: handleEvent,
  };
}

async function processMessage(xml, parseFn, decryptFn) {
  await ensureInit();

  let msg = parseFn(xml);

  if (msg.Encrypt) {
    console.log("[message] 检测到加密消息");
    if (!decryptFn) {
      throw new Error("不支持加密消息解密");
    }
    msg = await decryptFn(xml);
  }

  console.log("[message] MsgType:", msg.MsgType, "Content:", msg.Content);

  if (!msg.MsgType) {
    throw new Error("MsgType 为空");
  }

  const handlers = getHandlers();
  const handler = handlers[msg.MsgType];

  if (!handler) {
    console.log(`[message] 未支持的消息类型: ${msg.MsgType}`);
    return "success";
  }

  return await handler(msg);
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

async function verifySignature(signature, timestamp, nonce, token, cryptoImpl) {
  const arr = [token, timestamp, nonce].sort();
  let hashHex;

  if (cryptoImpl === "node") {
    hashHex = require("node:crypto").createHash("sha1").update(arr.join("")).digest("hex");
  } else {
    const hashBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(arr.join("")));
    hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  return hashHex === signature;
}

module.exports = {
  ensureInit,
  processMessage,
  buildReplyXml,
  verifySignature,
  sysConfigCache,
  config,
};
