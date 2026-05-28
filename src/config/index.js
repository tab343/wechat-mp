/**
 * 微信公众号配置
 *
 * 优先从 sys-config-cache（数据库）读取，
 * 未加载时回退到 process.env 环境变量。
 */

import sysConfigCache from "../services/sys-config-cache.js";

function getConfig(key, envKey) {
  const dbVal = sysConfigCache.get(key);
  if (dbVal) return dbVal;
  return process.env[envKey] || "";
}

export default {
  get token() {
    return getConfig("WECHAT_TOKEN", "WECHAT_TOKEN");
  },

  get appID() {
    return getConfig("WECHAT_APPID", "WECHAT_APPID");
  },

  get appSecret() {
    return getConfig("WECHAT_APPSECRET", "WECHAT_APPSECRET");
  },

  get encodingAESKey() {
    return getConfig("WECHAT_ENCODING_AES_KEY", "WECHAT_ENCODING_AES_KEY");
  },

  path: "/",

  get cloudflare() {
    const accountId = getConfig("CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID");
    const databaseId = getConfig("CLOUDFLARE_D1_DATABASE_ID", "CLOUDFLARE_D1_DATABASE_ID");
    const apiToken = getConfig("CLOUDFLARE_ACCOUNT_API_TOKEN", "CLOUDFLARE_ACCOUNT_API_TOKEN");

    return {
      accountId,
      databaseId,
      apiToken,
      get apiBase() {
        return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
      },
    };
  },
};