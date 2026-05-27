/**
 * Cloudflare Worker - 微信公众号服务
 * 使用原生 Worker API 实现微信公众号功能
 */

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request, event.env));
});

async function handleRequest(request, env) {
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
  
  // API 路由
  if (path.startsWith('/api/')) {
    return handleApiRequest(request, env);
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
    
    // 根据消息内容处理
    let reply = 'success';
    if (msg.Content && msg.Content.trim()) {
      const content = msg.Content.trim().toLowerCase();
      
      if (content === '帮助' || content === 'help') {
        reply = '可用命令：\n- 帮助：显示帮助信息\n- 菜单：查看菜单\n- 鹿岛：获取会员码';
      } else if (content === '菜单' || content === 'menu') {
        reply = '菜单功能开发中...';
      } else if (content === '鹿岛' || content === 'ludao') {
        reply = await handleLudaoRequest(env);
      } else {
        reply = `你发送了：${msg.Content}`;
      }
    }
    
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

async function handleLudaoRequest(env) {
  try {
    const apiConfig = await getLudaoConfig(env);
    if (!apiConfig) {
      return '鹿岛 API 配置未设置';
    }
    
    const response = await fetch(apiConfig.base_url, {
      method: apiConfig.request_method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        [apiConfig.param_key]: apiConfig.param_value,
        ...(apiConfig.extra_headers ? JSON.parse(apiConfig.extra_headers) : {})
      },
      body: apiConfig.extra_body ? apiConfig.extra_body : undefined
    });
    
    const data = await response.json();
    
    if (data.code === 200 && data.data?.code) {
      return `鹿岛会员码：${data.data.code}`;
    } else {
      return `获取会员码失败：${data.msg || '未知错误'}`;
    }
  } catch (error) {
    console.error('鹿岛 API 调用失败:', error);
    return `获取会员码失败：${error.message}`;
  }
}

async function getLudaoConfig(env) {
  try {
    // 从 D1 数据库获取配置
    if (env.DB) {
      const result = await env.DB.prepare('SELECT * FROM sys_api_info WHERE name = ?').bind('ludao_api').first();
      return result;
    }
    return null;
  } catch (error) {
    console.error('获取 API 配置失败:', error);
    return null;
  }
}

async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 健康检查
  if (path === '/api/health') {
    return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  }
  
  return new Response('API not found', { status: 404 });
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