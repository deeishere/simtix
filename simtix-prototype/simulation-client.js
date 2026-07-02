/**
 * Simtix Executive Dashboard + transaction AI drill-down.
 */

const SIMTIX_API = window.location.port === "5000" ? "" : "http://127.0.0.1:5000";

let latestSimulation = null;
let chartInstances = [];

async function checkBackendReady() {
  const response = await fetch(`${SIMTIX_API}/api/health`);
  if (!response.ok) throw new Error("Backend not reachable. Run: python3 backend/server.py");
  const data = await response.json();
  if (data.service !== "simtix-backend") {
    throw new Error("Wrong server on port 5000. Run: python3 backend/server.py");
  }
  return data;
}

function getSelectedModules() {
  return [...document.querySelectorAll('input[name="module"]:checked')].map((input) => input.value);
}

function getProjectPayload() {
  const customerCount = Number(document.querySelector("#simCustomerCount")?.value || 100);
  const transactionCount = Number(document.querySelector("#simTransactionCount")?.value || 500);
  const seed = Number(document.querySelector("#simSeed")?.value || 42);
  const projectName = document.querySelector('[data-wizard="0"] input')?.value || "Riyadh Sukuk Platform";
  const industry = document.querySelector('[data-wizard="0"] select')?.value || "Tokenized Assets";
  const country = document.querySelectorAll('[data-wizard="0"] select')[1]?.value || "Saudi Arabia";
  const regulator = document.querySelectorAll('[data-wizard="0"] select')[2]?.value || "SAMA";

  return {
    project_name: projectName,
    industry,
    country,
    regulator,
    customer_count: customerCount,
    transaction_count: transactionCount,
    seed,
    modules: getSelectedModules(),
  };
}

function updateTxPerCustomerPreview() {
  const customers = Number(document.querySelector("#simCustomerCount")?.value || 1);
  const transactions = Number(document.querySelector("#simTransactionCount")?.value || 1);
  const field = document.querySelector("#simTxPerCustomer");
  if (field) field.value = (transactions / customers).toFixed(2);
}

async function runSimulation() {
  await checkBackendReady();
  const response = await fetch(`${SIMTIX_API}/api/run-simulation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getProjectPayload()),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Simulation failed (${response.status}): ${detail}`);
  }
  latestSimulation = await response.json();
  return latestSimulation;
}

function destroyCharts() {
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances = [];
}

function renderDashboard(data) {
  if (!data) return;
  destroyCharts();

  const stats = data.statistics || {};
  document.querySelector("#dashReadiness").textContent = `${data.readiness_score}%`;
  document.querySelector("#dashCustomers").textContent = String(data.customers_count);
  document.querySelector("#dashTransactions").textContent = String(data.transactions_count);
  document.querySelector("#dashEvaluations").textContent = String(stats.total_rule_evaluations || 0);
  document.querySelector("#dashFailedChecks").textContent = String(stats.total_failed_checks || 0);
  document.querySelector("#dashPassedChecks").textContent = String(stats.total_passed_checks || 0);
  document.querySelector("#dashHighRisk").textContent = String(stats.high_risk_transactions || 0);
  document.querySelector("#dashMediumRisk").textContent = String(stats.medium_risk_transactions || 0);
  document.querySelector("#dashLowRisk").textContent = String(stats.low_risk_transactions || 0);

  const topRulesBody = document.querySelector("#topFailedRulesTable tbody");
  topRulesBody.innerHTML = "";
  (data.top_failed_rules || []).forEach((rule) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${rule.rule_id}</td>
      <td>${rule.rule_name}</td>
      <td>${rule.module}</td>
      <td>${rule.severity}</td>
      <td>${rule.failure_count}</td>
    `;
    topRulesBody.appendChild(row);
  });

  const flaggedBody = document.querySelector("#flaggedTransactionsTable tbody");
  flaggedBody.innerHTML = "";
  (data.flagged_transactions || []).forEach((tx) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${tx.transaction_id}</td>
      <td>${tx.customer_id}</td>
      <td><span class="risk-pill risk-${String(tx.risk).toLowerCase()}">${tx.risk}</span></td>
      <td>${tx.decision}</td>
      <td>${(tx.failed_rules || []).join(", ")}</td>
      <td><button class="small-button view-tx-details" data-transaction-id="${tx.transaction_id}" type="button">View Details</button></td>
    `;
    flaggedBody.appendChild(row);
  });

  flaggedBody.querySelectorAll(".view-tx-details").forEach((button) => {
    button.addEventListener("click", () => {
      openTransactionReport(button.dataset.transactionId);
    });
  });

  if (typeof Chart === "undefined") return;

  const moduleCtx = document.querySelector("#moduleChart");
  if (moduleCtx) {
    chartInstances.push(new Chart(moduleCtx, {
      type: "bar",
      data: {
        labels: Object.keys(data.module_scores || {}),
        datasets: [{ data: Object.values(data.module_scores || {}), backgroundColor: "#2563eb" }],
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { max: 100 } } },
    }));
  }

  const severityCtx = document.querySelector("#severityChart");
  if (severityCtx) {
    const severity = stats.severity_distribution || {};
    chartInstances.push(new Chart(severityCtx, {
      type: "doughnut",
      data: {
        labels: Object.keys(severity),
        datasets: [{ data: Object.values(severity), backgroundColor: ["#991b1b", "#dc2626", "#f59e0b", "#64748b"] }],
      },
    }));
  }

  const txCtx = document.querySelector("#transactionChart");
  if (txCtx) {
    const txTypes = stats.transaction_types || {};
    chartInstances.push(new Chart(txCtx, {
      type: "pie",
      data: { labels: Object.keys(txTypes), datasets: [{ data: Object.values(txTypes) }] },
    }));
  }

  const riskCtx = document.querySelector("#riskChart");
  if (riskCtx) {
    const risk = stats.risk_distribution || {};
    chartInstances.push(new Chart(riskCtx, {
      type: "polarArea",
      data: {
        labels: Object.keys(risk),
        datasets: [{ data: Object.values(risk), backgroundColor: ["#ef4444", "#f59e0b", "#22c55e"] }],
      },
    }));
  }

  const topRulesCtx = document.querySelector("#topRulesChart");
  if (topRulesCtx) {
    const chartData = stats.top_failed_rules_chart || {};
    chartInstances.push(new Chart(topRulesCtx, {
      type: "bar",
      data: {
        labels: Object.keys(chartData),
        datasets: [{ data: Object.values(chartData), backgroundColor: "#7c3aed" }],
      },
      options: { indexAxis: "y", responsive: true, plugins: { legend: { display: false } } },
    }));
  }
}

function renderGptAnalysis(analysis) {
  if (!analysis) return;
  document.querySelector("#readinessScoreValue").textContent = analysis.decision || "--";
  document.querySelector("#readinessStatusLabel").textContent = analysis.overall_risk || "--";
  document.querySelector("#resultsCaseIds").textContent = `${analysis.customer_id || "--"} · ${analysis.transaction_id || "--"}`;
  document.querySelector("#aiSummaryText").textContent = analysis.summary || "";
  document.querySelector("#rawGptOutput").textContent = JSON.stringify(analysis, null, 2);

  const violationsList = document.querySelector("#violationsList");
  violationsList.innerHTML = "";
  (analysis.violations || []).forEach((violation) => {
    const details = document.createElement("details");
    details.open = violation.severity === "High" || violation.severity === "Critical";
    details.innerHTML = `
      <summary><span class="rule-id">${violation.rule_id || "Rule"}</span> ${violation.rule_name || ""}</summary>
      <p><strong>Severity:</strong> ${violation.severity || "N/A"}</p>
      <p><strong>Reason:</strong> ${violation.reason || ""}</p>
      <p><strong>Triggered by:</strong> ${(violation.triggered_by || []).join(", ") || "None"}</p>
    `;
    violationsList.appendChild(details);
  });

  const recommendationsList = document.querySelector("#recommendationsList");
  recommendationsList.innerHTML = "";
  (analysis.recommendations || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    recommendationsList.appendChild(li);
  });
}

async function openTransactionReport(transactionId) {
  if (!latestSimulation) return;
  document.querySelector("#resultsCaseIds").textContent = "Loading AI report...";
  window.showPage?.("results");

  try {
    const response = await fetch(`${SIMTIX_API}/api/transaction-ai-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        simulation_id: latestSimulation.simulation_id,
        transaction_id: transactionId,
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    const analysis = await response.json();
    renderGptAnalysis(analysis);
  } catch (error) {
    document.querySelector("#aiSummaryText").textContent = `Failed to load AI report: ${error.message}`;
  }
}

async function playLiveSimulation({ onProgress, onComplete }) {
  const data = await runSimulation();
  const events = data.events || [];
  let index = 0;
  const list = document.querySelector("#liveEvents");
  const caseMeta = document.querySelector("#complianceCaseMeta");

  function tick() {
    if (index >= events.length) {
      onComplete?.(data);
      return;
    }
    const event = events[index];
    const li = document.createElement("li");
    li.textContent = event.message;
    if (event.phase === "violations_found" || event.phase === "rule_triggered") li.className = "event-warning";
    list.prepend(li);
    onProgress?.(event.progress || Math.round(((index + 1) / events.length) * 100));
    if (caseMeta) caseMeta.textContent = event.message;
    index += 1;
    window.setTimeout(tick, 300);
  }

  tick();
  return data;
}

window.SimtixClient = {
  SIMTIX_API,
  checkBackendReady,
  get latestSimulation() {
    return latestSimulation;
  },
  getProjectPayload,
  updateTxPerCustomerPreview,
  runSimulation,
  playLiveSimulation,
  renderDashboard,
  renderGptAnalysis,
  openTransactionReport,
  destroyCharts,
};

document.querySelector("#simCustomerCount")?.addEventListener("input", updateTxPerCustomerPreview);
document.querySelector("#simTransactionCount")?.addEventListener("input", updateTxPerCustomerPreview);
updateTxPerCustomerPreview();
