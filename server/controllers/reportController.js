const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');

const {
  generatePDFReport,
  generateExcelReport
} = require('../services/reportService');


// Get REAL ML Engine reports
const getReports = asyncHandler(async (req, res) => {
  const reportsDir = path.join(__dirname, '../../ml_engine/reports');

  if (!fs.existsSync(reportsDir)) {
    return res.json({
      success: true,
      count: 0,
      reports: []
    });
  }

  const files = fs.readdirSync(reportsDir);

  const reports = files
    .filter((filename) => filename !== '.gitkeep')
    .map((filename) => {
      const filePath = path.join(reportsDir, filename);
      const stats = fs.statSync(filePath);

      return {
        filename,
        fileUrl: `/reports/${filename}`,
        size: stats.size,
        createdAt: stats.birthtime
      };
    });

  res.json({
    success: true,
    count: reports.length,
    reports
  });
});


// Existing report generation endpoint
const generateReport = asyncHandler(async (req, res) => {
  const { type = 'PDF', datasetId } = req.body;

  const reportsDir = path.join(__dirname, '../../reports');

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filename = `Report-${type}-${Date.now()}.${
    type === 'PDF'
      ? 'pdf'
      : type === 'EXCEL'
        ? 'xlsx'
        : 'pptx'
  }`;

  const filePath = path.join(reportsDir, filename);

  if (type === 'PDF') {
    await generatePDFReport(
      {
        datasetId,
        status: 'Completed',
        score: 94.5
      },
      filePath
    );
  } else if (type === 'EXCEL') {
    await generateExcelReport(
      [
        {
          metric: 'Quality Score',
          value: 94.5
        },
        {
          metric: 'Anomalies',
          value: 12
        }
      ],
      filePath
    );
  }

  res.status(201).json({
    success: true,
    message: `${type} Report generated successfully`,
    fileUrl: `/reports/${filename}`
  });
});


module.exports = {
  generateReport,
  getReports
};