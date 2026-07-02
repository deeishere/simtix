from __future__ import annotations

import json
import uuid
from typing import Any

import pandas as pd

from backend.ai import ComplianceAI
from backend.config import DEFAULT_MODULES
from backend.generator import SyntheticDataGenerator
from backend.models import SimulationEvent, SimulationRequest, SimulationResponse
from backend.regulatory_rules import RegulatoryRules
from backend.report import ReportBuilder
from backend.rule_engine import RuleEngine


class SimulationRunner:
    PHASES = [
        ("generating_customers", "Generating synthetic customers..."),
        ("generating_transactions", "Generating synthetic transactions..."),
        ("merging_data", "Merging customers and transactions..."),
        ("running_rules", "Running deterministic compliance rules on all transactions..."),
        ("calculating_readiness", "Calculating readiness score..."),
        ("building_dashboard", "Building executive dashboard..."),
    ]

    def __init__(self) -> None:
        self.rule_engine = RuleEngine()
        self.compliance_ai = ComplianceAI()
        self.regulatory_rules = RegulatoryRules()
        self.reporter = ReportBuilder()
        self._last_payload: dict[str, Any] | None = None

    def _build_events(
        self,
        customers_count: int,
        transactions_count: int,
        readiness_score: int,
        statistics: dict[str, Any],
    ) -> list[dict[str, Any]]:
        events: list[SimulationEvent] = []
        progress = 0
        for phase, message in self.PHASES:
            progress += 16
            events.append(SimulationEvent(phase=phase, message=message, progress=min(progress, 92)))

        events.extend(
            [
                SimulationEvent(phase="customer_generated", message=f"Generated {customers_count} synthetic customers", progress=20),
                SimulationEvent(phase="transaction_created", message=f"Generated {transactions_count} synthetic transactions", progress=35),
                SimulationEvent(phase="rules_evaluated", message=f"Evaluated {statistics.get('total_rule_evaluations', 0)} rule checks", progress=70),
                SimulationEvent(phase="readiness_updated", message=f"Readiness score updated to {readiness_score}%", progress=90),
                SimulationEvent(phase="complete", message="Executive dashboard ready", progress=100),
            ]
        )

        failed_checks = statistics.get("total_failed_checks", 0)
        if failed_checks:
            events.insert(-2, SimulationEvent(phase="violations_found", message=f"{failed_checks} failed rule checks detected", progress=85))

        return [event.to_dict() for event in events]

    def run(self, request: SimulationRequest) -> SimulationResponse:
        simulation_id = f"sim-{uuid.uuid4().hex[:10]}"
        modules = request.modules or DEFAULT_MODULES

        generator = SyntheticDataGenerator(seed=request.seed)
        customers, transactions = generator.generate(request.customer_count, request.transaction_count)

        customers_df = pd.DataFrame([customer.to_dict() for customer in customers])
        transactions_df = pd.DataFrame([transaction.to_dict() for transaction in transactions])
        merged_df = transactions_df.merge(customers_df, on="Customer ID", how="left")
        merged_records = json.loads(merged_df.to_json(orient="records"))

        evaluation = self.rule_engine.evaluate(merged_records, active_modules=modules)
        statistics = evaluation["statistics"]
        events = self._build_events(
            len(customers),
            len(transactions),
            evaluation["readiness_score"],
            statistics,
        )

        response = SimulationResponse(
            simulation_id=simulation_id,
            project={
                "project_name": request.project_name,
                "industry": request.industry,
                "country": request.country,
                "regulator": request.regulator,
            },
            config={
                "customer_count": request.customer_count,
                "transaction_count": request.transaction_count,
                "seed": request.seed,
                "modules": modules,
            },
            events=events,
            statistics=statistics,
            module_scores=evaluation["module_scores"],
            readiness_score=evaluation["readiness_score"],
            customers_count=len(customers),
            transactions_count=len(transactions),
            top_failed_rules=evaluation["top_failed_rules"],
            flagged_transactions=evaluation["flagged_transactions"],
            transaction_store=evaluation["transaction_store"],
        )

        payload = response.to_dict()
        self._last_payload = payload
        self.reporter.save(simulation_id, payload)
        return response

    def analyze_transaction_ai(self, simulation_id: str, transaction_id: str) -> dict[str, Any]:
        payload = self.reporter.load_json(simulation_id)
        store = payload.get("transaction_store", {})
        record = store.get(transaction_id)
        if not record:
            raise KeyError(f"Transaction {transaction_id} not found in simulation {simulation_id}")

        customer = record["customer"]
        transaction = record["transaction"]
        categories = self.regulatory_rules.select_categories(customer, transaction)
        relevant_rules = self.regulatory_rules.filter_rules(categories)
        rules_text = self.regulatory_rules.build_rules_text(relevant_rules)
        ai_result = self.compliance_ai.analyze(customer, transaction, rules_text)
        ai_result["deterministic_failures"] = record.get("failures", [])
        ai_result["deterministic_decision"] = record.get("decision")
        ai_result["deterministic_risk"] = record.get("risk")
        return ai_result
