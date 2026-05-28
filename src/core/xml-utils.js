/**
 * XML 解析工具 - 支持加密消息解密
 * 同时支持本地和 Cloudflare Worker 环境
 */

const sysConfigCache = require("../services/sys-config-cache");

function parseWechatXml(xml) {
  const inner = xml.replace(/<\?xml[^>]*\?>/i, "").replace(/<\/?xml[^>]*>/gi, "").trim();
  const msg = {};
  const tagRegex = /<(\w+)>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?\s*<\/\1>/gi;
  let match;
  while ((match = tagRegex.exec(inner || xml)) !== null) {
    if (!msg[match[1]]) {
      msg[match[1]] = match[2];
    }
  }
  return msg;
}

function pkcs7Unpad(buf) {
  const padLen = buf[buf.length - 1];
  if (padLen < 1 || padLen > 32) return buf;
  return buf.slice(0, buf.length - padLen);
}

function base64Decode(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function decryptMsg(rawXml) {
  let encodingAESKey = sysConfigCache.get("WECHAT_ENCODING_AES_KEY");

  if (!encodingAESKey) {
    encodingAESKey = process.env.WECHAT_ENCODING_AES_KEY || "";
  }

  if (!encodingAESKey) {
    await sysConfigCache.refresh();
    encodingAESKey = sysConfigCache.get("WECHAT_ENCODING_AES_KEY");
  }

  if (!encodingAESKey) {
    throw new Error("未配置 WECHAT_ENCODING_AES_KEY");
  }

  const xmlObj = parseWechatXml(rawXml);
  const encryptStr = xmlObj.Encrypt;
  if (!encryptStr) {
    throw new Error("加密消息中未找到 Encrypt 字段");
  }

  const keyBuffer = base64Decode(encodingAESKey + "=");
  if (keyBuffer.byteLength !== 32) {
    throw new Error(`EncodingAESKey 解码后长度错误: ${keyBuffer.byteLength}`);
  }

  const encryptedBuffer = base64Decode(encryptStr);
  const iv = keyBuffer.slice(0, 16);

  const key = await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-CBC" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, encryptedBuffer);

  const buf = new Uint8Array(decrypted);
  const unpadded = pkcs7Unpad(buf);
  const msgLen = (unpadded[16] << 24) | (unpadded[17] << 16) | (unpadded[18] << 8) | unpadded[19];
  const msgStr = new TextDecoder().decode(unpadded.slice(20, 20 + msgLen));

  return parseWechatXml(msgStr);
}

module.exports = {
  parseWechatXml,
  decryptMsg,
};
