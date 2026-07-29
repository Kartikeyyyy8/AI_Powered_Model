const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const uploadRoutes = require('./routes/uploadRoutes');
const validationRoutes = require('./routes/validationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads and reports static folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/reports', express.static(path.join(__dirname, '../reports')));

// Mount API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AI-Powered Data Quality Backend API Server Active' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
