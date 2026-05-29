import { R2Storage } from "../utils/r2-storage.js";
import sysConfigCache from "./sys-config-cache.js";

let r2Storage = null;

export function initR2Storage(bucket) {
  if (!bucket) {
    console.warn("[r2-manager] R2 bucket 未绑定，跳过初始化");
    return false;
  }
  
  try {
    r2Storage = new R2Storage(bucket);
    console.log("[r2-manager] R2Storage 全局实例初始化成功");
    return true;
  } catch (error) {
    console.error("[r2-manager] R2Storage 初始化失败:", error.message);
    return false;
  }
}

export function getR2Storage() {
  if (!r2Storage) {
    throw new Error("R2Storage 尚未初始化，请先调用 initR2Storage");
  }
  return r2Storage;
}

export function isR2StorageReady() {
  return r2Storage !== null;
}

export async function uploadImageToR2(imageData, filename, options = {}) {
  const storage = getR2Storage();
  const bucketPublicUrl = sysConfigCache.get("R2_BUCKET_PUBLIC_URL");
  
  if (!bucketPublicUrl) {
    throw new Error("R2_BUCKET_PUBLIC_URL 未配置");
  }
  
  const prefix = options.prefix || "images";
  const key = `${prefix}/${Date.now()}-${filename}`;
  
  console.log(`[r2-manager] 上传图片到 R2，key: ${key}`);
  
  const result = await storage.putImage(key, imageData, {
    uploadedAt: new Date().toISOString(),
    ...(options.customMetadata || {})
  });
  
  const publicUrl = `${bucketPublicUrl}/${key}`;
  console.log(`[r2-manager] 图片上传成功，公网 URL: ${publicUrl}`);
  
  return {
    ...result,
    key,
    publicUrl
  };
}

export default {
  initR2Storage,
  getR2Storage,
  isR2StorageReady,
  uploadImageToR2
};
