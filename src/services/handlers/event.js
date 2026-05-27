/**
 * 事件消息处理器
 * 
 * 处理微信公众号的各类事件推送，包括关注、取关、扫码、菜单点击等。
 * 
 * 扩展方式：
 * 1. 在 eventHandlers 中添加新的事件类型处理
 * 2. 扩展订阅事件的业务逻辑（如积分奖励）
 * 3. 添加自定义菜单事件处理
 */

const { textReply } = require("./utils");
const userDb = require("../db/mp_users-db");

// ── 事件类型处理器映射 ──────────────────────────────────────
const eventHandlers = {
  /**
   * 订阅事件（用户关注公众号）
   */
  async subscribe(msg) {
    let sceneId = null;
    if (msg.EventKey && msg.EventKey.startsWith("qrscene_")) {
      sceneId = msg.EventKey.replace("qrscene_", "");
    }

    // 异步写入数据库，不阻塞回复
    userDb.upsertBySubscribe(msg.FromUserName, sceneId).catch((err) =>
      console.error("[user-db] 记录关注失败:", err.message)
    );

    if (sceneId) {
      return textReply(msg, `欢迎关注！🎉\n场景值：${sceneId}\n\n回复 help 查看可用命令`);
    }
    return textReply(msg, "欢迎关注！🎉\n\n回复 help 查看可用命令");
  },

  /**
   * 取消订阅事件
   */
  async unsubscribe(msg) {
    console.log(`[事件] 用户 ${msg.FromUserName} 已取消关注`);
    
    // 异步标记取关
    userDb.markUnsubscribed(msg.FromUserName).catch((err) =>
      console.error("[user-db] 标记取关失败:", err.message)
    );

    return null; // 取关事件不需要回复
  },

  /**
   * 扫码事件（已关注用户扫描带参数二维码）
   */
  async SCAN(msg) {
    const sceneId = msg.EventKey;
    console.log(`[事件] 用户扫码，场景值：${sceneId}`);
    
    // 扩展：扫码统计
    // await trackScanEvent(msg.FromUserName, sceneId);

    return textReply(msg, `扫码成功！\n场景值：${sceneId}`);
  },

  /**
   * 自定义菜单点击事件
   */
  async CLICK(msg) {
    const menuKey = msg.EventKey;
    console.log(`[事件] 菜单点击：${menuKey}`);

    // 扩展：根据菜单 key 执行不同逻辑
    const menuActions = {
      "MENU_HELP": "帮助中心",
      "MENU_ABOUT": "关于我们",
      "MENU_CONTACT": "联系我们",
    };

    const actionText = menuActions[menuKey];
    if (actionText) {
      return textReply(msg, `${actionText}功能开发中...`);
    }

    return textReply(msg, `菜单点击：${menuKey}`);
  },

  /**
   * 菜单跳转链接事件
   */
  async VIEW(msg) {
    const url = msg.EventKey;
    console.log(`[事件] 菜单跳转：${url}`);
    
    // 扩展：记录跳转统计
    // await trackViewEvent(msg.FromUserName, url);

    return textReply(msg, `正在为您跳转...`);
  },

  /**
   * 地理位置上报事件
   */
  async LOCATION(msg) {
    const { Latitude, Longitude, Precision } = msg;
    console.log(`[事件] 地理位置上报: ${Latitude}, ${Longitude}, 精度: ${Precision}`);
    
    // 扩展：更新用户位置信息
    // await userDb.updateLocation(msg.FromUserName, Latitude, Longitude);

    return null; // 地理位置上报不需要回复
  },

  /**
   * 模板消息发送结果事件
   */
  async TEMPLATESENDJOBFINISH(msg) {
    const { Status } = msg;
    console.log(`[事件] 模板消息发送结果: ${Status}`);
    return null; // 不需要回复
  },
};

/**
 * 事件消息主处理器
 * @param {Object} msg - 消息对象
 * @param {string} msg.FromUserName - 用户 OpenID
 * @param {string} msg.ToUserName - 公众号 ID
 * @param {number} msg.CreateTime - 事件创建时间戳
 * @param {string} msg.MsgType - 消息类型：event
 * @param {string} msg.Event - 事件类型：subscribe/unsubscribe/SCAN/CLICK/VIEW/LOCATION/TEMPLATESENDJOBFINISH
 * @param {string} [msg.EventKey] - 事件 Key（扫码场景值/菜单 Key/跳转链接）
 * @param {string} [msg.Ticket] - 二维码 Ticket（扫码事件）
 * @param {string} [msg.Latitude] - 纬度（位置上报事件）
 * @param {string} [msg.Longitude] - 经度（位置上报事件）
 * @param {string} [msg.Precision] - 精度（位置上报事件）
 * @param {string} [msg.Status] - 模板消息发送状态
 * @returns {Object|null} 回复消息对象
 * 
 * @example
 * // 订阅事件示例：
 * {
 *   FromUserName: 'o1234567890abcdef1234567890abcdef',
 *   ToUserName: 'gh_1234567890abcdef',
 *   CreateTime: 1672531200,
 *   MsgType: 'event',
 *   Event: 'subscribe',
 *   EventKey: 'qrscene_123456',
 *   Ticket: 'TICKET_1234567890'
 * }
 * 
 * @example
 * // 扫码事件示例（已关注用户）：
 * {
 *   FromUserName: 'o1234567890abcdef1234567890abcdef',
 *   ToUserName: 'gh_1234567890abcdef',
 *   CreateTime: 1672531200,
 *   MsgType: 'event',
 *   Event: 'SCAN',
 *   EventKey: '123456',
 *   Ticket: 'TICKET_1234567890'
 * }
 * 
 * @example
 * // 菜单点击事件示例：
 * {
 *   FromUserName: 'o1234567890abcdef1234567890abcdef',
 *   ToUserName: 'gh_1234567890abcdef',
 *   CreateTime: 1672531200,
 *   MsgType: 'event',
 *   Event: 'CLICK',
 *   EventKey: 'MENU_HELP'
 * }
 * 
 * @example
 * // 位置上报事件示例：
 * {
 *   FromUserName: 'o1234567890abcdef1234567890abcdef',
 *   ToUserName: 'gh_1234567890abcdef',
 *   CreateTime: 1672531200,
 *   MsgType: 'event',
 *   Event: 'LOCATION',
 *   Latitude: '39.9087',
 *   Longitude: '116.3975',
 *   Precision: '10'
 * }
 */
async function handleEvent(msg) {
  const eventType = msg.Event;
  console.log(`[事件] ${eventType} (来自: ${msg.FromUserName})`);

  const handler = eventHandlers[eventType];
  
  if (handler) {
    return await handler(msg);
  }

  console.log(`[事件] 未处理的事件类型: ${eventType}`);
  return textReply(msg, `收到事件：${eventType}`);
}

/**
 * 扩展方法：注册自定义事件处理器
 * @param {string} eventType - 事件类型
 * @param {Function} handler - 处理函数
 */
function registerEventHandler(eventType, handler) {
  eventHandlers[eventType] = handler;
}

/**
 * 扩展方法：获取所有已注册的事件类型
 * @returns {string[]} 事件类型列表
 */
function getRegisteredEvents() {
  return Object.keys(eventHandlers);
}

module.exports = {
  handleEvent,
  registerEventHandler,
  getRegisteredEvents,
  // 暴露事件处理器映射便于扩展
  eventHandlers,
};
