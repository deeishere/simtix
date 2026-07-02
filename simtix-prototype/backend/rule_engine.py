from __future__ import annotations

import json
from collections import Counter, defaultdict
from typing import Any

from backend.config import RULES_PATH
from backend.models import RuleResult

DEFAULT_MODULES = [
    "AML",
    "KYC",
    "Transaction Monitoring",
    "Sanctions",
    "Tokenization",
    "Consumer Protection",
    "Cybersecurity",
    "Open Banking",
]


class RuleEngine:
    def __init__(self, rules_path=RULES_PATH) -> None:
        with open(rules_path, encoding="utf-8") as handle:
            self.rules: list[dict[str, Any]] = json.load(handle)

    def _record(self, merged: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
        customer = {
            "Customer ID": merged.get("Customer ID"),
            "Customer Name": merged.get("Customer Name"),
            "Nationality": merged.get("Nationality"),
            "Customer Type": merged.get("Customer Type"),
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
            "Destination Country": merged.get("Destination Country"),
            "Is International": merged.get("Is International"),
            "Crypto Asset": merged.get("Crypto Asset"),
            "Wallet ID": merged.get("Wallet ID"),
        }
        return customer, transaction

    def _evaluate_rule(self, rule: dict[str, Any], customer: dict[str, Any], transaction: dict[str, Any]) -> RuleResult:
        rule_id = rule["rule_id"]
        passed = True
        message = rule["pass_message"]

        amount = float(transaction.get("Amount") or 0)
        checks = {
            "AML-001": amount > 20000,
            "AML-002": transaction.get("Transaction Type") == "Transfer" and transaction.get("Is International") == "Yes",
            "AML-003": amount > 50000,
            "AML-004": customer.get("PEP Flag") == "Yes" and amount > 5000,
            "AML-005": transaction.get("Transaction Type") == "Transfer" and customer.get("Risk Level") == "High",
            "KYC-001": customer.get("KYC Status") != "Complete",
            "KYC-002": customer.get("KYC Status") == "Incomplete",
            "KYC-003": customer.get("Customer Type") == "Individual" and not customer.get("Occupation"),
            "KYC-004": customer.get("PEP Flag") == "Yes" and customer.get("KYC Status") != "Complete",
            "TM-001": transaction.get("Transaction Type") == "Transfer" and amount > 10000,
            "TM-002": amount > 30000,
            "TM-003": transaction.get("Is International") == "Yes" and amount > 15000,
            "SAN-001": customer.get("Sanction Match") != "No Match",
            "SAN-002": transaction.get("Destination Country") in {"Iran", "Syria"},
            "SAN-003": transaction.get("Is International") == "Yes" and customer.get("Sanction Match") != "No Match",
            "TOK-001": transaction.get("Crypto Asset") not in ("", None) and customer.get("KYC Status") != "Complete",
            "TOK-002": transaction.get("Transaction Type") in {"Buy Crypto", "Sell Crypto"} and customer.get("Risk Level") == "High",
            "TOK-003": transaction.get("Crypto Asset") not in ("", None) and transaction.get("Is International") == "Yes",
            "CP-001": transaction.get("Transaction Type") == "Bill Payment" and amount > 10000,
            "CP-002": customer.get("Customer Type") == "Individual" and customer.get("Risk Level") == "High" and amount > 15000,
            "CYB-001": not transaction.get("Wallet ID"),
            "CYB-002": transaction.get("Transaction Type") in {"Buy Crypto", "Sell Crypto"} and not transaction.get("Crypto Asset"),
            "OB-001": transaction.get("Transaction Type") == "Transfer" and transaction.get("Is International") == "Yes" and not transaction.get("Wallet ID"),
            "OB-002": transaction.get("Transaction Type") == "Transfer" and amount > 10000 and customer.get("KYC Status") != "Complete",
        }

        if checks.get(rule_id, False):
            passed = False
            message = rule["fail_message"]

        return RuleResult(
            rule_id=rule_id,
            rule_name=rule.get("rule_name", rule_id),
            module=rule["module"],
            severity=rule["severity"],
            passed=passed,
            message=message,
            customer_id=str(customer.get("Customer ID") or ""),
            transaction_id=str(transaction.get("Transaction ID") or ""),
        )

    def _transaction_risk(self, failures: list[RuleResult]) -> str:
        if not failures:
            return "Low"
        severities = {item.severity for item in failures}
        if "Critical" in severities or len([f for f in failures if f.severity == "High"]) >= 2:
            return "High"
        if "High" in severities or "Medium" in severities:
            return "Medium"
        return "Low"

    def evaluate(self, merged_records: list[dict[str, Any]], active_modules: list[str] | None = None) -> dict[str, Any]:
        active = set(active_modules or DEFAULT_MODULES)
        active_rules = [rule for rule in self.rules if rule["module"] in active]

        all_results: list[RuleResult] = []
        transaction_summaries: list[dict[str, Any]] = []
        transaction_store: dict[str, Any] = {}
        rule_failure_counter: Counter[str] = Counter()
        rule_meta: dict[str, dict[str, str]] = {}

        for merged in merged_records:
            customer, transaction = self._record(merged)
            tx_results: list[RuleResult] = []
            for rule in active_rules:
                result = self._evaluate_rule(rule, customer, transaction)
                tx_results.append(result)
                all_results.append(result)
                rule_meta[rule["rule_id"]] = {
                    "rule_name": rule.get("rule_name", rule["rule_id"]),
                    "module": rule["module"],
                    "severity": rule["severity"],
                }

            failures = [item for item in tx_results if not item.passed]
            for failure in failures:
                rule_failure_counter[failure.rule_id] += 1

            risk = self._transaction_risk(failures)
            decision = "Non-Compliant" if failures else "Compliant"
            failed_rule_ids = [item.rule_id for item in failures]

            summary = {
                "transaction_id": transaction.get("Transaction ID"),
                "customer_id": customer.get("Customer ID"),
                "risk": risk,
                "decision": decision,
                "failed_rules": failed_rule_ids,
                "failed_rule_count": len(failures),
            }
            transaction_summaries.append(summary)

            if failures:
                transaction_store[str(transaction.get("Transaction ID"))] = {
                    "customer": customer,
                    "transaction": transaction,
                    "failures": [item.to_dict() for item in failures],
                    "risk": risk,
                    "decision": decision,
                }

        violations = [item.to_dict() for item in all_results if not item.passed]
        passed_count = len([item for item in all_results if item.passed])
        total_evaluations = len(all_results) or 1
        readiness_score = round((passed_count / total_evaluations) * 100)

        module_scores: dict[str, int] = {}
        for module in active:
            module_results = [item for item in all_results if item.module == module]
            if not module_results:
                continue
            module_passed = len([item for item in module_results if item.passed])
            module_scores[module] = round((module_passed / len(module_results)) * 100)

        risk_distribution = Counter(item["risk"] for item in transaction_summaries)
        top_failed_rules = [
            {
                "rule_id": rule_id,
                "rule_name": rule_meta[rule_id]["rule_name"],
                "module": rule_meta[rule_id]["module"],
                "severity": rule_meta[rule_id]["severity"],
                "failure_count": count,
            }
            for rule_id, count in rule_failure_counter.most_common(15)
        ]

        flagged_transactions = sorted(
            [item for item in transaction_summaries if item["failed_rule_count"] > 0],
            key=lambda item: ({"High": 0, "Medium": 1, "Low": 2}[item["risk"]], -item["failed_rule_count"]),
        )[:100]

        statistics = {
            "total_rule_evaluations": total_evaluations,
            "total_passed_checks": passed_count,
            "total_failed_checks": len(violations),
            "high_risk_transactions": risk_distribution.get("High", 0),
            "medium_risk_transactions": risk_distribution.get("Medium", 0),
            "low_risk_transactions": risk_distribution.get("Low", 0),
            "transaction_types": self._count_field(merged_records, "Transaction Type"),
            "risk_distribution": dict(risk_distribution),
            "severity_distribution": self._count_values(violations, "severity"),
            "top_failed_rules_chart": {item["rule_id"]: item["failure_count"] for item in top_failed_rules[:8]},
        }

        return {
            "readiness_score": readiness_score,
            "module_scores": module_scores,
            "statistics": statistics,
            "top_failed_rules": top_failed_rules,
            "flagged_transactions": flagged_transactions,
            "transaction_store": transaction_store,
            "violations": violations,
        }

    def _count_field(self, records: list[dict[str, Any]], field: str) -> dict[str, int]:
        counts: dict[str, int] = defaultdict(int)
        for record in records:
            counts[str(record.get(field) or "Unknown")] += 1
        return dict(counts)

    def _count_values(self, records: list[dict[str, Any]], field: str) -> dict[str, int]:
        counts: dict[str, int] = defaultdict(int)
        for record in records:
            counts[str(record.get(field) or "Unknown")] += 1
        return dict(counts)
