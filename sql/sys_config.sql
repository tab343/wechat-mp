-- ============================================================
-- Table: sys_config
-- Description: 系统配置表，存储所有环境变量级别配置
--              项目启动从 DB 读取，不再依赖 Cloudflare 环境变量
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_config (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key  TEXT    NOT NULL UNIQUE,  -- 配置键名
  config_value TEXT   NOT NULL,          -- 配置值
  description TEXT,                      -- 配置说明
  created_at  TEXT    DEFAULT (datetime('now')),
  updated_at  TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sys_config_key ON sys_config(config_key);

-- 初始化系统配置（INSERT OR IGNORE 不会覆盖已有数据）
-- 首次使用请在 D1 控制台或通过 API 更新为真实值
INSERT OR IGNORE INTO sys_config (config_key, config_value, description) VALUES
  ('WECHAT_TOKEN',       '请替换为你的Token',     '微信 Token'),
  ('WECHAT_APPID',       '请替换为你的AppID',     '公众号 AppID'),
  ('WECHAT_APPSECRET',   '请替换为你的AppSecret', '公众号 AppSecret'),
  ('WECHAT_ENCODING_AES_KEY', '请替换为你的AESKey', '消息加解密密钥'),
  ('CLOUDFLARE_ACCOUNT_ID',    '请替换为你的AccountId', 'Cloudflare Account ID'),
  ('CLOUDFLARE_D1_DATABASE_ID', '请替换为你的DatabaseId', 'D1 Database ID'),
  ('CLOUDFLARE_ACCOUNT_API_TOKEN',     '请替换为你的ApiToken', 'Cloudflare API Token');
