/**
 * 条形码生成器工具类
 * 使用 bwip-js 库生成 SVG 格式条形码
 * 兼容 Cloudflare Worker 环境
 */

import * as bwipjs from 'bwip-js';

/**
 * 生成 Code128 条形码 SVG
 * @param {string} text - 要编码的文本
 * @param {number} [scale=2] - 缩放比例
 * @param {number} [height=30] - 条形码高度（毫米）
 * @returns {Promise<string>} SVG 字符串
 */
export async function generateCode128Barcode(text, scale = 2, height = 30) {
  console.log(`[barcode] 生成条形码 SVG: ${text}`);
  
  try {
    const svg = await bwipjs.toSVG({
      bcid: 'code128',           // 条形码类型
      text: text,                 // 要编码的文本
      scale: scale,               // 缩放比例
      height: height,             // 高度（毫米）
      includetext: true,          // 包含文本
      textxalign: 'center',       // 文本居中
      textsize: 10,               // 文本大小
      textgap: 5                  // 文本与条形码间距
    });
    
    console.log(`[barcode] SVG 生成成功，长度: ${svg.length} characters`);
    return svg;
    
  } catch (error) {
    console.error(`[barcode] SVG 生成失败: ${error.message}`);
    throw error;
  }
}

/**
 * 检测是否为 Cloudflare Worker 环境
 */
export function isCloudflareEnvironment() {
  return process.env.CF_PAGES || process.env.CF_WORKER || 
         (typeof caches !== 'undefined' && typeof fetch !== 'undefined' && typeof Request !== 'undefined');
}

export default {
  generateCode128Barcode,
  isCloudflareEnvironment
};
