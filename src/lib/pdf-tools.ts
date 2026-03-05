import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

/**
 * 辅助函数：将特定的文字（包含中文）转为 PNG 字节流
 * 解决 pdf-lib 无法直接渲染中文的问题
 */
async function textToPngBytes(text: string, fontSize: number, color: string): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    // 设置高分辨率
    const ratio = 3;
    canvas.width = 400 * ratio;
    canvas.height = 50 * ratio;
    ctx.scale(ratio, ratio);
    
    // 设置字体：优先使用衬线体以匹配学术风格
    ctx.font = `bold ${fontSize}px "Noto Serif SC", serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 25);

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
  // 1. 并发获取：原始PDF、SVG Logo、以及生成的中文标题图片
  const [pdfRes, logoBytes, titleBytes] = await Promise.all([
    fetch(pdfUrl),
    svgToPngBytes('/favicon.svg', 100, 100),
    textToPngBytes('I.D.I.O.T. 若智', 22, '#e8e6e1') // 对应你的 --text 颜色
  ]);

  const pdfDoc = await PDFDocument.load(await pdfRes.arrayBuffer());
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // 嵌入图片
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const titleImage = await pdfDoc.embedPng(titleBytes);
  
  const pages = pdfDoc.getPages();
  const GOLD = rgb(0.83, 0.69, 0.22); // #d4af37

  pages.forEach((page: PDFPage, index: number) => {
    const { width, height } = page.getSize();
    const topMargin = 65; // 整体下移的基准线 [针对问题2]

    // 2. 绘制 Logo (左上角)
    const logoSize = 35;
    page.drawImage(logoImage, {
      x: 50,
      y: height - topMargin,
      width: logoSize,
      height: logoSize,
    });

    // 3. 绘制主标题 "I.D.I.O.T. 若智" [针对问题3]
    page.drawImage(titleImage, {
      x: 50 + logoSize + 12,
      y: height - topMargin + 10,
      width: 140, // 根据需要微调宽度
      height: 18,
    });

    // 4. 绘制期刊元数据 (紧跟在标题下方)
    const metaText = `I.D.I.O.T. JOURNAL | ${idiotId} | Vol. ${vol} Iss. ${issue}`;
    page.drawText(metaText, {
      x: 50 + logoSize + 12,
      y: height - topMargin - 4,
      size: 8,
      font: helveticaFont,
      color: GOLD,
    });

    // 5. 绘制分割线 [针对问题1]
    page.drawLine({
      start: { x: 50, y: height - topMargin - 15 },
      end: { x: width - 50, y: height - topMargin - 15 },
      thickness: 1.5,
      color: rgb(0.15, 0.15, 0.18), // 对应 --border 的深色调
    });

    // 6. 绘制页脚 (右下角页码)
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
