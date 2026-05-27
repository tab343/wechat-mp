/**
 * 业务功能注册中心
 * 
 * 自动加载所有业务功能模块并注册到关键字缓存
 * 
 * 新增业务功能步骤：
 * 1. 在本目录创建新的功能文件（如 xxx.js）
 * 2. 导出格式：{ actionId, executor, description, defaultKeywords }
 * 3. 在数据库 sys_keywords 表中添加关键字映射
 */

const keywordCache = require("../keyword-cache");

// 业务功能列表
const businessActions = [
  require("./help"),
  require("./greeting"),
  require("./menu"),
  require("./ludao"),
];

/**
 * 注册所有业务功能
 */
function registerBusinessActions() {
  let registeredCount = 0;
  
  for (const action of businessActions) {
    if (action.actionId && action.executor) {
      const success = keywordCache.registerActionExecutor(action.actionId, action.executor);
      if (success) {
        registeredCount++;
        console.log(`[actions] 已注册业务功能: ${action.actionId} (${action.description})`);
      }
    }
  }
  
  console.log(`[actions] 业务功能注册完成，共 ${registeredCount} 个`);
  return registeredCount;
}

/**
 * 获取所有业务功能定义
 * @returns {Object[]} 功能定义列表
 */
function getBusinessActions() {
  return businessActions;
}

/**
 * 获取单个业务功能
 * @param {string} actionId - 功能标识
 * @returns {Object|null} 功能定义
 */
function getBusinessAction(actionId) {
  return businessActions.find(a => a.actionId === actionId) || null;
}

/**
 * 添加新的业务功能
 * @param {Object} action - 功能定义
 * @returns {boolean} 是否成功
 */
function addBusinessAction(action) {
  if (!action.actionId || !action.executor) {
    console.error("[actions] 添加业务功能失败：缺少必要字段");
    return false;
  }
  
  businessActions.push(action);
  return keywordCache.registerActionExecutor(action.actionId, action.executor);
}

module.exports = {
  businessActions,
  registerBusinessActions,
  getBusinessActions,
  getBusinessAction,
  addBusinessAction,
};
