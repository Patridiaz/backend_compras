import PdfPrinter = require('pdfmake');

try {
  const printer = new PdfPrinter({
    Roboto: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    }
  });

  const docDefinition = {
    content: ['Hello World']
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  pdfDoc.end();
  console.log('PDF generation successful');
} catch (error) {
  console.error('Error generating PDF:', error);
}
