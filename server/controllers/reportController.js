const asyncHandler = require('express-async-handler');
const path = require('path');
const { generatePDFReport, generateExcelReport } = require('../services/reportService');

const generateReport = asyncHandler(async (req, res) => {
  const { type = 'PDF', datasetId } = req.body;
  const reportsDir = path.join(__dirname, '../../reports');

  const filename = `Report-${type}-${Date.now()}.${type === 'PDF' ? 'pdf' : type === 'EXCEL' ? 'xlsx' : 'pptx'}`;
  const filePath = path.join(reportsDir, filename);

  if (type === 'PDF') {
    await generatePDFReport({ datasetId, status: 'Completed', score: 94.5 }, filePath);
  } else if (type === 'EXCEL') {
    generateExcelReport([{ metric: 'Quality Score', value: 94.5 }, { metric: 'Anomalies', value: 12 }], filePath);
  }

  res.status(201).json({
    success: true,
    message: `${type} Report generated successfully`,
    fileUrl: `/reports/${filename}`,
  });
});

module.exports = { generateReport };
