from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from backend.config import REPORTS_DIR, ensure_directories


class ReportBuilder:
    def __init__(self) -> None:
        ensure_directories()

    def save(self, simulation_id: str, payload: dict[str, Any]) -> dict[str, str]:
        json_path = REPORTS_DIR / f"{simulation_id}.json"
        pdf_path = REPORTS_DIR / f"{simulation_id}.pdf"

        with open(json_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)

        self.build_pdf(pdf_path, payload)
        return {"json": str(json_path), "pdf": str(pdf_path)}

    def build_pdf(self, output_path: Path, payload: dict[str, Any]) -> None:
        styles = getSampleStyleSheet()
        story = []
        project = payload.get("project", {})
        ai_report = payload.get("ai_report", {})

        story.append(Paragraph("Simtix Regulatory Readiness Report", styles["Title"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"Project: {project.get('project_name', 'N/A')}", styles["Heading2"]))
        story.append(Paragraph(f"Industry: {project.get('industry', 'N/A')}", styles["Normal"]))
        story.append(Paragraph(f"Country: {project.get('country', 'N/A')}", styles["Normal"]))
        story.append(Paragraph(f"Regulator: {project.get('regulator', 'N/A')}", styles["Normal"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"Readiness Score: {payload.get('readiness_score', 0)}%", styles["Heading2"]))
        story.append(Spacer(1, 12))

        stats = payload.get("statistics", {})
        stats_rows = [["Metric", "Value"]] + [[key, str(value)] for key, value in stats.items()]
        stats_table = Table(stats_rows, hAlign="LEFT")
        stats_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        story.append(Paragraph("Simulation Statistics", styles["Heading2"]))
        story.append(stats_table)
        story.append(Spacer(1, 12))

        story.append(Paragraph("Executive Summary", styles["Heading2"]))
        story.append(Paragraph(ai_report.get("executive_summary", ""), styles["Normal"]))
        story.append(Spacer(1, 12))
        story.append(Paragraph("Risk Explanation", styles["Heading2"]))
        story.append(Paragraph(ai_report.get("risk_explanation", ""), styles["Normal"]))
        story.append(Spacer(1, 12))

        recommendations = ai_report.get("recommendations", [])
        if recommendations:
            story.append(Paragraph("Recommendations", styles["Heading2"]))
            for item in recommendations:
                story.append(Paragraph(f"• {item}", styles["Normal"]))

        doc = SimpleDocTemplate(str(output_path), pagesize=A4)
        doc.build(story)

    def load_json(self, simulation_id: str) -> dict[str, Any]:
        path = REPORTS_DIR / f"{simulation_id}.json"
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)

    def pdf_path(self, simulation_id: str) -> Path:
        return REPORTS_DIR / f"{simulation_id}.pdf"
