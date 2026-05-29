import { getApiConfig } from "../api-config-cache.js";
import { generateCode128Barcode } from "../../utils/barcode-generator.js";
import { put } from "../../utils/r2-storage.js";

const urlCache = new Map();
const CACHE_TTL = 60 * 1000;
let fetchingPromise = null;

async function fetchMemberCode() {
  const now = Date.now();

  const cached = urlCache.get("memberCode");
  if (cached && now < cached.expiresAt) {
    console.log(`[ludao] 使用缓存的会员码: ${cached.code}`);
    return cached;
  }

  if (fetchingPromise) {
    console.log("[ludao] 已有请求进行中，等待结果...");
    return fetchingPromise;
  }

  fetchingPromise = doFetchMemberCode();
  try {
    const result = await fetchingPromise;
    return result;
  } finally {
    fetchingPromise = null;
  }
}

async function doFetchMemberCode() {
  const now = Date.now();

  const config = await getApiConfig("ludao_api");
  if (!config) {
    throw new Error("API 配置不存在");
  }

  console.log("[ludao] API 配置:", JSON.stringify(config, null, 2));

  const { base_url, request_method, param_location, param_key, param_value, extra_headers, extra_body } = config;

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

  if (!respData || respData.code !== 200 || !respData.data?.code) {
    console.error("[ludao] API 响应不符合预期");
    throw new Error(respData?.msg || "获取会员码失败");
  }

  const memberCode = respData.data.code;
  console.log("[ludao] 成功获取会员码:", memberCode);

  const svgContent = await generateCode128Barcode(memberCode);
  const key = `ludao/${Date.now()}-${memberCode}.svg`;

  console.log(`[ludao] 上传 SVG 到 R2: ${key}`);
  const publicUrl = await put(key, svgContent, {
    httpMetadata: { contentType: "image/svg+xml" },
    customMetadata: { memberCode, uploadedAt: new Date().toISOString() }
  });

  console.log(`[ludao] SVG 上传成功: ${publicUrl}`);

  const cachedData = { code: memberCode, imageUrl: publicUrl, expiresAt: now + CACHE_TTL };
  urlCache.set("memberCode", cachedData);

  return cachedData;
}

async function getImageUrl(memberCode) {
  console.log(`[ludao] 生成条形码 SVG，会员码: ${memberCode}`);

  const svgContent = await generateCode128Barcode(memberCode);
  const key = `ludao/${Date.now()}-${memberCode}.svg`;

  console.log(`[ludao] 上传 SVG 到 R2: ${key}`);
  const publicUrl = await put(key, svgContent, {
    httpMetadata: { contentType: "image/svg+xml" },
    customMetadata: { memberCode, uploadedAt: new Date().toISOString() }
  });

  console.log(`[ludao] SVG 上传成功: ${publicUrl}`);
  return publicUrl;
}

async function executor(msg) {
  try {
    const cachedData = await fetchMemberCode();

    return {
      msgType: "news",
      content: `<ArticleCount>1</ArticleCount>
<Articles>
<item>
<Title><![CDATA[您的鹿岛会员码]]></Title>
<Description><![CDATA[会员码：${cachedData.code}]]></Description>
<PicUrl><![CDATA[${cachedData.imageUrl}]]></PicUrl>
<Url><![CDATA[${cachedData.imageUrl}]]></Url>
</item>
</Articles>`
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
