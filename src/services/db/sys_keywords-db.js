/**
 * 关键词数据库操作（sys_keywords 表）
 */

async function findByKeyword(keyword) {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "SELECT * FROM sys_keywords WHERE keyword = ? AND is_enabled = 1"
    ).bind(keyword).first();
    
    return result || null;
  } catch (error) {
    console.error(`[sys_keywords-db] 查询关键词失败：${error.message}`);
    return null;
  }
}

async function findMatchingKeywords(content) {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "SELECT * FROM sys_keywords WHERE is_enabled = 1 ORDER BY priority DESC"
    ).all();
    
    const keywords = result.results || [];
    
    return keywords.filter(k => content.includes(k.keyword));
  } catch (error) {
    console.error(`[sys_keywords-db] 查询匹配关键词失败：${error.message}`);
    return [];
  }
}

async function listAll() {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "SELECT * FROM sys_keywords ORDER BY priority DESC"
    ).all();
    
    return result.results || [];
  } catch (error) {
    console.error(`[sys_keywords-db] 查询关键词列表失败：${error.message}`);
    return [];
  }
}

async function insertKeyword(data) {
  const { keyword, action, response_text, priority, description } = data;

  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(`
      INSERT INTO sys_keywords 
        (keyword, action, response_text, priority, description, is_enabled, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
        ON CONFLICT(keyword) DO UPDATE SET
          action = excluded.action,
          response_text = excluded.response_text,
          priority = excluded.priority,
          description = excluded.description,
          updated_at = datetime('now')
    `).bind(keyword, action, response_text, priority, description).run();

    return { success: true, changes: result.meta?.changes };
  } catch (error) {
    console.error(`[sys_keywords-db] 插入关键词失败：${error.message}`);
    return { success: false, message: error.message };
  }
}

async function deleteKeyword(keyword) {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "DELETE FROM sys_keywords WHERE keyword = ?"
    ).bind(keyword).run();

    return { success: true, changes: result.meta?.changes };
  } catch (error) {
    console.error(`[sys_keywords-db] 删除关键词失败：${error.message}`);
    return { success: false, message: error.message };
  }
}

function isConfigured() {
  return !!globalThis.env?.WECHAT_MP_DB;
}

export default {
  findByKeyword,
  findMatchingKeywords,
  listAll,
  insertKeyword,
  deleteKeyword,
  isConfigured,
};