/**
 * API 配置数据库操作（sys_api_info 表）
 */

async function getApiConfig(name) {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "SELECT * FROM sys_api_info WHERE name = ? AND is_enabled = 1"
    ).bind(name).first();
    
    return result || null;
  } catch (error) {
    console.error(`[sys_api_info-db] 查询 API 配置失败：${error.message}`);
    return null;
  }
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

  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(`
      INSERT INTO sys_api_info 
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
          updated_at = CURRENT_TIMESTAMP
    `).bind(name, base_url, request_method, param_location, param_key, param_value, expires_at, extra_headers, extra_body).run();

    return { success: true, changes: result.meta?.changes };
  } catch (error) {
    console.error(`[sys_api_info-db] 插入 API 配置失败：${error.message}`);
    return { success: false, message: error.message };
  }
}

async function listApiConfigs() {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare("SELECT * FROM sys_api_info ORDER BY name").all();
    
    return result.results || [];
  } catch (error) {
    console.error(`[sys_api_info-db] 查询 API 配置列表失败：${error.message}`);
    return [];
  }
}

async function updateApiToken(name, token, expires_at) {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "UPDATE sys_api_info SET param_value = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?"
    ).bind(token, expires_at, name).run();

    return { success: true, changes: result.meta?.changes };
  } catch (error) {
    console.error(`[sys_api_info-db] 更新 API Token 失败：${error.message}`);
    return { success: false, message: error.message };
  }
}

async function isApiConfigExpired(name) {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "SELECT expires_at FROM sys_api_info WHERE name = ? AND is_enabled = 1"
    ).bind(name).first();
    
    if (!result || !result.expires_at) return false;
    return new Date(result.expires_at) < new Date();
  } catch (error) {
    console.error(`[sys_api_info-db] 检查 API 配置过期失败：${error.message}`);
    return false;
  }
}

function isConfigured() {
  return !!globalThis.env?.WECHAT_MP_DB;
}

export {
  getApiConfig,
  upsertApiConfig,
  listApiConfigs,
  updateApiToken,
  isApiConfigExpired,
  isConfigured,
};