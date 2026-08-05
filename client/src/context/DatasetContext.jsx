import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { uploadDatasetFile, fetchDatasets } from '../services/uploadApi';
import { fetchValidationResults, fetchAnomalies } from '../services/validationApi';
import { fetchDashboardStats } from '../services/dashboardApi';

const DatasetContext = createContext(null);

export const DatasetProvider = ({ children }) => {
  const [activeDataset, setActiveDataset] = useState(null);
  const [datasetsList, setDatasetsList] = useState([]);
  const [validationResults, setValidationResults] = useState(null);
  const [anomalyResults, setAnomalyResults] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch list of datasets on mount
  const loadDatasets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchDatasets();
      if (res?.datasets) {
        setDatasetsList(res.datasets);
        // Set first dataset as active if none selected yet
        if (!activeDataset && res.datasets.length > 0) {
          setActiveDataset(res.datasets[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch datasets:', err);
    } finally {
      setLoading(false);
    }
  }, [activeDataset]);

  // Load dashboard stats
  const loadDashboardStats = useCallback(async () => {
    try {
      const res = await fetchDashboardStats();
      if (res?.data) {
        setDashboardStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  }, []);

  // Select active dataset and load its findings
  const selectDataset = useCallback(async (dataset) => {
    setActiveDataset(dataset);
    if (!dataset?._id) return;

    try {
      setLoading(true);
      setError(null);
      
      const [valRes, anomalyRes] = await Promise.allSettled([
        fetchValidationResults(dataset._id),
        fetchAnomalies(dataset._id),
      ]);

      if (valRes.status === 'fulfilled' && valRes.value?.validation) {
        setValidationResults(valRes.value.validation);
      }
      if (anomalyRes.status === 'fulfilled' && anomalyRes.value?.anomalies) {
        setAnomalyResults(anomalyRes.value.anomalies);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dataset details');
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload new dataset file
  const uploadDataset = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const res = await uploadDatasetFile(file);
      if (res?.dataset) {
        setActiveDataset(res.dataset);
        setDatasetsList((prev) => [res.dataset, ...prev]);
        await loadDashboardStats();
        return res.dataset;
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadDashboardStats]);

  useEffect(() => {
    loadDatasets();
    loadDashboardStats();
  }, []);

  return (
    <DatasetContext.Provider
      value={{
        activeDataset,
        datasetsList,
        validationResults,
        anomalyResults,
        dashboardStats,
        loading,
        error,
        setActiveDataset,
        selectDataset,
        uploadDataset,
        loadDatasets,
        loadDashboardStats,
        clearError: () => setError(null),
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
};

export default DatasetContext;
