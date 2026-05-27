const express = require("express");
const { parseStringPromise } = require("xml2js");
const config = require("./config");
const { isConfigured } = require("./services/db/d1-client");
const { initDatabase } = require("./services/db/init-db");
const keywordCache = require("./services/keyword-cache");
const apiConfigCache = require("./services/api-config-cache");
const { registerSysActions } = require("./services/actions/sys-actions");
const { registerBusinessActions } = require("./services/actions");
const { handleText } = require("./services/handlers/text");
const { handleImageMessage } = require("./services/handlers/image");
const { handleVoiceMessage } = require("./services/handlers/voice");
const { handleVideoMessage } = require("./services/handlers/video");
const { handleLocationMessage } = require("./services/handlers/location");
const { handleLinkMessage } = require("./services/handlers/link");
const { handleEventMessage } = require("./services/handlers/event");

const app = express();

app.get(config.path, async (req, res) => {
  const { echostr, signature, timestamp, nonce } = req.query;

  if (!signature || !timestamp || !nonce) {
    return res.send(echostr);
  }

  const checkSignature = () => {
    const arr = [config.token, timestamp, nonce].sort();
    const hash = require("crypto").createHash("sha1").update(arr.join("")).digest("hex");
    return hash === signature;
  };

  if (checkSignature()) {
    res.send(echostr);
  } else {
    res.status(401).send("Invalid signature");
  }
});

app.post(config.path, express.text({ type: "*/*" }), async (req, res) => {
  try {
    const xml = req.body;
    const data = await parseStringPromise(xml);
    const msg = {
      ToUserName: data.xml.ToUserName[0],
      FromUserName: data.xml.FromUserName[0],
      CreateTime: parseInt(data.xml.CreateTime[0]),
      MsgType: data.xml.MsgType[0],
      Content: data.xml.Content?.[0] || "",
      MsgId: data.xml.MsgId?.[0]
    };

    console.log(`收到消息：${msg.MsgType} - ${msg.Content || ""}`);

    const reply = await handleMessage(msg);
    const xmlReply = buildReplyXml(msg, reply);
    res.send(xmlReply);
  } catch (error) {
    console.error("处理消息失败:", error);
    res.status(500).send("error");
  }
});

async function handleMessage(msg) {
  const handler = getHandler(msg.MsgType);
  if (!handler) {
    console.log(`暂不支持的消息类型：${msg.MsgType}`);
    return "success";
  }

  try {
    return await handler(msg);
  } catch (error) {
    console.error(`消息处理失败 [${msg.MsgType}]:`, error);
    return "success";
  }
}

function getHandler(msgType) {
  const handlers = {
    text: handleText,
    image: handleImageMessage,
    voice: handleVoiceMessage,
    video: handleVideoMessage,
    location: handleLocationMessage,
    link: handleLinkMessage,
    event: handleEventMessage
  };

  return handlers[msgType.toLowerCase()] || null;
}

function buildReplyXml(msg, reply) {
  const time = Math.floor(Date.now() / 1000);

  if (typeof reply === "string") {
    return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${reply}]]></Content>
</xml>`;
  }

  // 处理 textReply 返回的对象（MsgType 和 Content）
  if (reply.MsgType === "text") {
    return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${reply.Content}]]></Content>
</xml>`;
  }

  // 处理 image 类型的回复
  if (reply.type === "image" || reply.MsgType === "image") {
    return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[image]]></MsgType>
  <Image>
    <MediaId><![CDATA[${reply.mediaId || reply.MediaId}]]></MediaId>
  </Image>
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

// ── 管理 API：用户列表 ────────────────────────────────
app.get("/api/users", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  try {
    const { query } = require("./services/db/d1-client");
    const result = await query("SELECT * FROM mp_users ORDER BY created_at DESC");
    res.json({ code: 200, data: result.results || [] });
  } catch (error) {
    res.status(500).json({ code: 500, msg: "Failed to get users", error: error.message });
  }
});

// ── 管理 API：关键字列表 ────────────────────────────────
app.get("/api/keywords", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  try {
    const keywords = keywordCache.getKeywords();
    res.json({ code: 200, data: keywords });
  } catch (error) {
    res.status(500).json({ code: 500, msg: "Failed to get keywords", error: error.message });
  }
});

// ── 管理 API：刷新缓存 ────────────────────────────────
app.post("/api/refresh", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  const success = await keywordCache.refresh();
  res.json({ success, message: success ? "缓存刷新成功" : "缓存刷新失败" });
});

// ── 管理 API：API 配置管理 ────────────────────────────────
app.get("/api/api-configs", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  try {
    const configs = await apiConfigCache.loadApiConfigs();
    res.json({ code: 200, data: configs });
  } catch (error) {
    res.status(500).json({ code: 500, msg: "Failed to get API configs", error: error.message });
  }
});

app.post("/api/api-configs/:name", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  try {
    const { name } = req.params;
    const { param_value, expires_at, extra_headers, extra_body } = req.body;
    
    const config = await apiConfigCache.getApiConfig(name);
    if (!config) {
      return res.status(404).json({ error: `API config '${name}' not found` });
    }
    
    const updated = {
      ...config,
      param_value: param_value || config.param_value,
      expires_at: expires_at || config.expires_at,
      extra_headers: extra_headers || config.extra_headers,
      extra_body: extra_body || config.extra_body
    };
    
    await apiConfigCache.updateApiConfig(name, updated);
    res.json({ code: 200, message: "Updated successfully", data: updated });
  } catch (error) {
    res.status(500).json({ code: 500, msg: "Failed to update API config", error: error.message });
  }
});

app.get("/api/api-configs/:name/status", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  try {
    const { name } = req.params;
    const config = await apiConfigCache.getApiConfig(name);
    if (!config) {
      return res.status(404).json({ error: `API config '${name}' not found` });
    }
    
    const isExpired = await apiConfigCache.isApiConfigExpired(name);
    res.json({
      code: 200,
      data: {
        name,
        expires_at: config.expires_at,
        is_expired: isExpired,
        time_remaining: isExpired ? 0 : Math.max(0, new Date(config.expires_at) - new Date())
      }
    });
  } catch (error) {
    res.status(500).json({ code: 500, msg: "Failed to get API config status", error: error.message });
  }
});

// ── 初始化并启动服务 ─────────────────────────────────────
async function bootstrap() {
  try {
    console.log("[启动] 正在初始化数据库...");
    await initDatabase();
    
    console.log("[启动] 正在加载关键字缓存...");
    await keywordCache.loadFromDatabase();
    
    console.log("[启动] 正在加载 API 配置缓存...");
    await apiConfigCache.loadApiConfigs();
    
    console.log("[启动] 正在注册系统功能...");
    registerSysActions();
    
    console.log("[启动] 正在注册业务功能...");
    registerBusinessActions();

    const server = app.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║     微信公众号服务已启动                      ║
║     Port: ${String(config.port).padEnd(35)}║
║     Path: ${config.path.padEnd(35)}║
║     AppID: ${config.appID.padEnd(33)}║
╚══════════════════════════════════════════════╝
  `);
      console.log(`✅ 域名验证接口：     GET  http://localhost:${config.port}${config.path}`);
      console.log(`✅ 消息接收接口：     POST http://localhost:${config.port}${config.path}`);
      console.log(`✅ 用户列表：         GET  http://localhost:${config.port}/api/users`);
      console.log(`✅ 关键字缓存：       GET  http://localhost:${config.port}/api/keywords`);
      console.log(`✅ API 配置列表：     GET  http://localhost:${config.port}/api/api-configs`);
      console.log(`✅ API 配置更新：     POST http://localhost:${config.port}/api/api-configs/{name}`);

      if (!isConfigured()) {
        console.warn("⚠️  D1 未配置，请设置环境变量 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_DATABASE_ID / CLOUDFLARE_API_TOKEN");
      }
    });

    // 保持进程运行
    server.on('error', (error) => {
      console.error('[启动] 服务器启动失败:', error);
      process.exit(1);
    });

    process.on('SIGTERM', () => {
      console.log('[启动] 收到 SIGTERM 信号，关闭服务器...');
      server.close(() => {
        console.log('[启动] 服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('[启动] 收到 SIGINT 信号，关闭服务器...');
      server.close(() => {
        console.log('[启动] 服务器已关闭');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('[启动] 启动失败:', error);
    process.exit(1);
  }
}

bootstrap();