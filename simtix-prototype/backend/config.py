from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
DATA_DIR = PROJECT_DIR / "data"
REPORTS_DIR = DATA_DIR / "reports"
RULES_PATH = DATA_DIR / "engine_rules.json"

GITHUB_MODELS_ENDPOINT = "https://models.github.ai/inference"
GITHUB_MODEL = "openai/gpt-4.1-nano"

RANDOM_SEED = 42
CUSTOMER_COUNT = 100
TRANSACTION_COUNT = 500

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


def ensure_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def get_github_token() -> str | None:
    return os.environ.get("GITHUB_TOKEN")
