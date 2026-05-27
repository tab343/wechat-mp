const { query } = require("./d1-client");

async function findAll() {
  const result = await query("SELECT config_key, config_value FROM sys_config ORDER BY config_key");
  return result.results || [];
}

async function getValue(key) {
  const result = await query(
    "SELECT config_value FROM sys_config WHERE config_key = ?",
    [key]
  );
  return result.results?.[0]?.config_value || null;
}

async function setValue(key, value) {
  return query(
    `INSERT INTO sys_config (config_key, config_value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(config_key) DO UPDATE SET
       config_value = excluded.config_value,
       updated_at = datetime('now')`,
    [key, value]
  );
}

async function deleteKey(key) {
  return query("DELETE FROM sys_config WHERE config_key = ?", [key]);
}

module.exports = {
  findAll,
  getValue,
  setValue,
  deleteKey,
};
