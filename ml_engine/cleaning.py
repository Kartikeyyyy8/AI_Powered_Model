"""
cleaning.py
-----------
Data Cleaning & Standardisation Module for the ML Data Quality Engine.

Responsibilities
----------------
- Load the raw dataset from disk
- Parse and repair Transaction_Date values
- Parse Price values from currency strings to float
- Handle missing values (forward-fill or median imputation)
- Standardise Payment_Method to canonical form
- Standardise Transaction_Status to canonical form
- Return a cleaned DataFrame ready for downstream processing

Usage
-----
    from cleaning import load_dataset, run_cleaning

    df_raw   = load_dataset()          # uses default DATA_PATH from config
    df_clean = run_cleaning(df_raw)
"""

import logging
import os
from typing import Optional

import numpy as np
import pandas as pd

from config import (
    DATA_PATH,
    LOG_FORMAT,
    PAYMENT_METHOD_MAP,
    STATUS_NORMALISATION,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("ml_engine.cleaning")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def load_dataset(path: str = DATA_PATH) -> pd.DataFrame:
    """
    Load the raw dataset from a CSV file.

    Parameters
    ----------
    path : str
        Absolute or relative path to the CSV file.
        Defaults to ``config.DATA_PATH``.

    Returns
    -------
    pd.DataFrame
        Raw, unmodified dataframe.

    Raises
    ------
    FileNotFoundError
        If the file does not exist at the given path.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset not found at: {path}")
    df = pd.read_csv(path)
    logger.info("Loaded %d rows, %d columns from '%s'.", *df.shape, path)
    return df


def clean_dates(df: pd.DataFrame, date_col: str = "Transaction_Date") -> pd.DataFrame:
    """
    Parse the date column to datetime, coercing unparseable values to NaT.

    Uses ``dayfirst=True``: this dataset mixes two date formats in the same
    column — ``YYYY-MM-DD`` (where the genuinely-corrupted rows live, e.g.
    ``"2025-02-30"``) and ``DD-MM-YYYY`` (valid real dates, e.g.
    ``"07-08-2023"``). Without ``dayfirst=True``, pandas' default parsing
    wrongly rejects ~19,000 additional valid ``DD-MM-YYYY`` dates as
    unparseable on top of the ones that are genuinely calendar-invalid,
    inflating the invalid/missing count by more than 25%.

    Parameters
    ----------
    df : pd.DataFrame
    date_col : str
        Name of the date column to parse. Default: ``"Transaction_Date"``.

    Returns
    -------
    pd.DataFrame
        DataFrame with the date column converted to ``datetime64[ns]``.
    """
    df = df.copy()
    if date_col not in df.columns:
        logger.debug("Column '%s' not found; skipping date parsing.", date_col)
        return df

    original_nulls = df[date_col].isna().sum()
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce", dayfirst=True)
    new_nulls = df[date_col].isna().sum() - original_nulls

    if new_nulls > 0:
        logger.warning(
            "Column '%s': %d unparseable date(s) set to NaT.", date_col, new_nulls
        )
    else:
        logger.info("Column '%s': all dates parsed successfully.", date_col)
    return df


def parse_prices(df: pd.DataFrame, price_col: str = "Price") -> pd.DataFrame:
    """
    Parse the price column from currency strings (e.g. ``"$1,299.99"``) to float.

    Removes any non-numeric characters except ``.`` and ``-`` before conversion.

    Parameters
    ----------
    df : pd.DataFrame
    price_col : str
        Name of the price column. Default: ``"Price"``.

    Returns
    -------
    pd.DataFrame
    """
    df = df.copy()
    if price_col not in df.columns:
        logger.debug("Column '%s' not found; skipping price parsing.", price_col)
        return df

    df[price_col] = pd.to_numeric(
        df[price_col].astype(str).str.replace(r"[^\d.\-]", "", regex=True),
        errors="coerce",
    )
    logger.info("Column '%s': parsed as numeric.", price_col)
    return df


def handle_missing_values(
    df: pd.DataFrame,
    numeric_strategy: str = "median",
) -> pd.DataFrame:
    """
    Fill missing values in numeric columns using the chosen strategy.

    Parameters
    ----------
    df : pd.DataFrame
    numeric_strategy : str
        ``"median"`` (default) or ``"mean"``.
        Categorical columns are left as-is (NaN preserved).

    Returns
    -------
    pd.DataFrame
    """
    df = df.copy()
    num_cols = df.select_dtypes(include=[np.number]).columns

    for col in num_cols:
        n_missing = int(df[col].isna().sum())
        if n_missing == 0:
            continue
        fill_value = (
            df[col].median() if numeric_strategy == "median" else df[col].mean()
        )
        df[col] = df[col].fillna(fill_value)
        logger.info(
            "Column '%s': filled %d missing value(s) with %s (%.4f).",
            col,
            n_missing,
            numeric_strategy,
            fill_value,
        )
    return df


def standardize_payment_methods(df: pd.DataFrame) -> pd.DataFrame:
    """
    Map raw Payment_Method values to their canonical form using ``PAYMENT_METHOD_MAP``.

    Unknown values are kept as-is. Empty / NaN values are set to ``np.nan``.

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    pd.DataFrame
    """
    df = df.copy()
    if "Payment_Method" not in df.columns:
        logger.debug("Column 'Payment_Method' not found; skipping standardisation.")
        return df

    def _map_payment(raw_value) -> Optional[str]:
        if pd.isna(raw_value):
            return np.nan
        s = str(raw_value).strip()
        if s.lower() in ("nan", "none", ""):
            return np.nan
        return PAYMENT_METHOD_MAP.get(s.lower(), s)

    df["Payment_Method"] = df["Payment_Method"].map(_map_payment)
    logger.info("Payment_Method standardised.")
    return df


def standardize_transaction_status(df: pd.DataFrame) -> pd.DataFrame:
    """
    Map raw Transaction_Status values to their canonical title-cased form.

    Uses ``STATUS_NORMALISATION`` for known values; title-cases unknown values.
    Empty / NaN entries are preserved as ``np.nan``.

    Parameters
    ----------
    df : pd.DataFrame

    Returns
    -------
    pd.DataFrame
    """
    df = df.copy()
    if "Transaction_Status" not in df.columns:
        logger.debug("Column 'Transaction_Status' not found; skipping normalisation.")
        return df

    def _map_status(raw_value) -> Optional[str]:
        if pd.isna(raw_value):
            return np.nan
        s = str(raw_value).strip()
        if s.lower() in ("nan", "none", ""):
            return np.nan
        return STATUS_NORMALISATION.get(s.lower(), s.title())

    df["Transaction_Status"] = df["Transaction_Status"].map(_map_status)
    logger.info("Transaction_Status normalised.")
    return df


def run_cleaning(df: pd.DataFrame, impute: bool = False) -> pd.DataFrame:
    """
    Execute the complete data cleaning pipeline on a raw DataFrame.

    Steps
    -----
    1. Parse Transaction_Date to datetime
    2. Parse Price to float
    3. Standardise Payment_Method
    4. Standardise Transaction_Status
    5. (Optional) Impute missing numeric values

    Parameters
    ----------
    df : pd.DataFrame
        Raw input dataframe.
    impute : bool
        If ``True``, fill missing numeric values with column medians.
        Default: ``False`` (preserve NaN for downstream validation reporting).

    Returns
    -------
    pd.DataFrame
        Cleaned dataframe.
    """
    logger.info("Starting cleaning pipeline. Input shape: %s.", df.shape)

    df = clean_dates(df)
    df = parse_prices(df)
    df = standardize_payment_methods(df)
    df = standardize_transaction_status(df)

    if impute:
        df = handle_missing_values(df)

    logger.info("Cleaning complete. Output shape: %s.", df.shape)
    return df
