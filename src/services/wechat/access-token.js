const config = require('../../config');

let accessToken = null;
let expiresAt = 0;
let fetching = false;

/**
 * 获取 Access Token
 * @returns {Promise<string>} access_token
 */
async function getAccessToken() {
  // 检查是否已有有效 token
  if (accessToken && Date.now() < expiresAt) {
    return accessToken;
  }

  // 如果正在获取中，等待结果
  if (fetching) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (!fetching && accessToken) {
          clearInterval(check);
          resolve(accessToken);
        }
      }, 100);
    });
  }

  fetching = true;

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credential',
      appid: config.appID,
      secret: config.appSecret
    });
    const url = `https://api.weixin.qq.com/cgi-bin/token?${params.toString()}`;

    const res = await fetch(url);
    const data = await res.json();
    
    if (data.errcode) {
      throw new Error(`获取 access_token 失败: ${data.errmsg}`);
    }

    accessToken = data.access_token;
    // 设置过期时间（提前10分钟刷新，避免网络延迟）
    expiresAt = Date.now() + (data.expires_in - 600) * 1000;
    
    console.log(`[access-token] 获取成功，有效期至: ${new Date(expiresAt).toLocaleString()}`);
    
    return accessToken;
  } catch (error) {
    console.error('[access-token] 获取失败:', error.message);
    throw error;
  } finally {
    fetching = false;
  }
}

/**
 * 强制刷新 Access Token
 */
async function refreshAccessToken() {
  accessToken = null;
  expiresAt = 0;
  return getAccessToken();
}

module.exports = {
  getAccessToken,
  refreshAccessToken
};