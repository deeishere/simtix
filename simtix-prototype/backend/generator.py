from __future__ import annotations

import random
from datetime import datetime, timedelta

from backend.models import Customer, Transaction


class SyntheticDataGenerator:
    NATIONALITIES = [
        "Saudi Arabia", "UAE", "Bahrain", "Kuwait", "Jordan", "Egypt", "Pakistan", "Philippines",
    ]
    CUSTOMER_TYPES = ["Individual", "Company"]
    RISK_LEVELS = ["Low", "Medium", "High"]
    KYC_STATUSES = ["Complete", "Pending Review", "Incomplete"]
    PEP_VALUES = ["Yes", "No"]
    SANCTIONS = ["No Match", "Potential Match - Under Review"]
    OCCUPATIONS = ["Engineer", "Teacher", "Retired", "Government Employee", "Business Owner", "Student"]
    TX_TYPES = ["Transfer", "Deposit", "Withdrawal", "Card Payment", "Bill Payment", "Buy Crypto", "Sell Crypto"]
    CURRENCIES = ["SAR", "AED", "USD", "JOD"]
    COUNTRIES = ["Saudi Arabia", "UAE", "Jordan", "Iran", "Kuwait", "Bahrain"]
    CRYPTO = ["", "BTC", "ETH", "USDT"]

    def __init__(self, seed: int = 42) -> None:
        self._rng = random.Random(seed)

    def generate_customers(self, count: int) -> list[Customer]:
        customers: list[Customer] = []
        for index in range(count):
            customer_id = f"CUST-{index + 1:05d}"
            customers.append(
                Customer(
                    id=customer_id,
                    name=f"Customer {index + 1}",
                    nationality=self._rng.choice(self.NATIONALITIES),
                    customer_type=self._rng.choice(self.CUSTOMER_TYPES),
                    risk_level=self._rng.choice(self.RISK_LEVELS),
                    kyc_status=self._rng.choice(self.KYC_STATUSES),
                    pep=self._rng.choices(self.PEP_VALUES, weights=[8, 92])[0],
                    sanctions=self._rng.choices(self.SANCTIONS, weights=[97, 3])[0],
                    occupation=self._rng.choice(self.OCCUPATIONS),
                )
            )
        return customers

    def generate_transactions(self, customers: list[Customer], count: int) -> list[Transaction]:
        if not customers:
            return []

        start = datetime(2025, 1, 1)
        transactions: list[Transaction] = []
        for index in range(count):
            sender = self._rng.choice(customers)
            receiver = self._rng.choice(customers)
            tx_type = self._rng.choice(self.TX_TYPES)
            destination = self._rng.choice(self.COUNTRIES)
            international = "Yes" if destination != sender.nationality else "No"
            timestamp = (start + timedelta(minutes=index * 5)).isoformat()
            transactions.append(
                Transaction(
                    id=f"TXN-{index + 1:06d}",
                    sender=sender.id,
                    receiver=receiver.id,
                    amount=round(self._rng.uniform(100, 75000), 2),
                    currency=self._rng.choice(self.CURRENCIES),
                    type=tx_type,
                    timestamp=timestamp,
                    destination_country=destination,
                    international=international,
                    crypto=self._rng.choice(self.CRYPTO),
                    wallet_id=f"WLT-{self._rng.randint(1000, 9999)}",
                )
            )
        return transactions

    def generate(self, customer_count: int, transaction_count: int) -> tuple[list[Customer], list[Transaction]]:
        customers = self.generate_customers(customer_count)
        transactions = self.generate_transactions(customers, transaction_count)
        return customers, transactions
