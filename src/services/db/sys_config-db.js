/**
 * 系统配置数据库操作（sys_config 表）
 */

async function findAll() {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "SELECT config_key, config_value FROM sys_config ORDER BY config_key"
    ).all();
    
    return result.results || [];
  } catch (error) {
    console.error(`[sys_config-db] 查询配置失败：${error.message}`);
    return [];
  }
}

async function getValue(key) {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "SELECT config_value FROM sys_config WHERE config_key = ?"
    ).bind(key).first();
    
    return result?.config_value || null;
  } catch (error) {
    console.error(`[sys_config-db] 查询配置失败：${error.message}`);
    return null;
  }
}

async function setValue(key, value) {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(`
      INSERT INTO sys_config (config_key, config_value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(config_key) DO UPDATE SET
        config_value = excluded.config_value,
        updated_at = datetime('now')
    `).bind(key, value).run();

    return { success: true, changes: result.meta?.changes };
  } catch (error) {
    console.error(`[sys_config-db] 设置配置失败：${error.message}`);
    return { success: false, message: error.message };
  }
}

async function deleteKey(key) {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "DELETE FROM sys_config WHERE config_key = ?"
    ).bind(key).run();

    return { success: true, changes: result.meta?.changes };
  } catch (error) {
    console.error(`[sys_config-db] 删除配置失败：${error.message}`);
    return { success: false, message: error.message };
  }
}

function isConfigured() {
  return !!globalThis.env?.WECHAT_MP_DB;
}

export default {
  findAll,
  getValue,
  setValue,
  deleteKey,
  isConfigured,
};