/**
 * 打招呼功能模块
 * 
 * 用户发送问候语时的响应
 */

/**
 * 执行打招呼功能
 * @param {Object} msg - 消息对象
 * @returns {string} 回复文本
 */
async function executeGreeting(msg) {
  console.log(`[action:greeting] 执行打招呼 (用户: ${msg?.FromUserName})`);
  
  const greetings = [
    "你好！很高兴为你服务 😊",
    "嗨！有什么我可以帮你的吗？",
    "你好呀！欢迎随时咨询",
    "哈喽！很高兴认识你",
  ];
  
  // 随机选择一个回复
  const randomIndex = Math.floor(Math.random() * greetings.length);
  return greetings[randomIndex];
}

/**
 * 功能定义
 */
export default {
  actionId: "greeting",
  executor: executeGreeting,
  description: "打招呼",
  defaultKeywords: ["hello", "你好", "hi", "嗨"],
};