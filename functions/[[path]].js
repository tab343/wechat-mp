/**
 * Cloudflare Pages Function - 微信公众号接口
 * 处理所有请求
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 微信域名验证（GET 请求）
  if (request.method === 'GET' && path === '/wechat') {
    return handleGetRequest(request, env);
  }
  
  // 微信消息接收（POST 请求）
  if (request.method === 'POST' && path === '/wechat') {
    return handlePostRequest(request, env);
  }
  
  // 默认响应
  return new Response('WeChat MP Service', { status: 200 });
}

async function handleGetRequest(request, env) {
  const url = new URL(request.url);
  const { echostr, signature, timestamp, nonce } = url.searchParams;
  
  const token = env.WECHAT_TOKEN || '';
  
  if (!signature || !timestamp || !nonce) {
    return new Response(echostr || '', { status: 200 });
  }
  
  const arr = [token, timestamp, nonce].sort();
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(arr.join('')));
  const signatureHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  if (signatureHex === signature) {
    return new Response(echostr, { status: 200 });
  } else {
    return new Response('Invalid signature', { status: 401 });
  }
}

async function handlePostRequest(request, env) {
  try {
    const xml = await request.text();
    const data = await parseXml(xml);
    
    const msg = {
      ToUserName: data.xml.ToUserName[0],
      FromUserName: data.xml.FromUserName[0],
      CreateTime: parseInt(data.xml.CreateTime[0]),
      MsgType: data.xml.MsgType[0],
      Content: data.xml.Content?.[0] || '',
      MsgId: data.xml.MsgId?.[0]
    };
    
    console.log(`收到消息：${msg.MsgType} - ${msg.Content || ''}`);
    
    // 简单回复
    const reply = `你发送了：${msg.Content}`;
    const xmlReply = buildReplyXml(msg, reply);
    
    return new Response(xmlReply, {
      headers: { 'Content-Type': 'text/xml' },
      status: 200
    });
  } catch (error) {
    console.error('处理消息失败:', error);
    return new Response('error', { status: 500 });
  }
}

async function parseXml(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const result = { xml: {} };
  
  const elements = doc.documentElement.children;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    result.xml[element.tagName] = [element.textContent];
  }
  
  return result;
}

function buildReplyXml(msg, reply) {
  const time = Math.floor(Date.now() / 1000);
  
  if (typeof reply === 'string') {
    return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${reply}]]></Content>
</xml>`;
  }
  
  return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[success]]></Content>
</xml>`;
}