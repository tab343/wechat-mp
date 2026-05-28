import sysConfigCache from "../services/sys-config-cache.js";
import { parseWechatXml } from "./xml-utils.js";

// 直接从缓存读取，不加载、不打印
const config = {
  token: sysConfigCache.get("WECHAT_TOKEN"),
  appID: sysConfigCache.get("WECHAT_APPID"),
  appSecret: sysConfigCache.get("WECHAT_APPSECRET"),
  encodingAESKey: sysConfigCache.get("WECHAT_ENCODING_AES_KEY"),
  port: sysConfigCache.get("SERVER_PORT") || 3000,
  path: "/",
};

// 初始化（无配置加载）
let initialized = false;
async function ensureInit() {
  if (initialized) return;
  initialized = true;
}

// 微信签名验证
async function verifySignature(signature, timestamp, nonce, token, platform = "web") {
  const crypto = require("crypto");
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join("");
  const hash = crypto.createHash("sha1").update(str).digest("hex");
  return hash === signature;
}

// 处理消息
async function processMessage(xml, parseXml, decryptMsg) {
  await ensureInit();
  const msg = await parseXml(xml);
  return "你好，我已收到你的消息";
}

// 构造回复 XML
function buildReplyXml(recvMsg, replyContent) {
  const toUser = recvMsg.FromUserName;
  const fromUser = recvMsg.ToUserName;
  const createTime = Math.floor(Date.now() / 1000);
  return `
<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[fromUser]]></FromUserName>
<CreateTime>${createTime}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${replyContent}]]></Content>
</xml>
  `.trim();
}

export {
  ensureInit,
  processMessage,
  buildReplyXml,
  verifySignature,
  config,
};