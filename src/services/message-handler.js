const { parseXML, buildXML } = require("../utils/xml");
const handlers = require("./handlers");
const { textReply } = require("./handlers/utils");

/**
 * 微信消息处理服务（入口层）
 * 
 * 负责接收微信服务器 POST 过来的 XML 消息体，
 * 解析后分派到对应的处理器，最终构造 XML 回复。
 * 
 * 回复消息的 ToUserName / FromUserName 与接收时互换：
 *   - 接收：ToUserName=公众号, FromUserName=用户OpenID
 *   - 回复：ToUserName=用户OpenID, FromUserName=公众号
 */

/**
 * 处理微信 POST 消息，返回 XML 回复字符串；无需回复时返回空串 ""
 * @param {string} rawBody - 原始 XML 消息体
 * @returns {string} XML 回复字符串或空串
 */
async function handleMessage(rawBody) {
  try {
    const msg = await parseXML(rawBody);
    const msgType = msg.MsgType;

    console.log(`[消息] 收到消息类型: ${msgType}`);

    // 使用处理器注册中心处理消息
    const replyData = await handlers.handle(msgType, msg);

    // 无需回复（如取关事件）
    if (!replyData) {
      return "";
    }

    return buildXML(replyData);
  } catch (err) {
    console.error("[消息] 处理失败:", err.message);
    // 解析失败时返回空，避免微信服务器重试
    return "";
  }
}

/**
 * 处理未知消息类型
 * @param {Object} msg - 消息对象
 * @returns {Object} 回复消息对象
 */
function handleUnknown(msg) {
  return textReply(msg, `暂不支持该消息类型：${msg.MsgType}`);
}

module.exports = {
  handleMessage,
  handleUnknown,
  // 暴露处理器注册中心便于扩展
  handlers,
};
