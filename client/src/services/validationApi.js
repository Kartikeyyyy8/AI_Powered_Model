import api from './api';

export const runDatasetValidation = async (datasetId) => {
  return api.post(`/validation/${datasetId}`);
};

export const fetchValidationResults = async (datasetId) => {
  return api.get(`/validation/${datasetId}`);
};

export const fetchAnomalies = async (datasetId) => {
  return api.get(`/validation/anomalies/${datasetId}`);
};
