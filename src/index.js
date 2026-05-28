import http from 'node:http';
import worker from './worker.js';
import { killPortProcess } from './utils/kill-port-process.js';
import { config } from 'dotenv';

// 1. 加载 .env 文件到 process.env
const result = config();
if (result.error) {
  console.error('[.env] 加载失败:', result.error);
}

// 2. 只把 .env 里定义的变量传给 worker（关键！）
const env = {};
for (const key of Object.keys(result.parsed || {})) {
  env[key] = process.env[key];
}

// 固定端口 3000
const PORT = 3000;

async function startServer() {
  console.log("🚀 本地服务启动中...");

  // 创建服务
  const server = http.createServer(async (req, res) => {
    try {
      const request = new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method,
        headers: new Headers(req.headers),
        body: req.method === 'POST' ? req : null,
        duplex: 'half',
      });

      // 3. 把只含 .env 变量的 env 对象传给 fetch
      const response = await worker.fetch(request, env, {});

      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch (err) {
      console.error('服务错误:', err);
      res.writeHead(500).end("Error");
    }
  });

  // 监听端口 + 自动处理占用
  function listen() {
    server.listen(PORT, () => {
      console.log(`✅ 本地服务已启动：http://127.0.0.1:${PORT}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️ 端口 ${PORT} 被占用，正在清理...`);
        killPortProcess(PORT);
        setTimeout(listen, 500);
      }
    });
  }

  listen();
}

startServer();