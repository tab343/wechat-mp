/**
 * 文本消息处理器
 * 
 * 处理用户发送的文本消息，通过关键字缓存匹配功能。
 * 
 * 扩展方式：
 * 1. 在 actions 目录中创建新的功能模块
 * 2. 在数据库 sys_keywords 表中添加关键字映射
 * 3. 多个关键字可以映射到同一个功能
 */

import { textReply, newsReply } from "./utils.js";
import { keywordCache } from "../keyword-cache.js";

/**
 * 文本消息主处理器
 * @param {Object} msg - 消息对象
 * @param {string} msg.FromUserName - 用户 OpenID
 * @param {string} msg.ToUserName - 公众号 ID
 * @param {number} msg.CreateTime - 消息创建时间戳
 * @param {string} msg.MsgType - 消息类型：text
 * @param {string} msg.Content - 文本内容
 * @param {number} msg.MsgId - 消息 ID
 * @returns {Object|null} 回复消息对象
 * 
 * @example
 * // 消息示例：
 * {
 *   FromUserName: 'o1234567890abcdef1234567890abcdef',
 *   ToUserName: 'gh_1234567890abcdef',
 *   CreateTime: 1672531200,
 *   MsgType: 'text',
 *   Content: '你好',
 *   MsgId: 1234567890123456
 * }
 */
async function handleText(msg) {
  const content = msg.Content || "";
  console.log(`[消息] 收到文本: ${content} (来自: ${msg.FromUserName})`);

  const trimmedContent = content.trim();
  const lowerContent = trimmedContent.toLowerCase();

  // 1. 从缓存中查找关键字
  const keywordInfo = keywordCache.getAction(lowerContent);
  
  if (keywordInfo) {
    const { action } = keywordInfo;
    console.log(`[消息] 匹配关键字: ${lowerContent} -> action: ${action}`);

    // 2. 执行对应的功能
    const reply = await keywordCache.executeAction(action, msg);
    if (reply) {
      // 支持返回对象类型
      if (typeof reply === 'object' && reply.type === 'image') {
        // 使用 MediaId 返回图片消息
        if (reply.mediaId) {
          return `<xml>
            <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
            <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
            <CreateTime>${Date.now()}</CreateTime>
            <MsgType><![CDATA[image]]></MsgType>
            <Image>
              <MediaId><![CDATA[${reply.mediaId}]]></MediaId>
            </Image>
          </xml>`;
        }
        // 使用图片URL返回图文消息
        if (reply.content) {
          return newsReply(msg, [{
            title: reply.text || '图片',
            description: reply.text || '',
            picUrl: reply.content,
            url: reply.content
          }]);
        }
      }
      // 默认返回文本消息
      return textReply(msg, reply);
    }
  }

  // 3. 未匹配关键字：原样回复
  return textReply(msg, content);
}

/**
 * 扩展方法：添加本地关键字（仅内存，不持久化）
 * @param {string} keyword - 关键字
 * @param {string} reply - 回复内容
 */
function addKeyword(keyword, reply) {
  keywordCache.registerActionExecutor(`local:${keyword}`, async () => reply);
}

/**
 * 扩展方法：批量添加本地关键字
 * @param {Object} newKeywords - 关键字对象
 */
function addKeywords(newKeywords) {
  for (const [keyword, reply] of Object.entries(newKeywords)) {
    addKeyword(keyword, reply);
  }
}

export {
  handleText,
  addKeyword,
  addKeywords,
};