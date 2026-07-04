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
  "color.sidebarActive",
  "color.sidebarText",
  "color.panel",
  "color.infoSoft",
  "color.lockedSoft",
  "typography.fontFamilyNumber",
  "typography.cardTitle",
  "shadow.md",
  "layout.sidebarWidth",
  "density.tableRowHeight",
  "focus.ring"
]) {
  addCheck(checks, `token:${tokenPath}`, hasNestedPath(tokens, tokenPath), `apps/web/src/design-system/tokens.json -> ${tokenPath}`);
}

addCheck(
  checks,
  "token:chinese-b2b-typography",
  String(tokens.typography?.fontFamily ?? "").includes("PingFang SC") &&
    String(tokens.typography?.fontFamily ?? "").indexOf("Inter") < 0 &&
    tokens.typography?.weightBold === 600,
  "apps/web/src/design-system/tokens.json prioritizes Chinese system fonts and restrained title weight."
);

addCheck(
  checks,
  "token:light-commercial-sidebar",
  tokens.color?.sidebar === "#FFFFFF" && Number(tokens.layout?.sidebarWidth ?? 999) <= 232,
  "apps/web/src/design-system/tokens.json sets white sidebar and compact <=232px width."
);

addCheck(
  checks,
  "shell:grouped-navigation",
  textIncludes("apps/web/src/layouts/AppShell.vue", ["enterprise-nav-group", "environmentLabel", "roleLabel", "roleSwitchEnabled"]) &&
    !readText("apps/web/src/layouts/AppShell.vue").includes("enterprise-nav-icon"),
  "apps/web/src/layouts/AppShell.vue renders grouped nav and removes single-character nav icon slots."
);

addCheck(
  checks,
  "role-model:navigation-metadata",
  textIncludes("apps/web/src/permissions/role-model.ts", ["group?:", "description?:", "priority?:", "group: \"采购\"", "group: \"履约结算\""]) &&
    !/icon:\s*"/.test(readText("apps/web/src/permissions/role-model.ts")),
  "apps/web/src/permissions/role-model.ts preserves role entries and grouping metadata without single-character icons."
);

addCheck(
  checks,
  "login:commercial-layout",
  textIncludes("apps/web/src/pages/login/LoginPageShell.vue", ["enterprise-login-layout", "enterprise-login-brand", "enterprise-login-card", "酒店供应链采购平台", "登录采购平台"]),
  "apps/web/src/pages/login/LoginPageShell.vue contains branded product login layout."
);

addCheck(
  checks,
  "login:production-hides-local-access",
  textIncludes("apps/web/src/pages/login/useLoginPage.ts", ["showLocalAccess", "session.mode !== \"production\"", "session.mockAuthEnabled"]),
  "apps/web/src/pages/login/useLoginPage.ts hides local role quick entry when mode is production."
);

addCheck(
  checks,
  "login:compact-role-selector",
  textIncludes("apps/web/src/pages/login/DemoAccountTable.vue", ["eds-role-select-panel", "<select", "进入该角色工作台"]) &&
    !readText("apps/web/src/pages/login/DemoAccountTable.vue").includes("<DataTable"),
  "apps/web/src/pages/login/DemoAccountTable.vue uses a compact role selector instead of a tall account table."
);

addCheck(
  checks,
  "login:required-local-roles",
  ["集团采购管理", "采购经办", "酒店采购", "供应商管理员", "供应商报价员", "专家", "财务审核", "审计监督", "系统管理员"].every((label) =>
    readText("apps/web/src/pages/login/display.ts").includes(label)
  ),
  "apps/web/src/pages/login/display.ts includes all required Local/UAT validation roles."
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

addCheck(
  checks,
  "state-pages:routed",
  exists("apps/web/src/pages/PermissionDeniedPage.vue") &&
    exists("apps/web/src/pages/NotFoundPage.vue") &&
    textIncludes("apps/web/src/router/index.ts", ["/permission-denied", "/:pathMatch(.*)*"]) &&
    textIncludes("apps/web/src/App.vue", ["isPermissionDeniedRoute", "isNotFoundRoute"]),
  "Dedicated permission denied and not-found/error state pages are routed through AppShell."
);

for (const [key, file, patterns] of [
  ["dashboard:role-workbench", "apps/web/src/pages/dashboard/DashboardRoleWorkbenchSection.vue", ["风险提醒", "常用操作", "eds-workbench-side"]],
  ["dashboard:information-architecture", "apps/web/src/pages/dashboard/DashboardPageShell.vue", ["eds-workbench-layout", "DashboardTodoSection", "DashboardActivitySection", "DashboardRoleWorkbenchSection"]],
  ["request-detail:split-layout", "apps/web/src/pages/procurement-requests/ProcurementRequestDetailShell.vue", ["SplitDetailLayout", "RiskAlertPanel", "流程进度"]],
  ["project-detail:split-layout", "apps/web/src/pages/project-workbench/ProjectWorkbenchDetailPageShell.vue", ["SplitDetailLayout", "RiskAlertPanel", "下一步关注"]],
  ["sourcing:control-panel", "apps/web/src/pages/project-sourcing/SourcingPageShell.vue", ["SplitDetailLayout", "RiskAlertPanel", "招采控制点"]],
  ["fulfillment:control-panel", "apps/web/src/pages/project-fulfillment/FulfillmentPageShell.vue", ["SplitDetailLayout", "RiskAlertPanel", "履约与结算关注"]],
  ["settlement:review-sidebar", "apps/web/src/pages/settlement-materials/SettlementPageShell.vue", ["SplitDetailLayout", "RiskAlertPanel", "结算审核关注"]],
  ["supplier-portal:status-summary", "apps/web/src/pages/supplier-portal/SupplierPortalPageShell.vue", ["供应商门户", "eds-business-context", "eds-ledger-strip", "StatusTag"]],
  ["expert-scoring:status-summary", "apps/web/src/pages/expert-scoring/ExpertScoringPageShell.vue", ["评分工作台", "评分台账", "StatusTag"]],
  ["archive:audit-summary", "apps/web/src/pages/archive-audit/ArchiveAuditPageShell.vue", ["项目档案与审计", "SummaryCards", "只读"]],
  ["audit:table-state", "apps/web/src/pages/audit/AuditPageShell.vue", ["审计日志", "DataTable", "StatusTag"]]
]) {
  addCheck(checks, key, textIncludes(file, patterns), `${file} contains ${patterns.join(", ")}.`);
}

addCheck(
  checks,
  "dashboard:not-function-matrix",
  !readText("apps/web/src/pages/dashboard/DashboardRoleWorkbenchSection.vue").includes("ActionCard") &&
    !readText("apps/web/src/pages/dashboard/DashboardRoleWorkbenchSection.vue").includes("权限边界"),
  "DashboardRoleWorkbenchSection no longer renders the old four-card function matrix."
);

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

addCheck(
  checks,
  "third-pass:plan-exists",
  exists("docs/eprocurement_ui_redesign_third_pass_plan_v1.md"),
  "Third-pass visual correction plan records the human-review gap and stricter acceptance rules."
);

addCheck(
  checks,
  "third-pass:portal-login",
  textIncludes("apps/web/src/design-system/enterprise.css", [
    "grid-template-columns: minmax(320px, 0.82fr)",
    "box-shadow: var(--ep-shadow-sm)",
    ".enterprise-login-proof-item"
  ]),
  "Login is constrained as a portal-style panel instead of a floating marketing card."
);

addCheck(
  checks,
  "third-pass:workbench-anti-template",
  textIncludes("apps/web/src/design-system/enterprise.css", [
    ".eds-workbench-brief",
    "overflow-x: hidden",
    ".eds-action-link",
    ".eds-risk-dot"
  ]) &&
    !readText("apps/web/src/pages/dashboard/DashboardRoleWorkbenchSection.vue").includes("StatusTag"),
  "Workbench removes horizontal table overflow, badge-stack risks and stacked action buttons."
);

addCheck(
  checks,
  "third-pass:layout-gate-strengthened",
  textIncludes("scripts/ui-second-pass-checks.mjs", [
    "login-balanced-portal",
    "dashboard-no-horizontal-overflow",
    "dashboard-panel-count",
    "dashboard-no-stacked-action-buttons"
  ]),
  "ui:layout-check now blocks obvious AI-template regressions."
);

addCheck(
  checks,
  "fourth-pass:plan-exists",
  exists("docs/eprocurement_ui_redesign_fourth_pass_plan_v1.md"),
  "Fourth-pass productization plan records key business-page scope and human-review acceptance."
);

addCheck(
  checks,
  "fourth-pass:business-context",
  textIncludes("apps/web/src/design-system/enterprise.css", [
    ".eds-business-context",
    ".eds-ledger-strip",
    ".eds-project-switcher"
  ]) &&
    textIncludes("apps/web/src/pages/project-workbench/ProjectWorkbenchDetailPageShell.vue", ["eds-business-context", "采购项目 / 执行总览"]) &&
    textIncludes("apps/web/src/pages/project-sourcing/SourcingPageShell.vue", ["eds-business-context", "项目工作台 / 招采执行"]) &&
    textIncludes("apps/web/src/pages/project-fulfillment/FulfillmentPageShell.vue", ["eds-business-context", "项目工作台 / 履约结算"]),
  "Fourth-pass key project pages use business context and ledger-style summaries."
);

addCheck(
  checks,
  "fourth-pass:expert-supplier-productized",
  textIncludes("apps/web/src/pages/expert-scoring/ExpertScoringPageShell.vue", ["eds-business-context", "专家评审 / 评分工作台", "评分台账"]) &&
    textIncludes("apps/web/src/pages/expert-scoring/ExpertScoreSheetPanel.vue", ["eds-ledger-strip", "技术分", "总分"]) &&
    textIncludes("apps/web/src/pages/supplier-portal/SupplierPortalPageShell.vue", ["eds-business-context", "供应商门户 / 企业档案", "档案完整度"]),
  "Expert scoring and supplier portal now expose real business context instead of generic card scaffolding."
);

addCheck(
  checks,
  "fourth-pass:visual-pack-key-business-pages",
  ["project-detail", "project-sourcing", "project-fulfillment"].every((key) => readText("scripts/ui-second-pass-checks.mjs").includes(key)),
  "Visual review pack captures project detail, sourcing detail and fulfillment detail pages."
);

for (const scriptName of ["ui:login-role-smoke", "ui:layout-check", "ui:visual-review-pack"]) {
  addCheck(
    checks,
    `script:${scriptName}`,
    readText("package.json").includes(`"${scriptName}"`) && exists("scripts/ui-second-pass-checks.mjs"),
    `package.json registers ${scriptName} via scripts/ui-second-pass-checks.mjs.`
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

This check validates Sprint 4-8 UI productization evidence only. It does not convert Production NO_GO to Production GO, and it does not weaken role navigation, route access, copy scan, sellable readiness, production gate, Process Layer, Workflow, BPMN shadow or API tests.`;

fs.writeFileSync(path.join(docsDir, "05_UI_COMMERCIAL_CHECK_REPORT.md"), report.trimEnd() + "\n", "utf8");

console.log(JSON.stringify({ status: payload.status, failures: failures.length, todos: todos.length, report: "docs/sellable-readiness/05_UI_COMMERCIAL_CHECK_REPORT.md" }, null, 2));
if (failures.length) process.exitCode = 1;
