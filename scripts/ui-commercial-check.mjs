#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs", "sellable-readiness");
const outputDir = path.join(root, "output", "ui-commercial-check");

function ensureDirs() {
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
}

function readText(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function mdTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replaceAll("\n", "<br>").replaceAll("|", "\\|");
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
  ].join("\n");
}

function hasNestedPath(value, dottedPath) {
  let current = value;
  for (const key of dottedPath.split(".")) {
    if (!current || typeof current !== "object" || !(key in current)) return false;
    current = current[key];
  }
  return true;
}

function textIncludes(file, patterns) {
  const text = readText(file);
  return patterns.every((pattern) => (pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern)));
}

function addCheck(checks, key, pass, evidence, blocker = true) {
  checks.push({
    key,
    status: pass ? "PASS" : blocker ? "FAIL" : "TODO",
    evidence
  });
}

function packageScriptIncludes(packageJson, scriptName, expectedFragment) {
  return String(packageJson.scripts?.[scriptName] ?? "").includes(expectedFragment);
}

ensureDirs();

const tokens = readJson("apps/web/src/design-system/tokens.json");
const packageJson = readJson("package.json");
const checks = [];

for (const tokenPath of [
  "color.primary",
  "color.accent",
  "color.sidebar",
  "color.sidebarActiveBorder",
  "color.bg",
  "color.surface",
  "typography.fontFamily",
  "typography.fontFamilyNumber",
  "shadow.md",
  "layout.sidebarWidth",
  "layout.topbarHeight",
  "density.tableRowHeight",
  "focus.ring"
]) {
  addCheck(checks, `token:${tokenPath}`, hasNestedPath(tokens, tokenPath), `apps/web/src/design-system/tokens.json -> ${tokenPath}`);
}

addCheck(
  checks,
  "token:rbac-shell-palette",
  tokens.color?.accent === "#173F3D" &&
    tokens.color?.sidebar === "#173F3D" &&
    tokens.color?.primary === "#245F5B" &&
    tokens.color?.sidebarActiveBorder === "#B8872F" &&
    tokens.color?.warningSoft === "#F6EFE3" &&
    tokens.color?.bg === "#F4F6F5" &&
    tokens.color?.surface === "#FFFFFF" &&
    Number(tokens.layout?.sidebarWidth ?? 0) === 220 &&
    Number(tokens.layout?.topbarHeight ?? 0) === 56,
  "Design tokens lock the cloud-spruce shell, restrained primary action, sand-gold micro accent, neutral background and fixed shell dimensions."
);

addCheck(
  checks,
  "token:restrained-b2b-typography",
  String(tokens.typography?.fontFamily ?? "").includes("PingFang SC") &&
    String(tokens.typography?.fontFamily ?? "").includes("Microsoft YaHei") &&
    !String(tokens.typography?.fontFamily ?? "").includes("Inter") &&
    tokens.typography?.weightBold === 600,
  "Typography prioritizes Chinese system sans fonts and restrained heading weight."
);

addCheck(
  checks,
  "shell:topbar-sidebar-rbac",
  textIncludes("apps/web/src/layouts/AppShell.vue", [
    "enterprise-topbar",
    "enterprise-role-switch",
    "enterprise-bell-button",
    "enterprise-user-pill",
    "enterprise-sidebar",
    "enterprise-nav-item"
  ]) && !readText("apps/web/src/layouts/AppShell.vue").includes("enterprise-nav-group"),
  "AppShell uses a fixed topbar + green sidebar RBAC shell instead of the old grouped navigation."
);

addCheck(
  checks,
  "role-model:exact-template-matrix",
  textIncludes("apps/web/src/permissions/role-model.ts", [
    "template: \"A\"",
    "template: \"B\"",
    "template: \"C\"",
    "template: \"D\"",
    "showMessageBell",
    "supplier_quotation",
    "finance_reviewer",
    "procurementSupervision",
    "awardSupervision"
  ]),
  "role-model.ts preserves the role-to-template mapping, per-role bell visibility and supervision-only menus."
);

addCheck(
  checks,
  "login:commercial-layout",
  textIncludes("apps/web/src/pages/login/LoginPageShell.vue", ["enterprise-login-layout", "enterprise-login-brand", "enterprise-login-card"]),
  "Login page keeps the branded split portal layout."
);

addCheck(
  checks,
  "login:production-hides-local-access",
  textIncludes("apps/web/src/pages/login/useLoginPage.ts", ["showLocalAccess", "session.mode !== \"production\"", "session.mockAuthEnabled"]),
  "Local role quick entry stays hidden in production mode."
);

addCheck(
  checks,
  "login:compact-role-selector",
  textIncludes("apps/web/src/pages/login/DemoAccountTable.vue", ["eds-role-select-panel", "<select"]) &&
    !readText("apps/web/src/pages/login/DemoAccountTable.vue").includes("<DataTable"),
  "Mock role switching uses a compact selector instead of a tall test table."
);

for (const component of [
  "EmptyState",
  "ErrorState",
  "PermissionState",
  "KpiCard",
  "ActionCard",
  "StepList",
  "RiskAlertPanel",
  "AuditRail",
  "ActivityRail",
  "SplitDetailLayout",
  "EnvironmentBadge",
  "RoleBadge",
  "EnterpriseDialog"
]) {
  addCheck(
    checks,
    `component:${component}`,
    exists(`apps/web/src/components/base/${component}.vue`) && readText("apps/web/src/components/base/index.ts").includes(`as ${component}`),
    `apps/web/src/components/base/${component}.vue exported from base index.`
  );
}

addCheck(
  checks,
  "state-pages:routed",
  exists("apps/web/src/pages/PermissionDeniedPage.vue") &&
    exists("apps/web/src/pages/NotFoundPage.vue") &&
    textIncludes("apps/web/src/router/index.ts", ["/permission-denied", "/:pathMatch(.*)*"]) &&
    textIncludes("apps/web/src/App.vue", ["isPermissionDeniedRoute", "isNotFoundRoute"]),
  "Permission denied and not-found state pages stay inside the AppShell flow."
);

addCheck(
  checks,
  "dashboard:template-routing",
  textIncludes("apps/web/src/pages/dashboard/DashboardPageShell.vue", [
    "landingTemplate",
    "eds-template-a-main-grid",
    "eds-template-a-flow",
    "eds-template-b-shell",
    "eds-template-c-shell",
    "eds-template-d-shell",
    "DashboardTimelineSection"
  ]) && !readText("apps/web/src/pages/dashboard/DashboardPageShell.vue").includes("DashboardRoleWorkbenchSection"),
  "Dashboard routes through A/B/C/D templates instead of one shared workbench layout."
);

addCheck(
  checks,
  "dashboard:quick-action-center",
  textIncludes("apps/web/src/pages/dashboard/DashboardQuickActionSection.vue", ["eds-template-a-quick-grid", "eds-waterfall-shell", "eds-risk-list"]),
  "Dashboard quick-action center combines primary actions with restrained risk reminders."
);

addCheck(
  checks,
  "dashboard:gantt-and-shell-styles",
  textIncludes("apps/web/src/design-system/enterprise.css", [
    ".eds-template-a-kpis",
    ".eds-template-a-main-grid",
    ".eds-template-a-flow",
    ".eds-template-c-hero",
    ".eds-template-d-hero",
    ".eds-gantt-board",
    ".eds-waterfall-log"
  ]),
  "enterprise.css contains the new A/B/C/D template scaffolding, gantt and waterfall patterns."
);

addCheck(
  checks,
  "procurement:business-shell",
  textIncludes("apps/web/src/pages/procurement-requests/ProcurementRequestsShell.vue", ["PageHeader", "EnterpriseSurface", "eds-template-b-ledger"]) &&
    textIncludes("apps/web/src/pages/procurement-requests/ProcurementRequestsPageShell.vue", ["eds-template-b-workspace", "eds-template-b-rail"]),
  "Procurement requests use a B-template list workspace with compact ledger context and processing rail."
);

addCheck(
  checks,
  "bidding:portal-shell",
  textIncludes("apps/web/src/pages/bidding/BiddingPageShell.vue", ["eds-business-context", "SummaryCards", "BIDDING_ENTRY_HINT"]),
  "Supplier bidding exposes a portal-style context shell instead of a generic dashboard card."
);

addCheck(
  checks,
  "expert:avoidance-gate",
  textIncludes("apps/web/src/pages/expert-scoring/ExpertScoringRoutePageShell.vue", ["EnterpriseDialog", "showAvoidanceDialog", "confirmAll"]) &&
    textIncludes("apps/web/src/pages/expert-scoring/ExpertScoringPageShell.vue", ["eds-business-context", "TaskInboxSummary", "SummaryCards"]),
  "Expert scoring forces avoidance confirmation before entering the scoring flow."
);

addCheck(
  checks,
  "audit:waterfall-view",
  textIncludes("apps/web/src/pages/audit/AuditPageShell.vue", ["eds-audit-matrix", "eds-waterfall-log", "DataTable", "StatusTag"]),
  "Audit landing combines waterfall trace and dense detail table."
);

addCheck(
  checks,
  "permissions:matrix-shell",
  textIncludes("apps/web/src/pages/permissions/PermissionsPageShell.vue", [
    "系统设置",
    "EnterpriseSurface",
    "PermissionScopePanel",
    "SummaryCards"
  ]),
  "System settings page frames the permission matrix inside the D-template shell."
);

addCheck(
  checks,
  "sellable:commercial-gate",
  readText("scripts/sellable-readiness.mjs").includes("npm run ui:commercial-check"),
  "sellable-readiness aggregation still includes ui:commercial-check."
);

addCheck(
  checks,
  "sellable:layout-gate",
  readText("scripts/sellable-readiness.mjs").includes("npm run ui:layout-check"),
  "sellable-readiness aggregation still includes ui:layout-check."
);

addCheck(
  checks,
  "layout-check:script-present",
  textIncludes("scripts/ui-second-pass-checks.mjs", ["async function collectPageDiagnostics(page)", "async function runLayoutCheck(browser)"]),
  "ui-second-pass-checks.mjs still exposes the browser layout-check entry points for follow-up visual automation."
);

for (const scriptName of ["ui:terminology-check", "ui:login-role-smoke", "ui:layout-check", "ui:visual-review-pack"]) {
  const expectedScript = scriptName === "ui:terminology-check" ? "scripts/ui-terminology-check.mjs" : "scripts/ui-second-pass-checks.mjs";
  addCheck(
    checks,
    `script:${scriptName}`,
    packageScriptIncludes(packageJson, scriptName, expectedScript) && exists(expectedScript),
    `package.json registers ${scriptName} via ${expectedScript}.`
  );
}

for (const [key, file] of [
  ["docs:visual-report", "docs/sellable-readiness/04_VISUAL_REDESIGN_REPORT.md"],
  ["docs:commercial-report", "docs/sellable-readiness/05_UI_COMMERCIAL_CHECK_REPORT.md"]
]) {
  const selfGenerating = key === "docs:commercial-report";
  addCheck(checks, key, selfGenerating || exists(file), `${file} exists.`, false);
}

const failures = checks.filter((item) => item.status === "FAIL");
const todos = checks.filter((item) => item.status === "TODO");
const payload = {
  generatedAt: new Date().toISOString(),
  status: failures.length === 0 ? "PASS" : "FAIL",
  pass: checks.filter((item) => item.status === "PASS").length,
  failures,
  todos,
  checks
};

fs.writeFileSync(path.join(outputDir, "ui-commercial-check.json"), JSON.stringify(payload, null, 2), "utf8");

const report = `# UI Commercial Check Report

- Generated at: ${payload.generatedAt}
- Result: ${payload.status}
- Pass: ${payload.pass}
- Failures: ${failures.length}
- TODO / blocker records: ${todos.length}

${mdTable(["Check", "Status", "Evidence"], checks.map((item) => [item.key, item.status, item.evidence]))}

## Scope Boundary

This check validates the RBAC shell, low-saturation enterprise token system, the four landing templates, and key page-shell evidence only. It does not weaken production readiness, route access, API tests, sellable readiness gates, or process-layer evidence.`;

fs.writeFileSync(path.join(docsDir, "05_UI_COMMERCIAL_CHECK_REPORT.md"), report.trimEnd() + "\n", "utf8");

console.log(
  JSON.stringify(
    {
      status: payload.status,
      failures: failures.length,
      todos: todos.length,
      report: "docs/sellable-readiness/05_UI_COMMERCIAL_CHECK_REPORT.md"
    },
    null,
    2
  )
);

if (failures.length) process.exitCode = 1;
