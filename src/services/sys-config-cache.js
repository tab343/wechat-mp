import configDb from "./db/sys_config-db.js";

/**
 * 系统配置缓存
 * 仅在应用启动时加载一次，全局只读
 */
let configCache = {};

/**
 * 启动时加载配置（本地 + Cloudflare 通用）
 * 只执行一次！
 */
async function loadOnStartup() {
  try {
    let rows = [];

    // 统一从 sys_config-db 模块获取配置（内部已兼容 D1/本地环境）
    rows = await configDb.findAll();

    // 加载到内存
    configCache = {};
    for (const item of rows) {
      configCache[item.config_key] = item.config_value;
    }

    // 【唯一一次打印】
    console.log("\n==================================");
    console.log("  系统配置加载完成（仅启动时打印）");
    console.log("==================================");
    for (const key in configCache) {
      console.log(`✅ ${key} = ${configCache[key]}`);
    }
    console.log("==================================\n");

    return true;
  } catch (err) {
    console.error("❌ 启动加载配置失败:", err.message);
    return false;
  }
}

// 全局只读获取
function get(key) {
  return configCache[key] ?? "";
}

function getAll() {
  return { ...configCache };
}

export default {
  loadOnStartup,
  get,
  getAll,
};