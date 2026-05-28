/**
 * Cloudflare Worker 入口
 * 使用公共核心模块处理微信消息
 */

const { ensureInit, processMessage, buildReplyXml, verifySignature, sysConfigCache, config } = require("./core/message-handler");
const { parseWechatXml, decryptMsg } = require("./core/xml-utils");

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === "GET" && (path === "/" || path === "/wechat")) {
        return handleVerify(request);
      }

      if (request.method === "POST" && (path === "/" || path === "/wechat")) {
        return handleMessage(request);
      }

      if (request.method === "GET" && path === "/api/config") {
        return handleConfigList();
      }

      if (request.method === "POST" && path === "/api/config") {
        return handleConfigSave(request);
      }

      return new Response("WeChat MP Service", { status: 200 });
    } catch (err) {
      console.error("[worker] 异常:", err.message);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

async function handleVerify(request) {
  const url = new URL(request.url);
  const { echostr, signature, timestamp, nonce } = Object.fromEntries(url.searchParams);

  if (!signature || !timestamp || !nonce) {
    return new Response(echostr || "", { status: 200 });
  }

  const isValid = await verifySignature(signature, timestamp, nonce, config.token, "web");
  return isValid ? new Response(echostr, { status: 200 }) : new Response("Invalid signature", { status: 401 });
}

async function handleMessage(request) {
  try {
    const xml = await request.text();
    const msg = await processMessage(xml, parseWechatXml, decryptMsg);
    const replyXml = buildReplyXml(parseWechatXml(xml), msg);
    return new Response(replyXml, { headers: { "Content-Type": "text/xml" }, status: 200 });
  } catch (err) {
    console.error("[worker] 消息处理失败:", err.message);
    return new Response("success", { status: 200 });
  }
}

async function handleConfigList() {
  const all = sysConfigCache.getAll();
  const safeConfig = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.includes("TOKEN") || k.includes("SECRET") || k.includes("KEY")) {
      safeConfig[k] = v ? "***" + v.slice(-4) : "";
    } else {
      safeConfig[k] = v;
    }
  }
  return new Response(JSON.stringify(safeConfig), { headers: { "Content-Type": "application/json" } });
}

async function handleConfigSave(request) {
  try {
    const body = await request.json();
    const configDb = require("./services/db/sys_config-db");
    for (const [key, value] of Object.entries(body)) {
      await configDb.setValue(key, String(value));
    }
    await sysConfigCache.refresh();
    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
