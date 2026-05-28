import { execSync } from 'child_process';
import os from 'os';

export function killPortProcess(port) {
  try {
    const platform = os.platform();
    if (platform === 'win32') {
      // Windows 平台：修复 findstr 为中文写法问题，转义反引号
      execSync(`for /f "tokens=5" %p in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %p`, { stdio: 'ignore' });
    } else {
      // Mac / Linux 平台
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
    }
    console.log(`✅ 端口 ${port} 占用已清理`);
  } catch (e) {
    // 端口未占用，忽略错误
  }
}