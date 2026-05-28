/**
 * 微信公众号消息测试脚本
 * 用于模拟微信用户向公众号发送消息
 * 
 * 使用方法：
 * 1. 确保服务已启动：npm start
 * 2. 运行测试：node test/wechat-message.js [关键字]
 * 
 * 示例：
 *   node test/wechat-message.js 鹿岛
 *   node test/wechat-message.js 帮助
 *   node test/wechat-message.js 菜单
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const WECHAT_PATH = '/wechat';

/**
 * 构造微信消息 XML
 * @param {string} content - 消息内容
 * @param {string} fromUser - 发送者标识
 * @returns {string} XML 字符串
 */
function buildMessageXML(content, fromUser = 'test_user_' + Date.now()) {
  return `
<xml>
  <ToUserName><![CDATA[gh_test_official]]></ToUserName>
  <FromUserName><![CDATA[${fromUser}]]></FromUserName>
  <CreateTime>${Date.now()}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${content}]]></Content>
  <MsgId>${Date.now()}${Math.random().toString(36).substr(2, 9)}</MsgId>
</xml>
  `.trim();
}

/**
 * 发送消息到公众号
 * @param {string} content - 消息内容
 * @returns {Promise<string>} 响应内容
 */
async function sendMessage(content) {
  const xml = buildMessageXML(content);
  
  try {
    console.log(`\n[发送] ${content}`);
    console.log('--- 请求 XML ---');
    console.log(xml);
    
    const response = await axios.post(`${BASE_URL}${WECHAT_PATH}`, xml, {
      headers: { 
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(xml)
      }
    });
    
    console.log('\n--- 响应 ---');
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('\n--- 发送失败 ---');
    console.error('错误:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应内容:', error.response.data);
    }
    throw error;
  }
}

/**
 * 批量测试多个关键字
 */
async function runBatchTest() {
  const keywords = ['鹿岛', '帮助', '菜单', '你好', 'status'];
  
  console.log('========== 批量测试开始 ==========');
  
  for (const keyword of keywords) {
    try {
      await sendMessage(keyword);
      await delay(1000); // 间隔1秒
    } catch (err) {
      // 继续测试下一个
    }
  }
  
  console.log('\n========== 批量测试结束 ==========');
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法:');
    console.log('  node test/wechat-message.js [关键字]');
    console.log('  node test/wechat-message.js --batch    (批量测试)');
    console.log('\n示例:');
    console.log('  node test/wechat-message.js 鹿岛');
    console.log('  node test/wechat-message.js 帮助');
    console.log('  node test/wechat-message.js --batch');
    return;
  }
  
  const content = args[0];
  
  if (content === '--batch') {
    await runBatchTest();
  } else {
    await sendMessage(content);
  }
}

// 执行主函数
main().catch(console.error);