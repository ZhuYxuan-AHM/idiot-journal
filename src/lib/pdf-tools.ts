import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

/**
 * 辅助函数：利用浏览器 Canvas 将 SVG 转换为 PNG 字节流
 */
async function svgToPngBytes(svgUrl: string, width: number, height: number): Promise<Uint8Array> {
  const response = await fetch(svgUrl);
  const svgText = await response.text();
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // 使用 2 倍甚至更高倍数以确保 PDF 中的清晰度
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject('Canvas context failed');
        return;
      }
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
        } else {
          reject('Blob conversion failed');
        }
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject('SVG load failed');
    };
    img.src = url;
  });
}

export async function stampPdf(pdfUrl: string, idiotId: string, vol: string, issue: string) {
  // 1. 并发获取原始 PDF 和转换后的 Logo
  const [pdfRes, logoPngBytes] = await Promise.all([
    fetch(pdfUrl),
    svgToPngBytes('/favicon.svg', 100, 100) // 👈 这里使用你 public 下的 favicon.svg
  ]);

  const existingPdfBytes = await pdfRes.arrayBuffer();

  // 2. 加载文档并嵌入资源
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // 嵌入图片
  const logoImage = await pdfDoc.embedPng(logoPngBytes);
  const logoDims = logoImage.scale(0.2); // 根据实际需要调整缩放比例

  const pages = pdfDoc.getPages();

  // 3. 遍历每一页注入 Logo 和文字
  pages.forEach((page: PDFPage, index: number) => {
    const { width, height } = page.getSize();
    
    // 绘制 Logo (左上角)
    page.drawImage(logoImage, {
      x: 50,
      y: height - 42,
      width: logoDims.width,
      height: logoDims.height,
    });

    // 绘制页眉文字 (紧跟在 Logo 右侧)
    const headerText = `I.D.I.O.T. JOURNAL | ${idiotId} | Vol. ${vol} Iss. ${issue}`;
    page.drawText(headerText, {
      x: 50 + logoDims.width + 12, // Logo 宽度 + 间距
      y: height - 35,
      size: 9,
      font: helveticaFont,
      color: rgb(0.83, 0.69, 0.22),
    });

    // 绘制页脚 (右下角页码)
    const footerText = `Page ${index + 1} of ${pages.length}`;
    const fontSize = 9;
    const textWidth = helveticaFont.widthOfTextAtSize(footerText, fontSize);
    
    page.drawText(footerText, {
      x: width - textWidth - 50,
      y: 25,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
