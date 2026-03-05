import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

/**
 * 辅助函数：将特定的文字（包含中文）转为 PNG 字节流
 */
async function textToPngBytes(text: string, fontSize: number, color: string): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const ratio = 3;
    // 增加画布宽度防止长标题截断
    canvas.width = 600 * ratio;
    canvas.height = 60 * ratio;
    ctx.scale(ratio, ratio);
    
    // 优先使用衬线字体
    ctx.font = `bold ${fontSize}px "Noto Serif SC", "Source Han Serif SC", serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 30);

    canvas.toBlob((blob) => {
      blob!.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
    }, 'image/png');
  });
}

/**
 * 辅助函数：SVG 转 PNG (保持原有逻辑)
 */
async function svgToPngBytes(svgUrl: string, width: number, height: number): Promise<Uint8Array> {
  const response = await fetch(svgUrl);
  const svgText = await response.text();
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        blob!.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
      }, 'image/png');
    };
    img.src = url;
  });
}

export async function stampPdf(pdfUrl: string, idiotId: string, vol: string, issue: string) {
  // 1. 并发获取：原始PDF、SVG Logo、以及生成的黑色标题图片
  const [pdfRes, logoBytes, titleBytes] = await Promise.all([
    fetch(pdfUrl),
    svgToPngBytes('/favicon.svg', 100, 100),
    textToPngBytes('I.D.I.O.T. 若智', 22, '#000000') // [优化3] 改为实心黑字
  ]);

  const pdfDoc = await PDFDocument.load(await pdfRes.arrayBuffer());
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const titleImage = await pdfDoc.embedPng(titleBytes);
  
  const pages = pdfDoc.getPages();
  const GOLD = rgb(0.83, 0.69, 0.22); // #d4af37

  pages.forEach((page: PDFPage, index: number) => {
    const { width, height } = page.getSize();
    const topMargin = 75; // 整体向下移动一点，增加呼吸感

    // 2. 绘制 Logo
    const logoSize = 40;
    const logoX = 50;
    const logoY = height - topMargin;
    page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoSize,
      height: logoSize,
    });

    // 3. 绘制主标题 [优化1] 重新计算 y 坐标实现垂直对齐
    page.drawImage(titleImage, {
      x: logoX + logoSize + 15,
      y: logoY + 16, // 使主标题位于 Logo 整体高度的上半部分
      width: 180, 
      height: 20,
    });

    // 4. 绘制期刊元数据
    const metaText = `I.D.I.O.T. JOURNAL | ${idiotId} | Vol. ${vol} Iss. ${issue}`;
    page.drawText(metaText, {
      x: logoX + logoSize + 15,
      y: logoY + 3, // 使元数据位于 Logo 整体高度的下半部分
      size: 8.5,
      font: helveticaFont,
      color: GOLD,
    });

    // 5. 绘制分割线 [优化2] 线条改为主题金色
    page.drawLine({
      start: { x: logoX, y: logoY - 12 },
      end: { x: width - 50, y: logoY - 12 },
      thickness: 1.2,
      color: GOLD,
    });

    // 6. 绘制页脚
    const footerText = `Page ${index + 1} of ${pages.length}`;
    const textWidth = helveticaFont.widthOfTextAtSize(footerText, 9);
    page.drawText(footerText, {
      x: width - textWidth - 50,
      y: 30,
      size: 9,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
  });

  return new Blob([await pdfDoc.save()], { type: 'application/pdf' });
}
