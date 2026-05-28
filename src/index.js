import http from 'node:http';
import worker from './worker.js';
import { killPortProcess } from './utils/kill-port-process.js';
import { config } from 'dotenv';

// 1. 加载 .env （这一句就够了）
config();

// 2. 直接取 process.env（最稳定，永远不会空）
const env = { ...process.env };

// 固定端口 3000
const PORT = 3000;

async function startServer() {
  console.log("🚀 本地服务启动中...");

  const server = http.createServer(async (req, res) => {
    try {
      const request = new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method,
        headers: new Headers(req.headers),
        body: req.method === 'POST' ? req : null,
        duplex: 'half',
      });

      // ✅ 这里 env 一定有值！
      const response = await worker.fetch(request, env, {});

      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch (err) {
      console.error('服务错误:', err);
      res.writeHead(500).end("Error");
    }
  });

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