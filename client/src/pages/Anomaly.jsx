import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { getAnomalyResults, getLLMComparison } from '../services/anomalyApi';
import { useDataset } from '../context/DatasetContext';


const Anomaly = () => {
  const { activeDataset } = useDataset();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [llmResult, setLlmResult] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const recordsPerPage = 20;


  // ============================================================
  // LOAD ANOMALY RESULTS
  // ============================================================

  const loadAnomalyResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getAnomalyResults();

      console.log('ANOMALY RESULTS:', response);

      const data =
        response?.anomaly_summary ||
        response?.data?.anomaly_summary ||
        response?.data ||
        response;

      if (!data) {
        throw new Error('No anomaly results returned by backend.');
      }

      setSummary(data);

    } catch (err) {
      console.error('Failed to load anomaly results:', err);

      setError(
        err.message ||
        'Failed to load anomaly detection results.'
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadAnomalyResults();
  }, []);


  // ============================================================
  // MODEL COMPARISON
  // ============================================================

  const modelComparison = useMemo(() => {

    if (
      summary?.model_comparison &&
      Array.isArray(summary.model_comparison)
    ) {
      return summary.model_comparison;
    }

    return [
      {
        model: 'Isolation Forest',
        anomalies:
          summary?.isolation_forest_anomalies || 0,
        anomaly_pct:
          summary?.isolation_forest_pct || 0,
        execution_time_sec: 0,
      },
      {
        model: 'Local Outlier Factor',
        anomalies:
          summary?.lof_anomalies || 0,
        anomaly_pct:
          summary?.lof_pct || 0,
        execution_time_sec: 0,
      },
      {
        model: 'One-Class SVM',
        anomalies:
          summary?.one_class_svm_anomalies || 0,
        anomaly_pct:
          summary?.one_class_svm_pct || 0,
        execution_time_sec: 0,
      },
    ];

  }, [summary]);


  // ============================================================
  // CHART DATA
  // ============================================================

  const anomalyChartData =
    modelComparison.map((item) => ({
      name:
        item.model === 'Local Outlier Factor'
          ? 'LOF'
          : item.model === 'One-Class SVM'
            ? 'One-Class SVM'
            : 'Isolation Forest',

      anomalies:
        Number(item.anomalies) || 0,
    }));


  const executionChartData =
    modelComparison.map((item) => ({
      name:
        item.model === 'Local Outlier Factor'
          ? 'LOF'
          : item.model === 'One-Class SVM'
            ? 'One-Class SVM'
            : 'Isolation Forest',

      seconds:
        Number(item.execution_time_sec) || 0,
    }));


  // ============================================================
  // ANOMALY RECORDS
  // ============================================================

  const anomalyRecords =
    Array.isArray(summary?.anomaly_records)
      ? summary.anomaly_records
      : [];


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        anomalyRecords.length /
        recordsPerPage
      )
    );


  const paginatedRecords =
    anomalyRecords.slice(
      (currentPage - 1) *
        recordsPerPage,

      currentPage *
        recordsPerPage
    );


  // ============================================================
  // LLM COMPARISON
  // ============================================================

  const runLLMComparison = async () => {

    if (!summary) {
      return;
    }

    try {

      setLlmLoading(true);
      setLlmError(null);

      const response =
        await getLLMComparison({anomaly_summary:summary,});

      console.log(
        'LLM COMPARISON:',
        response
      );

      setLlmResult(
        response?.comparison ||
        response?.data?.comparison ||
        response?.result ||
        response?.data ||
        response
      );

    } catch (err) {

      console.error(
        'LLM comparison failed:',
        err
      );

      setLlmError(
        err.message ||
        'LLM comparison failed.'
      );

    } finally {

      setLlmLoading(false);

    }
  };


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {

    return (
      <div
        style={{
          padding: '3rem',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <h2>
          Loading anomaly detection results...
        </h2>

        <p
          style={{
            color: 'var(--text-muted)',
          }}
        >
          Running model comparison data.
        </p>
      </div>
    );
  }


  // ============================================================
  // ERROR
  // ============================================================

  if (error) {

    return (
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          color: '#fff',
        }}
      >

        <h2
          style={{
            marginBottom: '1rem',
          }}
        >
          Anomaly Detection
        </h2>

        <p
          style={{
            color: '#ff6b6b',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </p>

        <button
          onClick={loadAnomalyResults}
          style={{
            padding: '0.7rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: '#6366f1',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          Retry
        </button>

      </div>
    );
  }


  // ============================================================
  // MAIN DASHBOARD
  // ============================================================

  return (

    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div>

        <h2
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#fff',
            marginBottom: '0.4rem',
          }}
        >
          Machine Learning Anomaly Detection
        </h2>

        <p
          style={{
            color: 'var(--text-muted)',
          }}
        >
          Three-model anomaly detection using
          Isolation Forest, LOF, and One-Class SVM
          for{' '}
          <strong>
            {activeDataset?.originalName ||
              'Active Dataset'}
          </strong>
        </p>

      </div>


      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >

        <SummaryCard
          title="Rows Analysed"
          value={
            summary?.total_rows_analysed ||
            0
          }
        />

        <SummaryCard
          title="Consensus Anomalies"
          value={
            summary?.consensus_anomalies ||
            0
          }
          subtitle={
            `${summary?.consensus_pct || 0}% of dataset`
          }
        />

        <SummaryCard
          title="Features"
          value={
            summary?.features_used?.length ||
            0
          }
          subtitle={
            summary?.features_used?.join(', ') ||
            'N/A'
          }
        />

      </div>


      {/* ======================================================
          MODEL CARDS
      ====================================================== */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
        }}
      >

        {modelComparison.map(
          (model) => (

            <ModelCard
              key={model.model}
              model={model}
            />

          )
        )}

      </div>


      {/* ======================================================
          ANOMALY COUNT CHART
      ====================================================== */}

      <ChartContainer
        title="Model Comparison"
        subtitle="Number of anomalies detected by each model"
      >

        <ResponsiveContainer
          width="100%"
          height={320}
        >

          <BarChart
            data={anomalyChartData}
          >

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.08)"
            />

            <XAxis
              dataKey="name"
              stroke="#9ca3af"
            />

            <YAxis
              stroke="#9ca3af"
            />

            <Tooltip
              contentStyle={{
                background: '#111827',
                border:
                  '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />

            <Bar
              dataKey="anomalies"
              fill="#6366f1"
              radius={[6, 6, 0, 0]}
            />

          </BarChart>

        </ResponsiveContainer>

      </ChartContainer>


      {/* ======================================================
          EXECUTION TIME
      ====================================================== */}

      <ChartContainer
        title="Model Execution Time"
        subtitle="Time required to analyse the dataset"
      >

        <ResponsiveContainer
          width="100%"
          height={320}
        >

          <BarChart
            data={executionChartData}
          >

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.08)"
            />

            <XAxis
              dataKey="name"
              stroke="#9ca3af"
            />

            <YAxis
              stroke="#9ca3af"
              unit="s"
            />

            <Tooltip
              contentStyle={{
                background: '#111827',
                border:
                  '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
            />

            <Bar
              dataKey="seconds"
              fill="#22c55e"
              radius={[6, 6, 0, 0]}
            />

          </BarChart>

        </ResponsiveContainer>

      </ChartContainer>


      {/* ======================================================
          CONSENSUS
      ====================================================== */}

      <ChartContainer
        title="Model Consensus"
        subtitle="Higher agreement means stronger anomaly evidence"
      >

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >

          <ConsensusCard
            title="2+ Model Consensus"
            value={
              summary?.consensus_anomalies ||
              0
            }
            subtitle={
              `${summary?.consensus_pct || 0}% of records`
            }
          />


          <ConsensusCard
            title="All 3 Models"
            value={
              anomalyRecords.filter(
                (record) =>
                  Number(
                    record.model_vote_count
                  ) === 3
              ).length
            }
            subtitle="Very-high-confidence sample"
          />

        </div>

      </ChartContainer>


      {/* ======================================================
          ANOMALY TABLE
      ====================================================== */}

      <ChartContainer
        title={`Flagged Anomaly Records (${anomalyRecords.length})`}
        subtitle="Records flagged by at least two models"
      >

        {anomalyRecords.length === 0 ? (

          <p
            style={{
              color: 'var(--text-muted)',
            }}
          >
            No consensus anomaly records
            are available.
          </p>

        ) : (

          <>

            <div
              style={{
                overflowX: 'auto',
              }}
            >

              <table
                style={{
                  width: '100%',
                  borderCollapse:
                    'collapse',
                  color: '#fff',
                }}
              >

                <thead>

                  <tr
                    style={{
                      background:
                        'rgba(255,255,255,0.04)',
                    }}
                  >

                    <th style={thStyle}>
                      Row
                    </th>

                    <th style={thStyle}>
                      Transaction ID
                    </th>

                    <th style={thStyle}>
                      Customer ID
                    </th>

                    <th style={thStyle}>
                      Quantity
                    </th>

                    <th style={thStyle}>
                      Price
                    </th>

                    <th style={thStyle}>
                      Models
                    </th>

                    <th style={thStyle}>
                      Votes
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {paginatedRecords.map(
                    (record, index) => (

                      <tr
                        key={
                          `${record.anomaly_index}-${index}`
                        }
                      >

                        <td style={tdStyle}>
                          {record.anomaly_index}
                        </td>

                        <td style={tdStyle}>
                          {record.Transaction_ID ||
                            '—'}
                        </td>

                        <td style={tdStyle}>
                          {record.Customer_ID ||
                            '—'}
                        </td>

                        <td style={tdStyle}>
                          {record.Quantity ??
                            '—'}
                        </td>

                        <td style={tdStyle}>
                          {record.Price ??
                            '—'}
                        </td>

                        <td style={tdStyle}>

                          <div
                            style={{
                              display: 'flex',
                              flexWrap:
                                'wrap',
                              gap: '0.35rem',
                            }}
                          >

                            {(
                              record.models_flagged ||
                              []
                            ).map(
                              (model) => (

                                <span
                                  key={model}
                                  style={{
                                    padding:
                                      '0.25rem 0.5rem',
                                    borderRadius:
                                      '999px',
                                    background:
                                      'rgba(99,102,241,0.15)',
                                    color:
                                      '#a5b4fc',
                                    fontSize:
                                      '0.72rem',
                                  }}
                                >
                                  {shortModelName(
                                    model
                                  )}
                                </span>

                              )
                            )}

                          </div>

                        </td>

                        <td style={tdStyle}>

                          <span
                            style={{
                              fontWeight: 800,
                            }}
                          >
                            {record.model_vote_count ||
                              0}
                            /3
                          </span>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>


            {/* Pagination */}

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                marginTop: '1rem',
              }}
            >

              <button
                disabled={
                  currentPage === 1
                }
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.max(
                        1,
                        page - 1
                      )
                  )
                }
                style={paginationButtonStyle}
              >
                Previous
              </button>


              <span
                style={{
                  color:
                    'var(--text-muted)',
                }}
              >
                Page {currentPage} of {totalPages}
              </span>


              <button
                disabled={
                  currentPage >=
                  totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.min(
                        totalPages,
                        page + 1
                      )
                  )
                }
                style={paginationButtonStyle}
              >
                Next
              </button>

            </div>

          </>

        )}

      </ChartContainer>


      {/* ======================================================
          LLM COMPARISON
      ====================================================== */}

      <ChartContainer
        title="AI Model Comparison"
        subtitle="LLM-generated interpretation of the measured model results"
      >

        {!llmResult &&
        !llmLoading &&
        !llmError && (

          <div>

            <p
              style={{
                color:
                  'var(--text-muted)',
                marginBottom:
                  '1rem',
              }}
            >
              Let AI compare the three anomaly
              detection models and explain their
              results.
            </p>


            <button
              onClick={
                runLLMComparison
              }
              style={{
                padding:
                  '0.75rem 1.25rem',
                border: 'none',
                borderRadius:
                  '8px',
                background:
                  '#6366f1',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Generate AI Comparison
            </button>

          </div>

        )}


        {llmLoading && (

          <div
            style={{
              color:
                'var(--text-muted)',
            }}
          >
            Generating AI comparison...
          </div>

        )}


        {llmError && (

          <div>

            <p
              style={{
                color: '#ff6b6b',
                marginBottom:
                  '1rem',
              }}
            >
              {llmError}
            </p>


            <button
              onClick={
                runLLMComparison
              }
              style={{
                padding:
                  '0.65rem 1rem',
                border: 'none',
                borderRadius:
                  '8px',
                background:
                  '#6366f1',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>

          </div>

        )}


        {llmResult && (

          <div
            style={{
              whiteSpace:
                'pre-wrap',
              lineHeight:
                1.7,
              color: '#e5e7eb',
            }}
          >

            {typeof llmResult ===
            'string'
              ? llmResult
              : JSON.stringify(
                  llmResult,
                  null,
                  2
                )}

          </div>

        )}

      </ChartContainer>

    </div>
  );
};


// ============================================================
// COMPONENTS
// ============================================================

const SummaryCard = ({
  title,
  value,
  subtitle,
}) => (

  <div
    className="glass-card"
    style={{
      padding: '1.25rem',
    }}
  >

    <div
      style={{
        color:
          'var(--text-muted)',
        fontSize:
          '0.85rem',
        marginBottom:
          '0.5rem',
      }}
    >
      {title}
    </div>

    <div
      style={{
        color: '#fff',
        fontSize:
          '1.7rem',
        fontWeight: 800,
      }}
    >
      {value}
    </div>

    {subtitle && (

      <div
        style={{
          color:
            'var(--text-muted)',
          fontSize:
            '0.8rem',
          marginTop:
            '0.3rem',
        }}
      >
        {subtitle}
      </div>

    )}

  </div>

);


const ModelCard = ({
  model,
}) => (

  <div
    className="glass-card"
    style={{
      padding: '1.25rem',
    }}
  >

    <h3
      style={{
        color: '#fff',
        marginBottom:
          '1rem',
        fontSize:
          '1rem',
      }}
    >
      {model.model}
    </h3>


    <div
      style={{
        fontSize:
          '1.8rem',
        fontWeight: 800,
        color: '#fff',
      }}
    >
      {Number(
        model.anomalies || 0
      ).toLocaleString()}
    </div>


    <div
      style={{
        color:
          'var(--text-muted)',
        marginTop:
          '0.25rem',
      }}
    >
      {model.anomaly_pct || 0}%
      anomalies
    </div>


    <div
      style={{
        color:
          '#a5b4fc',
        marginTop:
          '0.75rem',
        fontSize:
          '0.85rem',
      }}
    >
      {Number(
        model.execution_time_sec || 0
      ).toFixed(3)}{' '}
      seconds
    </div>

  </div>

);


const ConsensusCard = ({
  title,
  value,
  subtitle,
}) => (

  <div
    style={{
      padding: '1.25rem',
      borderRadius: '12px',
      background:
        'rgba(99,102,241,0.08)',
      border:
        '1px solid rgba(99,102,241,0.2)',
    }}
  >

    <div
      style={{
        color:
          'var(--text-muted)',
      }}
    >
      {title}
    </div>

    <div
      style={{
        fontSize:
          '1.7rem',
        fontWeight: 800,
        color: '#fff',
        marginTop:
          '0.3rem',
      }}
    >
      {Number(value).toLocaleString()}
    </div>

    <div
      style={{
        color:
          'var(--text-muted)',
        fontSize:
          '0.8rem',
      }}
    >
      {subtitle}
    </div>

  </div>

);


const ChartContainer = ({
  title,
  subtitle,
  children,
}) => (

  <div
    className="glass-card"
    style={{
      padding: '1.5rem',
    }}
  >

    <h3
      style={{
        color: '#fff',
        marginBottom:
          '0.3rem',
        fontSize:
          '1.05rem',
      }}
    >
      {title}
    </h3>

    {subtitle && (

      <p
        style={{
          color:
            'var(--text-muted)',
          fontSize:
            '0.82rem',
          marginBottom:
            '1rem',
        }}
      >
        {subtitle}
      </p>

    )}

    {children}

  </div>

);


// ============================================================
// HELPERS
// ============================================================

const shortModelName = (
  model
) => {

  if (
    model ===
    'Local Outlier Factor'
  ) {
    return 'LOF';
  }

  if (
    model ===
    'One-Class SVM'
  ) {
    return 'OCSVM';
  }

  return 'Isolation Forest';

};


const thStyle = {
  padding: '0.8rem',
  textAlign: 'left',
  fontSize: '0.78rem',
  color: '#9ca3af',
  borderBottom:
    '1px solid rgba(255,255,255,0.08)',
};


const tdStyle = {
  padding: '0.8rem',
  fontSize: '0.8rem',
  borderBottom:
    '1px solid rgba(255,255,255,0.05)',
};


const paginationButtonStyle = {
  padding: '0.5rem 0.9rem',
  borderRadius: '7px',
  border:
    '1px solid rgba(255,255,255,0.12)',
  background:
    'rgba(255,255,255,0.05)',
  color: '#fff',
  cursor: 'pointer',
};


export default Anomaly;