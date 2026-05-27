const axios = require("axios");
const config = require("../../config");

/**
 * Cloudflare D1 底层客户端
 *
 * 通过 Cloudflare REST API 操作 D1（SQLite 兼容）。
 * 只暴露 query / batch 两个底层方法，不包含业务逻辑。
 *
 * 前置条件：在 Cloudflare 控制台创建 D1 数据库和 API Token。
 *   - Account ID：https://dash.cloudflare.com 总览页右下角
 *   - Database ID：Workers & Pages → D1
 *   - API Token：https://dash.cloudflare.com/profile/api-tokens
 *     权限选 Account → D1 → Edit
 */

const { accountId, databaseId, apiToken, apiBase } = config.cloudflare;


const isConfigured = () => !!(accountId && databaseId && apiToken);

/**
 * 执行一条 SQL（参数化查询，防注入）
 * @param {string} sql    - SQL 语句，使用 ? 占位符
 * @param {Array}  params - 参数数组
 * @returns {Promise<{success: boolean, results: Array, meta: object, error?: string}>}
 */
async function query(sql, params = []) {
  if (!isConfigured()) {
    return { success: false, results: [], error: "D1 not configured" };
  }

  try {
    const res = await axios.post(apiBase, { sql, params }, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    const body = res.data;
    if (!body.success || (body.errors && body.errors.length > 0)) {
      console.error("[d1-client] 请求失败:", body.errors);
      return { success: false, results: [], errors: body.errors };
    }

    const first = body.result?.[0];
    if (!first) return { success: true, results: [], meta: {} };
    if (!first.success) {
      console.error("[d1-client] SQL 执行失败:", first.error);
      return { success: false, results: [], error: first.error };
    }

    return {
      success: true,
      results: first.results || [],
      meta: first.meta || {},
    };
  } catch (err) {
    console.error("[d1-client] 异常:", err.message);
    return { success: false, results: [], error: err.message };
  }
}

/**
 * 批量执行多条 SQL（同一事务，全部成功或全部回滚）
 * @param {Array<{sql: string, params?: Array}>} statements
 * @returns {Promise<Array>}
 */
async function batch(statements) {
  if (!isConfigured()) {
    return [];
  }

  try {
    const res = await axios.post(apiBase, statements, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    const body = res.data;
    if (!body.success) {
      console.error("[d1-client] 批量失败:", body.errors);
      return [];
    }

    return (body.result || []).map((r) => ({
      success: r.success,
      results: r.results || [],
      meta: r.meta || {},
      error: r.error || null,
    }));
  } catch (err) {
    console.error("[d1-client] 批量异常:", err.message);
    return [];
  }
}

module.exports = { isConfigured, query, batch };
