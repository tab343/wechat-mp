const configDb = require("./db/sys_config-db");
const { isConfigured } = require("./db/d1-client");

let cache = {};
let loaded = false;

async function loadFromDatabase() {
  if (!isConfigured()) {
    console.warn("[sys-config] D1 未配置，跳过加载");
    return false;
  }
  try {
    const rows = await configDb.findAll();
    cache = {};
    for (const row of rows) {
      cache[row.config_key] = row.config_value;
    }
    loaded = true;
    console.log(`[sys-config] 已加载 ${rows.length} 项配置`);
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
