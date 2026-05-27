const crypto = require("crypto");
const config = require("../config");

/**
 * 微信服务器签名验证中间件
 *
 * 微信服务器会发送 GET 请求到配置的 URL，携带四个参数：
 *   signature  - 微信加密签名
 *   timestamp  - 时间戳
 *   nonce      - 随机数
 *   echostr    - 随机字符串（验证通过后需原样返回）
 *
 * 验证流程：
 *   1. 将 token、timestamp、nonce 三个参数按字典序排序
 *   2. 拼接成一个字符串进行 SHA1 加密
 *   3. 与 signature 对比，一致则验证通过
 */
function wechatVerify(req, res, next) {
  const { signature, timestamp, nonce, echostr } = req.query;

  // 参数不完整，放行让后续路由处理（可能是 POST 消息）
  if (!signature || !timestamp || !nonce) {
    return next();
  }

  // 字典序排序后拼接
  const tmpArr = [config.token, timestamp, nonce].sort();
  const tmpStr = tmpArr.join("");

  // SHA1 加密
  const sha1 = crypto.createHash("sha1").update(tmpStr).digest("hex");

  if (sha1 === signature) {
    console.log("[微信验证] 签名验证通过");
    // GET 请求：验证成功，原样返回 echostr
    if (echostr !== undefined) {
      return res.send(echostr);
    }
    return next();
  }

  console.warn("[微信验证] 签名验证失败");
  res.status(403).send("Forbidden: signature verification failed");
}

module.exports = wechatVerify;
