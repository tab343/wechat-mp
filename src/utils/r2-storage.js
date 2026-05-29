/**
 * Cloudflare R2 存储工具
 * 官方文档：https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
 */

// R2 bucket 公网访问前缀（固定地址）
const R2_PUBLIC_PREFIX = "https://pub-0c0c60bc28d94016a2acb679eef2f5cb.r2.dev";

/**
 * 上传文件到 R2
 * @param {string} key - 文件键名
 * @param {ReadableStream|ArrayBuffer|ArrayBufferView|string|Blob} value - 文件内容
 * @param {Object} options - R2PutOptions
 * @returns {Promise<string>} 公网 URL
 */
export async function put(key, value, options = {}) {
  console.log(`[r2-storage] 上传文件: ${key}`);
  
  const result = await globalThis.env.WECHAT_MP_BUCKET.put(key, value, options);
  
  const publicUrl = `${R2_PUBLIC_PREFIX}/${key}`;
  console.log(`[r2-storage] 上传成功: ${key}, etag: ${result?.etag}, URL: ${publicUrl}`);
  
  return publicUrl;
}

/**
 * 获取文件
 * @param {string} key - 文件键名
 * @param {Object} options - R2GetOptions
 * @returns {Promise<R2ObjectBody|R2Object|null>}
 */
export async function get(key, options = {}) {
  console.log(`[r2-storage] 获取文件: ${key}`);
  
  const result = await globalThis.env.WECHAT_MP_BUCKET.get(key, options);
  
  if (result) {
    console.log(`[r2-storage] 获取成功: ${key}, size: ${result.size}, etag: ${result.etag}`);
  } else {
    console.log(`[r2-storage] 文件不存在: ${key}`);
  }
  
  return result;
}

/**
 * 删除文件
 * @param {string|string[]} keys - 文件键名
 * @returns {Promise<void>}
 */
export async function del(keys) {
  const keyList = Array.isArray(keys) ? keys.join(', ') : keys;
  console.log(`[r2-storage] 删除文件: ${keyList}`);
  
  await globalThis.env.WECHAT_MP_BUCKET.delete(keys);
  
  console.log(`[r2-storage] 删除成功: ${keyList}`);
}

/**
 * 列出文件
 * @param {Object} options - R2ListOptions
 * @returns {Promise<R2Objects>}
 */
export async function list(options = {}) {
  console.log(`[r2-storage] 列出文件: ${JSON.stringify(options)}`);
  
  const result = await globalThis.env.WECHAT_MP_BUCKET.list(options);
  
  console.log(`[r2-storage] 列出成功: ${result.objects?.length || 0} 个文件`);
  
  return result;
}

/**
 * 构造公网 URL
 * @param {string} key - 文件键名
 * @returns {string}
 */
export function url(key) {
  const publicUrl = `${R2_PUBLIC_PREFIX}/${key}`;
  console.log(`[r2-storage] 构造 URL: ${publicUrl}`);
  return publicUrl;
}

export default { put, get, delete: del, list, url };
