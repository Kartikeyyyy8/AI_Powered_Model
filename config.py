"""
config.py
---------
Centralised configuration for the ML Data Quality Engine.

All constants, file paths, and domain-specific lookup tables live here.
Import this module in any other module instead of repeating constants.
"""

import os

# ---------------------------------------------------------------------------
# File Paths
# ---------------------------------------------------------------------------

# Root directory of the ml_engine package (where this file lives)
BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))

# Path to the raw dataset (relative to BASE_DIR)
DATA_PATH: str = os.path.join(BASE_DIR, "data", "dataset_ecommerce_transactions_data.csv")

# Directory where generated reports are saved
REPORTS_DIR: str = os.path.join(BASE_DIR, "reports")

# ---------------------------------------------------------------------------
# Data Schema
# ---------------------------------------------------------------------------

# Columns that must always be present and non-null
REQUIRED_COLUMNS: list = ["Transaction_ID", "Customer_ID", "Product_Name"]

# Expected column names for schema validation
EXPECTED_COLUMNS: list = [
    "Transaction_ID",
    "Transaction_Date",
    "Customer_ID",
    "Product_Name",
    "Quantity",
    "Price",
    "Payment_Method",
    "Transaction_Status",
]

# ---------------------------------------------------------------------------
# Categorical Lookup Tables
# ---------------------------------------------------------------------------

# Maps raw payment-method strings (lower-cased) to canonical form
PAYMENT_METHOD_MAP: dict = {
    "pay pal": "PayPal",
    "paypal": "PayPal",
    "creditcard": "Credit Card",
    "credit card": "Credit Card",
    "debitcard": "Debit Card",
    "debit card": "Debit Card",
    "bank transfer": "Bank Transfer",
    "cash": "Cash",
}

# Allowed canonical payment methods (after standardisation)
ALLOWED_PAYMENT_METHODS: set = {
    "PayPal",
    "Credit Card",
    "Debit Card",
    "Bank Transfer",
    "Cash",
}

# Maps raw transaction-status strings (lower-cased) to canonical form
STATUS_NORMALISATION: dict = {
    "completed": "Completed",
    "pending": "Pending",
    "failed": "Failed",
    "refunded": "Refunded",
    "cancelled": "Cancelled",
}

# Allowed canonical transaction statuses
ALLOWED_STATUSES: set = {
    "Completed",
    "Pending",
    "Failed",
    "Refunded",
    "Cancelled",
}

# Known valid product categories
KNOWN_CATEGORIES: set = {
    "Headphones", "Coffee", "Tablet", "Coffee Machine", "Laptop",
    "Smartphone", "Monitor", "Keyboard", "Mouse", "Webcam",
    "Printer", "Speaker", "Camera", "TV", "Refrigerator",
    "Washing Machine", "Microwave", "Blender", "Toaster", "Iron",
}

# ---------------------------------------------------------------------------
# Anomaly Detection Defaults
# ---------------------------------------------------------------------------

ANOMALY_CONTAMINATION: float = 0.05   # Expected proportion of anomalies
ANOMALY_RANDOM_STATE: int = 42        # Seed for reproducibility
LOF_N_NEIGHBORS: int = 20             # Local Outlier Factor neighbours

# ---------------------------------------------------------------------------
# Statistical Outlier Defaults
# ---------------------------------------------------------------------------

ZSCORE_THRESHOLD: float = 3.0   # |z| > this → outlier
IQR_FACTOR: float = 1.5         # Tukey fence multiplier

# ---------------------------------------------------------------------------
# Logging Format
# ---------------------------------------------------------------------------

LOG_FORMAT: str = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
LOG_LEVEL: str = "INFO"
