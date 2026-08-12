const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const uploadRoutes = require('./routes/uploadRoutes');
const validationRoutes = require('./routes/validationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const anomalyRoutes = require('./routes/anomalyRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// Serve REAL ML Engine reports
const reportsPath = path.join(__dirname, '../ml_engine/reports');

console.log('ML REPORTS PATH:', reportsPath);

app.use('/reports', express.static(reportsPath));

// API routes
app.use('/api/upload', uploadRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/anomaly', anomalyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AI-Powered Data Quality Backend API Server Active'
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;