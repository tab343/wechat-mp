/**
 * API 路由模块
 */

import express from "express";
const router = express.Router();

import sysConfigCache from "../services/sys-config-cache.js";
import { isConfigured } from "../services/db/d1-client.js";
import * as keywordCache from "../services/keyword-cache.js";
import * as apiConfigCache from "../services/api-config-cache.js";
import configDb from "../services/db/sys_config-db.js";

router.get("/config", async (req, res) => {
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

router.post("/config", express.json(), async (req, res) => {
  try {
    const body = req.body;
    for (const [key, value] of Object.entries(body)) {
      await configDb.setValue(key, String(value));
    }
    await sysConfigCache.refresh();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/users", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  try {
    const { query } = await import("../services/db/d1-client.js");
    const result = await query("SELECT * FROM mp_users ORDER BY created_at DESC");
    res.json({ code: 200, data: result.results || [] });
  } catch (error) {
    res.status(500).json({ code: 500, msg: "Failed to get users", error: error.message });
  }
});

router.get("/keywords", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  try {
    const keywords = keywordCache.getAllKeywords();
    res.json({ code: 200, data: keywords });
  } catch (error) {
    res.status(500).json({ code: 500, msg: "Failed to get keywords", error: error.message });
  }
});

router.post("/refresh", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  const success = await keywordCache.refresh();
  res.json({ success, message: success ? "缓存刷新成功" : "缓存刷新失败" });
});

router.get("/api-configs", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  try {
    const info = apiConfigCache.getCacheInfo();
    res.json({ code: 200, data: info });
  } catch (error) {
    res.status(500).json({ code: 500, msg: "Failed to get API configs", error: error.message });
  }
});

router.post("/api-configs/:name", express.json(), async (req, res) => {
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

router.get("/api-configs/:name/status", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "D1 数据库未配置" });
  }
  try {
    const { name } = req.params;
    const configItem = await apiConfigCache.getApiConfig(name);
    if (!configItem) {
      return res.status(404).json({ error: `API config '${name}' not found` });
    }
    
    res.json({
      code: 200,
      data: {
        name,
        expires_at: configItem.expires_at,
        is_expired: false,
        time_remaining: configItem.expires_at ? Math.max(0, new Date(configItem.expires_at) - new Date()) : null
      }
    });
  } catch (error) {
    res.status(500).json({ code: 500, msg: "Failed to get API config status", error: error.message });
  }
});

export default router;