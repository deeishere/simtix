/**
 * Simtix Compliance Engine — port of the Colab regulatory analysis pipeline.
 * Data source: Regulatory_Rules_Features_Extraction.xlsx, customer.xlsx, transaction.xlsx
 */

const COMPLIANCE_CONFIG = {
  endpoint: "https://models.github.ai/inference",
  model: "openai/gpt-4.1-nano",
  proxyUrl: "http://127.0.0.1:5000/api/analyze",
  dataUrl: "http://127.0.0.1:5000/api/data",
  temperature: 0.1,
  maxTokens: 1200,
  simulationCaseLimit: 8,
};

const SYSTEM_PROMPT = `You are Simtix Compliance AI.

You are an expert Regulatory Compliance Officer specializing in:

- KYC & Onboarding
- AML / CFT
- Beneficial Ownership
- Transaction Monitoring
- Sanctions Screening
- Customer Due Diligence (CDD)
- Investor Protection

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
}`;

let rulesData = [];
let customersData = [];
let transactionsData = [];
let cachedSimulationCases = null;
let dataSource = "json";

function serializeRecord(record) {
  const out = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) {
      out[key] = null;
    } else if (value instanceof Date) {
      out[key] = value.toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

function selectCategories(customer, transaction) {
  const selected = new Set();

  if (transaction["Transaction Type"] === "Transfer") {
    selected.add("AML / CFT");
    selected.add("Transaction Monitoring");
  }

  if ((transaction.Amount ?? 0) > 20000) {
    selected.add("AML / CFT");
    selected.add("Transaction Monitoring");
  }

  if (customer["KYC Status"] !== "Complete") {
    selected.add("KYC & Onboarding");
  }

  if (customer["PEP Flag"] === "Yes") {
    selected.add("Customer Due Diligence (CDD)");
    selected.add("Sanctions Screening");
  }

  if (customer["Sanction Match"] !== "No Match") {
    selected.add("Sanctions Screening");
  }

  const cryptoAsset = transaction["Crypto Asset"];
  if (cryptoAsset !== null && cryptoAsset !== undefined && cryptoAsset !== "") {
    selected.add("Investor Protection");
    selected.add("Transaction Monitoring");
  }

  if (transaction["Transaction Type"] === "Buy Crypto" || transaction["Transaction Type"] === "Sell Crypto") {
    selected.add("Investor Protection");
    selected.add("Transaction Monitoring");
  }

  if (customer["Beneficial Owner Exists"] === "Yes") {
    selected.add("Beneficial Ownership");
  }

  if (transaction["Is International"] === "Yes") {
    selected.add("Sanctions Screening");
    selected.add("AML / CFT");
  }

  return selected;
}

function filterRules(selectedCategories) {
  return rulesData.filter((rule) => selectedCategories.has(rule.Category));
}

function buildRulesText(relevantRules) {
  return relevantRules
    .map(
      (row) => `
Rule ID: ${row.Rule_ID}

Category: ${row.Category}

Rule:
${row.Rule}

Scenario:
${row.Scenario}

Expected Behavior:
${row["Expected Behavior"]}

--------------------------------------------
`
    )
    .join("");
}

function buildUserPrompt(customer, transaction, rulesText) {
  return `# Regulatory Rules

${rulesText}

-----------------------------------------------------

# Customer

${JSON.stringify(customer, null, 2)}

-----------------------------------------------------

# Transaction

${JSON.stringify(transaction, null, 2)}

-----------------------------------------------------

Analyze the customer and transaction against ALL the provided regulatory rules.

Return ONLY JSON.`;
}

function getCustomerById(customerId) {
  return (
    customersData.find((customer) => customer["Customer ID"] === customerId || customer.customer_id === customerId) ??
    null
  );
}

function getCustomerLabel(customer) {
  return customer["Customer ID"] || customer.customer_id || "Customer";
}

function getTransactionId(transaction) {
  return transaction["Transaction ID"] || transaction.transaction_id;
}

function buildSimulationCases() {
  if (cachedSimulationCases) return cachedSimulationCases;

  const cases = [];

  if (customersData[0] && transactionsData[0]) {
    const customer = customersData[0];
    const transaction = transactionsData[0];
    const categories = selectCategories(customer, transaction);
    cases.push({ customer, transaction, categories, rules: filterRules(categories) });
  }

  cachedSimulationCases = cases;
  return cases;
}

function parseComplianceJson(raw) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(payload);
}

async function callGitHubModelsDirect(apiToken, userPrompt) {
  const response = await fetch(`${COMPLIANCE_CONFIG.endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: COMPLIANCE_CONFIG.model,
      temperature: COMPLIANCE_CONFIG.temperature,
      max_tokens: COMPLIANCE_CONFIG.maxTokens,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub Models API error (${response.status}): ${detail}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callProxyServer(customer, transaction) {
  const response = await fetch(COMPLIANCE_CONFIG.proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer, transaction }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Compliance proxy error (${response.status}): ${detail}`);
  }

  return response.json();
}

function buildDeterministicFallback(customer, transaction, relevantRules) {
  const violations = [];

  for (const rule of relevantRules) {
    let triggered = false;
    const triggeredBy = [];

    if (rule.Rule_ID.startsWith("KYC-") && customer["KYC Status"] !== "Complete") {
      triggered = true;
      triggeredBy.push("KYC Status");
    }
    if (rule.Rule_ID.startsWith("SAN-") && customer["Sanction Match"] !== "No Match") {
      triggered = true;
      triggeredBy.push("Sanction Match");
    }
    if (rule.Rule_ID.startsWith("CDD-") && customer["PEP Flag"] === "Yes") {
      triggered = true;
      triggeredBy.push("PEP Flag");
    }
    if (rule.Rule_ID.startsWith("AML-") && ((transaction.Amount ?? 0) > 20000 || transaction["Transaction Type"] === "Transfer")) {
      triggered = true;
      triggeredBy.push(transaction.Amount > 20000 ? "Amount" : "Transaction Type");
    }
    if (rule.Rule_ID.startsWith("TM-") && (transaction["Is International"] === "Yes" || transaction["Transaction Type"] === "Transfer")) {
      triggered = true;
      triggeredBy.push("Transaction Type");
    }
    if (rule.Rule_ID.startsWith("BO-") && customer["Beneficial Owner Exists"] === "Yes") {
      triggered = true;
      triggeredBy.push("Beneficial Owner Exists");
    }
    if (rule.Rule_ID.startsWith("INV-") && (transaction["Crypto Asset"] || ["Buy Crypto", "Sell Crypto"].includes(transaction["Transaction Type"]))) {
      triggered = true;
      triggeredBy.push("Crypto Asset");
    }

    if (triggered) {
      violations.push({
        rule_id: rule.Rule_ID,
        rule_name: rule.Rule.split(".")[0],
        severity: rule.Category === "Sanctions Screening" ? "High" : customer["Risk Level"] === "High" ? "High" : "Medium",
        reason: `Triggered by ${rule.Category} rule: ${rule.Rule}`,
        triggered_by: triggeredBy,
      });
    }
  }

  const decision = violations.length ? "Non-Compliant" : "Compliant";
  const overallRisk =
    violations.some((v) => v.severity === "Critical") ? "Critical" :
    violations.some((v) => v.severity === "High") ? "High" :
    violations.length ? "Medium" : "Low";

  return {
    customer_id: customer["Customer ID"] || customer.customer_id,
    transaction_id: getTransactionId(transaction),
    decision,
    overall_risk: overallRisk,
    violations,
    summary:
      violations.length === 0
        ? "No regulatory rule violations detected for the selected categories."
        : `${violations.length} rule violation(s) detected across ${[...new Set(violations.map((v) => relevantRules.find((r) => r.Rule_ID === v.rule_id)?.Category))].join(", ")}.`,
    recommendations:
      violations.length === 0
        ? ["Continue standard monitoring."]
        : violations.map((v) => `Address ${v.rule_id}: ${relevantRules.find((r) => r.Rule_ID === v.rule_id)?.["Expected Behavior"] ?? "Review required."}`),
    _source: "deterministic",
  };
}

async function analyzeCompliance(customer, transaction, options = {}) {
  const { apiToken, preferProxy = true } = options;
  const serializedCustomer = serializeRecord(customer);
  const serializedTransaction = serializeRecord(transaction);
  const categories = selectCategories(serializedCustomer, serializedTransaction);
  const relevantRules = filterRules(categories);
  const rulesText = buildRulesText(relevantRules);
  const userPrompt = buildUserPrompt(serializedCustomer, serializedTransaction, rulesText);

  if (preferProxy) {
    try {
      const result = await callProxyServer(serializedCustomer, serializedTransaction);
      result._source = "proxy";
      return { result, categories, relevantRules };
    } catch {
      // Fall through to direct API or deterministic mode.
    }
  }

  if (apiToken) {
    try {
      const content = await callGitHubModelsDirect(apiToken, userPrompt);
      const result = parseComplianceJson(content);
      result._source = "github-models";
      return { result, categories, relevantRules };
    } catch {
      // Fall through to deterministic mode.
    }
  }

  const result = buildDeterministicFallback(serializedCustomer, serializedTransaction, relevantRules);
  return { result, categories, relevantRules };
}

async function loadComplianceData() {
  cachedSimulationCases = null;

  try {
    const response = await fetch(COMPLIANCE_CONFIG.dataUrl);
    if (response.ok) {
      const data = await response.json();
      rulesData = data.rules;
      customersData = data.customers;
      transactionsData = data.transactions;
      cachedSimulationCases = (data.simulationCases || []).map((item) => ({
        customer: serializeRecord(item.customer),
        transaction: serializeRecord(item.transaction),
        categories: item.categories || [...selectCategories(item.customer, item.transaction)],
        rules: item.rules || filterRules(selectCategories(item.customer, item.transaction)),
      }));
      dataSource = data.source || "excel";
      return { rules: rulesData, customers: customersData, transactions: transactionsData, source: dataSource };
    }
  } catch {
    // Fall back to exported JSON from the Excel files.
  }

  const [rules, customers, transactions] = await Promise.all([
    fetch("data/rules.json").then((r) => r.json()),
    fetch("data/customers.json").then((r) => r.json()),
    fetch("data/transactions.json").then((r) => r.json()),
  ]);

  rulesData = rules;
  customersData = customers;
  transactionsData = transactions;
  dataSource = "json";
  return { rules, customers, transactions, source: dataSource };
}

window.ComplianceEngine = {
  COMPLIANCE_CONFIG,
  SYSTEM_PROMPT,
  loadComplianceData,
  selectCategories,
  filterRules,
  buildRulesText,
  buildUserPrompt,
  buildSimulationCases,
  analyzeCompliance,
  getCustomerById,
  getCustomerLabel,
  getTransactionId,
};
