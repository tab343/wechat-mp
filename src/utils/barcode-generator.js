/**
 * 条形码生成器工具类
 * 纯 JavaScript 实现，兼容 Cloudflare Worker 环境
 * 
 * 支持 Code128A 编码，可生成 PNG 格式条形码图片
 */

/**
 * PNG 生成器内部类
 */
class PNGGenerator {
  static crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    return table;
  })();

  static crc32(data) {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = PNGGenerator.crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  static createChunk(type, data) {
    const length = new Uint32Array([data.length]);
    const typeData = new TextEncoder().encode(type);
    const crcData = new Uint8Array(typeData.length + data.length);
    crcData.set(typeData);
    crcData.set(data, typeData.length);
    const crc = new Uint32Array([PNGGenerator.crc32(crcData)]);
    
    const chunk = new Uint8Array(4 + 4 + data.length + 4);
    chunk.set(new Uint8Array(length.buffer), 0);
    chunk.set(typeData, 4);
    chunk.set(data, 8);
    chunk.set(new Uint8Array(crc.buffer), 8 + data.length);
    
    return chunk;
  }

  static createIHDR(width, height) {
    const data = new Uint8Array(13);
    const w = new Uint32Array([width]);
    const h = new Uint32Array([height]);
    data.set(new Uint8Array(w.buffer), 0);
    data.set(new Uint8Array(h.buffer), 4);
    data[8] = 8;  // bit depth
    data[9] = 2;  // color type (RGB)
    data[10] = 0; // compression
    data[11] = 0; // filter
    data[12] = 0; // interlace
    return PNGGenerator.createChunk('IHDR', data);
  }

  static createIDAT(rawData, width, height) {
    const filtered = new Uint8Array((width * 3 + 1) * height);
    for (let y = 0; y < height; y++) {
      filtered[y * (width * 3 + 1)] = 0;
      for (let x = 0; x < width * 3; x++) {
        filtered[y * (width * 3 + 1) + 1 + x] = rawData[y * width * 3 + x];
      }
    }
    
    const compressed = PNGGenerator.deflate(filtered);
    return PNGGenerator.createChunk('IDAT', compressed);
  }

  static deflate(data) {
    const result = new Uint8Array(data.length + 6);
    result[0] = 0x78;
    result[1] = 0x01;
    
    const len = data.length;
    result[2] = len & 0xff;
    result[3] = (len >> 8) & 0xff;
    result[4] = (~len) & 0xff;
    result[5] = ((~len) >> 8) & 0xff;
    result.set(data, 6);
    
    let s1 = 1, s2 = 0;
    for (let i = 0; i < data.length; i++) {
      s1 = (s1 + data[i]) % 65521;
      s2 = (s2 + s1) % 65521;
    }
    const adler = new Uint32Array([((s2 << 16) | s1) >>> 0]);
    const final = new Uint8Array(result.length + 4);
    final.set(result);
    final.set(new Uint8Array(adler.buffer), result.length);
    
    return final;
  }

  static createIEND() {
    return PNGGenerator.createChunk('IEND', new Uint8Array(0));
  }

  static createPNG(width, height, pixels) {
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = PNGGenerator.createIHDR(width, height);
    const idat = PNGGenerator.createIDAT(pixels, width, height);
    const iend = PNGGenerator.createIEND();
    
    const png = new Uint8Array(signature.length + ihdr.length + idat.length + iend.length);
    let offset = 0;
    png.set(signature, offset); offset += signature.length;
    png.set(ihdr, offset); offset += ihdr.length;
    png.set(idat, offset); offset += idat.length;
    png.set(iend, offset);
    
    return png;
  }
}

// 8x8 像素字体
const FONT = {
  '0': [0x3e, 0x63, 0x73, 0x7b, 0x6f, 0x63, 0x3e, 0x00],
  '1': [0x18, 0x38, 0x58, 0x18, 0x18, 0x18, 0x3c, 0x00],
  '2': [0x3e, 0x63, 0x03, 0x1e, 0x3c, 0x60, 0x7f, 0x00],
  '3': [0x3e, 0x63, 0x03, 0x1e, 0x03, 0x63, 0x3e, 0x00],
  '4': [0x0c, 0x1c, 0x2c, 0x4c, 0x7f, 0x0c, 0x0c, 0x00],
  '5': [0x7f, 0x60, 0x7e, 0x03, 0x03, 0x63, 0x3e, 0x00],
  '6': [0x1e, 0x30, 0x60, 0x7e, 0x63, 0x63, 0x3e, 0x00],
  '7': [0x7f, 0x03, 0x06, 0x0c, 0x18, 0x18, 0x18, 0x00],
  '8': [0x3e, 0x63, 0x63, 0x3e, 0x63, 0x63, 0x3e, 0x00],
  '9': [0x3e, 0x63, 0x63, 0x3f, 0x03, 0x06, 0x1e, 0x00],
  'A': [0x1c, 0x36, 0x63, 0x7f, 0x63, 0x63, 0x63, 0x00],
  'B': [0x7e, 0x63, 0x63, 0x7e, 0x63, 0x63, 0x7e, 0x00],
  'C': [0x3e, 0x63, 0x60, 0x60, 0x60, 0x63, 0x3e, 0x00],
  'D': [0x7e, 0x63, 0x63, 0x63, 0x63, 0x63, 0x7e, 0x00],
  'E': [0x7f, 0x60, 0x60, 0x7e, 0x60, 0x60, 0x7f, 0x00],
  'F': [0x7f, 0x60, 0x60, 0x7e, 0x60, 0x60, 0x60, 0x00],
  'G': [0x3e, 0x63, 0x60, 0x7e, 0x63, 0x63, 0x3e, 0x00],
  'H': [0x63, 0x63, 0x63, 0x7f, 0x63, 0x63, 0x63, 0x00],
  'I': [0x3e, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3e, 0x00],
  'J': [0x1e, 0x0c, 0x0c, 0x0c, 0x0c, 0x6c, 0x38, 0x00],
  'K': [0x63, 0x66, 0x6c, 0x78, 0x6c, 0x66, 0x63, 0x00],
  'L': [0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7f, 0x00],
  'M': [0x63, 0x77, 0x7f, 0x7f, 0x6b, 0x63, 0x63, 0x00],
  'N': [0x63, 0x63, 0x73, 0x7b, 0x6f, 0x63, 0x63, 0x00],
  'O': [0x3e, 0x63, 0x63, 0x63, 0x63, 0x63, 0x3e, 0x00],
  'P': [0x7e, 0x63, 0x63, 0x7e, 0x60, 0x60, 0x60, 0x00],
  'Q': [0x3e, 0x63, 0x63, 0x63, 0x6b, 0x67, 0x3f, 0x00],
  'R': [0x7e, 0x63, 0x63, 0x7e, 0x6c, 0x66, 0x63, 0x00],
  'S': [0x3e, 0x63, 0x60, 0x3e, 0x03, 0x63, 0x3e, 0x00],
  'T': [0x7f, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00],
  'U': [0x63, 0x63, 0x63, 0x63, 0x63, 0x63, 0x3e, 0x00],
  'V': [0x63, 0x63, 0x63, 0x63, 0x63, 0x36, 0x1c, 0x00],
  'W': [0x63, 0x63, 0x6b, 0x7f, 0x7f, 0x77, 0x63, 0x00],
  'X': [0x63, 0x63, 0x36, 0x1c, 0x36, 0x63, 0x63, 0x00],
  'Y': [0x63, 0x63, 0x63, 0x36, 0x1c, 0x18, 0x18, 0x00],
  'Z': [0x7f, 0x03, 0x06, 0x0c, 0x18, 0x30, 0x7f, 0x00],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  '?': [0x3e, 0x63, 0x03, 0x06, 0x0c, 0x00, 0x0c, 0x00]
};

// Code128A 编码表
const CODE128A = {
  '0': 16, '1': 17, '2': 18, '3': 19, '4': 20, '5': 21, '6': 22, '7': 23, '8': 24, '9': 25,
  'A': 36, 'B': 37, 'C': 38, 'D': 39, 'E': 40, 'F': 41, 'G': 42, 'H': 43, 'I': 44, 'J': 45,
  'K': 46, 'L': 47, 'M': 48, 'N': 49, 'O': 50, 'P': 51, 'Q': 52, 'R': 53, 'S': 54, 'T': 55,
  'U': 56, 'V': 57, 'W': 58, 'X': 59, 'Y': 60, 'Z': 61,
  ' ': 32, '!': 1, '"': 2, '#': 3, '$': 4, '%': 5, '&': 6, '\'': 7, '(': 8, ')': 9,
  '*': 10, '+': 11, ',': 12, '-': 13, '.': 14, '/': 15,
  ':': 26, ';': 27, '<': 28, '=': 29, '>': 30, '?': 31,
  '@': 33, '[': 34, '\\': 35, ']': 62, '^': 63, '_': 64
};

// Code128 码型
const CODE_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

/**
 * 计算 Code128 校验码
 */
function calculateChecksum(data) {
  let sum = 104; // Start Code A
  for (let i = 0; i < data.length; i++) {
    sum += (i + 1) * data[i];
  }
  return sum % 103;
}

/**
 * 生成 Code128 条形码 PNG 图片
 * @param {string} text - 要编码的文本（只支持 Code128A 字符集）
 * @param {number} [scale=2] - 缩放比例
 * @param {number} [height=30] - 条形码高度（像素）
 * @returns {Uint8Array} PNG 图片数据
 */
export function generateCode128Barcode(text, scale = 2, height = 30) {
  // 编码文本
  const encodedData = [];
  for (const char of text) {
    const code = CODE128A[char];
    if (code === undefined) {
      throw new Error(`不支持的字符: ${char}，请使用 Code128A 字符集`);
    }
    encodedData.push(code);
  }

  // 添加起始码、校验码、终止码
  const startCode = 103; // Code A
  const checksum = calculateChecksum([startCode, ...encodedData]);
  const stopCode = 106;
  const fullCode = [startCode, ...encodedData, checksum, stopCode];

  // 生成条/空模式
  let pattern = '';
  for (const code of fullCode) {
    pattern += CODE_PATTERNS[code];
  }

  // 计算图片尺寸
  const barWidth = pattern.length * scale;
  const imgWidth = barWidth + 40;
  const imgHeight = height + 20;

  // 创建像素数据 (RGB)
  const pixels = new Uint8Array(imgWidth * imgHeight * 3);
  
  // 填充白色背景
  for (let i = 0; i < pixels.length; i += 3) {
    pixels[i] = 255;     // R
    pixels[i + 1] = 255; // G
    pixels[i + 2] = 255; // B
  }

  // 绘制条形码
  let x = 20;
  for (let i = 0; i < pattern.length; i++) {
    const bar = pattern[i] === '1';
    const width = parseInt(pattern[i]) * scale;
    if (bar) {
      for (let wx = 0; wx < width; wx++) {
        for (let y = 5; y < height + 5; y++) {
          const idx = ((y * imgWidth) + (x + wx)) * 3;
          pixels[idx] = 0;
          pixels[idx + 1] = 0;
          pixels[idx + 2] = 0;
        }
      }
    }
    x += width;
  }

  // 绘制文本
  const textY = height + 15;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charData = FONT[char] || FONT['?'];
    if (charData) {
      const charX = Math.floor((imgWidth - text.length * 8) / 2) + i * 8;
      for (let fy = 0; fy < 8; fy++) {
        for (let fx = 0; fx < 8; fx++) {
          if (charData[fy] & (1 << (7 - fx))) {
            const idx = ((textY + fy) * imgWidth + charX + fx) * 3;
            pixels[idx] = 0;
            pixels[idx + 1] = 0;
            pixels[idx + 2] = 0;
          }
        }
      }
    }
  }

  return PNGGenerator.createPNG(imgWidth, imgHeight, pixels);
}

/**
 * 检测是否为 Cloudflare Worker 环境
 */
export function isCloudflareEnvironment() {
  return process.env.CF_PAGES || process.env.CF_WORKER || 
         (typeof caches !== 'undefined' && typeof fetch !== 'undefined' && typeof Request !== 'undefined');
}

export default {
  generateCode128Barcode,
  isCloudflareEnvironment
};
