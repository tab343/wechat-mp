-- ============================================================
-- WeChat Official Account User Table
-- Execute this script in Cloudflare D1 Console or wrangler CLI before deployment
-- ============================================================

CREATE TABLE IF NOT EXISTS mp_users (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  wechat_openid    TEXT    NOT NULL UNIQUE,          -- WeChat User OpenID
  subscribe_time   TEXT,                             -- Last subscribe time (ISO 8601)
  unsubscribe_time TEXT,                             -- Last unsubscribe time
  scene_id         TEXT,                             -- Subscribe source (QR code scene value)
  is_subscribed    INTEGER DEFAULT 1,                -- Current status: 1=subscribed 0=unsubscribed
  created_at       TEXT    DEFAULT (datetime('now')),
  updated_at       TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mp_users_wechat_openid
  ON mp_users(wechat_openid);

CREATE INDEX IF NOT EXISTS idx_mp_users_is_subscribed
  ON mp_users(is_subscribed);
