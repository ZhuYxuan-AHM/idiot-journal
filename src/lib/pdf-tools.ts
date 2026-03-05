import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

export async function stampPdf(pdfUrl: string, idiotId: string, vol: string, issue: string) {
  const response = await fetch(pdfUrl);
  const existingPdfBytes = await response.arrayBuffer();

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  // 👇 修复了 (page, index) 的类型定义
  pages.forEach((page: PDFPage, index: number) => {
    const { width, height } = page.getSize();
    
    const headerText = `I.D.I.O.T. JOURNAL | ${idiotId} | Vol. ${vol} Iss. ${issue}`;
    page.drawText(headerText, {
      x: 50,
      y: height - 35,
      size: 9,
      font: helveticaFont,
      color: rgb(0.83, 0.69, 0.22),
    });

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
