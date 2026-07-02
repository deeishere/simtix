from __future__ import annotations

import json
from typing import Any

import pandas as pd

from backend.config import DATA_DIR

RULES_XLSX = DATA_DIR / "Regulatory_Rules_Features_Extraction.xlsx"


class RegulatoryRules:
    def __init__(self) -> None:
        self.rules_df = pd.read_excel(RULES_XLSX)
        self.rules: list[dict[str, Any]] = self.rules_df.to_dict(orient="records")

    def select_categories(self, customer: dict[str, Any], transaction: dict[str, Any]) -> set[str]:
        selected: set[str] = set()

        if transaction.get("Transaction Type") == "Transfer":
            selected.update({"AML / CFT", "Transaction Monitoring"})

        if float(transaction.get("Amount") or 0) > 20000:
            selected.update({"AML / CFT", "Transaction Monitoring"})

        if customer.get("KYC Status") != "Complete":
            selected.add("KYC & Onboarding")

        if customer.get("PEP Flag") == "Yes":
            selected.update({"Customer Due Diligence (CDD)", "Sanctions Screening"})

        if customer.get("Sanction Match") != "No Match":
            selected.add("Sanctions Screening")

        crypto = transaction.get("Crypto Asset")
        if crypto not in (None, "", "None"):
            selected.update({"Investor Protection", "Transaction Monitoring"})

        if transaction.get("Transaction Type") in {"Buy Crypto", "Sell Crypto"}:
            selected.update({"Investor Protection", "Transaction Monitoring"})

        if customer.get("Beneficial Owner Exists") == "Yes":
            selected.add("Beneficial Ownership")

        if transaction.get("Is International") == "Yes":
            selected.update({"Sanctions Screening", "AML / CFT"})

        return selected

    def filter_rules(self, categories: set[str]) -> list[dict[str, Any]]:
        filtered = self.rules_df[self.rules_df["Category"].isin(categories)]
        return json.loads(filtered.to_json(orient="records"))

    def build_rules_text(self, relevant_rules: list[dict[str, Any]]) -> str:
        parts: list[str] = []
        for row in relevant_rules:
            parts.append(
                f"""
Rule ID: {row['Rule_ID']}

Category: {row['Category']}

Rule:
{row['Rule']}

Scenario:
{row['Scenario']}

Expected Behavior:
{row['Expected Behavior']}

--------------------------------------------
"""
            )
        return "".join(parts)

    def split_customer_transaction(self, merged: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
        customer = {
            "Customer ID": merged.get("Customer ID"),
            "Customer Name": merged.get("Customer Name"),
            "Customer Type": merged.get("Customer Type"),
            "Nationality": merged.get("Nationality"),
            "Risk Level": merged.get("Risk Level"),
            "KYC Status": merged.get("KYC Status"),
            "PEP Flag": merged.get("PEP Flag"),
            "Sanction Match": merged.get("Sanction Match"),
            "Occupation": merged.get("Occupation"),
        }
        transaction = {
            "Transaction ID": merged.get("Transaction ID"),
            "Customer ID": merged.get("Customer ID"),
            "Amount": merged.get("Amount"),
            "Currency": merged.get("Currency"),
            "Transaction Type": merged.get("Transaction Type"),
            "Timestamp": merged.get("Timestamp"),
            "Destination Country": merged.get("Destination Country"),
            "Is International": merged.get("Is International"),
            "Crypto Asset": merged.get("Crypto Asset"),
            "Wallet ID": merged.get("Wallet ID"),
        }
        return customer, transaction
