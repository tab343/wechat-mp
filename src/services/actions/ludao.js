import * as bwipjs from "bwip-js";
import { getApiConfig } from "../api-config-cache.js";
import { uploadImage } from "../wechat/media-upload.js";
import { generateCode128Barcode, isCloudflareEnvironment } from "../../utils/barcode-generator.js";

const mediaCache = new Map();
const CACHE_TTL = 60 * 1000;

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

async function generateBarcode(code) {
  if (isCloudflareEnvironment()) {
    console.log("[ludao] 使用纯 JavaScript PNG 生成器");
    return generateCode128Barcode(code);
  } else {
    console.log("[ludao] 使用 bwip-js 生成条形码");
    return generateBarcodeNode(code);
  }
}

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
