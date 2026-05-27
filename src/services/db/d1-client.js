const config = require("../../config");

/**
 * Cloudflare D1 底层客户端
 */

function getCredentials() {
  const cf = config.cloudflare;
  return {
    accountId: cf.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || "",
    databaseId: cf.databaseId || process.env.CLOUDFLARE_D1_DATABASE_ID || "",
    apiToken: cf.apiToken || process.env.CLOUDFLARE_API_TOKEN || "",
    get apiBase() {
      return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
    },
  };
}

function isConfigured() {
  const c = getCredentials();
  return !!(c.accountId && c.databaseId && c.apiToken);
}

async function query(sql, params = []) {
  const c = getCredentials();

  if (!c.accountId || !c.databaseId || !c.apiToken) {
    console.error("[d1-client] D1 未配置: accountId=" + !!c.accountId + " databaseId=" + !!c.databaseId + " apiToken=" + !!c.apiToken);
    return { success: false, results: [], error: "D1 not configured" };
  }

  try {
    const res = await fetch(c.apiBase, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    });

    const body = await res.json();
    console.log("[d1-client] D1 原始响应:", JSON.stringify(body).substring(0, 500));

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

    const results = first.results || [];
    console.log("[d1-client] 查询返回 " + results.length + " 条数据");

    return {
      success: true,
      results,
      meta: first.meta || {},
    };
  } catch (err) {
    console.error("[d1-client] 异常:", err.message);
    return { success: false, results: [], error: err.message };
  }
}

async function batch(statements) {
  const c = getCredentials();

  if (!c.accountId || !c.databaseId || !c.apiToken) {
    return [];
  }

  try {
    const res = await fetch(c.apiBase, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.apiToken}`,
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
