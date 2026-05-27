const configDb = require("./db/sys_config-db");

let cache = {};
let loaded = false;

async function loadFromDatabase() {
  try {
    const rows = await configDb.findAll();
    console.log("[sys-config] findAll 返回:", JSON.stringify(rows));
    if (!rows || rows.length === 0) {
      console.warn("[sys-config] 数据库中无配置数据");
      return false;
    }
    cache = {};
    for (const row of rows) {
      cache[row.config_key] = row.config_value;
    }
    loaded = true;
    console.log(`[sys-config] 已加载 ${rows.length} 项配置, 缓存 keys:`, Object.keys(cache));
    return true;
  } catch (err) {
    console.error("[sys-config] 加载失败:", err.message);
    return false;
  }
}

function get(key) {
  return cache[key] || null;
}

function getAll() {
  return { ...cache };
}

function isLoaded() {
  return loaded;
}

async function refresh() {
  return loadFromDatabase();
}

module.exports = {
  loadFromDatabase,
  get,
  getAll,
  isLoaded,
  refresh,
};
