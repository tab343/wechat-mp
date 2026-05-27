/**
 * 链接消息处理器
 * 
 * 处理用户发送的链接消息，支持链接预览、内容提取等扩展功能。
 * 
 * 扩展方式：
 * 1. 链接内容抓取和解析
 * 2. 链接安全性检测
 * 3. 链接预览生成
 */

const { textReply } = require("./utils");

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
 * 
 * @example
 * // 消息示例：
 * {
 *   FromUserName: 'o1234567890abcdef1234567890abcdef',
 *   ToUserName: 'gh_1234567890abcdef',
 *   CreateTime: 1672531200,
 *   MsgType: 'link',
 *   Title: '微信公众平台',
 *   Description: '微信公众平台官方网站',
 *   Url: 'https://mp.weixin.qq.com',
 *   MsgId: 1234567890123456
 * }
 */
async function handleLink(msg) {
  const { Title, Description, Url } = msg;
  console.log(`[消息] 收到链接: ${Title} → ${Url}`);

  // 扩展：链接内容抓取
  // const content = await fetchLinkContent(Url);
  // if (content) return textReply(msg, `链接内容摘要：${content}`);

  // 扩展：链接安全检测
  // const isSafe = await checkLinkSafety(Url);
  // if (!isSafe) return textReply(msg, `⚠️ 该链接可能存在安全风险`);

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

module.exports = {
  handleLink,
  getLinkTitle,
  getLinkDescription,
  getLinkUrl,
};
