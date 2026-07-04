#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs", "sellable-readiness");
const outputDir = path.join(root, "output", "ui-terminology-check");

const scanRoots = [
  "apps/web/src/components",
  "apps/web/src/pages",
  "apps/web/src/permissions",
  "apps/web/src/router",
  "apps/web/src/utils/status-labels.ts"
];

const ignoredPathParts = ["/api/"];

const internalIdentifierPatterns = [
  /\bProcessBusinessType\b/,
  /\bProcessTaskView\b/,
  /\bProcessInstanceView\b/,
  /\bProcessBusinessResponse\b/,
  /\bR8Workflow[A-Za-z]+\b/,
  /\bloadWorkflow[A-Za-z]+\b/,
  /\bloadProcessTasks\b/,
  /\bloadBusinessProcess\b/,
  /\bprocess[A-Z][A-Za-z0-9_]*\b/,
  /\bworkflow[A-Z][A-Za-z0-9_]*\b/,
  /\bbpmn[A-Z][A-Za-z0-9_]*\b/,
  /\bBpmn[A-Za-z0-9_]*\b/
];

const forbiddenVisibleTerms = [
  { term: "BPMN", pattern: /BPMN/ },
  { term: "WorkflowSurfaceSummary", pattern: /WorkflowSurfaceSummary/ },
  { term: "ProcessTimeline", pattern: /ProcessTimeline/ },
  { term: "BusinessTimeline", pattern: /BusinessTimeline/ },
  { term: "ProcessStepBar", pattern: /ProcessStepBar/ },
  { term: "TimelinePanel", pattern: /TimelinePanel/ },
  { term: "流程轨迹", pattern: /流程轨迹/ },
  { term: "流程进度", pattern: /流程进度/ },
  { term: "流程状态", pattern: /流程状态/ },
  { term: "流程待办", pattern: /流程待办/ },
  { term: "审批待办", pattern: /审批待办/ },
  { term: "流程任务", pattern: /流程任务/ },
  { term: "流程节点", pattern: /流程节点/ },
  { term: "流程记录", pattern: /流程记录/ },
  { term: "当前节点", pattern: /当前节点/ },
  { term: "预测节点", pattern: /预测节点/ },
  { term: "workflow visible", pattern: /\bworkflow\b/i },
  { term: "process visible", pattern: /\bprocess\b/i },
  { term: "timeline visible", pattern: /\btimeline\b/i }
];

function normalize(file) {
  return file.replaceAll("\\", "/");
}

function walk(target, files = []) {
  const full = path.isAbsolute(target) ? target : path.join(root, target);
  if (!fs.existsSync(full)) return files;
  const stat = fs.statSync(full);
  if (stat.isFile()) {
    if (/\.(vue|ts)$/.test(full)) files.push(full);
    return files;
  }
  for (const entry of fs.readdirSync(full)) {
    if (["node_modules", "dist", ".git"].includes(entry)) continue;
    walk(path.join(full, entry), files);
  }
  return files;
}

function isInternalOnlyLine(line) {
  if (/^\s*import\b/.test(line)) return true;
  if (/^\s*}\s+from\s+["'][^"']+["'];?\s*$/.test(line)) return true;
  if (/export\s+type\s+[A-Za-z0-9_]+\s*=\s*["'](?:process|r8)["']/.test(line)) return true;
  if (/^\s*<[^>]+\s+:[A-Za-z0-9_-]*(process|workflow|bpmn)[A-Za-z0-9_-]*=/.test(line)) return true;
  if (/^\s*[:@][A-Za-z0-9_-]*(process|workflow|bpmn)[A-Za-z0-9_-]*=/.test(line)) return true;
  if (/^\s*[A-Za-z0-9_]*(Process|Workflow|Bpmn)[A-Za-z0-9_]*:/.test(line)) return true;
  if (/^\s*(source|type):\s*["'](?:process|r8)["']/.test(line)) return true;
  if (/api\/(?:workflow|process|bpmn)/.test(line)) return true;
  if (/^\s*(const|let|var|function|type|interface)\s+[A-Za-z0-9_]*(Process|Workflow|Bpmn|Timeline)/.test(line)) return true;
  if (internalIdentifierPatterns.some((pattern) => pattern.test(line))) {
    return !/[<>"'`][^<>"'`]*(BPMN|workflow|process|timeline|流程|节点|事件|轨迹)[^<>"'`]*[<>"'`]/i.test(line);
  }
  return false;
}

function scan() {
  const files = scanRoots.flatMap((scanRoot) => walk(scanRoot));
  const findings = [];

  for (const file of files) {
    const rel = normalize(path.relative(root, file));
    if (ignoredPathParts.some((part) => `/${rel}`.includes(part))) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (isInternalOnlyLine(line)) return;
      for (const rule of forbiddenVisibleTerms) {
        if (!rule.pattern.test(line)) continue;
        findings.push({ file: rel, line: index + 1, term: rule.term, text: line.trim() });
      }
    });
  }

  return findings;
}

function mdTable(headers, rows) {
  const esc = (value) => String(value ?? "").replaceAll("\n", "<br>").replaceAll("|", "\\|");
  return [`| ${headers.map(esc).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.map(esc).join(" | ")} |`)].join("\n");
}

fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const findings = scan();
const payload = {
  generatedAt: new Date().toISOString(),
  status: findings.length === 0 ? "PASS" : "FAIL",
  findings
};

fs.writeFileSync(path.join(outputDir, "ui-terminology-check.json"), JSON.stringify(payload, null, 2), "utf8");

const report = `# UI Terminology Check Report

- Generated at: ${payload.generatedAt}
- Result: ${payload.status}
- Findings: ${findings.length}

${findings.length ? mdTable(["File", "Line", "Term", "Text"], findings.map((item) => [item.file, item.line, item.term, item.text])) : "No user-visible workflow/process/timeline/BPMN terminology findings in scanned frontend surfaces."}

## Scope

This check scans user-facing frontend pages, base components, role navigation and status labels. It intentionally allows internal API contract names such as ProcessBusinessType and R8WorkflowTaskView when they are not rendered as product language.`;

fs.writeFileSync(path.join(docsDir, "08_UI_TERMINOLOGY_CHECK_REPORT.md"), report.trimEnd() + "\n", "utf8");

console.log(JSON.stringify({ status: payload.status, findings: findings.length, report: "docs/sellable-readiness/08_UI_TERMINOLOGY_CHECK_REPORT.md" }, null, 2));
if (findings.length) process.exitCode = 1;
