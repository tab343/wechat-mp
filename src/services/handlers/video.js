/**
 * 视频消息处理器
 * 
 * 处理用户发送的视频/短视频消息，支持视频分析等扩展功能。
 * 
 * 扩展方式：
 * 1. 视频内容分析
 * 2. 视频转码处理
 * 3. 视频内容审核
 */

const { textReply } = require("./utils");

/**
 * 视频消息主处理器
 * @param {Object} msg - 消息对象
 * @param {string} msg.FromUserName - 用户 OpenID
 * @param {string} msg.ToUserName - 公众号 ID
 * @param {number} msg.CreateTime - 消息创建时间戳
 * @param {string} msg.MsgType - 消息类型：video 或 shortvideo
 * @param {string} msg.MediaId - 视频媒体 ID
 * @param {string} msg.ThumbMediaId - 缩略图媒体 ID
 * @param {string} [msg.Title] - 视频标题
 * @param {string} [msg.Description] - 视频描述
 * @param {number} msg.MsgId - 消息 ID
 * @returns {Object|null} 回复消息对象
 * 
 * @example
 * // 视频消息示例：
 * {
 *   FromUserName: 'o1234567890abcdef1234567890abcdef',
 *   ToUserName: 'gh_1234567890abcdef',
 *   CreateTime: 1672531200,
 *   MsgType: 'video',
 *   MediaId: 'MEDIA_ID_1234567890',
 *   ThumbMediaId: 'THUMB_MEDIA_ID_1234567890',
 *   Title: '我的视频',
 *   Description: '这是一段精彩视频',
 *   MsgId: 1234567890123456
 * }
 */
async function handleVideo(msg) {
  const { MediaId, ThumbMediaId, Title, Description } = msg;
  console.log(`[消息] 收到视频 (MediaId: ${MediaId}, Title: ${Title || "无"})`);

  // 扩展：视频内容分析
  // const analysis = await analyzeVideo(MediaId);
  // if (analysis) return textReply(msg, `视频分析：${analysis}`);

  let reply = "已收到您的视频 🎬";
  if (Title) {
    reply += `\n标题：${Title}`;
  }
  if (Description) {
    reply += `\n描述：${Description}`;
  }

  return textReply(msg, reply);
}

/**
 * 扩展方法：获取视频标题
 * @param {Object} msg - 消息对象
 * @returns {string|null} 视频标题
 */
function getVideoTitle(msg) {
  return msg.Title || null;
}

/**
 * 扩展方法：获取视频描述
 * @param {Object} msg - 消息对象
 * @returns {string|null} 视频描述
 */
function getVideoDescription(msg) {
  return msg.Description || null;
}

/**
 * 扩展方法：获取缩略图 MediaId
 * @param {Object} msg - 消息对象
 * @returns {string|null} 缩略图 MediaId
 */
function getThumbMediaId(msg) {
  return msg.ThumbMediaId || null;
}

module.exports = {
  handleVideo,
  getVideoTitle,
  getVideoDescription,
  getThumbMediaId,
};
