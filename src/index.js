/**
 * 本地开发服务器入口 (Express)
 * 仅处理微信公众号消息，与 Cloudflare Worker 保持一致
 */

import express from "express";
import { parseStringPromise } from "xml2js";
import { processMessage, buildReplyXml, verifySignature, config } from "./core/message-handler.js";
import { parseWechatXml, decryptMsg } from "./core/xml-utils.js";

const app = express();

app.get(config.path, async (req, res) => {
  const { echostr, signature, timestamp, nonce } = req.query;

  if (!signature || !timestamp || !nonce) {
    return res.send(echostr);
  }

  const isValid = await verifySignature(signature, timestamp, nonce, config.token, "node");
  res.send(isValid ? echostr : "Invalid signature");
});

app.post(config.path, express.text({ type: "*/*" }), async (req, res) => {
  try {
    const xml = req.body;
    const msg = await processMessage(xml, parseWechatXml, decryptMsg);
    const parsedMsg = parseWechatXml(xml);
    const replyXml = buildReplyXml(parsedMsg, msg);
    res.send(replyXml);
  } catch (error) {
    console.error("消息处理失败:", error);
    res.status(500).send("error");
  }
});

// ── 启动服务 ─────────────────────────────────────
function bootstrap() {
  const server = app.listen(config.port, () => {
    console.log(`微信公众号服务已启动，端口: ${config.port}`);
  });

  server.on('error', (error) => {
    console.error('服务器启动失败:', error);
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    server.close(() => {
      process.exit(0);
    });
  });
}

bootstrap();