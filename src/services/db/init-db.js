/**
 * 数据库初始化服务
 * 在服务启动时执行数据库初始化脚本
 */

const fs = require('fs');
const path = require('path');
const { query, isConfigured } = require('./d1-client');

const SQL_DIR = path.join(__dirname, '../../../sql');

/**
 * 读取并执行 SQL 文件
 * @param {string} filename - SQL 文件名
 */
async function executeSqlFile(filename) {
  const filePath = path.join(SQL_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`[init-db] SQL 文件不存在: ${filePath}`);
    return;
  }
  
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // 按分号分割 SQL 语句（简单处理，不处理字符串内的分号）
    const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const sql of statements) {
      if (sql.toLowerCase().startsWith('--') || sql.toLowerCase().startsWith('/*')) {
        continue; // 跳过注释
      }
      
      console.log(`[init-db] 执行: ${sql.substring(0, 50)}...`);
      const result = await query(sql);
      if (!result.success) {
        console.error(`[init-db] 执行失败: ${result.error}`);
      }
    }
    
    console.log(`[init-db] 已执行 SQL 文件: ${filename}`);
  } catch (error) {
    console.error(`[init-db] 读取 SQL 文件失败: ${filename}`, error);
  }
}

/**
 * 初始化所有数据库表
 */
async function initDatabase() {
  if (!isConfigured()) {
    console.log('[init-db] D1 未配置，跳过数据库初始化');
    return;
  }
  
  console.log('[init-db] 开始初始化数据库...');
  
  try {
    // 执行所有 SQL 文件
    const sqlFiles = fs.readdirSync(SQL_DIR).filter(f => f.endsWith('.sql'));
    
    for (const file of sqlFiles) {
      await executeSqlFile(file);
    }
    
    console.log('[init-db] 数据库初始化完成');
  } catch (error) {
    console.error('[init-db] 数据库初始化失败:', error);
  }
}

module.exports = {
  initDatabase
};