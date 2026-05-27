const { query } = require("./d1-client");

/**
 * 用户数据库操作（mp_users 表）
 *
 * All methods return business-friendly results, not exposing underlying D1 implementation details.
 */

// ── Insert / Update ────────────────────────────────────────

/**
 * Called when user subscribes: insert or update user record
 * Users who have subscribed before (including those who unsubscribed) will have their status updated using ON CONFLICT
 */
async function upsertBySubscribe(wechatOpenid, sceneId = null) {
  console.log(`[mp_users-db] Record subscribe: ${wechatOpenid}`);

  return query(
    `INSERT INTO mp_users (wechat_openid, subscribe_time, scene_id, is_subscribed)
     VALUES (?, datetime('now'), ?, 1)
     ON CONFLICT(wechat_openid) DO UPDATE SET
       subscribe_time = datetime('now'),
       scene_id = COALESCE(?, scene_id),
       is_subscribed = 1,
       unsubscribe_time = NULL,
       updated_at = datetime('now')`,
    [wechatOpenid, sceneId, sceneId]
  );
}

/**
 * Called when user unsubscribes: mark as unsubscribed
 */
async function markUnsubscribed(wechatOpenid) {
  console.log(`[mp_users-db] Mark unsubscribed: ${wechatOpenid}`);

  return query(
    `UPDATE mp_users
     SET is_subscribed = 0,
         unsubscribe_time = datetime('now'),
         updated_at = datetime('now')
     WHERE wechat_openid = ?`,
    [wechatOpenid]
  );
}

// ── Query ──────────────────────────────────────────────────

/**
 * Find single user record by WeChat OpenID
 */
async function findByOpenid(wechatOpenid) {
  const result = await query(
    "SELECT * FROM mp_users WHERE wechat_openid = ?",
    [wechatOpenid]
  );
  return result.results?.[0] || null;
}

/**
 * Paginated query for currently subscribed users
 */
async function listActive(limit = 100, offset = 0) {
  const result = await query(
    "SELECT * FROM mp_users WHERE is_subscribed = 1 ORDER BY subscribe_time DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
  return result.results || [];
}

/**
 * Count currently subscribed users
 */
async function countActive() {
  const result = await query(
    "SELECT COUNT(*) AS total FROM mp_users WHERE is_subscribed = 1"
  );
  return result.results?.[0]?.total || 0;
}

module.exports = {
  upsertBySubscribe,
  markUnsubscribed,
  findByOpenid,
  listActive,
  countActive,
};
