const config = require("../../config");

/**
 * Cloudflare D1 底层客户端
 *
 * 通过 Cloudflare REST API 操作 D1（SQLite 兼容）。
 * 配置优先从 sys-config-cache（DB）读取，回退 process.env。
 */

function getCredentials() {
  return config.cloudflare;
}

function isConfigured() {
  const c = getCredentials();
  return !!(c.accountId && c.databaseId && c.apiToken);
}

async function query(sql, params = []) {
  if (!isConfigured()) {
    return { success: false, results: [], error: "D1 not configured" };
  }

  const { apiBase, apiToken } = getCredentials();

  try {
    const res = await fetch(apiBase, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    });

    const body = await res.json();
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

async function batch(statements) {
  if (!isConfigured()) {
    return [];
  }

  const { apiBase, apiToken } = getCredentials();

  try {
    const res = await fetch(apiBase, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(statements),
    });

    const body = await res.json();
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
