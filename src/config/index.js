/**
 * 微信公众号配置
 * 生产环境建议使用环境变量，不要硬编码敏感信息
 */
require('dotenv').config();

module.exports = {
  // 微信后台填写的 Token（用于签名验证）
  token: process.env.WECHAT_TOKEN || "",

  // 公众号 AppID
  appID: process.env.WECHAT_APPID || "",

  // 公众号 AppSecret（用于获取 access_token 等接口调用）
  appSecret: process.env.WECHAT_APPSECRET || "",

  // 服务端口
  port: process.env.PORT || 3000,

  // 微信消息路由路径
  path: "/wechat",

  // ── Cloudflare D1 数据库配置 ──────────────────────────
  // 通过 Cloudflare REST API 操作 D1（无需 Workers）
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID || "",
    apiToken: process.env.CLOUDFLARE_API_TOKEN || "",
    // D1 REST API 基础 URL
    get apiBase() {
      return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
    },
  },
};