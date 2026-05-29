import http from 'node:http';
import worker from './worker.js';
import { config } from 'dotenv';

config();

const env = { ...process.env };

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

      const response = await worker.fetch(request, env, {});

      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch (err) {
      console.error('服务错误:', err);
      res.writeHead(500).end("Error");
    }
  });

  server.listen(PORT, () => {
    console.log(`✅ 本地服务已启动：http://127.0.0.1:${PORT}`);
  });
}

startServer();