/**
 * 语音消息处理器
 * 
 * 处理用户发送的语音消息，支持语音转文字等扩展功能。
 * 
 * 扩展方式：
 * 1. 接入语音识别服务
 * 2. 分析语音内容进行语义理解
 * 3. 语音合成回复
 */

import { textReply } from "./utils.js";

/**
 * 语音消息主处理器
 * @param {Object} msg - 消息对象
 * @param {string} msg.FromUserName - 用户 OpenID
 * @param {string} msg.ToUserName - 公众号 ID
 * @param {number} msg.CreateTime - 消息创建时间戳
 * @param {string} msg.MsgType - 消息类型：voice
 * @param {string} msg.MediaId - 语音媒体 ID
 * @param {string} msg.Format - 语音格式（如 amr、speex）
 * @param {string} [msg.Recognition] - 语音识别结果（开启语音识别后才有）
 * @param {number} msg.MsgId - 消息 ID
 * @returns {Object|null} 回复消息对象
 * 
 * @example
 * // 消息示例：
 * {
 *   FromUserName: 'o1234567890abcdef1234567890abcdef',
 *   ToUserName: 'gh_1234567890abcdef',
 *   CreateTime: 1672531200,
 *   MsgType: 'voice',
 *   MediaId: 'MEDIA_ID_1234567890',
 *   Format: 'amr',
 *   Recognition: '你好吗',
 *   MsgId: 1234567890123456
 * }
 */
async function handleVoice(msg) {
  const { MediaId, Recognition, Format } = msg;
  console.log(`[消息] 收到语音 (MediaId: ${MediaId}, Format: ${Format}, Recognition: ${Recognition || "无"})`);

  // 如果微信已提供语音识别结果
  if (Recognition) {
    return textReply(msg, `您说的是：${Recognition} 🎤`);
  }

  // 扩展：调用外部语音识别服务
  // const text = await speechToText(MediaId);
  // if (text) return textReply(msg, `识别结果：${text}`);

  // 默认回复
  return textReply(msg, "已收到您的语音消息 🎤");
}

/**
 * 扩展方法：获取语音格式
 * @param {Object} msg - 消息对象
 * @returns {string|null} 语音格式
 */
function getVoiceFormat(msg) {
  return msg.Format || null;
}

/**
 * 扩展方法：获取语音识别结果
 * @param {Object} msg - 消息对象
 * @returns {string|null} 识别结果
 */
function getRecognition(msg) {
  return msg.Recognition || null;
}

export {
  handleVoice,
  getVoiceFormat,
  getRecognition,
};