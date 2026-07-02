from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS

from backend.config import DEFAULT_MODULES, ensure_directories
from backend.models import SimulationRequest
from backend.report import ReportBuilder
from backend.simulation import SimulationRunner

ensure_directories()

app = Flask(__name__, static_folder=str(ROOT), static_url_path="")
CORS(app)

runner = SimulationRunner()
reporter = ReportBuilder()


@app.get("/api/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "simtix-backend",
            "rules_source": "Regulatory_Rules_Features_Extraction.xlsx",
            "model": "openai/gpt-4.1-nano",
        }
    )


@app.post("/api/run-simulation")
def run_simulation():
    payload = request.get_json(force=True) or {}
    simulation_request = SimulationRequest.from_dict(payload)
    response = runner.run(simulation_request)
    return jsonify(response.to_dict())


@app.post("/api/transaction-ai-report")
def transaction_ai_report():
    payload = request.get_json(force=True) or {}
    simulation_id = payload.get("simulation_id")
    transaction_id = payload.get("transaction_id")
    if not simulation_id or not transaction_id:
        return jsonify({"error": "simulation_id and transaction_id are required"}), 400
    try:
        result = runner.analyze_transaction_ai(simulation_id, transaction_id)
        return jsonify(result)
    except KeyError as error:
        return jsonify({"error": str(error)}), 404
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.get("/api/report/<simulation_id>.json")
def download_json_report(simulation_id: str):
    path = reporter.load_json(simulation_id)
    return jsonify(path)


@app.get("/api/report/<simulation_id>.pdf")
def download_pdf_report(simulation_id: str):
    pdf_path = reporter.pdf_path(simulation_id)
    if not pdf_path.exists():
        return jsonify({"error": "Report not found"}), 404
    return send_file(pdf_path, mimetype="application/pdf", as_attachment=True)


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:filename>")
def static_files(filename: str):
    return send_from_directory(ROOT, filename)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
