import api from './api';

export const uploadDatasetFile = async (file) => {
  const formData = new FormData();
  formData.append('dataset', file);

  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const fetchDatasets = async () => {
  return api.get('/upload');
};
