-- ============================================================
-- WeChat Official Account Keywords Table
-- Execute this script in Cloudflare D1 Console or wrangler CLI before deployment
-- ============================================================

CREATE TABLE IF NOT EXISTS sys_keywords (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword     TEXT    NOT NULL,                       -- Keyword (unique)
  action      TEXT    NOT NULL,                       -- Action identifier
  description TEXT,                                   -- Action description
  is_system   INTEGER DEFAULT 0,                       -- System keyword: 1=system 0=normal
  is_enabled  INTEGER DEFAULT 1,                       -- Enabled status: 1=enabled 0=disabled
  created_at  TEXT    DEFAULT (datetime('now')),
  updated_at  TEXT    DEFAULT (datetime('now')),
  UNIQUE(keyword)
);

CREATE INDEX IF NOT EXISTS idx_sys_keywords_action
  ON sys_keywords(action);

CREATE INDEX IF NOT EXISTS idx_sys_keywords_is_enabled
  ON sys_keywords(is_enabled);

-- ============================================================
-- Initialize System Keywords
-- ============================================================

INSERT OR IGNORE INTO sys_keywords (keyword, action, description, is_system)
VALUES 
  ('refresh', 'sys:refresh', 'Refresh keyword cache', 1),
  ('刷新', 'sys:refresh', 'Refresh keyword cache', 1),
  ('reload', 'sys:refresh', 'Refresh keyword cache', 1),
  ('status', 'sys:status', 'View cache status', 1),
  ('状态', 'sys:status', 'View cache status', 1);

-- ============================================================
-- Initialize Normal Keywords Examples
-- ============================================================

INSERT OR IGNORE INTO sys_keywords (keyword, action, description, is_system)
VALUES 
  ('help', 'help', 'Show help information', 0),
  ('hello', 'greeting', 'Say hello', 0),
  ('你好', 'greeting', 'Say hello', 0),
  ('menu', 'menu', 'Show menu', 0),
  ('菜单', 'menu', 'Show menu', 0),
  ('鹿岛', 'ludao', 'Get Ludao member code', 0),
  ('ludao', 'ludao', 'Get Ludao member code', 0),
  ('会员码', 'ludao', 'Get Ludao member code', 0);
