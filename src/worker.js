const { parseStringPromise } = require("xml2js");
const { handleText, handleImage, handleVoice, handleVideo, handleLocation, handleLink, handleEvent } = require("./services/handlers");
const keywordCache = require("./services/keyword-cache");
const apiConfigCache = require("./services/api-config-cache");
const { registerSysActions } = require("./services/actions/sys-actions");
const { registerBusinessActions } = require("./services/actions");

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  await keywordCache.loadFromDatabase();
  await apiConfigCache.loadApiConfigs();
  registerSysActions();
  registerBusinessActions();
  initialized = true;
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request, event.env));
});

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "GET" && path === "/wechat") {
    return handleVerify(request);
  }

  if (request.method === "POST" && path === "/wechat") {
    return handleMessage(request);
  }

  if (path === "/api/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("WeChat MP Service", { status: 200 });
}

async function handleVerify(request) {
  const url = new URL(request.url);
  const { echostr, signature, timestamp, nonce } = Object.fromEntries(url.searchParams);

  if (!signature || !timestamp || !nonce) {
    return new Response(echostr || "", { status: 200 });
  }

  const token = process.env.WECHAT_TOKEN || "";
  const arr = [token, timestamp, nonce].sort();
  const hashBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(arr.join("")));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hashHex === signature) {
    return new Response(echostr, { status: 200 });
  }
  return new Response("Invalid signature", { status: 401 });
}

async function handleMessage(request) {
  try {
    await ensureInit();

    const xml = await request.text();
    const data = await parseStringPromise(xml);
    const raw = data.xml;

    const msg = {
      ToUserName: raw.ToUserName[0],
      FromUserName: raw.FromUserName[0],
      CreateTime: parseInt(raw.CreateTime[0]),
      MsgType: raw.MsgType[0],
    };

    if (raw.Content) msg.Content = raw.Content[0];
    if (raw.MsgId) msg.MsgId = raw.MsgId[0];
    if (raw.Event) msg.Event = raw.Event[0];
    if (raw.EventKey) msg.EventKey = raw.EventKey[0];
    if (raw.Ticket) msg.Ticket = raw.Ticket[0];
    if (raw.Latitude) msg.Latitude = raw.Latitude[0];
    if (raw.Longitude) msg.Longitude = raw.Longitude[0];
    if (raw.Precision) msg.Precision = raw.Precision[0];
    if (raw.Status) msg.Status = raw.Status[0];
    if (raw.MediaId) msg.MediaId = raw.MediaId[0];
    if (raw.PicUrl) msg.PicUrl = raw.PicUrl[0];
    if (raw.Format) msg.Format = raw.Format[0];
    if (raw.Recognition) msg.Recognition = raw.Recognition[0];
    if (raw.ThumbMediaId) msg.ThumbMediaId = raw.ThumbMediaId[0];
    if (raw.Location_X) msg.Location_X = raw.Location_X[0];
    if (raw.Location_Y) msg.Location_Y = raw.Location_Y[0];
    if (raw.Scale) msg.Scale = raw.Scale[0];
    if (raw.Label) msg.Label = raw.Label[0];
    if (raw.Title) msg.Title = raw.Title[0];
    if (raw.Description) msg.Description = raw.Description[0];
    if (raw.Url) msg.Url = raw.Url[0];

    const handlers = {
      text: handleText,
      image: handleImage,
      voice: handleVoice,
      video: handleVideo,
      shortvideo: handleVideo,
      location: handleLocation,
      link: handleLink,
      event: handleEvent,
    };

    const handler = handlers[msg.MsgType];
    let reply = "success";

    if (handler) {
      try {
        reply = await handler(msg);
      } catch (err) {
        console.error(`[worker] 消息处理失败 [${msg.MsgType}]:`, err.message);
      }
    }

    const xmlReply = buildReplyXml(msg, reply);
    return new Response(xmlReply, {
      headers: { "Content-Type": "text/xml" },
      status: 200,
    });
  } catch (err) {
    console.error("[worker] 请求处理失败:", err.message);
    return new Response("error", { status: 500 });
  }
}

function buildReplyXml(msg, reply) {
  const time = Math.floor(Date.now() / 1000);

  if (typeof reply === "string") {
    return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${reply}]]></Content>
</xml>`;
  }

  if (reply && typeof reply === "object") {
    if (reply.MsgType === "text") {
      return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${reply.Content || ""}]]></Content>
</xml>`;
    }

    if (reply.type === "image" || reply.MsgType === "image") {
      return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[image]]></MsgType>
  <Image>
    <MediaId><![CDATA[${reply.mediaId || reply.MediaId}]]></MediaId>
  </Image>
</xml>`;
    }
  }

  return `<xml>
  <ToUserName><![CDATA[${msg.FromUserName}]]></ToUserName>
  <FromUserName><![CDATA[${msg.ToUserName}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[success]]></Content>
</xml>`;
}
