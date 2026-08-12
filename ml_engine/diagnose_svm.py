"""
Diagnose why SGDOneClassSVM detects 0 anomalies on this specific dataset.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

import numpy as np
import pandas as pd
from sklearn.linear_model import SGDOneClassSVM
from sklearn.preprocessing import StandardScaler
from config import ANOMALY_CONTAMINATION, DATA_PATH

print("Loading dataset:", DATA_PATH)
df = pd.read_csv(DATA_PATH)
print("Shape:", df.shape)

# Prepare features
X = df[["Quantity", "Price"]].copy()
for col in ["Quantity", "Price"]:
    X[col] = pd.to_numeric(X[col], errors="coerce")
    X[col] = X[col].fillna(X[col].median())

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X).astype(np.float32)
print("Feature matrix:", X_scaled.shape)
print("Price range:", X["Price"].min(), "to", X["Price"].max())
print("Quantity range:", X["Quantity"].min(), "to", X["Quantity"].max())
print()

# Test different nu values
for nu in [0.01, 0.05, 0.1, 0.15, 0.2, 0.3]:
    svm = SGDOneClassSVM(nu=nu, random_state=42, shuffle=True, max_iter=1000)
    svm.fit(X_scaled)
    preds = svm.predict(X_scaled)
    n_anom = int((preds == -1).sum())
    print(f"  nu={nu:.2f}: {n_anom} anomalies ({n_anom/len(df)*100:.2f}%)")
