import { query } from "./d1-client.js";

async function getApiConfig(name) {
  const result = await query(
    "SELECT * FROM sys_api_info WHERE name = ? AND is_enabled = 1",
    [name]
  );
  return result.results?.[0] || null;
}

async function upsertApiConfig(data) {
  const { 
    name, 
    base_url, 
    request_method, 
    param_location, 
    param_key, 
    param_value, 
    expires_at, 
    extra_headers, 
    extra_body 
  } = data;

  const result = await query(
    `INSERT INTO sys_api_info 
      (name, base_url, request_method, param_location, param_key, param_value, expires_at, extra_headers, extra_body, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(name) DO UPDATE SET 
        base_url = excluded.base_url,
        request_method = excluded.request_method,
        param_location = excluded.param_location,
        param_key = excluded.param_key,
        param_value = excluded.param_value,
        expires_at = excluded.expires_at,
        extra_headers = excluded.extra_headers,
        extra_body = excluded.extra_body,
        updated_at = CURRENT_TIMESTAMP`,
    [name, base_url, request_method, param_location, param_key, param_value, expires_at, extra_headers, extra_body]
  );
  return result;
}

async function listApiConfigs() {
  const result = await query("SELECT * FROM sys_api_info ORDER BY name");
  return result.results || [];
}

async function updateApiToken(name, token, expires_at) {
  const result = await query(
    "UPDATE sys_api_info SET param_value = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?",
    [token, expires_at, name]
  );
  return result;
}

async function isApiConfigExpired(name) {
  const result = await query(
    "SELECT expires_at FROM sys_api_info WHERE name = ? AND is_enabled = 1",
    [name]
  );
  const config = result.results?.[0];
  if (!config || !config.expires_at) return false;
  return new Date(config.expires_at) < new Date();
}

export {
  getApiConfig,
  upsertApiConfig,
  listApiConfigs,
  updateApiToken,
  isApiConfigExpired
};