# Simtix MVP Architecture

Simtix is an AI-powered **Regulatory Readiness Simulation Platform**. It helps FinTech teams test product readiness before regulator submission. It is **not** a live AML transaction checker.

## Principles

| Layer | Responsibility |
|-------|----------------|
| **Rule Engine (Python)** | All compliance decisions, scores, violations |
| **AI (GPT-4.1 Nano)** | Executive summary, risk explanation, recommendations only |
| **Frontend** | Enterprise SaaS UX, live simulation playback, dashboards |
| **Storage** | JSON files only |

## Folder Structure

```
simtix-prototype/
├── ARCHITECTURE.md
├── backend/
│   ├── server.py          # Flask routes, static file serving
│   ├── config.py          # Paths, model config, seeds
│   ├── models.py          # Dataclasses & JSON schemas
│   ├── generator.py       # Synthetic customers & transactions
│   ├── simulation.py      # Orchestration, merge, phases, events
│   ├── rule_engine.py     # Deterministic compliance rules
│   ├── ai.py              # Narrative generation only
│   └── report.py          # JSON + PDF export
├── data/
│   └── rules.json         # Rule definitions for rule engine
├── index.html
├── app.js
├── styles.css
└── requirements.txt
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/run-simulation` | Full simulation workflow |
| GET | `/api/report/<simulation_id>.json` | Download JSON report |
| GET | `/api/report/<simulation_id>.pdf` | Download PDF report |
| GET | `/` | SPA frontend |

### POST `/api/run-simulation`

**Input**
```json
{
  "project_name": "Namaa Wallet",
  "industry": "Tokenized Assets",
  "country": "Saudi Arabia",
  "regulator": "SAMA",
  "modules": ["AML", "KYC", "Tokenization"]
}
```

**Output**
```json
{
  "simulation_id": "sim-uuid",
  "events": [{"phase": "...", "message": "...", "timestamp": "..."}],
  "statistics": {},
  "violations": [],
  "module_scores": {},
  "readiness_score": 87,
  "ai_report": {},
  "customers_count": 100,
  "transactions_count": 500
}
```

## Data Flow

```
Create Project (frontend)
        ↓
POST /api/run-simulation
        ↓
generator.py → 100 customers, 500 transactions
        ↓
simulation.py → merged_df = transactions.merge(customers, on="Customer ID", how="left")
        ↓
rule_engine.py → violations, module scores, readiness score
        ↓
ai.py → executive summary (never decides compliance)
        ↓
report.py → persist JSON + PDF
        ↓
Frontend → live event playback → dashboard → report
```

## Backend Modules

| Module | Class / Functions |
|--------|-------------------|
| `models.py` | `Customer`, `Transaction`, `RuleResult`, `SimulationRequest`, `SimulationResponse` |
| `generator.py` | `SyntheticDataGenerator.generate()` |
| `rule_engine.py` | `RuleEngine.evaluate(merged_records)` |
| `simulation.py` | `SimulationRunner.run(request)` |
| `ai.py` | `AIReportGenerator.generate(context)` |
| `report.py` | `ReportBuilder.build_json()`, `build_pdf()` |
| `server.py` | Flask app, route handlers |

## Frontend Pages

| Route | Page |
|-------|------|
| `landing` | Marketing hero |
| `create` | Project wizard (4 steps) |
| `live` | Live simulation with event log |
| `dashboard` | Chart.js metrics |
| `results` | AI report + violations |
| `settings` | API token (optional) |

## JSON Schemas

See `backend/models.py` for dataclass definitions and `to_dict()` serializers.

## Class Design

```
SimulationRunner
  ├── SyntheticDataGenerator
  ├── RuleEngine
  ├── AIReportGenerator
  └── ReportBuilder

RuleEngine
  ├── load_rules(path)
  ├── evaluate_record(customer, transaction)
  └── aggregate_results(results)
```
