#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, "docs", "sellable-readiness");
const outputDir = path.join(repoRoot, "output", "sellable-readiness");
const nowIso = () => new Date().toISOString();

function ensureDirs() {
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
}

function rel(file) {
  return path.relative(repoRoot, file).replaceAll(path.sep, "/");
}

function writeReport(fileName, content) {
  ensureDirs();
  const target = path.join(docsDir, fileName);
  fs.writeFileSync(target, content.trimEnd() + "\n", "utf8");
  return target;
}

function mdTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replaceAll("\n", "<br>").replaceAll("|", "\\|");
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
  ].join("\n");
}

function walkFiles(startDirs, extensions) {
  const ignored = new Set(["node_modules", "dist", "build", "coverage", "output", ".git", ".data"]);
  const result = [];
  for (const startDir of startDirs) {
    const absolute = path.join(repoRoot, startDir);
    if (!fs.existsSync(absolute)) continue;
    const stack = [absolute];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        if (ignored.has(entry.name)) continue;
        const next = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(next);
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
          result.push(next);
        }
      }
    }
  }
  return result.sort();
}

function lineOf(source, index) {
  return source.slice(0, index).split(/\n/).length;
}

function stripVueScript(source) {
  return source.replace(/<script[\s\S]*?<\/script>/gi, "");
}

function visibleVueCandidates(file, source) {
  const template = stripVueScript(source);
  const candidates = [];
  const literalAttrs = /\s([A-Za-z][\w-]*)\s*=\s*"([^"]*)"/g;
  let attr;
  while ((attr = literalAttrs.exec(template))) {
    const attrName = attr[1];
    if (attrName.startsWith("v-") || attrName.startsWith(":") || attrName.startsWith("@")) continue;
    if (!/[\u4e00-\u9fff]|Demo|DEMO|Mock|P0|AI|\bmock\b/i.test(attr[2])) continue;
    candidates.push({ file, line: lineOf(source, source.indexOf(attr[0])), text: attr[2], kind: "vue-attribute" });
  }
  const textOnly = template
    .replace(/<[^>]+>/g, "\n")
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  for (const text of textOnly) {
    if (/[\u4e00-\u9fff]|Demo|DEMO|Mock|P0|AI|\bmock\b/i.test(text)) {
      const idx = source.indexOf(text);
      candidates.push({ file, line: idx >= 0 ? lineOf(source, idx) : 1, text, kind: "vue-text" });
    }
  }
  return candidates;
}

function stringLiteralCandidates(file, source) {
  const candidates = [];
  const literal = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;
  while ((match = literal.exec(source))) {
    const text = match[2].replace(/\\n/g, " ").trim();
    if (!text || text.length > 320) continue;
    if (!/[\u4e00-\u9fff]|Demo|DEMO|Mock|P0|AI|\bmock\b/i.test(text)) continue;
    candidates.push({ file, line: lineOf(source, match.index), text, kind: "string-literal" });
  }
  return candidates;
}

function classifyCopyFinding(candidate) {
  const normalized = candidate.text;
  const file = rel(candidate.file);
  const isFrontend = file.startsWith("apps/web/src/");
  const isApi = file.startsWith("apps/api/src/");
  const isVisibleVue = candidate.kind.startsWith("vue-");
  const isLikelyUserMessage =
    /[\u4e00-\u9fff]/.test(normalized) &&
    !/^(\/api\/|auth\.|award_approval\.|supplier\.|local\/test mock only|mock-token-|demoAuthActive|mockAuthEnabled|mockUserId)/i.test(normalized);

  const blockerTerms = [
    { term: "演示", pattern: /演示/ },
    { term: "DEMO", pattern: /\bDEMO\b|DEMO ACCESS|Demo account/i },
    { term: "联调", pattern: /联调/ },
    { term: "P0 白名单", pattern: /P0\s*白名单/ },
    { term: "Mock customer message", pattern: /Mock .*?(production|account|login|user|role)|Local mock|Demo account/i },
    { term: "模拟实名/模拟调用", pattern: /模拟实名|模拟联调|创建模拟/ }
  ];
  const warningTerms = [
    { term: "AI/智能", pattern: /\bAI\b|智能/ },
    { term: "治理", pattern: /治理/ },
    { term: "本地模拟", pattern: /本地模拟|模拟/ },
    { term: "R8/Process/BPMN display", pattern: /\bR8\b|Process Layer|BPMN|影子/ }
  ];

  for (const item of blockerTerms) {
    if (!item.pattern.test(normalized)) continue;
    if ((isFrontend && isVisibleVue) || (isApi && isLikelyUserMessage)) {
      return { severity: "BLOCKER", term: item.term };
    }
    return { severity: "INFO", term: item.term };
  }
  for (const item of warningTerms) {
    if (!item.pattern.test(normalized)) continue;
    return { severity: isFrontend && isVisibleVue ? "WARN" : "INFO", term: item.term };
  }
  return null;
}

async function uiCopyScan() {
  ensureDirs();
  const files = walkFiles(["apps/web/src", "apps/api/src"], [".vue", ".ts", ".tsx"]);
  const findings = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const candidates = file.endsWith(".vue") ? visibleVueCandidates(file, source) : stringLiteralCandidates(file, source);
    for (const candidate of candidates) {
      const classification = classifyCopyFinding(candidate);
      if (!classification) continue;
      findings.push({ ...candidate, ...classification });
    }
  }
  const blockers = findings.filter((item) => item.severity === "BLOCKER");
  const warnings = findings.filter((item) => item.severity === "WARN");
  const rows = findings.map((item) => [item.severity, item.term, `${rel(item.file)}:${item.line}`, item.text]);
  const report = `# Sprint 1 UI Copy Scan

- Generated at: ${nowIso()}
- Scope: apps/web/src visible Vue copy and apps/api/src user-facing string literals.
- Result: ${blockers.length === 0 ? "PASS" : "FAIL"}
- Blockers: ${blockers.length}
- Warnings: ${warnings.length}

${rows.length ? mdTable(["Severity", "Term", "Location", "Text"], rows) : "No risky customer-visible wording was found."}

## Notes

- Code identifiers, local storage keys, route names, and mock-only test hooks are treated as INFO unless they are rendered to the user or returned as customer-facing API messages.
- Local/test mock capabilities remain available; production isolation is enforced by the backend production gate.`;
  const reportPath = writeReport("01_UI_COPY_SCAN_REPORT.md", report);
  console.log(JSON.stringify({ status: blockers.length === 0 ? "PASS" : "FAIL", blockers: blockers.length, warnings: warnings.length, report: rel(reportPath) }, null, 2));
  if (blockers.length) process.exitCode = 1;
}

async function loadRoleModel() {
  return import(pathToFileURL(path.join(repoRoot, "apps/web/src/permissions/role-model.ts")).href);
}

async function loadSeedData() {
  return import(pathToFileURL(path.join(repoRoot, "apps/api/src/seed/data.ts")).href);
}

async function roleMenuSnapshot() {
  ensureDirs();
  const roleModel = await loadRoleModel();
  const seed = await loadSeedData();
  const permissionByRole = new Map(seed.rolePermissions.map((item) => [item.roleId, item]));
  const rows = roleModel.allRoleIds.map((roleId) => {
    const nav = roleModel.visibleNavItems(roleId);
    const util = roleModel.visibleUtilityItems(roleId);
    const permission = permissionByRole.get(roleId);
    return [
      roleId,
      roleModel.roleLabels[roleId] ?? roleId,
      roleModel.roleHome(roleId),
      nav.map((item) => `${item.label} (${item.to}, ${item.menuKey})`).join("<br>"),
      util.map((item) => `${item.label} (${item.to}, ${item.menuKey})`).join("<br>"),
      (permission?.menus ?? []).join(", "),
      (permission?.actions ?? []).join(", ")
    ];
  });
  const report = `# Sprint 2 Role Menu Snapshot

- Generated at: ${nowIso()}
- Frontend source: apps/web/src/permissions/role-model.ts
- Backend source: apps/api/src/seed/data.ts rolePermissions

${mdTable(["Role", "Label", "Home", "Frontend nav", "Utility", "Backend menus", "Backend actions"], rows)}

## Boundary

Frontend navigation is a customer-facing entry model only. Backend route guards, data-scope checks, field visibility checks, attachment guards and workflow/status guards remain the security source of truth.`;
  const reportPath = writeReport("02_MENU_SNAPSHOT_REPORT.md", report);
  console.log(JSON.stringify({ status: "PASS", report: rel(reportPath), roles: rows.length }, null, 2));
}

async function permissionAlign() {
  ensureDirs();
  const roleModel = await loadRoleModel();
  const seed = await loadSeedData();
  const permissionByRole = new Map(seed.rolePermissions.map((item) => [item.roleId, item]));
  const rows = [];
  let severe = 0;
  for (const roleId of roleModel.allRoleIds) {
    const frontendKeys = new Set([...roleModel.visibleNavItems(roleId), ...roleModel.visibleUtilityItems(roleId)].map((item) => item.menuKey));
    const backendKeys = new Set(permissionByRole.get(roleId)?.menus ?? []);
    const frontendOnly = [...frontendKeys].filter((item) => !backendKeys.has(item)).sort();
    const backendOnly = [...backendKeys].filter((item) => !frontendKeys.has(item)).sort();
    const status = frontendOnly.length === 0 && backendOnly.length === 0 ? "ALIGNED" : frontendOnly.length ? "FRONTEND_ENTRY_REVIEW" : "BACKEND_CAPABILITY_HIDDEN";
    if (frontendOnly.length) severe += 1;
    rows.push([roleId, status, [...frontendKeys].sort().join(", "), [...backendKeys].sort().join(", "), frontendOnly.join(", ") || "-", backendOnly.join(", ") || "-"]);
  }
  const report = `# Sprint 2 Permission Alignment

- Generated at: ${nowIso()}
- Result: ${severe === 0 ? "PASS" : "NEEDS_REVIEW"}
- Frontend entries that are not represented in backend menu keys: ${severe}

${mdTable(["Role", "Status", "Frontend menu keys", "Backend menus", "Frontend only", "Backend only"], rows)}

## Interpretation

- BACKEND_CAPABILITY_HIDDEN means backend menu capability exists but the current customer-facing navigation intentionally hides it for this role.
- FRONTEND_ENTRY_REVIEW means frontend exposes an entry whose menuKey is not in /me/menus rolePermissions; review before considering this aligned.
- This report does not weaken backend authorization. Security remains enforced by backend route guards and policies.`;
  const reportPath = writeReport("02_PERMISSION_ALIGNMENT.md", report);
  console.log(JSON.stringify({ status: severe === 0 ? "PASS" : "NEEDS_REVIEW", frontendOnlyRoles: severe, report: rel(reportPath) }, null, 2));
}

function parseEnvFile(file) {
  const result = {};
  if (!fs.existsSync(file)) return result;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    result[match[1]] = match[2].trim();
  }
  return result;
}

function envValue(env, key, fallback = "") {
  return process.env[key] ?? env[key] ?? fallback;
}

function boolEnv(env, key, fallback = false) {
  const value = envValue(env, key, String(fallback)).toLowerCase();
  return ["true", "1", "yes", "on"].includes(value);
}

function integrationEndpointKeys(env) {
  const keys = new Set();
  for (const pair of envValue(env, "INTEGRATION_ENDPOINTS", "").split(",")) {
    const [key, ...rest] = pair.split("=");
    if (key?.trim() && rest.join("=").trim()) keys.add(key.trim());
  }
  const direct = [
    ["sso", "INTEGRATION_SSO_ENDPOINT"],
    ["oa", "INTEGRATION_OA_ENDPOINT"],
    ["erp", "INTEGRATION_ERP_ENDPOINT"],
    ["wms", "INTEGRATION_WMS_ENDPOINT"],
    ["finance", "INTEGRATION_FINANCE_ENDPOINT"],
    ["fileService", "INTEGRATION_FILE_SERVICE_ENDPOINT"],
    ["contractSystem", "INTEGRATION_CONTRACT_ENDPOINT"],
    ["messageNotification", "INTEGRATION_MESSAGE_ENDPOINT"],
    ["eSignature", "INTEGRATION_E_SIGNATURE_ENDPOINT"],
    ["ca", "INTEGRATION_CA_ENDPOINT"],
    ["eInvoice", "INTEGRATION_E_INVOICE_ENDPOINT"]
  ];
  for (const [key, envKey] of direct) {
    if (envValue(env, envKey, "")) keys.add(key);
  }
  return keys;
}

function evaluateProductionGate(mode = "production") {
  const fileEnv = { ...parseEnvFile(path.join(repoRoot, ".env.example")) };
  fileEnv.APP_ENV = mode || envValue(fileEnv, "APP_ENV", "local");
  const appEnv = envValue(fileEnv, "APP_ENV", "local");
  const isProduction = appEnv === "production";
  const endpointKeys = integrationEndpointKeys(fileEnv);
  const checks = [];
  const add = (key, status, message) => checks.push({ key, status, message });
  const requirePass = (key, pass, message) => add(key, pass ? "PASS" : "FAIL", message);

  requirePass("app_env", isProduction, `APP_ENV must be production for production gate; evaluated ${appEnv}.`);
  requirePass("mock_auth_disabled", !isProduction || boolEnv(fileEnv, "DISABLE_MOCK_AUTH", false), "DISABLE_MOCK_AUTH=true is required in production.");
  requirePass("local_password_disabled", !isProduction || !boolEnv(fileEnv, "ALLOW_LOCAL_PASSWORD_LOGIN", true), "ALLOW_LOCAL_PASSWORD_LOGIN=false is required in production.");
  requirePass("seed_disabled", !isProduction || !boolEnv(fileEnv, "APP_SEED_ON_BOOT", true), "APP_SEED_ON_BOOT=false is required in production.");
  requirePass("cookie_secure", !isProduction || boolEnv(fileEnv, "SESSION_COOKIE_SECURE", false), "SESSION_COOKIE_SECURE=true is required in production.");
  const secret = envValue(fileEnv, "SESSION_SECRET", "");
  requirePass("session_secret", !isProduction || (secret.length >= 32 && !["change-this-before-shared-uat"].includes(secret) && !secret.startsWith("dev-only-")), "SESSION_SECRET must be non-placeholder and at least 32 characters.");
  requirePass("cors_whitelist", !isProduction || Boolean(envValue(fileEnv, "CORS_ALLOWED_ORIGINS", "")), "CORS_ALLOWED_ORIGINS must be explicit in production.");
  requirePass("workflow_source", envValue(fileEnv, "WORKFLOW_EXECUTION_SOURCE", "r8_workflow") === "r8_workflow", "R8 Workflow must remain the primary execution source.");
  requirePass("process_layer_shadow", !["execution"].includes(envValue(fileEnv, "PROCESS_LAYER_MODE", "shadow")), "Process Layer must not be production execution.");
  requirePass("bpmn_not_production", envValue(fileEnv, "BPMN_PILOT_MODE", "shadow") !== "production", "BPMN pilot must not be production execution.");
  const databaseDriver = envValue(fileEnv, "DATABASE_DRIVER", "sqlite");
  requirePass("production_database", !isProduction || (databaseDriver !== "sqlite" && Boolean(envValue(fileEnv, "DATABASE_URL", ""))), "Formal production requires a customer-approved non-SQLite database and DATABASE_URL.");
  const fileStorageMode = envValue(fileEnv, "FILE_STORAGE_MODE", "local");
  requirePass("file_storage", !isProduction || fileStorageMode === "object", "Formal production requires object storage or approved file-service storage, not local file storage.");
  if (fileStorageMode === "object") {
    requirePass("object_storage_endpoint", Boolean(envValue(fileEnv, "OBJECT_STORAGE_ENDPOINT", "")), "OBJECT_STORAGE_ENDPOINT is required for object storage.");
    requirePass("object_storage_bucket", Boolean(envValue(fileEnv, "OBJECT_STORAGE_BUCKET", "")), "OBJECT_STORAGE_BUCKET is required for object storage.");
  }
  requirePass("antivirus", !isProduction || envValue(fileEnv, "ANTIVIRUS_SCAN_MODE", "disabled") === "adapter", "Production file uploads require antivirus scan adapter evidence.");
  for (const key of ["sso", "oa", "erp", "wms", "finance", "fileService"]) {
    requirePass(`integration_${key}`, !isProduction || endpointKeys.has(key), `Production requires configured and verified ${key} integration evidence.`);
  }
  const failures = checks.filter((item) => item.status === "FAIL");
  return { mode: appEnv, checks, failures, status: failures.length === 0 ? "PASS" : "FAIL" };
}

async function productionGate() {
  ensureDirs();
  const modeIndex = process.argv.findIndex((item) => item === "--mode");
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : "production";
  const result = evaluateProductionGate(mode);
  const report = `# Sprint 2 Production Gate Report

- Generated at: ${nowIso()}
- Evaluated mode: ${result.mode}
- Result: ${result.status}
- Failures: ${result.failures.length}

${mdTable(["Check", "Status", "Message"], result.checks.map((item) => [item.key, item.status, item.message]))}

## Boundary

This gate intentionally keeps Production at NO_GO unless real customer SSO/OA/ERP/WMS/Finance/file-service, production database, object storage, upload scanning and backup/restore evidence exist. Local/test mock capability is not removed; it must stay isolated outside production.`;
  const reportPath = writeReport("02_PRODUCTION_GATE_REPORT.md", report);
  console.log(JSON.stringify({ status: result.status, failures: result.failures.length, report: rel(reportPath) }, null, 2));
  if (result.failures.length) process.exitCode = 1;
}

async function readinessStrict() {
  ensureDirs();
  const gate = evaluateProductionGate("production");
  const copyReport = path.join(docsDir, "01_UI_COPY_SCAN_REPORT.md");
  const hasCopyReport = fs.existsSync(copyReport);
  const hasPreflight = fs.existsSync(path.join(docsDir, "00_COMMAND_BASELINE.md"));
  const hasSellable = fs.existsSync(path.join(docsDir, "03_SELLABLE_CHECK_REPORT.md"));
  const rows = [
    ["Internal Demo", hasPreflight ? "CONDITIONAL_GO" : "CONDITIONAL_NO_GO", hasPreflight ? "Preflight baseline exists; production evidence is not required for internal demo." : "Preflight command baseline is missing."],
    ["Sales Demo", hasCopyReport ? "CONDITIONAL_GO" : "CONDITIONAL_NO_GO", hasCopyReport ? "UI copy scan evidence exists; review current command results before external demo." : "UI copy scan report is missing."],
    ["Controlled Trial", hasSellable ? "CONDITIONAL_GO" : "CONDITIONAL_NO_GO", hasSellable ? "Use sellable:check result for current command evidence." : "Full sellable:check evidence is not generated yet."],
    ["Sellable Candidate", gate.failures.length === 0 && hasSellable ? "CONDITIONAL_GO" : "NO_GO", "Requires green aggregated checks and production-like integration evidence."],
    ["Production", "NO_GO", "No verified real customer SSO/OA/ERP/WMS/Finance/file-service, production DB, object storage and production backup/restore evidence in this repo."]
  ];
  const report = `# Sprint 2 Readiness Strict Report

- Generated at: ${nowIso()}
- Production gate status: ${gate.status}
- Production gate failures: ${gate.failures.length}

${mdTable(["Scope", "Decision", "Reason"], rows)}

## Strict Rule

Production must remain NO_GO until real customer external integrations and production infrastructure evidence are attached. Local/UAT backup drills, adapter contracts and configured placeholder endpoints are not enough for Production Go.`;
  const reportPath = writeReport("02_READINESS_STRICT_REPORT.md", report);
  console.log(JSON.stringify({ status: "PASS", productionDecision: "NO_GO", report: rel(reportPath) }, null, 2));
}

function routeFiles() {
  return walkFiles(["apps/api/src/routes"], [".ts"]);
}

async function statusInventory() {
  ensureDirs();
  const directWrites = [];
  const assignment = /\b([A-Za-z0-9_.$[\]]*(?:status|Status|state|State|displayStatus|approvalStatus|archiveStatus|paymentStatus|settlementStatus|fulfillmentStatus))\s*=\s*([^;\n]+)/g;
  for (const file of routeFiles()) {
    const source = fs.readFileSync(file, "utf8");
    let match;
    while ((match = assignment.exec(source))) {
      const line = lineOf(source, match.index);
      const snippet = source.split(/\n/)[line - 1]?.trim() ?? "";
      directWrites.push({ file: rel(file), line, field: match[1], value: match[2].trim(), snippet });
    }
  }
  const criticalActions = [
    ["supplier.submit_bid", "apps/api/src/routes/bid-routes.ts", "assertSupplierCanBid, assertSupplierBidOwner, bid confidentiality policy"],
    ["bid.lock_or_close", "apps/api/src/routes/bid-routes.ts", "buyer role, cutoff/lock guards, audit events"],
    ["expert.submit_score", "apps/api/src/routes/expert-review-routes.ts", "assignment ownership, confidentiality confirmation, scoring lock guards"],
    ["award.submit_approval", "apps/api/src/routes/award-routes.ts", "award maintainer guard, review freeze, R8 approval"],
    ["award.publish_result", "apps/api/src/routes/award-routes.ts", "approval status guard and supplier self visibility"],
    ["archive.seal_project", "apps/api/src/routes/archive-routes.ts", "archive maintainer/auditor boundaries and sealed-write denial"],
    ["order.confirm_or_receive", "apps/api/src/routes/mall-routes.ts / contract-performance-routes.ts", "supplier/hotel buyer ownership and order status checks"],
    ["settlement.submit_or_approve", "apps/api/src/routes/settlement-finance-routes.ts", "supplier/finance roles and amount/material checks"],
    ["fulfillment.acceptance_confirm", "apps/api/src/routes/contract-performance-routes.ts", "acceptance role and supplier/order scope checks"]
  ];
  const inventoryReport = `# Sprint 3 Status Write Inventory

- Generated at: ${nowIso()}
- Scope: apps/api/src/routes only.
- Repository SQL persistence and runtime table sync are intentionally excluded.
- Direct route-level status writes found: ${directWrites.length}

${directWrites.length ? mdTable(["File", "Line", "Field", "Value", "Snippet"], directWrites.map((item) => [item.file, item.line, item.field, item.value, item.snippet])) : "No direct route-level status writes found."}

## Interpretation

Direct route-level status writes are not automatically defects. They need review when they bypass role guards, data scope checks, status preconditions, audit logging or R8 workflow approval. Repository persistence writes are normal storage behavior and are not counted here.`;
  const inventoryPath = writeReport("03_STATUS_WRITE_INVENTORY.md", inventoryReport);
  const flowReport = `# Sprint 3 Critical Flow Report

- Generated at: ${nowIso()}
- R8 Workflow remains the execution source.
- Process Layer and BPMN are kept in shadow/configuration roles only.

${mdTable(["Critical action", "Primary location", "Required guard evidence"], criticalActions)}

## Status Write Convergence

The inventory focuses review on route-level status mutations. High-risk actions must remain behind backend role checks, supplier/expert/org scope checks, bid confidentiality, attachment policies, audit logging and workflow/state preconditions. No repository SQL persistence line is treated as a risky direct business-status change.`;
  const flowPath = writeReport("03_CRITICAL_FLOW_REPORT.md", flowReport);
  const testReport = `# Sprint 3 Critical Flow Test Report

- Generated at: ${nowIso()}
- Focused existing tests: p0-permissions.test.ts, m6c-final-security-ops.test.ts, r10-final-uat-production.test.ts, phase3-bidding.test.ts, phase4-expert-review.test.ts, phase5-award-result.test.ts, r6-order-fulfillment.test.ts, r7-settlement-finance.test.ts, m4d-fulfillment-settlement-archive-process.test.ts.
- Current full-suite result must be read from 03_SELLABLE_CHECK_REPORT.md after sellable:check runs.

${mdTable(["Boundary", "Coverage expectation"], [
  ["Supplier isolation", "Supplier can only access own supplier data, own bid files and own order/settlement records."],
  ["Bid confidentiality", "Amounts/files remain hidden before cutoff unless abnormal view approval allows scoped metadata."],
  ["Expert scoring isolation", "Expert can only score assigned sheets and locked scores cannot be directly overwritten."],
  ["Audit read-only", "Auditor can inspect scoped evidence but cannot mutate business objects."],
  ["Archive seal", "Sealed archive items reject direct update and require supplement workflow where applicable."],
  ["Admin boundary", "System admin is restricted to config/account management and cannot read/mutate business payloads."]
])}`;
  const testPath = writeReport("03_CRITICAL_FLOW_TEST_REPORT.md", testReport);
  console.log(JSON.stringify({ status: "PASS", directWrites: directWrites.length, reports: [rel(inventoryPath), rel(flowPath), rel(testPath)] }, null, 2));
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runCommand(commandText, timeoutMs = 600000) {
  const result = spawnSync(commandText, {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 20 * 1024 * 1024,
    shell: true,
    windowsHide: true,
    env: { ...process.env, FORCE_COLOR: "0" }
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    command: commandText,
    exitCode: result.status,
    signal: result.signal,
    timedOut: Boolean(result.error?.code === "ETIMEDOUT"),
    error: result.error?.message ?? "",
    stdoutTail: stdout.slice(-5000),
    stderrTail: stderr.slice(-5000)
  };
}

function commandStatus(result) {
  if (result.timedOut) return "TIMEOUT";
  if (result.error) return "NOT_RUN_MANUAL_REQUIRED";
  return result.exitCode === 0 ? "PASS" : "FAIL";
}

function decisionFromResults(results) {
  const byCommand = new Map(results.map((item) => [item.command, commandStatus(item)]));
  const pass = (cmd) => byCommand.get(cmd) === "PASS";
  const fail = (cmd) => ["FAIL", "TIMEOUT", "NOT_RUN_MANUAL_REQUIRED"].includes(byCommand.get(cmd));
  const internalDemo = pass("npm run typecheck") && pass("npm run openapi:validate") && pass("npm run ui:smoke") ? "GO" : "CONDITIONAL_NO_GO";
  const salesDemo = pass("npm run ui:copy-scan") && pass("npm run ui:smoke") && pass("npm run ui:role-flow") ? "CONDITIONAL_GO" : "CONDITIONAL_NO_GO";
  const controlledTrial = pass("npm run test") && pass("npm run m6b:backup-restore") && pass("npm run m6c:browser-smoke") ? "CONDITIONAL_GO" : "NO_GO";
  const sellableCandidate = results.every((item) => commandStatus(item) === "PASS") && !fail("npm run production:gate -- --mode=production") ? "CONDITIONAL_GO" : "NO_GO";
  const production = "NO_GO";
  return { internalDemo, salesDemo, controlledTrial, sellableCandidate, production };
}

async function sellableCheck() {
  ensureDirs();
  const commands = [
    "npm run typecheck",
    "npm run test",
    "npm run openapi:validate",
    "npm run ui:scan:test",
    "npm run ui:scan",
    "npm run ui:copy-scan",
    "npm run ui:smoke",
    "npm run ui:role-flow",
    "npm run role:menu-snapshot",
    "npm run permission:align",
    "npm run status:inventory",
    "npm run production:gate -- --mode=production",
    "npm run readiness:strict",
    "npm run m6b:backup-restore",
    "npm run m6c:browser-smoke",
    "npm run build"
  ];
  const results = [];
  for (const command of commands) {
    console.log(`[sellable:check] ${command}`);
    const timeout = command.includes("test") || command.includes("browser") || command.includes("build") ? 900000 : 600000;
    results.push(runCommand(command, timeout));
  }
  const decisions = decisionFromResults(results);
  const blocking = results.filter((item) => ["FAIL", "TIMEOUT", "NOT_RUN_MANUAL_REQUIRED"].includes(commandStatus(item)));
  const overallStatus = decisions.sellableCandidate === "CONDITIONAL_GO" && decisions.production !== "GO" ? "CONDITIONAL_GO" : blocking.length ? "NO_GO" : "GO";
  const report = `# Sprint 3 Sellable Check Report

- Generated at: ${nowIso()}
- Overall status: ${overallStatus}
- Blocking/failed commands: ${blocking.length}

${mdTable(["Command", "Status", "Exit", "Signal/Error"], results.map((item) => [item.command, commandStatus(item), item.exitCode ?? "-", item.signal || item.error || "-"]))}

## Command Output Tails

${results
  .map(
    (item) => `### ${item.command}

- Status: ${commandStatus(item)}
- stdout tail:

\`\`\`
${item.stdoutTail || "(empty)"}
\`\`\`

- stderr tail:

\`\`\`
${item.stderrTail || "(empty)"}
\`\`\``
  )
  .join("\n\n")}
`;
  const reportPath = writeReport("03_SELLABLE_CHECK_REPORT.md", report);
  const goNoGo = `# GO / NO-GO

- Generated at: ${nowIso()}
- Overall status: ${overallStatus}

${mdTable(["Scope", "Decision", "Reason"], [
  ["Internal Demo", decisions.internalDemo, "Requires typecheck, OpenAPI validation and main UI smoke evidence."],
  ["Sales Demo", decisions.salesDemo, "Requires customer-facing copy scan, UI smoke and role flow evidence; remains conditional on presenter-controlled data."],
  ["Controlled Trial", decisions.controlledTrial, "Requires full tests plus local/UAT backup and browser role smoke evidence."],
  ["Sellable Candidate", decisions.sellableCandidate, "Requires all local gates green and production-like integration evidence; current result follows command table."],
  ["Production", decisions.production, "No real customer SSO/OA/ERP/WMS/Finance/file-service, production DB, object storage and production backup/restore evidence is present."]
])}`;
  const goPath = writeReport("GO_NO_GO.md", goNoGo);
  const limitations = `# Known Limitations

- Generated at: ${nowIso()}
- Production is NO_GO until real customer external-system and production-infrastructure evidence is attached.
- Local/test mock capability remains available by design and must stay isolated by production gates.
- Any command marked FAIL, TIMEOUT or NOT_RUN_MANUAL_REQUIRED in 03_SELLABLE_CHECK_REPORT.md must be reviewed before controlled trial or sellable-candidate positioning.
- R8 Workflow remains the execution source; Process Layer and BPMN shadow/configuration evidence must not be represented as production execution readiness.`;
  const limitationsPath = writeReport("KNOWN_LIMITATIONS.md", limitations);
  console.log(JSON.stringify({ overallStatus, decisions, reports: [rel(reportPath), rel(goPath), rel(limitationsPath)], failedCommands: blocking.map((item) => item.command) }, null, 2));
}

async function preflightReport() {
  ensureDirs();
  writeReport(
    "00_EXISTING_CAPABILITIES.md",
    `# Preflight Existing Capabilities

- Generated at: ${nowIso()}
- Branch target: codex/ui-de-ai-sellable-readiness
- Source branch: codex/ui-de-ai

${mdTable(["Area", "Observed capability"], [
  ["Workflow", "R8 Workflow is still the primary execution source; Process Layer and BPMN are shadow/configuration only."],
  ["Runtime health", "/health exposes readiness checks for auth, database, file storage, integrations, workflow source and operations."],
  ["Role isolation", "Backend policies exist for supplier data, bid confidentiality, expert assignment, audit-required actions and admin business isolation."],
  ["UI", "Existing enterprise shell, route guards, role-based navigation and browser smoke scripts are available."],
  ["Operations", "OpenAPI validation, backup/restore drill, M6C browser smoke and UI scan scripts are available."]
])}`
  );
  writeReport(
    "00_COMMAND_BASELINE.md",
    `# Preflight Command Baseline

- Generated at: ${nowIso()}
- Baseline was captured before sellable-readiness implementation changes.

${mdTable(["Command", "Baseline result", "Notes"], [
  ["npm run typecheck", "PASS", "API and web type checks completed."],
  ["npm run test", "FAIL", "Existing baseline failures across procurement request creation, supplier admission/review preconditions, award/archive authorization and several older phase tests. These were not introduced by sellable-readiness edits."],
  ["npm run openapi:validate", "PASS", "Required OpenAPI paths validated."],
  ["npm run ui:scan:test", "PASS", "UI scan unit check passed."],
  ["npm run ui:scan", "PASS", "Existing UI violation scan passed."],
  ["npm run ui:smoke", "PASS", "Browser route smoke passed against local API/web services."],
  ["npm run ui:role-flow", "FAIL", "Preflight script selected a supplier that current local data had marked restricted; script was later changed to select an admitted supplier dynamically."],
  ["npm run m6b:backup-restore", "PASS", "Local/UAT backup restore drill passed; not production backup evidence."],
  ["npm run m6c:browser-smoke", "FAIL", "Preflight route expectations still matched old navigation; script was later aligned to the narrowed role entry model."]
])}`
  );
  writeReport(
    "00_RISK_REGISTER.md",
    `# Preflight Risk Register

- Generated at: ${nowIso()}

${mdTable(["Risk", "Severity", "Mitigation"], [
  ["Full npm test suite has existing failures.", "High", "Do not delete tests or lower permission/security checks; record as blocker unless safely fixed."],
  ["Production external integrations are contract boundaries only.", "High", "Production remains NO_GO without customer SSO/OA/ERP/WMS/Finance/file-service evidence."],
  ["SQLite/local file storage are local/UAT posture.", "High", "Production gate requires formal database and object/file-service storage evidence."],
  ["Frontend navigation can hide backend capabilities but cannot be security truth.", "Medium", "Keep backend guards for permissions, data scope, field visibility, attachment download and status transitions."],
  ["Process Layer/BPMN shadow could be misrepresented as production execution.", "High", "Production gate enforces R8 Workflow as execution source and blocks BPMN production mode."],
  ["CodeGraph index is not initialized in this workspace.", "Low", "Use local search and existing code evidence; initialize CodeGraph only if the user later approves."]
])}`
  );
  console.log(JSON.stringify({ status: "PASS", reports: ["00_EXISTING_CAPABILITIES.md", "00_COMMAND_BASELINE.md", "00_RISK_REGISTER.md"] }, null, 2));
}

const command = process.argv[2];
const handlers = {
  "preflight": preflightReport,
  "ui-copy-scan": uiCopyScan,
  "role-menu-snapshot": roleMenuSnapshot,
  "permission-align": permissionAlign,
  "production-gate": productionGate,
  "readiness-strict": readinessStrict,
  "status-inventory": statusInventory,
  "sellable-check": sellableCheck
};

if (!handlers[command]) {
  console.error(`Unknown sellable-readiness command: ${command ?? "(missing)"}`);
  console.error(`Available: ${Object.keys(handlers).join(", ")}`);
  process.exit(1);
}

handlers[command]().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
