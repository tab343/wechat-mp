/**
 * 鹿岛功能测试脚本
 * 测试条形码生成和缓存机制
 */

const axios = require('axios');
const bwipjs = require('bwip-js');

// 测试条形码生成
async function testBarcodeGeneration() {
  console.log('=== 测试条形码生成 ===');
  const memberCode = '5101237031828111';
  
  try {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: memberCode,
      scale: 2,
      height: 30,
      includetext: true,
      textxalign: 'center',
      textsize: 12
    });
    
    console.log('✅ 条形码生成成功');
    console.log(`📐 文件大小: ${pngBuffer.length} bytes`);
    return true;
  } catch (error) {
    console.error('❌ 条形码生成失败:', error.message);
    return false;
  }
}

// 测试鹿岛接口调用
async function testLudaoApi() {
  console.log('\n=== 测试鹿岛 API 调用 ===');
  
  try {
    const response = await axios.get('http://localhost:3000/api/api-configs');
    console.log('✅ API 配置获取成功');
    console.log('📋 配置列表:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ API 配置获取失败:', error.message);
    return false;
  }
}

// 测试消息发送
async function testMessage() {
  console.log('\n=== 测试发送消息 ===');
  
  const xml = `<xml>
  <ToUserName><![CDATA[gh_test_official]]></ToUserName>
  <FromUserName><![CDATA[test_user_${Date.now()}]]></FromUserName>
  <CreateTime>${Date.now()}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[鹿岛]]></Content>
  <MsgId>${Date.now()}abc</MsgId>
</xml>`;

  try {
    const response = await axios.post('http://localhost:3000/wechat', xml, {
      headers: { 'Content-Type': 'text/xml' }
    });
    
    console.log('✅ 消息发送成功');
    console.log('📨 响应:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 消息发送失败:', error.message);
    if (error.response) {
      console.error('📄 错误响应:', error.response.data);
    }
    return false;
  }
}

// 运行所有测试
async function runTests() {
  console.log('开始测试鹿岛功能...\n');
  
  await testBarcodeGeneration();
  await testLudaoApi();
  await testMessage();
  
  console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);