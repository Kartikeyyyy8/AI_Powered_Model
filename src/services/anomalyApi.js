import api from './api';

/**
 * Fetch the anomaly summary from the latest ML engine pipeline report.
 * Returns: { success, anomaly_summary, report_file }
 */
export const getAnomalyResults = async () => {
  return api.get('/anomaly/results');
};

/**
 * Request an LLM comparison/interpretation of the anomaly results.
 * The LLM only interprets measured numbers — never performs detection.
 *
 * @param {Object} anomalySummary - The anomaly_summary object from getAnomalyResults
 * Returns: { success, sections, raw_text }
 */
export const getLLMComparison = async (anomalySummary) => {
  return api.post('/anomaly/llm-comparison', { anomaly_summary: anomalySummary });
};
