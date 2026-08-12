'use strict';

const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');

// ============================================================
// PATH TO ML REPORTS
// ============================================================

const ML_REPORTS_DIR = path.join(
  __dirname,
  '../../ml_engine/reports'
);


// ============================================================
// FIND LATEST PIPELINE REPORT
// ============================================================

function findLatestReport() {
  if (!fs.existsSync(ML_REPORTS_DIR)) {
    return null;
  }

  const files = fs
    .readdirSync(ML_REPORTS_DIR)
    .filter(
      (file) =>
        file.startsWith('pipeline_report_') &&
        file.endsWith('.json')
    )
    .map((file) => ({
      name: file,
      mtime: fs.statSync(
        path.join(ML_REPORTS_DIR, file)
      ).mtimeMs,
    }))
    .sort(
      (a, b) => b.mtime - a.mtime
    );

  if (files.length === 0) {
    return null;
  }

  return path.join(
    ML_REPORTS_DIR,
    files[0].name
  );
}


// ============================================================
// GET ANOMALY RESULTS
// GET /api/anomaly/results
// ============================================================

const getAnomalyResults = asyncHandler(
  async (req, res) => {

    const reportPath =
      findLatestReport();

    if (!reportPath) {
      return res.status(404).json({
        success: false,
        message:
          'No anomaly results available. Run the ML engine first.',
        anomaly_summary: null,
      });
    }

    let report;

    try {

      const raw =
        fs.readFileSync(
          reportPath,
          'utf-8'
        );

      report =
        JSON.parse(raw);

    } catch (err) {

      return res.status(500).json({
        success: false,
        message:
          `Failed to parse pipeline report: ${err.message}`,
        anomaly_summary: null,
      });

    }

    const anomalySummary =
      report.anomaly_summary;

    if (
      !anomalySummary ||
      Object.keys(anomalySummary).length === 0
    ) {

      return res.status(404).json({
        success: false,
        message:
          'No anomaly results available. Run the ML engine first.',
        anomaly_summary: null,
      });

    }

    return res.json({
      success: true,
      report_file:
        path.basename(reportPath),
      anomaly_summary:
        anomalySummary,
    });
  }
);


// ============================================================
// LLM MODEL COMPARISON
// POST /api/anomaly/llm-comparison
// ============================================================

const getLLMComparison = asyncHandler(
  async (req, res) => {

    // --------------------------------------------------------
    // Validate request
    // --------------------------------------------------------

    const summary =
      req.body?.anomaly_summary;

    if (!summary) {
      return res.status(400).json({
        success: false,
        message:
          'anomaly_summary is required in the request body.',
      });
    }


    // --------------------------------------------------------
    // Gemini API key
    // --------------------------------------------------------

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message:
          'GEMINI_API_KEY is not configured on the server. Set it in server/.env.',
      });
    }


    // --------------------------------------------------------
    // MODEL COMPARISON DATA
    // --------------------------------------------------------

    const modelComparison =
      Array.isArray(
        summary.model_comparison
      )
        ? summary.model_comparison
        : [];


    const modelComparisonText =
      modelComparison
        .map((model) => {

          const modelName =
            model.model ||
            'Unknown Model';

          const anomalies =
            Number(
              model.anomalies || 0
            );

          const anomalyPct =
            Number(
              model.anomaly_pct || 0
            );

          const executionTime =
            Number(
              model.execution_time_sec || 0
            );

          const rows =
            Number(
              model.rows_analysed ||
              summary.total_rows_analysed ||
              0
            );

          return [
            `Model: ${modelName}`,
            `Anomalies: ${anomalies.toLocaleString('en-US')}`,
            `Anomaly percentage: ${anomalyPct}%`,
            `Execution time: ${executionTime.toFixed(3)} seconds`,
            `Rows analysed: ${rows.toLocaleString('en-US')}`,
          ].join(' | ');

        })
        .join('\n');


    // --------------------------------------------------------
    // DATASET INFORMATION
    // --------------------------------------------------------

    const totalRows =
      Number(
        summary.total_rows_analysed || 0
      );

    const consensusAnomalies =
      Number(
        summary.consensus_anomalies || 0
      );

    const consensusPct =
      Number(
        summary.consensus_pct || 0
      );

    const features =
      Array.isArray(
        summary.features_used
      )
        ? summary.features_used.join(', ')
        : 'Not specified';

    const contamination =
      Number(
        summary.contamination_rate || 0.05
      );


    // --------------------------------------------------------
    // FIND FASTEST MODEL
    // --------------------------------------------------------

    let fastestModel =
      'Not available';

    let fastestTime =
      null;

    if (
      modelComparison.length > 0
    ) {

      const validModels =
        modelComparison.filter(
          (model) =>
            Number.isFinite(
              Number(
                model.execution_time_sec
              )
            )
        );

      if (
        validModels.length > 0
      ) {

        const fastest =
          [...validModels].sort(
            (a, b) =>
              Number(
                a.execution_time_sec
              ) -
              Number(
                b.execution_time_sec
              )
          )[0];

        fastestModel =
          fastest.model;

        fastestTime =
          Number(
            fastest.execution_time_sec
          );

      }
    }


    // --------------------------------------------------------
    // FIND HIGHEST ANOMALY COUNT
    // HANDLE TIES
    // --------------------------------------------------------

    let coverageDescription =
      'Not available';

    if (
      modelComparison.length > 0
    ) {

      const anomalyCounts =
        modelComparison.map(
          (model) =>
            Number(
              model.anomalies || 0
            )
        );

      const highestCount =
        Math.max(
          ...anomalyCounts
        );

      const highestModels =
        modelComparison
          .filter(
            (model) =>
              Number(
                model.anomalies || 0
              ) === highestCount
          )
          .map(
            (model) =>
              model.model
          );

      if (
        highestModels.length === 1
      ) {

        coverageDescription =
          `${highestModels[0]} detected the highest measured number of anomalies (${highestCount.toLocaleString('en-US')}).`;

      } else {

        coverageDescription =
          `${highestModels.join(' and ')} are tied for the highest measured anomaly count (${highestCount.toLocaleString('en-US')}).`;

      }
    }


    // ========================================================
    // GEMINI PROMPT
    // ========================================================

    const prompt = `
You are an AI data quality analyst.

Analyze the measured results of these three anomaly detection
models:

1. Isolation Forest
2. Local Outlier Factor (LOF)
3. One-Class SVM

IMPORTANT FACTUAL RULES:

- Use ONLY the measured values provided below.
- Do NOT invent numbers.
- Do NOT invent accuracy, precision, recall, or F1-score.
- There are NO ground-truth anomaly labels.
- Do NOT claim one model is objectively more accurate.
- The highest anomaly count does NOT automatically mean the best model.
- The fastest model does NOT automatically mean the best model.
- If models have the same anomaly count, explicitly say they are tied.
- Do not calculate new percentages that are not provided.
- Keep each section concise.
- You MUST complete ALL seven sections.
- NEVER stop before LIMITATIONS.

DATASET:

Rows analysed:
${totalRows.toLocaleString('en-US')}

Features:
${features}

Contamination rate / nu:
${contamination}

MEASURED MODEL RESULTS:

${modelComparisonText}

CONSENSUS:

Anomalies flagged by at least 2 of 3 models:
${consensusAnomalies.toLocaleString('en-US')}

Consensus percentage:
${consensusPct}%

PRECOMPUTED COMPARISON:

Fastest model:
${fastestModel}

Fastest execution time:
${
  fastestTime !== null
    ? `${fastestTime.toFixed(3)} seconds`
    : 'Not available'
}

Highest anomaly-count result:
${coverageDescription}

OUTPUT FORMAT:

Use exactly these seven headings:

OVERALL ASSESSMENT:

BEST COVERAGE:

FASTEST MODEL:

MODEL AGREEMENT:

CONSENSUS MEANING:

RECOMMENDED ACTION:

LIMITATIONS:

CONTENT REQUIREMENTS:

OVERALL ASSESSMENT:
Summarize the dataset size, three models, contamination rate,
and the main comparison result in 2-3 sentences.

BEST COVERAGE:
State the highest measured anomaly count.
If models are tied, explicitly state that they are tied.
Do not call this model more accurate.

FASTEST MODEL:
State the fastest model and its measured execution time.
Do not claim that speed means accuracy.

MODEL AGREEMENT:
State the supplied consensus count and consensus percentage.
Do not invent another percentage.

CONSENSUS MEANING:
Explain why anomalies flagged by at least two models are useful
candidates for investigation, while making clear they are not
confirmed anomalies.

RECOMMENDED ACTION:
Give 2-3 concise sentences recommending that high-consensus
records be prioritized for investigation and that individual
model results can be used for broader review.

LIMITATIONS:
Give 2-3 concise sentences explaining that there are no
ground-truth labels and therefore accuracy, precision, recall,
and F1-score cannot be established from these results alone.

IMPORTANT:
You MUST output all seven headings and content under every heading.
End the response after completing LIMITATIONS.
`;


    // ========================================================
    // GEMINI 3 FLASH PREVIEW
    // ========================================================

    try {

      const GEMINI_MODEL =
        'gemini-3-flash-preview';

      const GEMINI_URL =
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;


      console.log(
        `Calling Gemini model: ${GEMINI_MODEL}`
      );


      const response =
        await fetch(
          GEMINI_URL,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              'x-goog-api-key':
                apiKey,
            },

            body: JSON.stringify({

              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],

              generationConfig: {
                maxOutputTokens: 2000,
              },

            }),
          }
        );


      // ------------------------------------------------------
      // GEMINI ERROR
      // ------------------------------------------------------

      if (!response.ok) {

        const errorBody =
          await response.text();

        console.error(
          'Gemini API error:',
          response.status,
          errorBody
        );

        return res.status(502).json({
          success: false,
          message:
            `Gemini API error (${response.status}): ${errorBody}`,
        });
      }


      // ------------------------------------------------------
      // PARSE GEMINI RESPONSE
      // ------------------------------------------------------

      const data =
        await response.json();


      const rawText =
        data
          ?.candidates?.[0]
          ?.content?.parts
          ?.map(
            (part) =>
              part.text || ''
          )
          .join('')
          .trim();


      if (!rawText) {

        console.error(
          'Unexpected Gemini response:',
          JSON.stringify(
            data,
            null,
            2
          )
        );

        return res.status(502).json({
          success: false,
          message:
            'Gemini returned an empty response.',
        });
      }


      // ------------------------------------------------------
      // PARSE SECTIONS
      // ------------------------------------------------------

      const sections =
        parseLLMSections(
          rawText
        );


      // ------------------------------------------------------
      // RETURN RESULT
      // ------------------------------------------------------

      return res.json({

        success: true,

        comparison:
          rawText,

        raw_text:
          rawText,

        sections,

        model:
          GEMINI_MODEL,

      });

    } catch (err) {

      console.error(
        'Gemini request failed:',
        err
      );

      return res.status(502).json({
        success: false,
        message:
          `Failed to call Gemini API: ${err.message}`,
      });
    }
  }
);


// ============================================================
// PARSE LLM SECTIONS
// ============================================================

function parseLLMSections(text) {

  const sectionKeys = [
    'OVERALL ASSESSMENT',
    'BEST COVERAGE',
    'FASTEST MODEL',
    'MODEL AGREEMENT',
    'CONSENSUS MEANING',
    'RECOMMENDED ACTION',
    'LIMITATIONS',
  ];


  const result = {};

  const lines =
    text.split('\n');

  let currentKey =
    null;

  let buffer = [];


  for (
    const line of lines
  ) {

    const trimmed =
      line.trim();

    const upper =
      trimmed.toUpperCase();


    const matched =
      sectionKeys.find(
        (key) =>
          upper.startsWith(
            `${key}:`
          )
      );


    if (matched) {

      // Save previous section
      if (currentKey) {

        result[currentKey] =
          buffer
            .join('\n')
            .trim();
      }


      currentKey =
        matched;

      buffer = [
        trimmed
          .slice(
            matched.length + 1
          )
          .trim(),
      ];

    } else if (
      currentKey
    ) {

      buffer.push(
        trimmed
      );
    }
  }


  // Save final section
  if (currentKey) {

    result[currentKey] =
      buffer
        .join('\n')
        .trim();
  }


  return result;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAnomalyResults,
  getLLMComparison,
};