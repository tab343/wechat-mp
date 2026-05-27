/**
 * 帮助功能模块
 * 
 * 显示所有可用的命令和功能说明
 */

const keywordCache = require("../keyword-cache");

/**
 * 生成帮助信息
 * @param {Object} msg - 消息对象
 * @returns {string} 帮助文本
 */
async function executeHelp(msg) {
  console.log(`[action:help] 生成帮助信息 (用户: ${msg?.FromUserName})`);
  
  const keywords = keywordCache.getAllKeywords();
  const enabledKeywords = keywords.filter(k => !k.isSystem);
  
  let reply = "🤖 可用命令列表\n\n";
  
  if (enabledKeywords.length === 0) {
    reply += "暂无可用命令\n";
  } else {
    // 按功能分组
    const actionGroups = {};
    for (const kw of enabledKeywords) {
      if (!actionGroups[kw.action]) {
        actionGroups[kw.action] = {
          keywords: [],
          description: kw.description || kw.action
        };
      }
      actionGroups[kw.action].keywords.push(kw.keyword);
    }
    
    for (const [action, group] of Object.entries(actionGroups)) {
      const displayKeywords = group.keywords.join(" / ");
      reply += `• ${displayKeywords}\n  └─ ${group.description}\n`;
    }
  }
  
  reply += "\n💡 提示: 回复 'refresh' 可刷新关键字缓存";
  return reply;
}

/**
 * 功能定义
 */
module.exports = {
  actionId: "help",
  executor: executeHelp,
  description: "查看帮助信息",
  defaultKeywords: ["help", "帮助"],
};
