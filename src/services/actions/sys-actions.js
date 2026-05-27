/**
 * 系统功能模块
 * 
 * 提供关键字缓存的核心操作功能，包括：
 * - 加载关键字
 * - 刷新缓存
 * - 系统级别的关键字处理
 */

const keywordCache = require("../keyword-cache");

/**
 * 刷新关键字缓存功能
 * @param {Object} msg - 消息对象
 * @returns {string} 执行结果
 */
async function refreshKeywords(msg) {
  console.log(`[sys:refresh] 执行缓存刷新 (用户: ${msg?.FromUserName})`);
  const success = await keywordCache.refresh();
  return success 
    ? "关键字缓存已刷新成功 ✅\n\n当前关键字数量: " + keywordCache.getAllKeywords().length
    : "关键字缓存刷新失败 ⚠️\n\n请检查数据库连接";
}

/**
 * 获取缓存状态
 * @param {Object} msg - 消息对象
 * @returns {string} 状态信息
 */
async function getCacheStatus(msg) {
  const keywords = keywordCache.getAllKeywords();
  const actions = keywordCache.getAllActions();
  
  let status = "📊 关键字缓存状态\n";
  status += `\n• 缓存状态: ${keywordCache.isReady() ? "✅ 已就绪" : "⚠️ 未就绪"}`;
  status += `\n• 关键字总数: ${keywords.length}`;
  status += `\n• 功能总数: ${actions.length}`;
  
  const systemKeywords = keywords.filter(k => k.isSystem);
  status += `\n• 系统关键字: ${systemKeywords.length}`;
  
  return status;
}

/**
 * 系统功能注册表
 * 格式: actionId -> 执行函数
 */
const sysActions = {
  "sys:refresh": refreshKeywords,
  "sys:status": getCacheStatus,
};

/**
 * 注册系统功能到关键字缓存
 */
function registerSysActions() {
  for (const [actionId, executor] of Object.entries(sysActions)) {
    keywordCache.registerActionExecutor(actionId, executor);
  }
  console.log(`[sys-actions] 已注册 ${Object.keys(sysActions).length} 个系统功能`);
}

module.exports = {
  sysActions,
  registerSysActions,
  refreshKeywords,
  getCacheStatus,
};
