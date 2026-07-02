from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class SimulationRequest:
    project_name: str
    industry: str
    country: str
    regulator: str
    customer_count: int = 100
    transaction_count: int = 500
    seed: int = 42
    modules: list[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "SimulationRequest":
        return cls(
            project_name=str(payload.get("project_name", "Untitled Project")),
            industry=str(payload.get("industry", "FinTech")),
            country=str(payload.get("country", "Saudi Arabia")),
            regulator=str(payload.get("regulator", "SAMA")),
            customer_count=max(1, int(payload.get("customer_count", 100))),
            transaction_count=max(1, int(payload.get("transaction_count", 500))),
            seed=int(payload.get("seed", 42)),
            modules=list(payload.get("modules") or []),
        )


@dataclass
class Customer:
    id: str
    name: str
    nationality: str
    customer_type: str
    risk_level: str
    kyc_status: str
    pep: str
    sanctions: str
    occupation: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "Customer ID": self.id,
            "Customer Name": self.name,
            "Nationality": self.nationality,
            "Customer Type": self.customer_type,
            "Risk Level": self.risk_level,
            "KYC Status": self.kyc_status,
            "PEP Flag": self.pep,
            "Sanction Match": self.sanctions,
            "Occupation": self.occupation,
        }


@dataclass
class Transaction:
    id: str
    sender: str
    receiver: str
    amount: float
    currency: str
    type: str
    timestamp: str
    destination_country: str
    international: str
    crypto: str
    wallet_id: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "Transaction ID": self.id,
            "Customer ID": self.sender,
            "Receiver": self.receiver,
            "Amount": self.amount,
            "Currency": self.currency,
            "Transaction Type": self.type,
            "Timestamp": self.timestamp,
            "Destination Country": self.destination_country,
            "Is International": self.international,
            "Crypto Asset": self.crypto,
            "Wallet ID": self.wallet_id,
        }


@dataclass
class RuleResult:
    rule_id: str
    rule_name: str
    module: str
    severity: str
    passed: bool
    message: str
    customer_id: str = ""
    transaction_id: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SimulationEvent:
    phase: str
    message: str
    progress: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SimulationResponse:
    simulation_id: str
    project: dict[str, Any]
    config: dict[str, Any]
    events: list[dict[str, Any]]
    statistics: dict[str, Any]
    module_scores: dict[str, int]
    readiness_score: int
    customers_count: int
    transactions_count: int
    top_failed_rules: list[dict[str, Any]] = field(default_factory=list)
    flagged_transactions: list[dict[str, Any]] = field(default_factory=list)
    transaction_store: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
