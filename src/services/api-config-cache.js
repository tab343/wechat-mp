const apiInfoDb = require("./db/sys_api_info-db");
const { isConfigured } = require("./db/d1-client");

const configCache = {};
let lastLoadTime = null;

async function loadApiConfigs() {
  if (!isConfigured()) {
    console.log("D1 not configured, skipping API config load");
    return;
  }
  
  try {
    const configs = await apiInfoDb.listApiConfigs();
    configs.forEach(config => {
      configCache[config.name] = config;
    });
    lastLoadTime = new Date();
    console.log(`Loaded ${configs.length} API configs into cache`);
  } catch (error) {
    console.error("Failed to load API configs:", error);
  }
}

async function getApiConfig(name) {
  if (!configCache[name]) {
    await loadApiConfigs();
  }
  
  const config = configCache[name];
  if (!config) return null;
  
  if (config.expires_at) {
    const expires = new Date(config.expires_at);
    const now = new Date();
    if (expires < now) {
      console.warn(`API config ${name} has expired`);
    }
  }
  
  return config;
}

async function refreshApiConfig(name) {
  if (!isConfigured()) return;
  
  try {
    const config = await apiInfoDb.getApiConfig(name);
    if (config) {
      configCache[name] = config;
      console.log(`Refreshed API config: ${name}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to refresh API config:", error);
    return false;
  }
}

async function updateApiConfig(name, updates) {
  if (!isConfigured()) return false;
  
  try {
    const existing = await apiInfoDb.getApiConfig(name);
    if (!existing) return false;
    
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    await apiInfoDb.upsertApiConfig(updated);
    configCache[name] = updated;
    console.log(`Updated API config: ${name}`);
    return true;
  } catch (error) {
    console.error("Failed to update API config:", error);
    return false;
  }
}

function getCacheInfo() {
  return {
    configs: Object.keys(configCache),
    lastLoadTime,
    count: Object.keys(configCache).length
  };
}

module.exports = {
  loadApiConfigs,
  getApiConfig,
  refreshApiConfig,
  updateApiConfig,
  getCacheInfo
};