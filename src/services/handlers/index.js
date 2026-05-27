/**
 * 消息处理器注册中心
 * 
 * 统一管理所有消息类型的处理器，提供动态注册和扩展能力。
 * 
 * 使用方式：
 * const handlers = require('./handlers');
 * const reply = await handlers.handle(msgType, msg);
 * 
 * 扩展方式：
 * handlers.register('custom', customHandler);
 */

// 导入各类型处理器
const { handleText } = require("./text");
const { handleImage } = require("./image");
const { handleVoice } = require("./voice");
const { handleVideo } = require("./video");
const { handleLocation } = require("./location");
const { handleLink } = require("./link");
const { handleEvent } = require("./event");

// ── 处理器注册表 ────────────────────────────────────────────
const handlerRegistry = {
  text: handleText,
  image: handleImage,
  voice: handleVoice,
  video: handleVideo,
  shortvideo: handleVideo, // 短视频复用视频处理器
  location: handleLocation,
  link: handleLink,
  event: handleEvent,
};

/**
 * 根据消息类型获取处理器
 * @param {string} msgType - 消息类型
 * @returns {Function|null} 处理器函数
 */
function getHandler(msgType) {
  return handlerRegistry[msgType] || null;
}

/**
 * 注册新的消息处理器
 * @param {string} msgType - 消息类型
 * @param {Function} handler - 处理器函数
 * @returns {boolean} 是否注册成功
 */
function register(msgType, handler) {
  if (typeof handler !== "function") {
    console.error("[handler] 注册失败：handler 必须是函数");
    return false;
  }
  
  handlerRegistry[msgType] = handler;
  console.log(`[handler] 已注册消息类型: ${msgType}`);
  return true;
}

/**
 * 取消注册消息处理器
 * @param {string} msgType - 消息类型
 * @returns {boolean} 是否取消成功
 */
function unregister(msgType) {
  if (handlerRegistry[msgType]) {
    delete handlerRegistry[msgType];
    console.log(`[handler] 已取消注册消息类型: ${msgType}`);
    return true;
  }
  return false;
}

/**
 * 获取所有已注册的消息类型
 * @returns {string[]} 消息类型列表
 */
function getRegisteredTypes() {
  return Object.keys(handlerRegistry);
}

/**
 * 处理消息的主入口
 * @param {string} msgType - 消息类型
 * @param {Object} msg - 消息对象
 * @returns {Object|null} 回复消息对象
 */
async function handle(msgType, msg) {
  const handler = getHandler(msgType);
  
  if (!handler) {
    console.warn(`[handler] 未找到消息类型 "${msgType}" 的处理器`);
    return null;
  }

  try {
    return await handler(msg);
  } catch (err) {
    console.error(`[handler] 处理消息类型 "${msgType}" 时出错:`, err.message);
    return null;
  }
}

// ── 导出扩展接口 ────────────────────────────────────────────

module.exports = {
  // 主入口
  handle,
  
  // 注册管理
  register,
  unregister,
  getHandler,
  getRegisteredTypes,
  
  // 各类型处理器（便于单独使用或扩展）
  text: require("./text"),
  image: require("./image"),
  voice: require("./voice"),
  video: require("./video"),
  location: require("./location"),
  link: require("./link"),
  event: require("./event"),
  
  // 工具函数
  utils: require("./utils"),
};
