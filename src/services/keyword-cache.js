/**
 * 关键字缓存模块
 * 
 * 职责：从数据库加载关键字到内存，提供关键字查询和缓存管理功能。
 */

import { keywordDb } from "./db/sys_keywords-db.js";

// 关键字缓存: keyword -> { action, description, isSystem }
let keywordsCache = new Map();

// 功能缓存: action -> [keywords]
let actionCache = new Map();

// 功能执行器: action -> function(msg) -> string
let actionExecutors = new Map();

// 初始化状态
let isInitialized = false;

/**
 * 从数据库加载所有启用的关键字到缓存
 */
async function loadFromDatabase() {

  try {
    const keywords = await keywordDb.findAllEnabled();
    
    keywordsCache.clear();
    actionCache.clear();

    for (const item of keywords) {
      keywordsCache.set(item.keyword.toLowerCase(), {
        action: item.action,
        description: item.description,
        isSystem: !!item.is_system,
      });

      if (!actionCache.has(item.action)) {
        actionCache.set(item.action, []);
      }
      actionCache.get(item.action).push(item.keyword);
    }

    console.log(`[keyword-cache] 已加载 ${keywordsCache.size} 个关键字，${actionCache.size} 个功能`);
    isInitialized = true;
    return true;
  } catch (err) {
    console.error("[keyword-cache] 加载关键字失败:", err.message);
    return false;
  }
}

/**
 * 初始化关键字缓存（完整流程）
 * 包含：加载关键字 + 注册业务功能执行器
 * @param {Function} [registerActionsCallback] - 注册业务功能的回调函数
 * @returns {boolean} 是否成功
 */
async function init(registerActionsCallback) {
  console.log("[keyword-cache] 开始初始化...");
  
  // 1. 从数据库加载关键字
  const loadSuccess = await loadFromDatabase();
  
  // 2. 注册业务功能执行器（如果提供了回调）
  if (registerActionsCallback && typeof registerActionsCallback === 'function') {
    try {
      registerActionsCallback();
      console.log("[keyword-cache] 业务功能执行器注册完成");
    } catch (err) {
      console.error("[keyword-cache] 注册业务功能执行器失败:", err.message);
    }
  }
  
  console.log("[keyword-cache] 初始化完成");
  return loadSuccess;
}

/**
 * 刷新缓存（从数据库重新加载）
 */
async function refresh() {
  console.log("[keyword-cache] 正在刷新缓存...");
  return await loadFromDatabase();
}

/**
 * 根据关键字查找功能
 * @param {string} keyword - 关键字
 * @returns {Object|null} 关键字配置对象
 */
function getAction(keyword) {
  if (!keyword) return null;
  return keywordsCache.get(keyword.toLowerCase()) || null;
}

/**
 * 根据功能标识查找所有关联的关键字
 * @param {string} action - 功能标识
 * @returns {string[]} 关键字列表
 */
function getKeywordsByAction(action) {
  return actionCache.get(action) || [];
}

/**
 * 检查关键字是否存在
 * @param {string} keyword - 关键字
 * @returns {boolean}
 */
function hasKeyword(keyword) {
  return keywordCache.has(keyword.toLowerCase());
}

/**
 * 检查功能是否存在
 * @param {string} action - 功能标识
 * @returns {boolean}
 */
function hasAction(action) {
  return actionCache.has(action);
}

/**
 * 获取所有缓存的关键字
 * @returns {Object[]} 关键字列表
 */
function getAllKeywords() {
  return Array.from(keywordsCache.entries()).map(([keyword, config]) => ({
    keyword,
    ...config,
  }));
}

/**
 * 获取所有缓存的功能
 * @returns {Object[]} 功能列表
 */
function getAllActions() {
  return Array.from(actionCache.entries()).map(([action, keywords]) => ({
    action,
    keywords,
    keywordCount: keywords.length,
    hasExecutor: actionExecutors.has(action),
  }));
}

/**
 * 缓存是否已初始化
 * @returns {boolean}
 */
function isReady() {
  return isInitialized;
}

/**
 * 注册功能执行器
 * @param {string} action - 功能标识
 * @param {Function} executor - 执行函数
 * @returns {boolean} 是否成功
 */
function registerActionExecutor(action, executor) {
  if (typeof executor !== "function") {
    console.error("[keyword-cache] 注册执行器失败：必须是函数");
    return false;
  }
  actionExecutors.set(action, executor);
  console.log(`[keyword-cache] 已注册功能执行器: ${action}`);
  return true;
}

/**
 * 取消注册功能执行器
 * @param {string} action - 功能标识
 */
function unregisterActionExecutor(action) {
  actionExecutors.delete(action);
}

/**
 * 获取已注册的功能执行器
 * @returns {string[]} 功能标识列表
 */
function getRegisteredActions() {
  return Array.from(actionExecutors.keys());
}

/**
 * 执行功能
 * @param {string} action - 功能标识
 * @param {Object} msg - 消息对象
 * @returns {string|null} 回复内容
 */
async function executeAction(action, msg) {
  const executor = actionExecutors.get(action);
  console.log(`[keyword-cache] 执行功能: %o`, action);

  if (executor) {
    try {
      return await executor(msg);
    } catch (err) {
      console.error(`[keyword-cache] 执行功能失败 ${action}:`, err.message);
      return null;
    }
  }
  return null;
}

/**
 * 检查功能是否有执行器
 * @param {string} action - 功能标识
 * @returns {boolean}
 */
function hasExecutor(action) {
  return actionExecutors.has(action);
}

export const keywordCache = {
  // 缓存管理
  init,
  loadFromDatabase,
  refresh,  
  isReady,
  
  // 关键字查询
  getAction,
  getKeywordsByAction,
  hasKeyword,
  hasAction,
  getAllKeywords,
  getAllActions,
  
  // 功能执行器管理
  registerActionExecutor,
  unregisterActionExecutor,
  getRegisteredActions,
  executeAction,
  hasExecutor,
};