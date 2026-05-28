/**
 * 消息处理器工具函数
 */

/**
 * 构造文本回复消息的 XML 对象
 * @param {Object} msg - 原始消息对象
 * @param {string} content - 回复内容
 * @returns {Object} 回复消息对象
 */
function textReply(msg, content) {
  return {
    ToUserName: msg.FromUserName,
    FromUserName: msg.ToUserName,
    CreateTime: Math.floor(Date.now() / 1000),
    MsgType: "text",
    Content: content,
  };
}

/**
 * 构造图片回复消息
 * @param {Object} msg - 原始消息对象
 * @param {string} mediaId - 图片 MediaId
 * @returns {Object} 回复消息对象
 */
function imageReply(msg, mediaId) {
  return {
    ToUserName: msg.FromUserName,
    FromUserName: msg.ToUserName,
    CreateTime: Math.floor(Date.now() / 1000),
    MsgType: "image",
    Image: {
      MediaId: mediaId,
    },
  };
}

/**
 * 构造图文回复消息
 * @param {Object} msg - 原始消息对象
 * @param {Array} articles - 图文列表
 * @returns {Object} 回复消息对象
 */
function newsReply(msg, articles) {
  return {
    ToUserName: msg.FromUserName,
    FromUserName: msg.ToUserName,
    CreateTime: Math.floor(Date.now() / 1000),
    MsgType: "news",
    ArticleCount: articles.length,
    Articles: articles.map((article) => ({
      Title: article.title,
      Description: article.description || "",
      PicUrl: article.picUrl || "",
      Url: article.url,
    })),
  };
}

/**
 * 构造语音回复消息
 * @param {Object} msg - 原始消息对象
 * @param {string} mediaId - 语音 MediaId
 * @returns {Object} 回复消息对象
 */
function voiceReply(msg, mediaId) {
  return {
    ToUserName: msg.FromUserName,
    FromUserName: msg.ToUserName,
    CreateTime: Math.floor(Date.now() / 1000),
    MsgType: "voice",
    Voice: {
      MediaId: mediaId,
    },
  };
}

/**
 * 构造视频回复消息
 * @param {Object} msg - 原始消息对象
 * @param {string} mediaId - 视频 MediaId
 * @param {string} [title] - 视频标题
 * @param {string} [description] - 视频描述
 * @returns {Object} 回复消息对象
 */
function videoReply(msg, mediaId, title, description) {
  return {
    ToUserName: msg.FromUserName,
    FromUserName: msg.ToUserName,
    CreateTime: Math.floor(Date.now() / 1000),
    MsgType: "video",
    Video: {
      MediaId: mediaId,
      Title: title || "",
      Description: description || "",
    },
  };
}

export {
  textReply,
  imageReply,
  newsReply,
  voiceReply,
  videoReply,
};