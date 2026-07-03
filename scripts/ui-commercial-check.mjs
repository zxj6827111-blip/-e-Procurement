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

ensureDirs();

const tokens = readJson("apps/web/src/design-system/tokens.json");
const checks = [];

for (const tokenPath of [
  "color.primary",
  "color.accent",
  "color.sidebar",
  "color.panel",
  "color.infoSoft",
  "color.lockedSoft",
  "shadow.md",
  "layout.sidebarWidth",
  "density.tableRowHeight",
  "focus.ring"
]) {
  addCheck(checks, `token:${tokenPath}`, hasNestedPath(tokens, tokenPath), `apps/web/src/design-system/tokens.json -> ${tokenPath}`);
}

addCheck(
  checks,
  "shell:grouped-navigation",
  textIncludes("apps/web/src/layouts/AppShell.vue", ["enterprise-nav-group", "enterprise-nav-icon", "environmentLabel", "roleLabel"]),
  "apps/web/src/layouts/AppShell.vue renders grouped nav, icons, environment badge and role badge."
);

addCheck(
  checks,
  "role-model:navigation-metadata",
  textIncludes("apps/web/src/permissions/role-model.ts", ["group?:", "icon?:", "description?:", "priority?:", "group: \"采购\"", "group: \"履约结算\""]),
  "apps/web/src/permissions/role-model.ts preserves role entries and adds commercial grouping metadata."
);

addCheck(
  checks,
  "login:commercial-layout",
  textIncludes("apps/web/src/pages/login/LoginPageShell.vue", ["enterprise-login-layout", "enterprise-login-brand", "enterprise-login-card", "集团阳光采购与供应链协同平台"]),
  "apps/web/src/pages/login/LoginPageShell.vue contains branded product login layout."
);

addCheck(
  checks,
  "login:production-hides-local-access",
  textIncludes("apps/web/src/pages/login/useLoginPage.ts", ["showLocalAccess", "session.mode !== \"production\"", "session.mockAuthEnabled"]),
  "apps/web/src/pages/login/useLoginPage.ts hides local role quick entry when mode is production."
);

for (const component of [
  "EmptyState",
  "ErrorState",
  "PermissionState",
  "KpiCard",
  "ActionCard",
  "ProcessStepBar",
  "RiskAlertPanel",
  "AuditRail",
  "BusinessTimeline",
  "SplitDetailLayout",
  "EnvironmentBadge",
  "RoleBadge"
]) {
  addCheck(
    checks,
    `component:${component}`,
    exists(`apps/web/src/components/base/${component}.vue`) && readText("apps/web/src/components/base/index.ts").includes(`as ${component}`),
    `apps/web/src/components/base/${component}.vue exported from base index.`
  );
}

for (const [key, file, patterns] of [
  ["dashboard:role-workbench", "apps/web/src/pages/dashboard/DashboardRoleWorkbenchSection.vue", ["ActionCard", "岗位工作台"]],
  ["request-detail:split-layout", "apps/web/src/pages/procurement-requests/ProcurementRequestDetailShell.vue", ["SplitDetailLayout", "RiskAlertPanel", "流程进度"]],
  ["project-detail:split-layout", "apps/web/src/pages/project-workbench/ProjectWorkbenchDetailPageShell.vue", ["SplitDetailLayout", "RiskAlertPanel", "下一步关注"]],
  ["sourcing:control-panel", "apps/web/src/pages/project-sourcing/SourcingPageShell.vue", ["SplitDetailLayout", "RiskAlertPanel", "招采控制点"]],
  ["fulfillment:control-panel", "apps/web/src/pages/project-fulfillment/FulfillmentPageShell.vue", ["SplitDetailLayout", "RiskAlertPanel", "履约与结算关注"]],
  ["settlement:review-sidebar", "apps/web/src/pages/settlement-materials/SettlementPageShell.vue", ["SplitDetailLayout", "RiskAlertPanel", "结算审核关注"]],
  ["supplier-portal:status-summary", "apps/web/src/pages/supplier-portal/SupplierPortalPageShell.vue", ["供应商门户", "SummaryCards", "StatusTag"]],
  ["expert-scoring:status-summary", "apps/web/src/pages/expert-scoring/ExpertScoringPageShell.vue", ["专家评分", "SummaryCards", "StatusTag"]],
  ["archive:audit-summary", "apps/web/src/pages/archive-audit/ArchiveAuditPageShell.vue", ["项目档案与审计", "SummaryCards", "只读"]],
  ["audit:table-state", "apps/web/src/pages/audit/AuditPageShell.vue", ["审计日志", "DataTable", "StatusTag"]]
]) {
  addCheck(checks, key, textIncludes(file, patterns), `${file} contains ${patterns.join(", ")}.`);
}

addCheck(
  checks,
  "sellable:commercial-gate",
  readText("scripts/sellable-readiness.mjs").includes("npm run ui:commercial-check"),
  "scripts/sellable-readiness.mjs includes ui:commercial-check in sellable aggregation."
);

addCheck(
  checks,
  "visual-evidence:script",
  exists("scripts/ui-visual-evidence.mjs") && readText("package.json").includes("\"ui:visual-evidence\""),
  "scripts/ui-visual-evidence.mjs and package.json script exist."
);

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

This check validates Sprint 4-8 UI productization evidence only. It does not convert Production NO_GO to Production GO, and it does not weaken role navigation, route access, copy scan, sellable readiness, production gate, Process Layer, Workflow, BPMN shadow or API tests.`;

fs.writeFileSync(path.join(docsDir, "05_UI_COMMERCIAL_CHECK_REPORT.md"), report.trimEnd() + "\n", "utf8");

console.log(JSON.stringify({ status: payload.status, failures: failures.length, todos: todos.length, report: "docs/sellable-readiness/05_UI_COMMERCIAL_CHECK_REPORT.md" }, null, 2));
if (failures.length) process.exitCode = 1;
