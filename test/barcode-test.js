/**
 * 条形码生成测试脚本
 */
import bwipjs from "bwip-js";
import fs from "fs";
import path from "path";

async function testBarcode() {
  const memberCode = "5101237031828111";
  
  console.log(`测试条形码生成，会员码: ${memberCode}`);
  
  try {
    // 使用 bwip-js 生成条形码
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: memberCode,
      scale: 2,
      height: 30,
      includetext: true,
      textxalign: 'center',
      textsize: 12
    });
    
    // 保存到临时文件
    const outputPath = path.join(path.dirname(import.meta.url).replace('file:///', ''), '../public/temp/test_barcode.png');
    fs.writeFileSync(outputPath, pngBuffer);
    
    console.log(`✅ 条形码生成成功！`);
    console.log(`📁 保存路径: ${outputPath}`);
    console.log(`📐 文件大小: ${pngBuffer.length} bytes`);
    
    return true;
  } catch (error) {
    console.error(`❌ 条形码生成失败: ${error.message}`);
    return false;
  }
}

testBarcode();