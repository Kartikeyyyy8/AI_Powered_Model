const API_BASE =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';


// ============================================================
// GET ANOMALY RESULTS
// ============================================================

export async function getAnomalyResults() {
  const response = await fetch(
    `${API_BASE}/anomaly/results`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      `Request failed: ${response.status}`
    );
  }

  return data;
}


// ============================================================
// GET LLM MODEL COMPARISON
// ============================================================

export async function getLLMComparison(
  anomalySummary
) {
  const response = await fetch(
    `${API_BASE}/anomaly/llm-comparison`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify(
        anomalySummary
      ),
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      `LLM request failed: ${response.status}`
    );
  }

  return data;
}