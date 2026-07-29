import api from './api';

export const generateReport = async (reportType, datasetId) => {
  return api.post('/reports/generate', { type: reportType, datasetId });
};
