-- ============================================================
-- Table: sys_api_info
-- Description: API configuration information table
-- ============================================================
CREATE TABLE IF NOT EXISTS sys_api_info (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,    -- API unique identifier
  base_url        TEXT    NOT NULL,    -- Base URL
  request_method  TEXT    NOT NULL,    -- HTTP method: GET/POST/PUT/DELETE
  param_location  TEXT    NOT NULL,    -- Parameter location: header/query/body/path
  param_key       TEXT    NOT NULL,    -- Parameter key name
  param_value     TEXT    NOT NULL,    -- Parameter value
  expires_at      TEXT,                -- Expiration time (ISO 8601)
  extra_headers   TEXT,                -- Extra headers in JSON format
  extra_body      TEXT,                -- Extra body in JSON format
  is_enabled      INTEGER DEFAULT 1,   -- Enabled flag: 0-disabled, 1-enabled
  created_at      TEXT,
  updated_at      TEXT,
  UNIQUE(name)
);

-- Index for name lookup
CREATE INDEX IF NOT EXISTS idx_sys_api_info_name ON sys_api_info(name);

-- Initialize Ludao API configuration
INSERT OR IGNORE INTO sys_api_info (
  name, 
  base_url, 
  request_method, 
  param_location, 
  param_key, 
  param_value, 
  expires_at, 
  extra_headers, 
  extra_body,
  created_at,
  updated_at
) VALUES (
  'ludao_api',
  'https://app.swjld.com/app/v1/user/code',
  'POST',
  'header',
  'Authorization',
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6MCwiZXhwIjoxNzc5OTU1OTk2LCJpYXQiOjE3NzkzNTExOTYsImx1ZGFvaWQiOiI5NTNiZThiYjM4Y2M0YTdmYjNkOTI3YzdmMTRhMzY0NiIsInVpZCI6MjA0OTI4OH0.ShtWoF1dEEr4k7RGk4tUnC_zQojxZ4wPnOixT0x8J28',
  '2026-06-03T10:16:36Z',
  '{"Content-Type":"application/json"}',
  '{"type":"member"}',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);