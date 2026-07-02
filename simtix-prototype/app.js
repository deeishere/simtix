const pages = document.querySelectorAll(".page");
const navLinks = document.querySelectorAll(".nav-link");
const appOnly = document.querySelectorAll(".app-only");
const publicOnly = document.querySelectorAll(".public-only");
const languageToggle = document.querySelector("#languageToggle");
let authed = false;
let wizardStep = 0;
let liveTimer;
let currentLang = "en";
let uploadedSimulationFiles = ["business-model.pdf", "architecture.pdf", "api-docs.yaml"];
let uploadedDocumentFiles = [];
let simulationCases = [];
let complianceAnalyses = [];
let complianceDataReady = false;
let githubToken = localStorage.getItem("simtix_github_token") || "";

const translations = {
  "Home": "الرئيسية",
  "Projects": "المشاريع",
  "Simulations": "المحاكاة",
  "Documents": "المستندات",
  "Reports": "التقارير",
  "AI Assistant": "المساعد الذكي",
  "Team": "الفريق",
  "Notifications": "الإشعارات",
  "Login": "تسجيل الدخول",
  "Create Account": "إنشاء حساب",
  "AI Regulatory Simulation Platform": "منصة محاكاة تنظيمية بالذكاء الاصطناعي",
  "Test your financial products before regulators do.": "اختبر منتجاتك المالية قبل أن يختبرها المنظمون.",
  "Run AI-powered compliance simulations, detect risks early, and improve regulatory readiness before submission.": "شغّل محاكاة امتثال مدعومة بالذكاء الاصطناعي، واكتشف المخاطر مبكراً، وحسّن الجاهزية التنظيمية قبل التقديم.",
  "Start Simulation": "ابدأ المحاكاة",
  "Book Demo": "احجز عرضاً",
  "Average readiness score after recommendations": "متوسط درجة الجاهزية بعد التوصيات",
  "Features": "المميزات",
  "Everything teams need before regulatory review.": "كل ما تحتاجه الفرق قبل المراجعة التنظيمية.",
  "AI Compliance Simulation": "محاكاة امتثال ذكية",
  "Run thousands of regulatory scenarios.": "شغّل آلاف السيناريوهات التنظيمية.",
  "Synthetic Transactions": "معاملات اصطناعية",
  "Generate realistic financial activities safely.": "ولّد أنشطة مالية واقعية بأمان.",
  "Risk Detection": "اكتشاف المخاطر",
  "Find compliance issues before submission.": "اكتشف مشكلات الامتثال قبل التقديم.",
  "Readiness Reports": "تقارير الجاهزية",
  "Receive detailed AI-generated recommendations.": "احصل على توصيات تفصيلية مولدة بالذكاء الاصطناعي.",
  "How it works": "كيف يعمل",
  "From product documents to a regulator-ready action plan.": "من مستندات المنتج إلى خطة عمل جاهزة للمنظم.",
  "Create Project": "إنشاء مشروع",
  "Upload Documentation": "رفع المستندات",
  "Configure Regulations": "إعداد اللوائح",
  "Run Simulation": "تشغيل المحاكاة",
  "Receive AI Report": "استلام تقرير ذكي",
  "Improve Product": "تحسين المنتج",
  "Submit to Regulator": "التقديم للمنظم",
  "Industries": "القطاعات",
  "Built for modern financial products.": "مصمم للمنتجات المالية الحديثة.",
  "Digital Banks": "البنوك الرقمية",
  "Tokenized Assets": "الأصول المرمزة",
  "Open Banking": "الخدمات المصرفية المفتوحة",
  "Insurance": "التأمين",
  "Crowdfunding": "التمويل الجماعي",
  "Payments": "المدفوعات",
  "Ready to test your product?": "جاهز لاختبار منتجك؟",
  "Start your first simulation.": "ابدأ أول محاكاة لك.",
  "Regulatory readiness workspace": "مساحة عمل للجاهزية التنظيمية",
  "Teams, documents, simulations, and reports in one secure place.": "الفرق والمستندات والمحاكاة والتقارير في مكان آمن واحد.",
  "Start testing with Simtix.": "ابدأ الاختبار مع Simtix.",
  "Email": "البريد الإلكتروني",
  "Password": "كلمة المرور",
  "Company": "الشركة",
  "Industry": "القطاع",
  "Country": "الدولة",
  "Saudi Arabia": "السعودية",
  "UAE": "الإمارات",
  "Bahrain": "البحرين",
  "Already have one?": "لديك حساب؟",
  "User Home": "صفحة المستخدم",
  "Welcome back, Rehaf.": "مرحباً بعودتك، رهاف.",
  "Continue where you left off.": "أكمل من حيث توقفت.",
  "Recent Projects": "المشاريع الأخيرة",
  "View all": "عرض الكل",
  "Namaa Wallet": "محفظة نماء",
  "87% Ready": "جاهز 87%",
  "Continue ->": "متابعة ←",
  "Riyadh Sukuk Platform": "منصة صكوك الرياض",
  "Running Simulation": "المحاكاة قيد التشغيل",
  "View ->": "عرض ←",
  "Quick Actions": "إجراءات سريعة",
  "+ New Simulation": "+ محاكاة جديدة",
  "+ Invite Team": "+ دعوة الفريق",
  "+ Upload Documents": "+ رفع مستندات",
  "+ View Reports": "+ عرض التقارير",
  "Create New Simulation": "إنشاء محاكاة جديدة",
  "Build a regulatory test in four steps.": "ابنِ اختباراً تنظيمياً في أربع خطوات.",
  "1 Project": "1 المشروع",
  "2 Upload": "2 الرفع",
  "3 Modules": "3 الوحدات",
  "4 Settings": "4 الإعدادات",
  "Project details": "تفاصيل المشروع",
  "Project Name": "اسم المشروع",
  "Regulator": "الجهة التنظيمية",
  "Central Bank": "البنك المركزي",
  "Other": "أخرى",
  "Upload documentation": "رفع المستندات",
  "Upload or drag documentation": "ارفع أو اسحب المستندات",
  "Business model, architecture PDFs, policy documents, API documentation, and contracts": "نموذج العمل، ملفات البنية، وثائق السياسات، توثيق API، والعقود",
  "Drag & Drop Business Model, Architecture PDF, Policy Documents, API Documentation, Contracts": "اسحب وأفلت نموذج العمل، ملف البنية، السياسات، توثيق API، والعقود",
  "Choose modules": "اختر الوحدات",
  "Tokenization": "الترميز",
  "Cybersecurity": "الأمن السيبراني",
  "Consumer Protection": "حماية المستهلك",
  "Risk Management": "إدارة المخاطر",
  "Fraud Detection": "كشف الاحتيال",
  "Simulation settings": "إعدادات المحاكاة",
  "Synthetic Customers": "عملاء اصطناعيون",
  "AI Difficulty": "صعوبة الذكاء الاصطناعي",
  "Easy": "سهل",
  "Standard": "قياسي",
  "Extreme": "متطرف",
  "Back": "رجوع",
  "Next": "التالي",
  "Live Simulation": "المحاكاة الحية",
  "Monitor regulatory checks in real time.": "راقب الفحوصات التنظيمية في الوقت الفعلي.",
  "Simulation progress": "تقدم المحاكاة",
  "Estimated": "المتبقي",
  "2 minutes": "دقيقتان",
  "Monitoring synthetic events generated for this simulation.": "مراقبة أحداث اصطناعية مولدة لهذه المحاكاة.",
  "Live events": "الأحداث المباشرة",
  "Synthetic monitoring stream": "تدفق مراقبة اصطناعي",
  "Simtix is analyzing generated customer, wallet, transfer, and document events against selected regulatory modules.": "يقوم Simtix بتحليل أحداث العملاء والمحافظ والتحويلات والمستندات المولدة مقابل الوحدات التنظيمية المحددة.",
  "Simulated live run": "تشغيل حي اصطناعي",
  "Transactions analyzed": "المعاملات المحللة",
  "Risk alerts": "تنبيهات المخاطر",
  "Rules evaluated": "القواعد المقيمة",
  "Avg. check time": "متوسط وقت الفحص",
  "Review findings with Simtix AI": "راجع الملاحظات مع Simtix AI",
  "Explain this finding": "اشرح هذه الملاحظة",
  "What regulation applies?": "ما اللائحة المطبقة؟",
  "Suggest remediation steps": "اقترح خطوات المعالجة",
  "Simulation Results": "نتائج المحاكاة",
  "View Results": "عرض النتائج",
  "Readiness Score": "درجة الجاهزية",
  "Excellent": "ممتاز",
  "Compliance": "الامتثال",
  "Cyber": "السيبراني",
  "Governance": "الحوكمة",
  "Issues": "المشكلات",
  "High-risk wallet verification": "تحقق محفظة عالية المخاطر",
  "Severity:": "الخطورة:",
  "Medium": "متوسطة",
  "Recommendation:": "التوصية:",
  "Require additional KYC verification.": "يتطلب تحقق KYC إضافياً.",
  "Missing AML escalation evidence": "دليل تصعيد AML مفقود",
  "Low": "منخفضة",
  "Attach decision logs to the final report.": "أرفق سجلات القرار بالتقرير النهائي.",
  "AI Summary": "ملخص الذكاء الاصطناعي",
  "Overall, your product demonstrates strong regulatory readiness. Minor improvements are recommended for AML monitoring.": "بشكل عام، يظهر منتجك جاهزية تنظيمية قوية. نوصي بتحسينات بسيطة في مراقبة AML.",
  "Export PDF": "تصدير PDF",
  "Export Excel": "تصدير Excel",
  "Share": "مشاركة",
  "Submit": "إرسال",
  "Submitted to regulator workspace": "تم الإرسال إلى مساحة عمل الجهة التنظيمية",
  "Report link copied": "تم نسخ رابط التقرير",
  "File list updated": "تم تحديث قائمة الملفات",
  "Invitation sent": "تم إرسال الدعوة",
  "New Reviewer": "مراجع جديد",
  "Invited": "تمت الدعوة",
  "Pending": "قيد الانتظار",
  "Settings section opened": "تم فتح قسم الإعدادات",
  "Signed in successfully": "تم تسجيل الدخول بنجاح",
  "Simulation complete. Opening results.": "اكتملت المحاكاة. يتم فتح النتائج.",
  "Uploaded files": "الملفات المرفوعة",
  "No files uploaded yet": "لم يتم رفع ملفات بعد",
  "All regulatory simulations.": "كل المحاكاة التنظيمية.",
  "Open Finance Gateway": "بوابة التمويل المفتوح",
  "Takaful Claims App": "تطبيق مطالبات تكافل",
  "Completed": "مكتمل",
  "Running": "قيد التشغيل",
  "Draft": "مسودة",
  "Open": "فتح",
  "Centralized evidence and policy library.": "مكتبة مركزية للأدلة والسياسات.",
  "Architecture": "البنية",
  "Policies": "السياسات",
  "Contracts": "العقود",
  "Risk": "المخاطر",
  "Preview PDFs": "معاينة ملفات PDF",
  "Document preview": "معاينة المستند",
  "Upload files": "رفع الملفات",
  "Version history: v1, v2, v3": "سجل الإصدارات: v1، v2، v3",
  "Comments: 8 open comments": "التعليقات: 8 تعليقات مفتوحة",
  "Team Collaboration": "تعاون الفريق",
  "Manage members and permissions.": "إدارة الأعضاء والصلاحيات.",
  "Rehaf Al-Faleh": "رهاف الفالح",
  "Sara Al-Nuhait": "سارة النحيط",
  "Doaa Al-Ghamdi": "دعاء الغامدي",
  "Owner": "مالك",
  "Online": "متصل",
  "Compliance Officer": "مسؤول امتثال",
  "Developer": "مطوّر",
  "Away": "غير متاح",
  "Invite": "دعوة",
  "Recent activity.": "النشاط الأخير.",
  "Simulation Completed": "اكتملت المحاكاة",
  "5 min ago": "قبل 5 دقائق",
  "AI Report Ready": "تقرير الذكاء الاصطناعي جاهز",
  "Yesterday": "أمس",
  "New Comment": "تعليق جديد",
  "2 days ago": "قبل يومين",
  "AI Chat Assistant": "مساعد المحادثة الذكي",
  "Regulatory guidance assistant.": "مساعد الإرشاد التنظيمي.",
  "How do I comply with SAMA Tokenization rules?": "كيف أمتثل لقواعد الترميز لدى ساما؟",
  "I can map the requirement to relevant regulations, suggested fixes, linked documents, and a generated checklist.": "يمكنني ربط المتطلب باللوائح ذات الصلة، والإصلاحات المقترحة، والمستندات المرتبطة، وقائمة تحقق مولدة.",
  "Send": "إرسال",
  "Company workspace settings.": "إعدادات مساحة عمل الشركة.",
  "Brand": "الهوية",
  "Security": "الأمان",
  "API Keys": "مفاتيح API",
  "Billing": "الفوترة",
  "Language": "اللغة",
  "Theme": "المظهر",
  "About": "عن المنصة",
  "Privacy": "الخصوصية",
  "Documentation": "التوثيق",
  "API": "API",
  "Support": "الدعم",
  "Using rule-based fallback until an API token or proxy server is configured.": "يتم استخدام محرك القواعد حتى يتم إعداد رمز API أو خادم proxy.",
  "Current compliance check": "فحص الامتثال الحالي",
  "GitHub Models API": "GitHub Models API",
  "Save Token": "حفظ الرمز",
  "Clear": "مسح",
  "Run a simulation to generate AI compliance findings.": "شغّل محاكاة لإنشاء نتائج امتثال بالذكاء الاصطناعي.",
  "Compliance analysis results will appear here after the live simulation completes.": "ستظهر نتائج تحليل الامتثال هنا بعد اكتمال المحاكاة الحية.",
  "Analyzing": "جاري التحليل",
  "Compliant": "ممتثل",
  "Non-Compliant": "غير ممتثل",
  "Manual Review": "مراجعة يدوية",
  "Pending": "قيد الانتظار",
  "Rule engine": "محرك القواعد",
  "GitHub Models": "GitHub Models",
  "Proxy server": "خادم proxy",
  "Token saved locally for this browser session.": "تم حفظ الرمز محلياً لهذا المتصفح.",
  "Token cleared.": "تم مسح الرمز.",
  "Regulatory data loaded.": "تم تحميل البيانات التنظيمية.",
  "Analyzing compliance case": "تحليل حالة امتثال",
  "categories": "فئات",
  "rules": "قواعد",
  "violation(s)": "مخالفة/مخالفات",
  "Recommendations": "التوصيات",
  "Compliance Decision": "قرار الامتثال",
  "Decision": "القرار",
  "Overall Risk": "المخاطر الإجمالية",
  "Customer ID": "معرف العميل",
  "Transaction ID": "معرف المعاملة",
  "Rule Evaluations": "تقييمات القواعد",
  "Analysis cases": "حالات التحليل",
  "Select case": "اختر الحالة",
  "View raw GPT JSON": "عرض JSON الخام من GPT",
  "Triggered by": "تم التفعيل بواسطة"
};

const reverseTranslations = Object.fromEntries(Object.entries(translations).map(([en, ar]) => [ar, en]));

const placeholderTranslations = {
  "Search projects": "البحث في المشاريع",
  "Ask about a regulation or finding": "اسأل عن لائحة أو ملاحظة"
};

const reversePlaceholderTranslations = Object.fromEntries(Object.entries(placeholderTranslations).map(([en, ar]) => [ar, en]));

const eventTranslations = {
  "✓ Customer onboarded": "✓ تم تسجيل العميل",
  "✓ KYC verified": "✓ تم التحقق من KYC",
  "⚠ AML Warning": "⚠ تحذير AML",
  "✓ Wallet Created": "✓ تم إنشاء المحفظة",
  "⚠ High Risk Transfer": "⚠ تحويل عالي المخاطر",
  "✓ Report Generated": "✓ تم إنشاء التقرير",
  "✓ Governance check complete": "✓ اكتمل فحص الحوكمة",
  "⚠ Missing audit attachment": "⚠ مرفق التدقيق مفقود"
};

const botReplies = {
  en: {
    flag: "This finding was generated because the simulated transaction exceeded the configured risk threshold. Suggested remediation: require enhanced KYC and attach AML escalation evidence.",
    general: "Relevant regulations found. Suggested fixes: strengthen KYC evidence, add monitoring thresholds, and generate a compliance checklist for the product team."
  },
  ar: {
    flag: "تم إنشاء هذه الملاحظة لأن المعاملة الاصطناعية تجاوزت حد المخاطر المحدد. المعالجة المقترحة: طلب KYC معزز وإرفاق دليل تصعيد AML.",
    general: "تم العثور على لوائح ذات صلة. الإصلاحات المقترحة: تعزيز أدلة KYC، وإضافة حدود مراقبة، وإنشاء قائمة تحقق للامتثال لفريق المنتج."
  }
};

function t(text) {
  return currentLang === "ar" ? translations[text] || text : text;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = t(message);
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function downloadFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function translateText(value, targetLang) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const dictionary = targetLang === "ar" ? translations : reverseTranslations;
  const normalized = trimmed.replace(/\s+/g, " ");
  const translated = dictionary[trimmed] || dictionary[normalized];
  if (!translated) return value;
  if (dictionary[normalized]) return translated;
  return value.replace(trimmed, translated);
}

function applyLanguage(targetLang) {
  currentLang = targetLang;
  document.documentElement.lang = targetLang;
  document.documentElement.dir = targetLang === "ar" ? "rtl" : "ltr";
  languageToggle.textContent = targetLang === "ar" ? "English" : "العربية";
  languageToggle.setAttribute("aria-label", targetLang === "ar" ? "Switch to English" : "Switch to Arabic");

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "CANVAS"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("#networkCanvas")) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    node.nodeValue = translateText(node.nodeValue, targetLang);
  });

  document.querySelectorAll("[placeholder]").forEach((input) => {
    const dictionary = targetLang === "ar" ? placeholderTranslations : reversePlaceholderTranslations;
    input.placeholder = dictionary[input.placeholder] || input.placeholder;
  });
}

function showPage(route) {
  if (route !== "landing" && route !== "auth") authed = true;
  pages.forEach((page) => page.classList.toggle("active", page.dataset.route === route));
  navLinks.forEach((button) => button.classList.toggle("active", button.dataset.page === route));
  appOnly.forEach((item) => (item.style.display = authed ? "" : "none"));
  publicOnly.forEach((item) => (item.style.display = authed ? "none" : ""));
  if (route === "live") startLiveSimulation();
  else window.clearInterval(liveTimer);
  if (route === "documents") renderDocumentFiles();
  if (route === "dashboard" && SimtixClient.latestSimulation) SimtixClient.renderDashboard(SimtixClient.latestSimulation);
  if (route === "settings") updateApiStatus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

navLinks.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

const wizardScreens = document.querySelectorAll(".wizard-screen");
const wizardButtons = document.querySelectorAll(".wizard-step");
const nextStep = document.querySelector("#nextStep");
const prevStep = document.querySelector("#prevStep");
const startLive = document.querySelector("#startLive");

function renderWizard() {
  wizardScreens.forEach((screen, index) => screen.classList.toggle("active", index === wizardStep));
  wizardButtons.forEach((button, index) => button.classList.toggle("active", index === wizardStep));
  prevStep.disabled = wizardStep === 0;
  nextStep.classList.toggle("hidden", wizardStep === wizardScreens.length - 1);
  startLive.classList.toggle("hidden", wizardStep !== wizardScreens.length - 1);
}

function goToNextWizardStep() {
  if (wizardStep === wizardScreens.length - 1) {
    showPage("live");
    return;
  }
  wizardStep = Math.min(wizardStep + 1, wizardScreens.length - 1);
  renderWizard();
}

wizardButtons.forEach((button) => {
  button.addEventListener("click", () => {
    wizardStep = Number(button.dataset.step);
    renderWizard();
  });
});

nextStep.addEventListener("click", goToNextWizardStep);

prevStep.addEventListener("click", () => {
  wizardStep = Math.max(wizardStep - 1, 0);
  renderWizard();
});

document.querySelectorAll(".segmented button").forEach((button) => {
  button.addEventListener("click", () => {
    button.parentElement.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

const eventSeedEn = [
  "✓ Customer onboarded",
  "✓ KYC verified",
  "⚠ AML Warning",
  "✓ Wallet Created",
  "⚠ High Risk Transfer",
  "✓ Report Generated",
  "✓ Governance check complete",
  "⚠ Missing audit attachment",
];

function getEventSeed() {
  return currentLang === "ar" ? eventSeedEn.map((event) => eventTranslations[event]) : eventSeedEn;
}

function getGithubToken() {
  return githubToken || localStorage.getItem("simtix_github_token") || "";
}

function updateApiStatus() {
  const status = document.querySelector("#apiStatusText");
  if (!status) return;
  if (getGithubToken()) {
    status.textContent = currentLang === "ar"
      ? "تم حفظ رمز GitHub. سيتم استخدام GitHub Models عند عدم توفر خادم proxy."
      : "GitHub token saved. GitHub Models will be used when the proxy server is unavailable.";
  } else {
    status.textContent = t("Using rule-based fallback until an API token or proxy server is configured.");
  }
}

function formatCaseMeta(customer, transaction, categories, rulesCount) {
  const name = ComplianceEngine.getCustomerLabel(customer);
  const amount = `${transaction.Amount?.toLocaleString()} ${transaction.Currency || "SAR"}`;
  const type = transaction["Transaction Type"];
  return `${name} · ${type} · ${amount} · ${categories.length} ${t("categories")} · ${rulesCount} ${t("rules")}`;
}

function setDecisionBadge(decision) {
  const badge = document.querySelector("#complianceDecisionBadge");
  if (!badge) return;
  badge.textContent = t(decision || "Pending");
  badge.className = "decision-badge";
  if (decision === "Compliant") badge.classList.add("compliant");
  else if (decision === "Non-Compliant") badge.classList.add("non-compliant");
  else if (decision === "Manual Review") badge.classList.add("manual-review");
  else badge.classList.add("pending");
}

function setSourceBadge(source) {
  const badge = document.querySelector("#complianceSourceBadge");
  if (!badge) return;
  const labels = {
    "github-models": "GitHub Models",
    proxy: "Proxy server",
    deterministic: "Rule engine",
  };
  badge.textContent = t(labels[source] || "Rule engine");
}

function renderCategoryChips(categories) {
  const container = document.querySelector("#complianceCategories");
  if (!container) return;
  container.innerHTML = "";
  categories.forEach((category) => {
    const chip = document.createElement("span");
    chip.className = "category-chip";
    chip.textContent = category;
    container.appendChild(chip);
  });
}

function renderCasePreview(customer, transaction) {
  const preview = document.querySelector("#complianceCasePreview");
  if (!preview) return;
  preview.textContent = JSON.stringify({ customer, transaction }, null, 2);
}

async function initBackendHealth() {
  try {
    await SimtixClient.checkBackendReady();
    showToast("Simtix backend connected.");
  } catch (error) {
    showToast(error.message);
  }
  updateApiStatus();
}

function renderSimulationViews(data) {
  if (!data) return;
  SimtixClient.renderDashboard(data);
}

async function startLiveSimulation() {
  const list = document.querySelector("#liveEvents");
  const progressValue = document.querySelector("#progressValue");
  const progressBar = document.querySelector("#progressBar");
  const caseMeta = document.querySelector("#complianceCaseMeta");

  list.innerHTML = "";
  window.clearInterval(liveTimer);
  progressValue.textContent = "0";
  progressBar.style.width = "0%";
  if (caseMeta) caseMeta.textContent = currentLang === "ar" ? "جاري تشغيل المحاكاة..." : "Running simulation...";

  try {
    await SimtixClient.playLiveSimulation({
      onProgress(progress) {
        progressValue.textContent = String(progress);
        progressBar.style.width = `${progress}%`;
      },
      onComplete(data) {
        renderSimulationViews(data);
        showToast("Simulation complete. Opening executive dashboard.");
        window.setTimeout(() => showPage("dashboard"), 900);
      },
    });
  } catch (error) {
    if (caseMeta) caseMeta.textContent = error.message;
    showToast(error.message);
  }
}

document.querySelectorAll(".prompt-chip").forEach((button) => {
  button.addEventListener("click", () => {
    showPage("assistant");
    addChat(button.textContent, "user");
    addChat(botReplies[currentLang].flag, "bot");
  });
});

const chatInput = document.querySelector("#chatInput");
const sendChat = document.querySelector("#sendChat");

function addChat(text, type) {
  const message = document.createElement("div");
  message.className = `chat ${type}`;
  message.textContent = text;
  document.querySelector("#chatMessages").appendChild(message);
}

sendChat.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;
  addChat(text, "user");
  addChat(botReplies[currentLang].general, "bot");
  chatInput.value = "";
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") sendChat.click();
});

const search = document.querySelector("#projectSearch");
search.addEventListener("input", () => {
  const query = search.value.toLowerCase();
  document.querySelectorAll("#projectGrid article").forEach((card) => {
    card.style.display = card.textContent.toLowerCase().includes(query) ? "" : "none";
  });
});

function renderFileList(target, files, emptyText = "No files uploaded yet") {
  target.innerHTML = "";
  if (!files.length) {
    const empty = document.createElement("span");
    empty.textContent = t(emptyText);
    target.appendChild(empty);
    return;
  }
  files.forEach((name) => {
    const chip = document.createElement("span");
    chip.textContent = name;
    target.appendChild(chip);
  });
}

function handleFiles(input, store, target) {
  const names = [...input.files].map((file) => file.name);
  store.splice(0, store.length, ...names);
  renderFileList(target, store);
  showToast("File list updated");
}

function handleDroppedFiles(event, store, target) {
  event.preventDefault();
  const names = [...event.dataTransfer.files].map((file) => file.name);
  if (!names.length) return;
  store.splice(0, store.length, ...names);
  renderFileList(target, store);
  showToast("File list updated");
}

const simulationFiles = document.querySelector("#simulationFiles");
const simulationFileList = document.querySelector("#simulationFileList");
const simulationDropZone = document.querySelector('label[for="simulationFiles"]');
simulationFiles.addEventListener("change", () => handleFiles(simulationFiles, uploadedSimulationFiles, simulationFileList));
simulationDropZone.addEventListener("dragover", (event) => event.preventDefault());
simulationDropZone.addEventListener("drop", (event) => handleDroppedFiles(event, uploadedSimulationFiles, simulationFileList));
renderFileList(simulationFileList, uploadedSimulationFiles);

const documentFiles = document.querySelector("#documentFiles");
const documentFileList = document.querySelector("#documentFileList");
const documentPreview = document.querySelector("#documentPreview");
const documentDropZone = document.querySelector('label[for="documentFiles"]');
function renderDocumentFiles() {
  renderFileList(documentFileList, uploadedDocumentFiles);
  if (uploadedDocumentFiles.length) documentPreview.textContent = uploadedDocumentFiles[0];
}
documentFiles.addEventListener("change", () => {
  handleFiles(documentFiles, uploadedDocumentFiles, documentFileList);
  renderDocumentFiles();
});
documentDropZone.addEventListener("dragover", (event) => event.preventDefault());
documentDropZone.addEventListener("drop", (event) => {
  handleDroppedFiles(event, uploadedDocumentFiles, documentFileList);
  renderDocumentFiles();
});

document.querySelectorAll(".folder-grid article").forEach((folder) => {
  folder.addEventListener("click", () => {
    const name = folder.dataset.folder;
    documentPreview.textContent = `${name.toLowerCase().replaceAll(" ", "-")}-review.pdf`;
    document.querySelector("#versionHistory").textContent = "Version history: v1, v2, current";
    document.querySelector("#documentComments").textContent = `${name} comments: 3 open comments`;
  });
});

document.querySelectorAll(".social-login").forEach((button) => {
  button.addEventListener("click", () => {
    showToast("Signed in successfully");
    showPage("home");
  });
});

document.querySelector("#exportPdf").addEventListener("click", () => {
  const data = SimtixClient.latestSimulation;
  if (data?.simulation_id) {
    window.open(`${SimtixClient.SIMTIX_API}/api/report/${data.simulation_id}.pdf`, "_blank");
    return;
  }
  downloadFile("simtix-readiness-report.txt", document.querySelector("#rawGptOutput")?.textContent || "No report available.");
});

document.querySelector("#exportExcel").addEventListener("click", () => {
  const data = SimtixClient.latestSimulation;
  if (!data) {
    downloadFile("simtix-readiness-report.csv", "Field,Value\nStatus,No data", "text/csv;charset=utf-8");
    return;
  }
  downloadFile("simtix-readiness-report.json", JSON.stringify(data, null, 2), "application/json;charset=utf-8");
});

document.querySelector("#shareReport").addEventListener("click", async () => {
  const shareText = `${location.href.split("#")[0]}#results`;
  try {
    await navigator.clipboard.writeText(shareText);
  } catch {
    // Clipboard may be unavailable on file://, but the prototype should still acknowledge the action.
  }
  showToast("Report link copied");
});

document.querySelector("#submitReport").addEventListener("click", () => {
  showToast("Submitted to regulator workspace");
  showPage("notifications");
});

document.querySelector("#viewResultsNow").addEventListener("click", () => {
  window.clearInterval(liveTimer);
  if (SimtixClient.latestSimulation) renderSimulationViews(SimtixClient.latestSimulation);
  showPage(SimtixClient.latestSimulation ? "dashboard" : "create");
});

const githubTokenInput = document.querySelector("#githubTokenInput");
if (githubTokenInput && githubToken) githubTokenInput.value = githubToken;

document.querySelector("#saveGithubToken")?.addEventListener("click", () => {
  githubToken = githubTokenInput.value.trim();
  if (githubToken) localStorage.setItem("simtix_github_token", githubToken);
  else localStorage.removeItem("simtix_github_token");
  updateApiStatus();
  showToast("Token saved locally for this browser session.");
});

document.querySelector("#clearGithubToken")?.addEventListener("click", () => {
  githubToken = "";
  githubTokenInput.value = "";
  localStorage.removeItem("simtix_github_token");
  updateApiStatus();
  showToast("Token cleared.");
});

document.querySelector("#inviteMember").addEventListener("click", () => {
  const container = document.querySelector('[data-route="team"] .content-card');
  const row = document.createElement("div");
  row.className = "member-row";
  row.innerHTML = "<span>New Reviewer</span><strong>Invited</strong><em>Pending</em><select><option>Viewer</option><option>Editor</option></select>";
  container.insertBefore(row, document.querySelector("#inviteMember"));
  showToast("Invitation sent");
});

document.querySelectorAll(".settings-grid article").forEach((setting) => {
  setting.addEventListener("click", () => showToast(`${setting.dataset.setting}: ${t("Settings section opened")}`));
});

document.querySelectorAll(".footer-link").forEach((button) => {
  button.addEventListener("click", () => showToast(`${button.textContent}: ${currentLang === "ar" ? "سيتم فتح هذه الصفحة في النسخة الكاملة" : "This page will open in the full product"}`));
});

function drawNetwork() {
  const canvas = document.querySelector("#networkCanvas");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const particles = Array.from({ length: 68 }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0009,
    vy: (Math.random() - 0.5) * 0.0009,
  }));

  function resize() {
    canvas.width = hero.clientWidth * devicePixelRatio;
    canvas.height = hero.clientHeight * devicePixelRatio;
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function frame() {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    context.clearRect(0, 0, width, height);
    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x < 0 || particle.x > 1) particle.vx *= -1;
      if (particle.y < 0 || particle.y > 1) particle.vy *= -1;
    });
    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = (a.x - b.x) * width;
        const dy = (a.y - b.y) * height;
        const distance = Math.hypot(dx, dy);
        if (distance < 150) {
          context.strokeStyle = `rgba(59, 130, 246, ${0.22 - distance / 800})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(a.x * width, a.y * height);
          context.lineTo(b.x * width, b.y * height);
          context.stroke();
        }
      }
    }
    particles.forEach((particle) => {
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.beginPath();
      context.arc(particle.x * width, particle.y * height, 2.1, 0, Math.PI * 2);
      context.fill();
    });
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  frame();
}

renderWizard();
initBackendHealth();
showPage("landing");
drawNetwork();
window.showPage = showPage;

languageToggle.addEventListener("click", () => {
  applyLanguage(currentLang === "en" ? "ar" : "en");
  if (document.querySelector('.page.active')?.dataset.route === "live") startLiveSimulation();
});
