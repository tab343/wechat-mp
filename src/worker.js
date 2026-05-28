/**
 * Cloudflare Worker 入口文件
 * 作用：运行在 Cloudflare 平台上，接收微信公众号的请求
 * 本地 Node.js 项目 不要引入、不要运行这个文件！
 * 依赖公共核心模块处理微信消息验证、解析、回复
 */

// 导入核心处理方法（ES 模块语法，Cloudflare 专用）
import { processMessage, buildReplyXml, verifySignature, config } from "./core/message-handler.js";
import { parseWechatXml, decryptMsg } from "./core/xml-utils.js";
import * as sysConfigCache from "./services/sys-config-cache.js";
// 全局变量，整个 Worker 共享
let initialized = false;

/**
 * Cloudflare Worker 固定入口
 * @param {Request} request - 收到的 HTTP 请求对象
 * @param {object} env - 环境变量
 * @param {object} ctx - 执行上下文
 * @returns {Response} 返回响应给微信服务器
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ✅ 这里判断：如果已经加载过，就永远不再执行！
    if (!initialized) {
      // 👇 只有【第一次请求】会走这里
      // 👇 加载 Cloudflare D1 配置
      // 👇 打印配置
      // 👇 只执行 1 次！
      globalThis.env = env;
      await sysConfigCache.loadOnStartup();
      initialized = true;
    }

    try {
      // 处理 GET 请求：微信公众号服务器验证
      if (request.method === "GET") {
        return handleVerify(request);
      }

      // 处理 POST 请求：接收微信用户消息
      if (request.method === "POST") {
        return handleMessage(request);
      }

      // 默认响应：访问根目录时显示服务说明
      return new Response("WeChat MP Service", { status: 200 });
    } catch (err) {
      // 全局异常捕获，避免服务报错
      console.error("[worker] 服务异常:", err.message);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

/**
 * 处理微信公众号服务器地址验证（GET 请求）
 * 微信后台配置服务器 URL 时会触发此方法
 */
async function handleVerify(request) {
  const url = new URL(request.url);
  // 获取微信服务器传递的验证参数
  const { echostr, signature, timestamp, nonce } = Object.fromEntries(url.searchParams);

  // 缺少参数时直接返回
  if (!signature || !timestamp || !nonce) {
    return new Response(echostr || "", { status: 200 });
  }

  // 验证签名是否合法（判断请求是否来自微信官方）
  const isValid = await verifySignature(signature, timestamp, nonce, config.token, "web");
  
  // 验证通过：返回 echostr，微信则认为配置成功
  // 验证失败：返回 401 错误
  return isValid 
    ? new Response(echostr, { status: 200 }) 
    : new Response("Invalid signature", { status: 401 });
}

/**
 * 处理微信用户发送的消息（POST 请求）
 * 接收消息 → 解析 → 处理 → 回复 XML 消息
 */
async function handleMessage(request) {
  try {
    // 1. 获取请求中的原始 XML 消息体
    const xml = await request.text();
    
    // 2. 处理消息：解析、解密、生成回复内容
    const msg = await processMessage(xml, parseWechatXml, decryptMsg);
    
    // 3. 组装符合微信规范的 XML 回复消息
    const replyXml = buildReplyXml(parseWechatXml(xml), msg);
    
    // 4. 返回 XML 格式响应给微信服务器
    return new Response(replyXml, { 
      headers: { "Content-Type": "text/xml" }, 
      status: 200 
    });
  } catch (err) {
    // 消息处理失败，打印错误日志，返回 success 避免微信重试
    console.error("[worker] 消息处理失败:", err.message);
    return new Response("success", { status: 200 });
  }
}