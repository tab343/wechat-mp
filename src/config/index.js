/**
 * 微信公众号配置
 * 生产环境建议使用环境变量，不要硬编码敏感信息
 */

// 开发环境：从 .env 文件加载
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
    console.log('[config] 已从 .env 文件加载环境变量');
  } catch (error) {
    console.log('[config] 未找到 .env 文件，使用系统环境变量');
  }
}

// 检查环境变量是否存在
const requiredVars = [
  'WECHAT_TOKEN',
  'WECHAT_APPID', 
  'WECHAT_APPSECRET',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_D1_DATABASE_ID',
  'CLOUDFLARE_API_TOKEN'
];

const missingVars = requiredVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
  console.warn(`[config] 警告：缺少以下环境变量：${missingVars.join(', ')}`);
}

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

// 打印配置状态（用于调试）
console.log('[config] 配置加载完成：');
console.log('[config]   WECHAT_APPID:', process.env.WECHAT_APPID ? '***' : '未设置');
console.log('[config]   WECHAT_APPSECRET:', process.env.WECHAT_APPSECRET ? '***' : '未设置');
console.log('[config]   CLOUDFLARE_ACCOUNT_ID:', process.env.CLOUDFLARE_ACCOUNT_ID ? '***' : '未设置');
console.log('[config]   CLOUDFLARE_D1_DATABASE_ID:', process.env.CLOUDFLARE_D1_DATABASE_ID ? '***' : '未设置');
console.log('[config]   CLOUDFLARE_API_TOKEN:', process.env.CLOUDFLARE_API_TOKEN ? '***' : '未设置');