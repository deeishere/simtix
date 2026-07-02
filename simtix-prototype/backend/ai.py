from __future__ import annotations

import json
import re
from typing import Any

from openai import OpenAI

from backend.config import GITHUB_MODEL, GITHUB_MODELS_ENDPOINT, get_github_token

SYSTEM_PROMPT = """
You are Simtix Compliance AI.

You are an expert Regulatory Compliance Officer specializing in:

- AML
- KYC
- Customer Onboarding
- Sanctions Screening
- PEP Screening
- Transaction Monitoring
- Tokenized Assets

Your task is to analyze ONE customer and ONE transaction using ONLY the regulatory rules provided.

Rules:

- Never invent regulations.
- Never use outside knowledge.
- Base every decision only on the supplied rules.
- If no rule is violated, return "Compliant".
- If one or more rules are violated, return "Non-Compliant".
- If information is missing, return "Manual Review".

Return ONLY valid JSON.

Use this schema:

{
    "customer_id":"",
    "transaction_id":"",
    "decision":"",
    "overall_risk":"",
    "violations":[
        {
            "rule_id":"",
            "rule_name":"",
            "severity":"",
            "reason":"",
            "triggered_by":[]
        }
    ],
    "summary":"",
    "recommendations":[]
}
"""


class ComplianceAI:
    def __init__(self) -> None:
        token = get_github_token()
        self.client = OpenAI(base_url=GITHUB_MODELS_ENDPOINT, api_key=token) if token else None

    def _parse_json(self, content: str) -> dict[str, Any]:
        trimmed = content.strip()
        fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", trimmed)
        payload = fenced.group(1).strip() if fenced else trimmed
        return json.loads(payload)

    def build_user_prompt(self, customer: dict[str, Any], transaction: dict[str, Any], rules_text: str) -> str:
        return f"""# Regulatory Rules

{rules_text}

-----------------------------------------------------

# Customer

{json.dumps(customer, indent=2, default=str)}

-----------------------------------------------------

# Transaction

{json.dumps(transaction, indent=2, default=str)}

-----------------------------------------------------

Analyze the customer and transaction against ALL the provided regulatory rules.

Return ONLY JSON."""

    def _fallback(self, customer: dict[str, Any], transaction: dict[str, Any]) -> dict[str, Any]:
        kyc_ok = customer.get("KYC Status") == "Complete"
        sanctions_ok = customer.get("Sanction Match") == "No Match"
        decision = "Compliant" if kyc_ok and sanctions_ok else "Non-Compliant"
        return {
            "customer_id": customer.get("Customer ID"),
            "transaction_id": transaction.get("Transaction ID"),
            "decision": decision,
            "overall_risk": "High" if not sanctions_ok else "Medium" if not kyc_ok else "Low",
            "violations": [],
            "summary": "Fallback analysis used because GPT is unavailable. Set GITHUB_TOKEN to enable AI decisions.",
            "recommendations": ["Configure GITHUB_TOKEN and rerun the simulation."],
            "_source": "fallback",
        }

    def analyze(
        self,
        customer: dict[str, Any],
        transaction: dict[str, Any],
        rules_text: str,
    ) -> dict[str, Any]:
        user_prompt = self.build_user_prompt(customer, transaction, rules_text)

        if not self.client:
            return self._fallback(customer, transaction)

        try:
            response = self.client.chat.completions.create(
                model=GITHUB_MODEL,
                temperature=0.1,
                max_tokens=1200,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            )
            content = response.choices[0].message.content or ""
            result = self._parse_json(content)
            result.setdefault("customer_id", customer.get("Customer ID"))
            result.setdefault("transaction_id", transaction.get("Transaction ID"))
            result["_source"] = "github-models"
            return result
        except Exception as error:
            fallback = self._fallback(customer, transaction)
            fallback["summary"] = f"GPT analysis failed: {error}. Fallback result shown."
            return fallback
