/**
 * 微信消息处理器 - 统一处理消息接收、解密、路由、回复
 * 每一步具体实现委托给对应的处理类
 */

import crypto from "node:crypto";
import sysConfigCache from "../sys-config-cache.js";
import { parseWechatXml, decryptMsg } from "../../utils/xml-utils.js";
import * as handlers from "../handlers/index.js";

// 配置
const config = {
  token: sysConfigCache.get("WECHAT_TOKEN"),
  appID: sysConfigCache.get("WECHAT_APPID"),
  appSecret: sysConfigCache.get("WECHAT_APPSECRET"),
  encodingAESKey: sysConfigCache.get("WECHAT_ENCODING_AES_KEY"),
  path: "/",
};

/**
 * 验证微信签名
 * @param {string} signature - 签名
 * @param {string} timestamp - 时间戳
 * @param {string} nonce - 随机数
 * @param {string} token - Token
 * @returns {boolean} 是否验证通过
 */
async function verifySignature(signature, timestamp, nonce, token) {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join("");
  const hash = crypto.createHash("sha1").update(str).digest("hex");
  return hash === signature;
}

/**
 * 解析消息类型并分发处理
 * @param {Object} msg - 解析后的消息对象
 * @returns {string} 回复内容
 */
async function routeMessage(msg) {
  const msgType = msg.MsgType;
  console.log(`[message-processor] 收到消息类型: ${msgType}`);
  
  // 根据消息类型路由到相应处理器
  switch (msgType) {
    case "text":
      return await handlers.handleText(msg);
    case "image":
      return await handlers.handleImage(msg);
    case "voice":
      return await handlers.handleVoice(msg);
    case "video":
      return await handlers.handleVideo(msg);
    case "location":
      return await handlers.handleLocation(msg);
    case "link":
      return await handlers.handleLink(msg);
    case "event":
      return await handlers.handleEvent(msg);
    default:
      console.warn(`[message-processor] 未知消息类型: ${msgType}`);
      return "收到你的消息，我会尽快回复你";
  }
}

/**
 * 处理加密消息
 * @param {string} xml - 原始 XML 内容
 * @returns {Object} 解密后的消息对象
 */
async function processEncryptedMessage(xml) {
  try {
    const decryptedMsg = await decryptMsg(xml);
    console.log("[message-processor] 消息解密成功，消息内容:", decryptedMsg);
    return decryptedMsg;
  } catch (error) {
    console.error("[message-processor] 消息解密失败:", error.message);
    throw error;
  }
}

/**
 * 处理消息主入口
 * @param {string} xml - 原始 XML 内容
 * @param {boolean} [isEncrypted=false] - 是否加密消息
 * @returns {string} 回复内容
 */
async function processMessage(xml, isEncrypted = false) {
  let msg;
  try {
    // 1. 解析或解密消息
    if (isEncrypted) {
      msg = await processEncryptedMessage(xml);
    } else {
      msg = parseWechatXml(xml);
    }
    
    // 2. 路由处理
    const replyContent = await routeMessage(msg);
    console.log(`[message-processor] 路由处理结果: ${replyContent}`);
    
    // 3. 构建回复 XML
    return buildReplyXml(msg, replyContent);
    
  } catch (error) {
    console.error("[message-processor] 消息处理失败:", error.message);
    return buildReplyXml(msg || {}, "消息处理失败，请稍后重试");
  }
}

/**
 * 构造回复 XML
 * @param {Object} recvMsg - 接收到的消息
 * @param {string|Object} reply - 回复内容
 * @returns {string} XML 字符串
 */
function buildReplyXml(recvMsg, reply) {
  const toUser = recvMsg.FromUserName || "";
  const fromUser = recvMsg.ToUserName || "";
  const createTime = Math.floor(Date.now() / 1000);
  
  const header = `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${createTime}</CreateTime>`;
  
  if (typeof reply === "string") {
    return `${header}
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${reply}]]></Content>
</xml>`.trim();
  }
  
  // 支持复杂消息类型
  if (reply.msgType) {
    return `${header}
<MsgType><![CDATA[${reply.msgType}]]></MsgType>
${reply.content}
</xml>`.trim();
  }
  
  return `${header}
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${JSON.stringify(reply)}]]></Content>
</xml>`.trim();
}

/**
 * 处理 GET 请求（微信验证）
 * @param {Object} query - 查询参数
 * @returns {string|boolean} echostr 或 false
 */
async function handleGetRequest(query) {
   console.log(`[message-processor] 收到 GET 请求，参数: ${JSON.stringify(query)}`);
  const { echostr, signature, timestamp, nonce } = query;
  const token = sysConfigCache.get("WECHAT_TOKEN") || config.token;
  console.log(`[message-processor] 微信Token: ${token}`);
  
  if (!signature || !timestamp || !nonce) {
    console.warn("[message-processor] GET 请求参数不完整");
    return false;
  }
  
  const isValid = await verifySignature(signature, timestamp, nonce, token);
  return isValid ? echostr : false;
}

/**
 * 处理 POST 请求（消息处理）
 * @param {string} body - 请求体内容
 * @returns {string} 回复 XML
 */
async function handlePostRequest(body) {
  console.log(`[message-processor] 收到 POST 请求，长度: ${body.length}`);
  
  // 检查是否为加密消息
  const isEncrypted = body.includes("<Encrypt><![CDATA[");
  console.log(`[message-processor] 是否为加密消息: ${isEncrypted}`);
  
  return await processMessage(body, isEncrypted);
}

export {
  processMessage,
  buildReplyXml,
  verifySignature,
  handleGetRequest,
  handlePostRequest,
  config,
  
};