const { parseStringPromise, Builder } = require("xml2js");

/**
 * 解析微信服务器发来的 XML 消息
 * @param {string} xml - 原始 XML 字符串
 * @returns {Promise<object>} 解析后的 JSON 对象
 */
async function parseXML(xml) {
  const result = await parseStringPromise(xml, {
    explicitArray: false,  // 不使用数组包装单个元素
    trim: true,            // 去除文本首尾空格
  });
  return result.xml;
}

/**
 * 构建回复给微信服务器的 XML
 * @param {object} data - 回复内容对象
 * @returns {string} XML 字符串
 */
function buildXML(data) {
  const builder = new Builder({
    headless: true,        // 不生成 <?xml?> 声明头
    cdata: true,           // 文本内容使用 CDATA 包裹
    rootName: "xml",
  });
  return builder.buildObject(data);
}

module.exports = { parseXML, buildXML };
