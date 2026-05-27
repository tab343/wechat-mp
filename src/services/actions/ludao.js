const { getApiConfig, refreshApiConfig } = require("../api-config-cache");
const { uploadImage } = require("../wechat/media-upload");

// 临时素材缓存：MediaId -> 过期时间戳
const mediaCache = new Map();
// 缓存有效期：1 分钟（60000 毫秒）
const CACHE_TTL = 60 * 1000;

/**
 * 生成条形码图片
 * @param {string} code - 会员码
 * @returns {Buffer} PNG 图片 Buffer
 */
async function generateBarcode(code) {
  const bwipjs = require("bwip-js");
  return bwipjs.toBuffer({
    bcid: 'code128',
    text: code,
    scale: 2,
    height: 30,
    includetext: true,
    textxalign: 'center',
    textsize: 12
  });
}

/**
 * 从鹿岛 API 获取会员码
 * @returns {Promise<string|null>} 会员码或 null
 */
async function fetchMemberCode() {
  const config = await getApiConfig("ludao_api");
  if (!config) {
    throw new Error("API 配置不存在");
  }

  console.log("[ludao] API 配置:", JSON.stringify(config, null, 2));

  const { base_url, request_method, param_location, param_key, param_value, extra_headers, extra_body } = config;

  if (!request_method) {
    throw new Error(`API 配置缺少 request_method 字段。配置内容：${JSON.stringify(config)}`);
  }

  const headers = {};
  if (extra_headers) {
    try {
      Object.assign(headers, JSON.parse(extra_headers));
    } catch (e) {
      console.error("[ludao] 解析 extra_headers 失败:", e);
    }
  }

  if (param_location === "header") {
    headers[param_key] = param_value;
  }

  let body = {};
  if (extra_body) {
    try {
      body = JSON.parse(extra_body);
    } catch (e) {
      console.error("[ludao] 解析 extra_body 失败:", e);
    }
  }

  if (param_location === "body") {
    body[param_key] = param_value;
  }

  const fetchOptions = {
    method: request_method.toUpperCase(),
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (request_method.toUpperCase() !== 'GET' && request_method.toUpperCase() !== 'HEAD') {
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(base_url, fetchOptions);
  const respData = await res.json();

  console.log("[ludao] API 响应状态码:", res.status);
  console.log("[ludao] API 响应数据:", JSON.stringify(respData, null, 2));

  if (respData && respData.code === 200 && respData.data?.code) {
    console.log("[ludao] 成功获取会员码:", respData.data.code);
    return respData.data.code;
  }
  
  console.error("[ludao] API 响应不符合预期");
  throw new Error(respData?.msg || "获取会员码失败");
}

/**
 * 获取有效的 MediaId（带缓存）
 * 优先返回缓存中未过期的 MediaId，否则重新生成
 * @returns {Promise<{mediaId: string, memberCode: string}>}
 */
async function getValidMediaId() {
  const now = Date.now();
  
  // 检查缓存中是否有有效的 MediaId
  for (const [mediaId, expiresAt] of mediaCache.entries()) {
    if (now < expiresAt) {
      console.log(`[ludao] 使用缓存的 MediaId: ${mediaId}, 剩余有效期：${Math.ceil((expiresAt - now) / 1000)}秒`);
      // 需要从缓存中反查 memberCode，这里简化处理，重新获取
      // 实际场景中可以将 memberCode 也存入缓存
      return { mediaId, fromCache: true };
    } else {
      // 清理过期缓存
      mediaCache.delete(mediaId);
    }
  }
  
  // 缓存中没有有效 MediaId，重新获取
  console.log("[ludao] 缓存中没有有效 MediaId，重新获取会员码并生成条形码...");
  
  const memberCode = await fetchMemberCode();
  const barcodeBuffer = await generateBarcode(memberCode);
  const mediaId = await uploadImage(barcodeBuffer, { filename: 'barcode.png' });
  
  // 存入缓存，设置 1 分钟过期时间
  mediaCache.set(mediaId, now + CACHE_TTL);
  console.log(`[ludao] MediaId 已缓存，有效期至：${new Date(now + CACHE_TTL).toLocaleString()}`);
  
  return { mediaId, memberCode, fromCache: false };
}

/**
 * Ludao member code acquisition function
 * @param {Object} msg - Message object
 * @param {string} msg.FromUserName - User OpenID
 * @param {string} msg.MsgType - Message type
 * @param {string} msg.Content - Message content
 * @example
 * {
 *   FromUserName: 'o1234567890abcdef1234567890abcdef',
 *   MsgType: 'text',
 *   Content: '鹿岛',
 *   MsgId: 1234567890123456
 * }
 */
async function executor(msg) {
  try {
    const { mediaId, memberCode, fromCache } = await getValidMediaId();
    
    // 如果是从缓存获取的，需要重新获取 memberCode 用于显示
    // 这里简化处理，实际可以将 memberCode 也缓存
    const displayCode = fromCache ? await fetchMemberCode() : memberCode;
    
    return {
      type: "image",
      mediaId: mediaId,
      text: `您的鹿岛会员码：${displayCode}`
    };

  } catch (error) {
    console.error("[ludao] 获取会员码失败:", error.message);
    return `获取会员码失败：${error.message}`;
  }
}

module.exports = {
  actionId: "ludao",
  executor,
  description: "获取鹿岛会员码",
  defaultKeywords: ["鹿岛", "ludao", "会员码"]
};