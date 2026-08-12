import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  Shield,
  Zap,
  TrendingUp,
  RefreshCw,
  Bot,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { getAnomalyResults, getLLMComparison } from '../services/anomalyApi';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL_COLORS = {
  'Isolation Forest': '#6366f1',
  'Local Outlier Factor': '#06b6d4',
  'One-Class SVM': '#10b981',
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single model metric card */
const ModelCard = ({ model, anomalies, anomalyPct, executionTime, rows, color, icon: Icon }) => (
  <div
    className="glass-card"
    style={{
      padding: '1.5rem',
      flex: '1 1 220px',
      borderTop: `3px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <div
        style={{
          background: `${color}22`,
          borderRadius: '10px',
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{model}</span>
    </div>

    <div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color }}>
        {anomalies.toLocaleString()}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>anomalies detected</div>
    </div>

    <div style={{ display: 'flex', gap: '1.5rem' }}>
      <div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{anomalyPct}%</div>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>of dataset</div>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Clock size={12} style={{ color: 'var(--text-dim)' }} />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{executionTime}s</span>
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>exec time</div>
      </div>
      <div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{rows.toLocaleString()}</div>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>rows analysed</div>
      </div>
    </div>
  </div>
);

/** Custom bar chart tooltip */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(17,24,39,0.97)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        color: '#f3f4f6',
        fontSize: '0.85rem',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
          {p.name === 'Anomalies' ? '' : 's'}
        </div>
      ))}
    </div>
  );
};

/** LLM Section display */
const LLMSection = ({ data, loading, error, onRetry }) => {
  if (loading) {
    return (
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          border: '1px solid rgba(139,92,246,0.3)',
        }}
      >
        <Loader2 size={32} style={{ color: 'var(--accent-secondary)', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)' }}>Generating AI model comparison…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          border: '1px solid rgba(244,63,94,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-rose)' }}>
          <XCircle size={20} />
          <strong>AI Comparison Unavailable</strong>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{error}</p>
        <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={onRetry}>
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { sections } = data;
  const labelMap = {
    OVERALL_ASSESSMENT: 'Overall Assessment',
    BEST_COVERAGE: 'Best Coverage',
    FASTEST_MODEL: 'Fastest Model',
    MODEL_AGREEMENT: 'Model Agreement',
    CONSENSUS_MEANING: 'Consensus Meaning',
    RECOMMENDED_ACTION: 'Recommended Action',
    LIMITATIONS: 'Important Limitations',
  };
  const accentMap = {
    RECOMMENDED_ACTION: 'var(--accent-emerald)',
    LIMITATIONS: 'var(--accent-amber)',
    BEST_COVERAGE: 'var(--accent-primary)',
    FASTEST_MODEL: 'var(--accent-cyan)',
  };

  return (
    <div
      className="glass-card"
      style={{
        padding: '2rem',
        border: '1px solid rgba(139,92,246,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ background: 'var(--gradient-primary)', padding: '0.5rem', borderRadius: '10px' }}>
          <Bot size={22} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem' }}>AI Model Comparison</div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            Gemini interprets measured results only — no ground-truth labels exist
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {Object.entries(labelMap).map(([key, label]) => {
          const content = sections?.[key];
          if (!content) return null;
          const accent = accentMap[key] || 'var(--text-muted)';
          return (
            <div
              key={key}
              style={{
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                borderLeft: `3px solid ${accent}`,
              }}
            >
              <div style={{ fontWeight: 600, color: accent, fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
              </div>
              <p style={{ color: 'var(--text-main)', fontSize: '0.875rem', lineHeight: 1.6 }}>{content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

const Anomaly = () => {
  const [anomalyData, setAnomalyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [llmData, setLlmData] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState(null);
  const [llmRequested, setLlmRequested] = useState(false);

  const [page, setPage] = useState(0);

  // ------------------------------------------------------------------
  // Fetch anomaly results
  // ------------------------------------------------------------------
  const fetchAnomalyResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnomalyResults();
      if (res.success && res.anomaly_summary) {
        setAnomalyData(res.anomaly_summary);
      } else {
        setError(res.message || 'No anomaly results available.');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch anomaly results.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnomalyResults();
  }, [fetchAnomalyResults]);

  // ------------------------------------------------------------------
  // LLM comparison
  // ------------------------------------------------------------------
  const fetchLLMComparison = useCallback(async (summary) => {
    setLlmLoading(true);
    setLlmError(null);
    setLlmRequested(true);
    try {
      const res = await getLLMComparison(summary);
      if (res.success) {
        setLlmData(res);
      } else {
        setLlmError(res.message || 'LLM comparison failed.');
      }
    } catch (err) {
      setLlmError(err.message || 'Failed to get AI comparison.');
    } finally {
      setLlmLoading(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------------
  const summary = anomalyData;
  const modelComparison = summary?.model_comparison || [];
  const anomalyRecords = summary?.anomaly_records || [];
  const totalRows = summary?.total_rows_analysed || 0;

  // Pagination
  const totalPages = Math.ceil(anomalyRecords.length / PAGE_SIZE);
  const pageRecords = anomalyRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // High confidence = 2+ models; Very high = all 3
  const highConfidence = anomalyRecords.filter((r) => r.model_vote_count >= 2).length;
  const veryHighConfidence = anomalyRecords.filter((r) => r.model_vote_count === 3).length;

  // Chart data
  const countChartData = modelComparison.map((m) => ({
    name: m.model.replace('Local Outlier Factor', 'LOF').replace('One-Class SVM', 'OC-SVM'),
    fullName: m.model,
    Anomalies: m.anomalies,
  }));

  const timeChartData = modelComparison.map((m) => ({
    name: m.model.replace('Local Outlier Factor', 'LOF').replace('One-Class SVM', 'OC-SVM'),
    fullName: m.model,
    'Time (s)': m.execution_time_sec,
  }));

  const modelIcons = [AlertTriangle, TrendingUp, Zap];

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
            Anomaly Detection
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Loading anomaly detection results…</p>
        </div>
        <div className="glass-card" style={{ padding: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <Loader2 size={28} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-muted)' }}>Fetching results from ML engine…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
            Anomaly Detection
          </h2>
        </div>
        <div
          className="glass-card"
          style={{
            padding: '2rem',
            border: '1px solid rgba(244,63,94,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-rose)' }}>
            <XCircle size={22} />
            <strong style={{ fontSize: '1rem' }}>No Anomaly Results Available</strong>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          <button className="btn-primary" onClick={fetchAnomalyResults} style={{ alignSelf: 'flex-start' }}>
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ---------------------------------------------------------------- */}
      {/* Header                                                           */}
      {/* ---------------------------------------------------------------- */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Anomaly Detection
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Three-model ML anomaly detection: Isolation Forest, Local Outlier Factor, and One-Class SVM.
          Consensus = flagged by ≥ 2 of 3 models.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <Database size={15} />
            <span><strong style={{ color: '#fff' }}>{totalRows.toLocaleString()}</strong> rows analysed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <Shield size={15} />
            <span>Features: <strong style={{ color: '#fff' }}>{(summary?.features_used || []).join(', ')}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <Info size={15} />
            <span>Contamination rate: <strong style={{ color: '#fff' }}>{(summary?.contamination_rate || 0.05) * 100}%</strong></span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Model Cards                                                      */}
      {/* ---------------------------------------------------------------- */}
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        {modelComparison.map((m, i) => (
          <ModelCard
            key={m.model}
            model={m.model}
            anomalies={m.anomalies}
            anomalyPct={m.anomaly_pct}
            executionTime={m.execution_time_sec}
            rows={m.rows_analysed}
            color={MODEL_COLORS[m.model] || '#6366f1'}
            icon={modelIcons[i] || AlertTriangle}
          />
        ))}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Model Comparison Charts                                          */}
      {/* ---------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>

        {/* Anomaly Count Chart */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            Model vs Anomaly Count
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Total anomalies detected by each model
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={countChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Anomalies" radius={[6, 6, 0, 0]}>
                {countChartData.map((entry) => (
                  <Cell key={entry.fullName} fill={MODEL_COLORS[entry.fullName] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Execution Time Chart */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            Model vs Execution Time
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Seconds taken by each model (lower is faster)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Time (s)" radius={[6, 6, 0, 0]}>
                {timeChartData.map((entry) => (
                  <Cell key={entry.fullName} fill={MODEL_COLORS[entry.fullName] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Consensus Section                                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(99,102,241,0.2)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
          Consensus Analysis
        </h3>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>

          <div style={{ flex: 1, minWidth: 180, background: 'rgba(99,102,241,0.1)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              All Consensus Anomalies
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {(summary?.consensus_anomalies || 0).toLocaleString()}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {summary?.consensus_pct || 0}% of dataset · flagged by ≥ 2 models
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 180, background: 'rgba(245,158,11,0.1)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              High Confidence (≥ 2 models)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
              {highConfidence.toLocaleString()}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              in shown records (≤ 200)
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 180, background: 'rgba(244,63,94,0.1)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(244,63,94,0.2)' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Very High Confidence (all 3)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
              {veryHighConfidence.toLocaleString()}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              in shown records (≤ 200)
            </div>
          </div>

        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Anomaly Records Table                                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Anomaly Records</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Showing top {Math.min(anomalyRecords.length, 200)} records (consensus-prioritised). Page {page + 1}/{Math.max(totalPages, 1)}.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ padding: '0.4rem 0.75rem' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="btn-secondary"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{ padding: '0.4rem 0.75rem' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {anomalyRecords.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>
            No anomaly records returned.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  {['Index', 'Transaction ID', 'Customer ID', 'Quantity', 'Price', 'Vote Count', 'Models Flagged'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.6rem 0.75rem',
                        textAlign: 'left',
                        color: 'var(--text-dim)',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRecords.map((row, i) => {
                  const voteCount = row.model_vote_count || 0;
                  const voteColor =
                    voteCount === 3
                      ? 'var(--accent-rose)'
                      : voteCount === 2
                      ? 'var(--accent-amber)'
                      : 'var(--text-muted)';

                  return (
                    <tr
                      key={row.anomaly_index ?? i}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-dim)' }}>
                        {row.anomaly_index ?? '-'}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {row.Transaction_ID ?? '-'}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {row.Customer_ID ?? '-'}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#fff', fontWeight: 600 }}>
                        {row.Quantity ?? '-'}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#fff', fontWeight: 600 }}>
                        {row.Price != null ? `$${Number(row.Price).toFixed(2)}` : '-'}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span
                          style={{
                            background: `${voteColor}22`,
                            color: voteColor,
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                          }}
                        >
                          {voteCount}/3
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {(row.models_flagged || []).map((mf) => (
                            <span
                              key={mf}
                              style={{
                                background: `${MODEL_COLORS[mf] || '#6366f1'}22`,
                                color: MODEL_COLORS[mf] || '#6366f1',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '5px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {mf === 'Isolation Forest' ? 'IF' : mf === 'Local Outlier Factor' ? 'LOF' : 'SVM'}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* AI Model Comparison Section                                      */}
      {/* ---------------------------------------------------------------- */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>AI Model Comparison</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Powered by Gemini · interprets measured numbers only · requires GEMINI_API_KEY
            </p>
          </div>
          {!llmRequested && (
            <button
              className="btn-primary"
              onClick={() => fetchLLMComparison(summary)}
            >
              <Bot size={16} /> Generate AI Comparison
            </button>
          )}
          {llmRequested && !llmLoading && (
            <button
              className="btn-secondary"
              onClick={() => fetchLLMComparison(summary)}
            >
              <RefreshCw size={15} /> Regenerate
            </button>
          )}
        </div>

        {!llmRequested && !llmLoading && (
          <div
            className="glass-card"
            style={{
              padding: '2rem',
              textAlign: 'center',
              border: '1px dashed rgba(139,92,246,0.3)',
              color: 'var(--text-muted)',
            }}
          >
            <Bot size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
            <p>Click <strong>"Generate AI Comparison"</strong> to get an LLM-powered interpretation of the model results.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--text-dim)' }}>
              The LLM only interprets measured numbers. It cannot invent accuracy or recall without ground-truth labels.
            </p>
          </div>
        )}

        <LLMSection
          data={llmData}
          loading={llmLoading}
          error={llmError}
          onRetry={() => fetchLLMComparison(summary)}
        />
      </div>

    </div>
  );
};

export default Anomaly;
