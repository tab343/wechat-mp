/**
 * 图片消息处理器
 * 
 * 处理用户发送的图片消息，支持图片识别、存储等扩展功能。
 * 
 * 扩展方式：
 * 1. 接入图片识别 API（如 OCR、人脸识别）
 * 2. 将图片保存到云存储
 * 3. 对图片进行处理（压缩、加水印等）
 */

const { textReply } = require("./utils");

/**
 * 图片消息主处理器
 * @param {Object} msg - 消息对象
 * @param {string} msg.FromUserName - 用户 OpenID
 * @param {string} msg.ToUserName - 公众号 ID
 * @param {number} msg.CreateTime - 消息创建时间戳
 * @param {string} msg.MsgType - 消息类型：image
 * @param {string} msg.MediaId - 图片媒体 ID
 * @param {string} msg.PicUrl - 图片 URL
 * @param {number} msg.MsgId - 消息 ID
 * @returns {Object|null} 回复消息对象
 * 
 * @example
 * // 消息示例：
 * {
 *   FromUserName: 'o1234567890abcdef1234567890abcdef',
 *   ToUserName: 'gh_1234567890abcdef',
 *   CreateTime: 1672531200,
 *   MsgType: 'image',
 *   MediaId: 'MEDIA_ID_1234567890',
 *   PicUrl: 'https://mmbiz.qpic.cn/mmbiz_jpg/xxx/0',
 *   MsgId: 1234567890123456
 * }
 */
async function handleImage(msg) {
  const { MediaId, PicUrl } = msg;
  console.log(`[消息] 收到图片 (MediaId: ${MediaId}, PicUrl: ${PicUrl})`);

  // 扩展：图片识别处理
  // const result = await recognizeImage(MediaId);
  // if (result) return textReply(msg, `图片识别结果：${result}`);

  // 默认回复
  return textReply(msg, "已收到您的图片 📷");
}

/**
 * 扩展方法：获取图片 URL
 * @param {Object} msg - 消息对象
 * @returns {string|null} 图片 URL
 */
function getImageUrl(msg) {
  return msg.PicUrl || null;
}

/**
 * 扩展方法：获取图片 MediaId
 * @param {Object} msg - 消息对象
 * @returns {string|null} MediaId
 */
function getMediaId(msg) {
  return msg.MediaId || null;
}

module.exports = {
  handleImage,
  getImageUrl,
  getMediaId,
};
