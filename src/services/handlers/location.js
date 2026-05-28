/**
 * 位置消息处理器
 * 
 * 处理用户发送的地理位置消息，支持地图服务集成等扩展功能。
 */

import { textReply } from "./utils.js";

/**
 * 位置消息主处理器
 * @param {Object} msg - 消息对象
 * @param {string} msg.FromUserName - 用户 OpenID
 * @param {string} msg.ToUserName - 公众号 ID
 * @param {number} msg.CreateTime - 消息创建时间戳
 * @param {string} msg.MsgType - 消息类型：location
 * @param {string} msg.Location_X - 纬度
 * @param {string} msg.Location_Y - 经度
 * @param {number} msg.Scale - 地图缩放级别
 * @param {string} [msg.Label] - 位置标签（地址描述）
 * @param {number} msg.MsgId - 消息 ID
 * @returns {Object|null} 回复消息对象
 */
async function handleLocation(msg) {
  const { Location_X: lat, Location_Y: lng, Label, Scale } = msg;
  console.log(`[消息] 收到位置: ${Label} (${lat}, ${lng})`);

  return textReply(msg, `已收到您的位置：${Label || `${lat}, ${lng}`} 📍`);
}

/**
 * 扩展方法：获取经纬度
 * @param {Object} msg - 消息对象
 * @returns {Object|null} 经纬度对象
 */
function getCoordinates(msg) {
  return {
    lat: parseFloat(msg.Location_X),
    lng: parseFloat(msg.Location_Y),
  };
}

/**
 * 扩展方法：获取位置标签
 * @param {Object} msg - 消息对象
 * @returns {string|null} 位置标签
 */
function getLabel(msg) {
  return msg.Label || null;
}

/**
 * 扩展方法：获取缩放级别
 * @param {Object} msg - 消息对象
 * @returns {number|null} 缩放级别
 */
function getScale(msg) {
  return parseInt(msg.Scale) || null;
}

export {
  handleLocation,
  getCoordinates,
  getLabel,
  getScale,
};