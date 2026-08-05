import api from './api';

export const fetchDashboardStats = async () => {
  return api.get('/dashboard');
};
