# amd — Simtix Hackathon MVP

Simtix is an **AI-powered Regulatory Readiness Simulation Platform** for FinTech products.

## Architecture

See [simtix-prototype/ARCHITECTURE.md](simtix-prototype/ARCHITECTURE.md).

Key principle: **Python rules decide compliance. GPT only writes the narrative.**

## Run

```bash
cd simtix-prototype
pip install -r requirements.txt
export GITHUB_TOKEN=your_github_token   # optional, enables AI narrative
python backend/server.py
```

Open **http://127.0.0.1:5000**

## Simulation workflow

1. Create project in the wizard
2. Start simulation
3. Backend generates 100 customers + 500 transactions
4. `merged_df = transactions.merge(customers, on="Customer ID", how="left")`
5. Deterministic rule engine evaluates all merged records
6. Readiness score is calculated in Python
7. GPT generates executive summary + recommendations only
8. Dashboard + report pages render results

## Data

- Rule definitions: `data/engine_rules.json`
- Excel source files (optional legacy import): `data/*.xlsx`
- Generated reports: `data/reports/`

Refresh JSON from Excel:

```bash
python convert_data.py
```

## API

- `POST /api/run-simulation`
- `GET /api/report/<simulation_id>.json`
- `GET /api/report/<simulation_id>.pdf`
# simtix
