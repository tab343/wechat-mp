/**
 * 基于 Cloudflare R2 Workers API 封装的工具类
 * 官方文档：https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
 */
export class R2Storage {
  constructor(bucket) {
    if (!bucket) {
      throw new Error("R2Storage：必须传入绑定后的 R2Bucket 实例")
    }
    this.bucket = bucket
  }

  async put(key, value, options = {}) {
    const httpMetadata = {}

    if (options.contentType) {
      httpMetadata.contentType = options.contentType
    }
    if (options.cacheControl) {
      httpMetadata.cacheControl = options.cacheControl
    }

    const result = await this.bucket.put(key, value, {
      httpMetadata,
      customMetadata: options.customMetadata
    })

    return {
      success: true,
      key: key,
      etag: result.etag,
      size: result.size,
      uploaded: result.uploaded
    }
  }

  async putImage(key, value, customMetadata = {}) {
    return this.put(key, value, {
      contentType: "image/png",
      cacheControl: "public, max-age=31536000",
      customMetadata
    })
  }

  async get(key, options = {}) {
    return this.bucket.get(key, options)
  }

  async head(key) {
    return this.bucket.head(key)
  }

  async delete(key) {
    await this.bucket.delete(key)
    return { success: true, key }
  }

  async deleteBatch(keys) {
    await this.bucket.delete(keys)
    return { success: true, count: keys.length }
  }

  async list(options = {}) {
    return this.bucket.list(options)
  }
}