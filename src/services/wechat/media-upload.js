/**
 * 微信临时素材上传服务
 * 
 * 封装微信公众号临时素材上传功能，支持多种媒体类型。
 * 自动从 access-token.js 获取已缓存的 Access Token。
 * 
 * 使用方式：
 * ```javascript
 * const { uploadImage } = require('./media-upload');
 * const mediaId = await uploadImage(imageBuffer);
 * ```
 */

const { getAccessToken } = require('./access-token');

// 微信 API 基础 URL
const WECHAT_API_BASE = 'https://api.weixin.qq.com/cgi-bin/media/upload';

/**
 * 构建上传 URL
 * @param {string} type - 媒体类型：image/voice/video/thumb
 * @param {string} accessToken - Access Token
 * @returns {string} 完整的上传 URL
 */
function buildUploadUrl(type, accessToken) {
  return `${WECHAT_API_BASE}?access_token=${accessToken}&type=${type}`;
}

/**
 * 上传图片到微信临时素材服务器
 * @param {Buffer} imageBuffer - 图片二进制数据
 * @param {Object} options - 可选配置
 * @param {string} options.filename - 文件名（默认：image.png）
 * @returns {Promise<string>} MediaId
 * @example
 * const fs = require('fs');
 * const buffer = fs.readFileSync('barcode.png');
 * const mediaId = await uploadImage(buffer, { filename: 'barcode.png' });
 */
async function uploadImage(imageBuffer, options = {}) {
  const { filename = 'image.png' } = options;
  
  const accessToken = await getAccessToken();
  const url = buildUploadUrl('image', accessToken);
  
  const form = new FormData();
  form.append('media', new Blob([imageBuffer], { type: 'image/png' }), filename);
  
  const res = await fetch(url, { method: 'POST', body: form });
  const data = await res.json();
  
  if (data.errcode) {
    throw new Error(`上传图片失败：${data.errmsg} (errcode: ${data.errcode})`);
  }
  
  console.log(`[media-upload] 图片上传成功，MediaId: ${data.media_id}`);
  return data.media_id;
}

/**
 * 上传语音到微信临时素材服务器
 * @param {Buffer} voiceBuffer - 语音二进制数据
 * @param {Object} options - 可选配置
 * @param {string} options.filename - 文件名（默认：voice.mp3）
 * @returns {Promise<string>} MediaId
 */
async function uploadVoice(voiceBuffer, options = {}) {
  const { filename = 'voice.mp3' } = options;
  
  const accessToken = await getAccessToken();
  const url = buildUploadUrl('voice', accessToken);
  
  const form = new FormData();
  form.append('media', new Blob([voiceBuffer], { type: 'audio/mpeg' }), filename);
  
  const res = await fetch(url, { method: 'POST', body: form });
  const data = await res.json();
  
  if (data.errcode) {
    throw new Error(`上传语音失败：${data.errmsg} (errcode: ${data.errcode})`);
  }
  
  console.log(`[media-upload] 语音上传成功，MediaId: ${data.media_id}`);
  return data.media_id;
}

/**
 * 上传视频到微信临时素材服务器
 * @param {Buffer} videoBuffer - 视频二进制数据
 * @param {Object} options - 可选配置
 * @param {string} options.filename - 文件名（默认：video.mp4）
 * @returns {Promise<string>} MediaId
 */
async function uploadVideo(videoBuffer, options = {}) {
  const { filename = 'video.mp4' } = options;
  
  const accessToken = await getAccessToken();
  const url = buildUploadUrl('video', accessToken);
  
  const form = new FormData();
  form.append('media', new Blob([videoBuffer], { type: 'video/mp4' }), filename);
  
  const res = await fetch(url, { method: 'POST', body: form });
  const data = await res.json();
  
  if (data.errcode) {
    throw new Error(`上传视频失败：${data.errmsg} (errcode: ${data.errcode})`);
  }
  
  console.log(`[media-upload] 视频上传成功，MediaId: ${data.media_id}`);
  return data.media_id;
}

/**
 * 上传缩略图到微信临时素材服务器
 * @param {Buffer} thumbBuffer - 缩略图二进制数据（JPG 格式，大小不超过 64KB）
 * @param {Object} options - 可选配置
 * @param {string} options.filename - 文件名（默认：thumb.jpg）
 * @returns {Promise<string>} MediaId
 */
async function uploadThumb(thumbBuffer, options = {}) {
  const { filename = 'thumb.jpg' } = options;
  
  const accessToken = await getAccessToken();
  const url = buildUploadUrl('thumb', accessToken);
  
  const form = new FormData();
  form.append('media', new Blob([thumbBuffer], { type: 'image/jpeg' }), filename);
  
  const res = await fetch(url, { method: 'POST', body: form });
  const data = await res.json();
  
  if (data.errcode) {
    throw new Error(`上传缩略图失败：${data.errmsg} (errcode: ${data.errcode})`);
  }
  
  console.log(`[media-upload] 缩略图上传成功，MediaId: ${data.media_id}`);
  return data.media_id;
}

/**
 * 通用上传方法
 * @param {Buffer} mediaBuffer - 媒体文件二进制数据
 * @param {string} type - 媒体类型：image/voice/video/thumb
 * @param {Object} options - 可选配置
 * @param {string} options.filename - 文件名
 * @returns {Promise<string>} MediaId
 */
async function upload(mediaBuffer, type, options = {}) {
  const uploaders = {
    image: uploadImage,
    voice: uploadVoice,
    video: uploadVideo,
    thumb: uploadThumb
  };
  
  const uploader = uploaders[type];
  if (!uploader) {
    throw new Error(`不支持的媒体类型：${type}，支持：image, voice, video, thumb`);
  }
  
  return uploader(mediaBuffer, options);
}

module.exports = {
  uploadImage,
  uploadVoice,
  uploadVideo,
  uploadThumb,
  upload
};