const { query } = require("./d1-client");

/**
 * Keywords database operations (sys_keywords table)
 */

async function findByKeyword(keyword) {
  const result = await query(
    "SELECT * FROM sys_keywords WHERE keyword = ? AND is_enabled = 1",
    [keyword]
  );
  return result.results?.[0] || null;
}

async function findByAction(action) {
  const result = await query(
    "SELECT * FROM sys_keywords WHERE action = ? AND is_enabled = 1",
    [action]
  );
  return result.results || [];
}

async function findAllEnabled() {
  const result = await query(
    "SELECT * FROM sys_keywords WHERE is_enabled = 1 ORDER BY is_system DESC, id ASC"
  );
  return result.results || [];
}

async function findAllSystemKeywords() {
  const result = await query(
    "SELECT * FROM sys_keywords WHERE is_system = 1 AND is_enabled = 1"
  );
  return result.results || [];
}

async function upsert(keyword, action, description = null, isSystem = false) {
  return query(
    `INSERT INTO sys_keywords (keyword, action, description, is_system, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(keyword) DO UPDATE SET
       action = excluded.action,
       description = COALESCE(excluded.description, sys_keywords.description),
       updated_at = datetime('now')`,
    [keyword, action, description, isSystem ? 1 : 0]
  );
}

async function remove(keyword) {
  return query(
    "DELETE FROM sys_keywords WHERE keyword = ?",
    [keyword]
  );
}

async function disable(keyword) {
  return query(
    "UPDATE sys_keywords SET is_enabled = 0, updated_at = datetime('now') WHERE keyword = ?",
    [keyword]
  );
}

async function enable(keyword) {
  return query(
    "UPDATE sys_keywords SET is_enabled = 1, updated_at = datetime('now') WHERE keyword = ?",
    [keyword]
  );
}

module.exports = {
  findByKeyword,
  findByAction,
  findAllEnabled,
  findAllSystemKeywords,
  upsert,
  remove,
  disable,
  enable,
};
