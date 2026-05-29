/**
 * Cloudflare Worker 入口文件
 * 作用：运行在 Cloudflare 平台上，接收微信公众号的请求
 * 本地 Node.js 项目 不要引入、不要运行这个文件！
 * 依赖公共核心模块处理微信消息验证、解析、回复
 */

// 导入微信消息处理器（ES 模块语法，Cloudflare 专用）
import { handleGetRequest, handlePostRequest } from "./services/wechat/message-processor.js";
import sysConfigCache from "./services/sys-config-cache.js";
import { keywordCache } from "./services/keyword-cache.js";
import { registerBusinessActions } from "./services/actions/index.js";
import { threadId } from 'worker_threads';

// 全局变量，整个 Worker 共享
// 全局异步锁（解决竞态问题） 
let initialized = false;
let initializing = false;

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

    // ✅ 这里判断：如果已经加载过，就永远不再执行！
    if (!initialized && !initializing) {
      initializing = true;
      console.log("[worker] 进行初始化操作...");
      globalThis.env = env;
      await sysConfigCache.loadOnStartup();
      await keywordCache.init(registerBusinessActions); // 初始化关键字缓存（包含加载关键字和注册执行器）
      initialized = true;
      initializing = false;
    }


    try {
      // 处理 GET 请求：微信公众号服务器验证
      if (request.method === "GET") {
        const query = Object.fromEntries(url.searchParams);
        const result = await handleGetRequest(query);
        return result 
          ? new Response(result, { status: 200 })
          : new Response("Invalid signature", { status: 401 });
      }

      // 处理 POST 请求：接收微信用户消息
      if (request.method === "POST") {
        const body = await request.text();
        console.log('POST body:', body);
        const replyXml = await handlePostRequest(body);
        return new Response(replyXml, { 
          headers: { "Content-Type": "text/xml" }, 
          status: 200 
        });
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
