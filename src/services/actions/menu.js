/**
 * 菜单功能模块
 * 
 * 显示服务菜单或功能列表
 */

/**
 * 执行菜单功能
 * @param {Object} msg - 消息对象
 * @returns {string} 菜单文本
 */
async function executeMenu(msg) {
  console.log(`[action:menu] 显示菜单 (用户: ${msg?.FromUserName})`);
  
  const menu = `
📋 服务菜单

1️⃣ 基本服务
   ├─ help        - 查看帮助
   └─ menu        - 显示菜单

2️⃣ 系统功能
   └─ refresh     - 刷新缓存

3️⃣ 其他服务
   └─ 更多功能开发中...

回复相应关键字即可使用功能！
  `.trim();
  
  return menu;
}

/**
 * 功能定义
 */
module.exports = {
  actionId: "menu",
  executor: executeMenu,
  description: "查看菜单",
  defaultKeywords: ["menu", "菜单", "功能"],
};
