const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const generatePDFReport = (reportData, outputPath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.fontSize(20).text('Data Quality & Anomaly Assessment Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated On: ${new Date().toLocaleString()}`);
    doc.moveDown();
    doc.fontSize(14).text('Summary Overview:', { underline: true });
    doc.fontSize(11).text(JSON.stringify(reportData, null, 2));

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', (err) => reject(err));
  });
};

const generateExcelReport = (dataArray, outputPath) => {
  const worksheet = XLSX.utils.json_to_sheet(dataArray);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit_Report');
  XLSX.writeFile(workbook, outputPath);
  return outputPath;
};

module.exports = { generatePDFReport, generateExcelReport };
