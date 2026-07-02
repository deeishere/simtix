#!/usr/bin/env python3
"""Export Excel regulatory data to JSON for static frontend fallback."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

RULES_XLSX = DATA_DIR / "Regulatory_Rules_Features_Extraction.xlsx"
CUSTOMERS_XLSX = DATA_DIR / "customer.xlsx"
TRANSACTIONS_XLSX = DATA_DIR / "transaction.xlsx"


def serialize_dataframe(df: pd.DataFrame) -> list[dict]:
    records = df.to_dict(orient="records")
    clean = []
    for record in records:
        row = {}
        for key, value in record.items():
            if pd.isna(value):
                row[key] = None
            elif isinstance(value, pd.Timestamp):
                row[key] = value.isoformat()
            else:
                row[key] = value
        clean.append(row)
    return clean


def main() -> None:
    rules_df = pd.read_excel(RULES_XLSX)
    customers_df = pd.read_excel(CUSTOMERS_XLSX)
    transactions_df = pd.read_excel(TRANSACTIONS_XLSX)

    exports = {
        "rules.json": serialize_dataframe(rules_df),
        "customers.json": serialize_dataframe(customers_df),
        "transactions.json": serialize_dataframe(transactions_df),
    }

    for filename, payload in exports.items():
        target = DATA_DIR / filename
        with open(target, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
        print(f"Wrote {target} ({len(payload)} rows)")


if __name__ == "__main__":
    main()
