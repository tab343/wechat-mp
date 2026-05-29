/**
 * 用户数据库操作（mp_users 表）
 */

async function upsertBySubscribe(wechatOpenid, sceneId = null) {
  console.log(`[mp_users-db] 用户关注落库：openid=${wechatOpenid}, sceneId=${sceneId}`);

  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(`
      INSERT INTO mp_users (wechat_openid, subscribe_time, scene_id, is_subscribed)
      VALUES (?, datetime('now'), ?, 1)
      ON CONFLICT(wechat_openid) DO UPDATE SET
        subscribe_time = datetime('now'),
        scene_id = COALESCE(?, scene_id),
        is_subscribed = 1,
        unsubscribe_time = NULL,
        updated_at = datetime('now')
    `).bind(wechatOpenid, sceneId, sceneId).run();

    console.log(`[mp_users-db] 用户落库成功：${wechatOpenid}`);
    return { success: true, message: "用户落库成功", changes: result.meta?.changes };
  } catch (error) {
    console.error(`[mp_users-db] 用户落库失败：${error.message}`);
    return { success: false, message: error.message };
  }
}

async function markUnsubscribed(wechatOpenid) {
  console.log(`[mp_users-db] 用户取消关注：${wechatOpenid}`);

  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(`
      UPDATE mp_users
      SET is_subscribed = 0,
          unsubscribe_time = datetime('now'),
          updated_at = datetime('now')
      WHERE wechat_openid = ?
    `).bind(wechatOpenid).run();

    console.log(`[mp_users-db] 标记取消关注成功：${wechatOpenid}`);
    return { success: true, message: "标记成功", changes: result.meta?.changes };
  } catch (error) {
    console.error(`[mp_users-db] 标记取消关注失败：${error.message}`);
    return { success: false, message: error.message };
  }
}

async function findByOpenid(wechatOpenid) {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "SELECT * FROM mp_users WHERE wechat_openid = ?"
    ).bind(wechatOpenid).first();
    
    return result || null;
  } catch (error) {
    console.error(`[mp_users-db] 查询用户失败：${error.message}`);
    return null;
  }
}

async function listActive(limit = 100, offset = 0) {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(`
      SELECT * FROM mp_users 
      WHERE is_subscribed = 1 
      ORDER BY subscribe_time DESC 
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    return result.results || [];
  } catch (error) {
    console.error(`[mp_users-db] 查询用户列表失败：${error.message}`);
    return [];
  }
}

async function countActive() {
  try {
    const result = await globalThis.env?.WECHAT_MP_DB?.prepare(
      "SELECT COUNT(*) AS total FROM mp_users WHERE is_subscribed = 1"
    ).first();
    
    return result?.total || 0;
  } catch (error) {
    console.error(`[mp_users-db] 统计用户失败：${error.message}`);
    return 0;
  }
}

async function getStats() {
  try {
    const [totalResult, activeResult] = await Promise.all([
      globalThis.env?.WECHAT_MP_DB?.prepare("SELECT COUNT(*) AS total FROM mp_users").first(),
      globalThis.env?.WECHAT_MP_DB?.prepare("SELECT COUNT(*) AS active FROM mp_users WHERE is_subscribed = 1").first()
    ]);

    const total = totalResult?.total || 0;
    const active = activeResult?.active || 0;

    return {
      total,
      active,
      inactive: total - active
    };
  } catch (error) {
    console.error("[mp_users-db] 获取统计失败:", error.message);
    return { total: 0, active: 0, inactive: 0 };
  }
}

function isConfigured() {
  return !!globalThis.env?.WECHAT_MP_DB;
}

export const userDb = {
  upsertBySubscribe,
  markUnsubscribed,
  findByOpenid,
  listActive,
  countActive,
  getStats,
  isConfigured,
};