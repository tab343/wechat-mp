/**
 * 本地开发服务器入口 (Express)
 * 使用公共核心模块处理微信消息
 */

const express = require("express");
const { parseStringPromise } = require("xml2js");
const os = require("os");
const { ensureInit, processMessage, buildReplyXml, verifySignature, sysConfigCache, config } = require("./core/message-handler");
const { isConfigured } = require("./services/db/d1-client");
const keywordCache = require("./services/keyword-cache");
const apiConfigCache = require("./services/api-config-cache");
const { registerSysActions } = require("./services/actions/sys-actions");
const { registerBusinessActions } = require("./services/actions");

const app = express();

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// 解析微信 XML（兼容 xml2js 格式）
function parseXml(xml) {
  return new Promise(async (resolve) => {
    try {
      const data = await parseStringPromise(xml);
      resolve({
        ToUserName: data.xml.ToUserName?.[0] || "",
        FromUserName: data.xml.FromUserName?.[0] || "",
        CreateTime: parseInt(data.xml.CreateTime?.[0]) || 0,
        MsgType: data.xml.MsgType?.[0] || "",
        Content: data.xml.Content?.[0] || "",
        MsgId: data.xml.MsgId?.[0] || "",
        Encrypt: data.xml.Encrypt?.[0] || "",
      });
    } catch {
      resolve({});
    }
  });
}

// 微信消息解密（本地环境使用 node:crypto）
async function decryptXml(rawXml) {
  const { decryptMsg } = require("./core/xml-utils");
  return decryptMsg(rawXml);
}

app.get(config.path, async (req, res) => {
  const { echostr, signature, timestamp, nonce } = req.query;

  if (!signature || !timestamp || !nonce) {
    return res.send(echostr);
  }

  const isValid = await verifySignature(signature, timestamp, nonce, config.token, "node");
  res.send(isValid ? echostr : "Invalid signature");
});

app.post(config.path, express.text({ type: "*/*" }), async (req, res) => {
  try {
    const xml = req.body;
    const msg = await processMessage(xml, parseXml, decryptXml);
    const parsedMsg = await parseXml(xml);
    const replyXml = buildReplyXml(parsedMsg, msg);
    res.send(replyXml);
  } catch (error) {
    console.error("消息处理失败:", error);
    res.status(500).send("error");
  }
});

// ── 管理 API ─────────────────────────────────────
app.get("/api/config", async (req, res) => {
  const all = sysConfigCache.getAll();
  const safeConfig = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.includes("TOKEN") || k.includes("SECRET") || k.includes("KEY")) {
      safeConfig[k] = v ? "***" + v.slice(-4) : "";
    } else {
      safeConfig[k] = v;
    }
  }
  res.json(safeConfig);
});

app.post("/api/config", express.json(), async (req, res) => {
  try {
    const body = req.body;
    const configDb = require("./services/db/sys_config-db");
    for (const [key, value] of Object.entries(body)) {
      await configDb.setValue(key, String(value));
    }
    await sysConfigCache.refresh();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

app.post("/api/refresh", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  const success = await keywordCache.refresh();
  res.json({ success, message: success ? "缓存刷新成功" : "缓存刷新失败" });
});

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

app.post("/api/api-configs/:name", express.json(), async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  try {
    const { name } = req.params;
    const { param_value, expires_at, extra_headers, extra_body } = req.body;
    
    const configItem = await apiConfigCache.getApiConfig(name);
    if (!configItem) {
      return res.status(404).json({ error: `API config '${name}' not found` });
    }
    
    const updated = {
      ...configItem,
      param_value: param_value || configItem.param_value,
      expires_at: expires_at || configItem.expires_at,
      extra_headers: extra_headers || configItem.extra_headers,
      extra_body: extra_body || configItem.extra_body
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
    const configItem = await apiConfigCache.getApiConfig(name);
    if (!configItem) {
      return res.status(404).json({ error: `API config '${name}' not found` });
    }
    
    const isExpired = await apiConfigCache.isApiConfigExpired(name);
    res.json({
      code: 200,
      data: {
        name,
        expires_at: configItem.expires_at,
        is_expired: isExpired,
        time_remaining: isExpired ? 0 : Math.max(0, new Date(configItem.expires_at) - new Date())
      }
    });
  } catch (error) {
    res.status(500).json({ code: 500, msg: "Failed to get API config status", error: error.message });
  }
});

// ── 启动服务 ─────────────────────────────────────
async function bootstrap() {
  try {    
    console.log("[启动] 初始化核心模块...");
    await ensureInit();

    const server = app.listen(config.port, () => {
      const hostIP = getLocalIP();
      console.log(`
╔══════════════════════════════════════════════╗
║     微信公众号服务已启动                      ║
║     Port: ${String(config.port).padEnd(35)}║
║     Path: ${config.path.padEnd(35)}║
║     AppID: ${config.appID.padEnd(33)}║
║     Host: ${hostIP.padEnd(35)}║
╚══════════════════════════════════════════════╝
      `);
      console.log(`✅ 域名验证接口：     GET  http://${hostIP}:${config.port}${config.path}`);
      console.log(`✅ 消息接收接口：     POST http://${hostIP}:${config.port}${config.path}`);
      console.log(`✅ 用户列表：         GET  http://${hostIP}:${config.port}/api/users`);
      console.log(`✅ 关键字缓存：       GET  http://${hostIP}:${config.port}/api/keywords`);
      console.log(`✅ API 配置列表：     GET  http://${hostIP}:${config.port}/api/api-configs`);
      console.log(`✅ API 配置更新：     POST http://${hostIP}:${config.port}/api/api-configs/{name}`);
      console.log(`✅ 系统配置管理：     GET/POST http://${hostIP}:${config.port}/api/config`);

      if (!isConfigured()) {
        console.warn("⚠️  D1 未配置，请设置环境变量 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_DATABASE_ID / CLOUDFLARE_API_TOKEN");
      }
    });

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
