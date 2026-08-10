import json
import os
from pathlib import Path

import plotly.express as px


# ============================================================
# REPORTS DIRECTORY
# ============================================================

REPORTS_DIR = Path(
    os.environ.get(
        "REPORTS_DIR",
        Path(__file__).resolve().parent / "reports"
    )
)


# ============================================================
# FIND LATEST PIPELINE REPORT
# ============================================================

def get_latest_pipeline_report():

    files = list(
        REPORTS_DIR.glob("pipeline_report_*.json")
    )

    if not files:
        raise FileNotFoundError(
            f"No pipeline report found in: {REPORTS_DIR}"
        )

    return max(
        files,
        key=lambda file: file.stat().st_mtime
    )


# ============================================================
# LOAD REPORT
# ============================================================

def load_pipeline_report():

    report_file = get_latest_pipeline_report()

    print(
        f"Loading pipeline report: {report_file}"
    )

    with open(
        report_file,
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


# ============================================================
# SAFE NUMBER
# ============================================================

def to_number(value, default=0):

    try:
        return float(value)
    except (
        TypeError,
        ValueError
    ):
        return default


# ============================================================
# 1. DATA QUALITY METRICS
# ============================================================

def create_quality_metrics_chart(
    quality_scores
):

    dataset = quality_scores.get(
        "dataset",
        {}
    )

    metrics = [
        "Completeness",
        "Uniqueness",
        "Validity",
        "Rules Quality"
    ]

    values = [
        to_number(
            dataset.get(
                "completeness_score",
                0
            )
        ),

        to_number(
            dataset.get(
                "uniqueness_score",
                0
            )
        ),

        to_number(
            dataset.get(
                "validity_score",
                0
            )
        ),

        to_number(
            dataset.get(
                "rules_quality_score",
                0
            )
        )
    ]

    print(
        "\nQuality Metrics:"
    )

    for metric, value in zip(
        metrics,
        values
    ):

        print(
            f"  {metric}: {value}"
        )

    fig = px.bar(
        x=metrics,
        y=values,
        text=[
            f"{value:.2f}"
            for value in values
        ],
        labels={
            "x": "Metric",
            "y": "Score"
        },
        title="Data Quality Metrics"
    )

    fig.update_traces(
        hovertemplate=(
            "<b>%{x}</b><br>"
            "Score: %{y:.2f}<extra></extra>"
        )
    )

    fig.update_layout(
        template="plotly_dark",
        height=350,
        yaxis=dict(
            range=[0, 100]
        ),
        margin=dict(
            l=50,
            r=20,
            t=70,
            b=50
        )
    )

    return fig


# ============================================================
# 2. OVERALL QUALITY SCORE
# ============================================================

def create_quality_score_chart(
    quality_scores
):

    dataset = quality_scores.get(
        "dataset",
        {}
    )

    score = to_number(
        dataset.get(
            "dataset_score",
            0
        )
    )

    score = max(
        0,
        min(
            score,
            100
        )
    )

    remaining = 100 - score

    print(
        f"\nOverall Quality Score: {score}"
    )

    fig = px.pie(
        names=[
            "Quality Score",
            "Remaining"
        ],

        values=[
            score,
            remaining
        ],

        hole=0.65,

        title=(
            f"Overall Quality Score: "
            f"{score:.2f}"
        )
    )

    fig.update_traces(
        textinfo="percent",

        hovertemplate=(
            "<b>%{label}</b><br>"
            "Value: %{value:.2f}<br>"
            "Percentage: %{percent}"
            "<extra></extra>"
        )
    )

    fig.update_layout(
        template="plotly_dark",
        height=350,

        margin=dict(
            l=20,
            r=20,
            t=70,
            b=20
        )
    )

    return fig


# ============================================================
# 3. ANOMALY DISTRIBUTION
# ============================================================

def create_anomaly_chart(
    anomaly_summary
):

    total_rows = int(
        to_number(
            anomaly_summary.get(
                "total_rows_analysed",
                0
            )
        )
    )

    consensus_anomalies = int(
        to_number(
            anomaly_summary.get(
                "consensus_anomalies",
                0
            )
        )
    )

    normal_records = max(
        0,
        total_rows - consensus_anomalies
    )

    print(
        "\nAnomaly Distribution:"
    )

    print(
        f"  Total rows: {total_rows}"
    )

    print(
        f"  Normal records: {normal_records}"
    )

    print(
        f"  Consensus anomalies: "
        f"{consensus_anomalies}"
    )

    fig = px.pie(
        names=[
            "Normal Records",
            "Anomalies"
        ],

        values=[
            normal_records,
            consensus_anomalies
        ],

        hole=0.55,

        title="Anomaly Distribution"
    )

    fig.update_traces(
        textinfo="percent+label",

        hovertemplate=(
            "<b>%{label}</b><br>"
            "Records: %{value:,}<br>"
            "Percentage: %{percent}"
            "<extra></extra>"
        )
    )

    fig.update_layout(
        template="plotly_dark",
        height=350,

        margin=dict(
            l=20,
            r=20,
            t=70,
            b=20
        )
    )

    return fig


# ============================================================
# 4. BUSINESS RULE VIOLATIONS
# ============================================================

def create_business_rules_chart(
    business_rules_summary
):

    violations = (
        business_rules_summary.get(
            "violations",
            []
        )
    )

    names = []
    counts = []
    severities = []

    for violation in violations:

        rule = violation.get(
            "rule",
            "Unknown Rule"
        )

        count = int(
            to_number(
                violation.get(
                    "count",
                    0
                )
            )
        )

        severity = violation.get(
            "severity",
            "Unknown"
        )

        names.append(
            rule
        )

        counts.append(
            count
        )

        severities.append(
            severity
        )

    print(
        "\nBusiness Rule Violations:"
    )

    for name, count, severity in zip(
        names,
        counts,
        severities
    ):

        print(
            f"  {severity}: "
            f"{name} = {count}"
        )

    fig = px.bar(
        x=counts,
        y=names,

        orientation="h",

        text=counts,

        labels={
            "x": "Affected Records",
            "y": "Business Rule"
        },

        title="Business Rule Violations"
    )

    fig.update_traces(
        customdata=severities,

        hovertemplate=(
            "<b>%{y}</b><br>"
            "Affected Records: %{x:,}<br>"
            "Severity: %{customdata}"
            "<extra></extra>"
        )
    )

    fig.update_layout(
        template="plotly_dark",

        height=450,

        margin=dict(
            l=50,
            r=20,
            t=70,
            b=50
        )
    )

    return fig


# ============================================================
# SAVE PLOTLY JSON
# ============================================================

def save_figure_json(
    figure,
    file_path
):

    with open(
        file_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            figure.to_plotly_json(),
            file,
            default=str
        )


# ============================================================
# CREATE ALL DASHBOARD CHARTS
# ============================================================

def create_dashboard_charts():

    print(
        "\n"
        + "=" * 60
    )

    print(
        "Generating interactive Plotly dashboard charts..."
    )

    print(
        "=" * 60
    )

    # --------------------------------------------------------
    # Load latest pipeline report
    # --------------------------------------------------------

    report = load_pipeline_report()

    # --------------------------------------------------------
    # IMPORTANT:
    # Your actual JSON structure is:
    #
    # timestamp
    # pipeline_execution_summary
    # validation_summary
    # validation_violations
    # business_rules_summary
    # anomaly_summary
    # quality_scores
    # statistics
    # --------------------------------------------------------

    quality_scores = report.get(
        "quality_scores",
        {}
    )

    anomaly_summary = report.get(
        "anomaly_summary",
        {}
    )

    business_rules_summary = report.get(
        "business_rules_summary",
        {}
    )

    # --------------------------------------------------------
    # Validate required sections
    # --------------------------------------------------------

    if not quality_scores:

        raise ValueError(
            "quality_scores section missing "
            "from pipeline report."
        )

    if not anomaly_summary:

        raise ValueError(
            "anomaly_summary section missing "
            "from pipeline report."
        )

    if not business_rules_summary:

        raise ValueError(
            "business_rules_summary section missing "
            "from pipeline report."
        )

    # --------------------------------------------------------
    # Create charts
    # --------------------------------------------------------

    quality_metrics = (
        create_quality_metrics_chart(
            quality_scores
        )
    )

    quality_score = (
        create_quality_score_chart(
            quality_scores
        )
    )

    anomaly_distribution = (
        create_anomaly_chart(
            anomaly_summary
        )
    )

    business_rules = (
        create_business_rules_chart(
            business_rules_summary
        )
    )

    # --------------------------------------------------------
    # Dashboard directory
    # --------------------------------------------------------

    dashboard_dir = (
        REPORTS_DIR / "dashboard"
    )

    dashboard_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    # --------------------------------------------------------
    # Save individual charts
    # --------------------------------------------------------

    save_figure_json(
        quality_metrics,
        dashboard_dir /
        "quality_metrics.json"
    )

    save_figure_json(
        quality_score,
        dashboard_dir /
        "quality_score.json"
    )

    save_figure_json(
        anomaly_distribution,
        dashboard_dir /
        "anomaly_distribution.json"
    )

    save_figure_json(
        business_rules,
        dashboard_dir /
        "business_rules.json"
    )

    # --------------------------------------------------------
    # Combined dashboard JSON
    # --------------------------------------------------------

    dashboard_data = {

        "quality_metrics":
            quality_metrics.to_plotly_json(),

        "quality_score":
            quality_score.to_plotly_json(),

        "anomaly_distribution":
            anomaly_distribution.to_plotly_json(),

        "business_rules":
            business_rules.to_plotly_json()
    }

    combined_file = (
        dashboard_dir /
        "dashboard_charts.json"
    )

    with open(
        combined_file,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            dashboard_data,
            file,
            default=str
        )

    # --------------------------------------------------------
    # Final output
    # --------------------------------------------------------

    print(
        "\n"
        + "=" * 60
    )

    print(
        "Dashboard charts generated successfully."
    )

    print(
        f"Dashboard JSON:"
    )

    print(
        combined_file
    )

    print(
        "=" * 60
    )

    return dashboard_data


# ============================================================
# RUN DIRECTLY
# ============================================================

if __name__ == "__main__":

    create_dashboard_charts()