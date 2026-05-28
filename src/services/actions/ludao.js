import * as bwipjs from "bwip-js";
import { getApiConfig } from "../api-config-cache.js";
import { uploadImage } from "../wechat/media-upload.js";

// 临时素材缓存：MediaId -> 过期时间戳
const mediaCache = new Map();
// 缓存有效期：1 分钟（60000 毫秒）
const CACHE_TTL = 60 * 1000;

/**
 * 检测是否为 Cloudflare Worker 环境
 */
function isCloudflareEnvironment() {
  return process.env.CF_PAGES || process.env.CF_WORKER || 
         (typeof caches !== 'undefined' && typeof fetch !== 'undefined' && typeof Request !== 'undefined');
}

/**
 * Code128 条形码生成器（纯 JavaScript 实现，兼容 Cloudflare Worker）
 * @param {string} text - 要编码的文本
 * @param {number} [scale=2] - 缩放比例
 * @param {number} [height=30] - 高度（像素）
 * @returns {Uint8Array} PNG 图片数据
 */
async function generateBarcodeCanvas(text, scale = 2, height = 30) {
  const code128A = {
    '0': 16, '1': 17, '2': 18, '3': 19, '4': 20, '5': 21, '6': 22, '7': 23, '8': 24, '9': 25,
    'A': 36, 'B': 37, 'C': 38, 'D': 39, 'E': 40, 'F': 41, 'G': 42, 'H': 43, 'I': 44, 'J': 45,
    'K': 46, 'L': 47, 'M': 48, 'N': 49, 'O': 50, 'P': 51, 'Q': 52, 'R': 53, 'S': 54, 'T': 55,
    'U': 56, 'V': 57, 'W': 58, 'X': 59, 'Y': 60, 'Z': 61,
    ' ': 32, '!': 1, '"': 2, '#': 3, '$': 4, '%': 5, '&': 6, '\'': 7, '(': 8, ')': 9,
    '*': 10, '+': 11, ',': 12, '-': 13, '.': 14, '/': 15,
    ':': 26, ';': 27, '<': 28, '=': 29, '>': 30, '?': 31,
    '@': 33, '[': 34, '\\': 35, ']': 62, '^': 63, '_': 64
  };

  const codePatterns = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
  ];

  function calculateChecksum(data) {
    let sum = 104;
    for (let i = 0; i < data.length; i++) {
      sum += (i + 1) * data[i];
    }
    return sum % 103;
  }

  const encodedData = [];
  for (const char of text) {
    const code = code128A[char];
    if (code === undefined) {
      throw new Error(`不支持的字符: ${char}`);
    }
    encodedData.push(code);
  }

  const startCode = 103;
  const checksum = calculateChecksum([startCode, ...encodedData]);
  const stopCode = 106;
  const fullCode = [startCode, ...encodedData, checksum, stopCode];

  let pattern = '';
  for (const code of fullCode) {
    pattern += codePatterns[code];
  }

  const barWidth = pattern.length * scale;
  const canvas = new OffscreenCanvas(barWidth + 40, height + 20);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  let x = 20;
  for (let i = 0; i < pattern.length; i++) {
    const bar = pattern[i] === '1';
    const width = parseInt(pattern[i]) * scale;
    if (bar) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, 5, width, height);
    }
    x += width;
  }
  
  ctx.font = '10px monospace';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, height + 18);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const buffer = await blob.arrayBuffer();
  
  return new Uint8Array(buffer);
}

/**
 * 使用 bwip-js 生成条形码（Node.js 环境）
 * @param {string} code - 会员码
 * @returns {Buffer} PNG 图片 Buffer
 */
async function generateBarcodeNode(code) {
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
 * 生成条形码图片（根据环境选择合适的方法）
 * @param {string} code - 会员码
 * @returns {Uint8Array|Buffer} PNG 图片数据
 */
async function generateBarcode(code) {
  if (isCloudflareEnvironment()) {
    console.log("[ludao] 使用 OffscreenCanvas 生成条形码");
    return generateBarcodeCanvas(code);
  } else {
    console.log("[ludao] 使用 bwip-js 生成条形码");
    return generateBarcodeNode(code);
  }
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
 * @returns {Promise<{mediaId: string, memberCode: string}>}
 */
async function getValidMediaId() {
  const now = Date.now();
  
  for (const [mediaId, expiresAt] of mediaCache.entries()) {
    if (now < expiresAt) {
      console.log(`[ludao] 使用缓存的 MediaId: ${mediaId}, 剩余有效期：${Math.ceil((expiresAt - now) / 1000)}秒`);
      return { mediaId, fromCache: true };
    } else {
      mediaCache.delete(mediaId);
    }
  }
  
  console.log("[ludao] 缓存中没有有效 MediaId，重新获取会员码并生成条形码...");
  
  const memberCode = await fetchMemberCode();
  const barcodeBuffer = await generateBarcode(memberCode);
  const mediaId = await uploadImage(barcodeBuffer, { filename: 'barcode.png' });
  
  mediaCache.set(mediaId, now + CACHE_TTL);
  console.log(`[ludao] MediaId 已缓存，有效期至：${new Date(now + CACHE_TTL).toLocaleString()}`);
  
  return { mediaId, memberCode, fromCache: false };
}

/**
 * Ludao member code acquisition function
 * @param {Object} msg - Message object
 */
async function executor(msg) {
  try {
    const { mediaId, memberCode, fromCache } = await getValidMediaId();
    
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

export default {
  actionId: "ludao",
  executor,
  description: "获取鹿岛会员码",
  defaultKeywords: ["鹿岛", "ludao", "会员码"]
};
