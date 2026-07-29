const asyncHandler = require('express-async-handler');

const getDashboardStats = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      overallQualityScore: 94.2,
      totalDatasetsProcessed: 128,
      totalAnomaliesDetected: 342,
      criticalAlerts: 4,
      categoryDistribution: [
        { category: 'Electronics', anomalies: 45 },
        { category: 'Apparel', anomalies: 22 },
        { category: 'Home Goods', anomalies: 12 },
        { category: 'Beauty', anomalies: 8 },
      ],
      recentRuns: [
        { id: 'DS-001', name: 'ecommerce_transactions_2026.csv', score: 96.5, date: '2026-07-29' },
        { id: 'DS-002', name: 'user_logs_july.csv', score: 91.0, date: '2026-07-28' },
      ],
    },
  });
});

module.exports = { getDashboardStats };
