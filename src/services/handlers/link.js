/**
 * 链接消息处理器
 * 
 * 处理用户发送的链接消息，支持链接预览、内容提取等扩展功能。
 */

import { textReply } from "./utils.js";

/**
 * 链接消息主处理器
 * @param {Object} msg - 消息对象
 * @param {string} msg.FromUserName - 用户 OpenID
 * @param {string} msg.ToUserName - 公众号 ID
 * @param {number} msg.CreateTime - 消息创建时间戳
 * @param {string} msg.MsgType - 消息类型：link
 * @param {string} msg.Title - 链接标题
 * @param {string} msg.Description - 链接描述
 * @param {string} msg.Url - 链接 URL
 * @param {number} msg.MsgId - 消息 ID
 * @returns {Object|null} 回复消息对象
 */
async function handleLink(msg) {
  const { Title, Description, Url } = msg;
  console.log(`[消息] 收到链接: ${Title} → ${Url}`);

  let reply = `已收到您分享的链接：`;
  if (Title) {
    reply += `\n标题：${Title}`;
  }
  if (Description) {
    reply += `\n描述：${Description}`;
  }
  reply += `\n链接：${Url}`;

  return textReply(msg, reply);
}

/**
 * 扩展方法：获取链接标题
 * @param {Object} msg - 消息对象
 * @returns {string|null} 链接标题
 */
function getLinkTitle(msg) {
  return msg.Title || null;
}

/**
 * 扩展方法：获取链接描述
 * @param {Object} msg - 消息对象
 * @returns {string|null} 链接描述
 */
function getLinkDescription(msg) {
  return msg.Description || null;
}

/**
 * 扩展方法：获取链接 URL
 * @param {Object} msg - 消息对象
 * @returns {string|null} 链接 URL
 */
function getLinkUrl(msg) {
  return msg.Url || null;
}

export {
  handleLink,
  getLinkTitle,
  getLinkDescription,
  getLinkUrl,
};