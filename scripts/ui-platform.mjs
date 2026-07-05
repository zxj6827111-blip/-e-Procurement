import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const root = process.cwd();
const webSrc = join(root, "apps/web/src");
const designSystemDir = join(webSrc, "design-system");
const baseComponentDir = join(webSrc, "components/base");
const layoutsDir = join(webSrc, "layouts");
const pagesDir = join(webSrc, "pages");
const outputDir = join(root, "output/ui-platform");
const tokenSourcePath = join(designSystemDir, "tokens.json");
const governancePath = join(designSystemDir, "governance.json");
const figmaSyncPath = join(designSystemDir, "figma-sync.json");
const visualBaselinePath = join(designSystemDir, "visual-baselines.json");

const command = process.argv[2] ?? "help";
const args = process.argv.slice(3);
const writeMode = args.includes("--write");
const updateMode = args.includes("--update");

const legacyClassMap = new Map([
  ["project-operation-card", "eds-surface"],
  ["project-operation-grid", "eds-responsive-grid"],
  ["metric-strip", "eds-summary-grid"],
  ["mini-card", "eds-record"],
  ["supplier-card", "eds-record"],
  ["status-card", "eds-record"],
  ["product-card", "eds-record"],
  ["scenario-card", "eds-record"],
  ["next-action-card", "eds-record"],
  ["modal-backdrop", "eds-dialog-backdrop"],
  ["modal-panel", "eds-dialog"],
  ["detail-summary-grid", "eds-summary-grid"],
  ["module-grid", "eds-table"],
  ["business-panel", "eds-surface"],
  ["page-surface", "eds-surface"],
  ["form-grid", "eds-form-section"],
  ["workflow-summary", "eds-surface"],
  ["process-timeline", "eds-timeline"],
  ["timeline-list", "eds-stack"],
  ["notice", "eds-feedback"],
  ["empty", "eds-feedback"],
  ["inline-error", "eds-feedback-error"],
  ["error-alert", "eds-feedback-error"],
  ["success-alert", "eds-feedback-success"],
  ["tag", "eds-tag"],
  ["attachment-list", "eds-table"],
  ["row-actions", "eds-actions"],
  ["muted", "eds-meta"],
  ["eyebrow", "eds-meta"]
]);

function normalize(path) {
  return path.replaceAll("\\", "/");
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function writeText(path, text) {
  ensureDir(dirname(path));
  writeFileSync(path, text);
}

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    if (["node_modules", "dist", ".git", ".data"].includes(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else if (/\.(vue|ts|css|json|md)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function pascalCase(value) {
  return String(value)
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function kebabCase(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashBuffer(value) {
  return createHash("sha256").update(value).digest("hex");
}

function tokenCssPath(path) {
  const [group, ...rest] = path;
  if (group === "spacing") return ["space", ...rest];
  if (group === "typography" && rest[0] === "fontFamily") return ["font", "family", ...rest.slice(1)];
  if (group === "typography" && rest[0] === "fontFamilyNumber") return ["font", "family", "number"];
  if (group === "typography") return ["font", ...rest];
  if (group === "zIndex") return ["z", ...rest];
  return path;
}

function cssVarName(path) {
  return `--ep-${tokenCssPath(path).map(kebabCase).join("-")}`;
}

function flattenTokens(value, prefix = [], out = []) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) flattenTokens(child, [...prefix, key], out);
  } else {
    out.push({ path: prefix, value });
  }
  return out;
}

function formatTokenValue(path, value) {
  const key = path[path.length - 1] ?? "";
  if (typeof value === "number") {
    if (["spacing", "radius", "layout", "density"].includes(path[0])) return `${value}px`;
    if (path[0] === "typography" && /^(pageTitle|sectionTitle|cardTitle|body|meta)$/.test(key)) return `${value}px`;
    return String(value);
  }
  if (path[0] === "border" && key === "base") return "1px solid var(--ep-color-border)";
  return String(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsLegacyClass(text, legacyClass) {
  const escaped = escapeRegExp(legacyClass);
  if (new RegExp(`\\.${escaped}(?![A-Za-z0-9_-])`).test(text)) return true;
  const staticClassPattern = /(?<![:\w-])class\s*=\s*["']([^"']*)["']/g;
  for (const match of text.matchAll(staticClassPattern)) {
    const classes = match[1].split(/\s+/);
    if (classes.some((className) => className === legacyClass || className.startsWith(`${legacyClass}-`) || className.startsWith(`${legacyClass}_`))) {
      return true;
    }
  }
  return false;
}

function replaceLegacyClasses(text, replacements) {
  let changed = text;
  for (const [legacyClass, enterpriseClass] of legacyClassMap) {
    let replaced = false;
    const escaped = escapeRegExp(legacyClass);
    changed = changed.replace(new RegExp(`\\.(${escaped})(?![A-Za-z0-9_-])`, "g"), () => {
      replaced = true;
      return `.${enterpriseClass}`;
    });
    changed = changed.replace(/(?<![:\w-])class\s*=\s*["']([^"']*)["']/g, (match, classValue) => {
      const nextClassValue = classValue
        .split(/\s+/)
        .map((className) => {
          if (className === legacyClass || className.startsWith(`${legacyClass}-`) || className.startsWith(`${legacyClass}_`)) {
            replaced = true;
            return className.replace(legacyClass, enterpriseClass);
          }
          return className;
        })
        .join(" ");
      return match.replace(classValue, nextClassValue);
    });
    if (replaced) replacements.push({ from: legacyClass, to: enterpriseClass });
  }
  return changed;
}

function compileTokens() {
  const tokens = readJson(tokenSourcePath);
  const flat = flattenTokens(tokens);
  const cssLines = [":root {"];
  for (const token of flat) cssLines.push(`  ${cssVarName(token.path)}: ${formatTokenValue(token.path, token.value)};`);
  cssLines.push("}");

  const ts = `export const enterpriseTokens = ${JSON.stringify(tokens, null, 2)} as const;\n\nexport type EnterpriseTokens = typeof enterpriseTokens;\n`;

  writeText(join(designSystemDir, "tokens.css"), `${cssLines.join("\n")}\n`);
  writeText(join(designSystemDir, "tokens.ts"), ts);
  console.log(`Token compiler wrote ${flat.length} tokens.`);
}

function componentFiles(name) {
  const componentName = pascalCase(name);
  if (!componentName) throw new Error("Component name is required.");
  const folder = join(baseComponentDir, componentName);
  return new Map([
    [
      join(folder, `${componentName}.vue`),
      `<script setup lang="ts">\nimport type { ${componentName}Props } from "./types";\n\ndefineProps<${componentName}Props>();\n</script>\n\n<template>\n  <section class="eds-surface">\n    <slot />\n  </section>\n</template>\n`
    ],
    [
      join(folder, "types.ts"),
      `export interface ${componentName}Props {\n  title?: string;\n}\n`
    ],
    [
      join(folder, "index.ts"),
      `export { default } from "./${componentName}.vue";\nexport type { ${componentName}Props } from "./types";\n`
    ],
    [
      join(folder, `${componentName}.stories.md`),
      `# ${componentName}\n\nEnterprise design-system story scaffold.\n\n- Uses token-backed eds classes only.\n- Must document default, loading, disabled, and error states before production use.\n`
    ],
    [
      join(folder, `${componentName}.test.mjs`),
      `import { readFileSync } from "node:fs";\n\nconst source = readFileSync(new URL("./${componentName}.vue", import.meta.url), "utf8");\nif (!source.includes("eds-")) throw new Error("${componentName} must use design-system classes.");\n`
    ]
  ]);
}

function generateComponent() {
  const name = args.find((item) => !item.startsWith("--"));
  const files = componentFiles(name);
  if (!writeMode) {
    console.log("Component generator dry run. Add --write to create files.");
    for (const file of files.keys()) console.log(normalize(relative(root, file)));
    return;
  }
  for (const [file, text] of files) writeText(file, text);
  console.log(`Component generator wrote ${files.size} files for ${pascalCase(name)}.`);
}

function pageFiles(domain, kind) {
  const normalizedKind = String(kind ?? "").toUpperCase();
  if (!["LIST", "DETAIL", "FORM", "DASHBOARD"].includes(normalizedKind)) {
    throw new Error("Page kind must be LIST, DETAIL, FORM, or DASHBOARD.");
  }
  const domainPascal = pascalCase(domain);
  const domainKebab = kebabCase(domain);
  if (!domainPascal || !domainKebab) throw new Error("Page domain is required.");
  const kindPascal = pascalCase(normalizedKind.toLowerCase());
  const rootPage = join(pagesDir, `${domainPascal}${kindPascal}Page.vue`);
  const featureShell = join(pagesDir, domainKebab, `${domainPascal}${kindPascal}PageShell.vue`);
  const template = pageTemplate(domainPascal, normalizedKind);
  return new Map([
    [
      rootPage,
      `<script setup lang="ts">\nimport ${domainPascal}${kindPascal}PageShell from "./${domainKebab}/${domainPascal}${kindPascal}PageShell.vue";\n</script>\n\n<template>\n  <${domainPascal}${kindPascal}PageShell />\n</template>\n`
    ],
    [featureShell, template]
  ]);
}

function pageTemplate(domainPascal, kind) {
  if (kind === "LIST") {
    return `<script setup lang="ts">\nimport { DataTable, FilterBar, PageHeader, PaginationBar } from "../../components/base";\n\nconst columns = [{ key: "name", label: "Name" }];\nconst rows: Array<{ id: string; name: string }> = [];\n</script>\n\n<template>\n  <section class="eds-section">\n    <PageHeader title="${domainPascal} List" eyebrow="LIST_PAGE" />\n    <FilterBar>\n      <label>Keyword<input /></label>\n    </FilterBar>\n    <DataTable :columns="columns" :rows="rows" row-key="id" />\n    <PaginationBar :total="rows.length" />\n  </section>\n</template>\n`;
  }
  if (kind === "DETAIL") {
    return `<script setup lang="ts">\nimport { EnterpriseTabs, PageHeader, SummaryCards } from "../../components/base";\n\nconst summaryItems = [{ label: "Status", value: "Draft" }];\nconst tabs = [\n  { key: "details", label: "Details" },\n  { key: "history", label: "History" },\n  { key: "attachments", label: "Attachments" },\n  { key: "logs", label: "Logs" }\n];\n</script>\n\n<template>\n  <section class="eds-section">\n    <PageHeader title="${domainPascal} Detail" eyebrow="DETAIL_PAGE" />\n    <SummaryCards :items="summaryItems" />\n    <EnterpriseTabs :tabs="tabs" active-key="details" />\n  </section>\n</template>\n`;
  }
  if (kind === "FORM") {
    return `<script setup lang="ts">\nimport { DataTable, FormSection, PageHeader, SubmitPanel } from "../../components/base";\n\nconst columns = [{ key: "name", label: "Name" }];\nconst rows: Array<{ id: string; name: string }> = [];\n</script>\n\n<template>\n  <section class="eds-section">\n    <PageHeader title="${domainPascal} Form" eyebrow="FORM_PAGE" />\n    <FormSection title="Basic information">\n      <label>Name<input /></label>\n    </FormSection>\n    <DataTable :columns="columns" :rows="rows" row-key="id" />\n    <SubmitPanel />\n  </section>\n</template>\n`;
  }
  return `<script setup lang="ts">\nimport { DataTable, PageHeader, SummaryCards } from "../../components/base";\n\nconst summaryItems = [{ label: "Pending", value: 0 }];\nconst columns = [{ key: "name", label: "Name" }];\nconst rows: Array<{ id: string; name: string }> = [];\n</script>\n\n<template>\n  <section class="eds-section">\n    <PageHeader title="${domainPascal} Dashboard" eyebrow="DASHBOARD_PAGE" />\n    <SummaryCards :items="summaryItems" />\n    <DataTable :columns="columns" :rows="rows" row-key="id" />\n    <DataTable :columns="columns" :rows="rows" row-key="id" />\n  </section>\n</template>\n`;
}

function generatePage() {
  const values = args.filter((item) => !item.startsWith("--"));
  const files = pageFiles(values[0], values[1]);
  if (!writeMode) {
    console.log("Page generator dry run. Add --write to create files.");
    for (const file of files.keys()) console.log(normalize(relative(root, file)));
    return;
  }
  for (const [file, text] of files) writeText(file, text);
  console.log(`Page generator wrote ${files.size} files.`);
}

function parsePageClassifications() {
  const path = join(webSrc, "router/page-classification.ts");
  const text = readText(path);
  return [...text.matchAll(/\{\s*path:\s*"([^"]+)",\s*domain:\s*"([^"]+)",\s*kind:\s*"([^"]+)",\s*component:\s*"([^"]+)"/g)].map((match) => ({
    path: match[1],
    domain: match[2],
    kind: match[3],
    component: match[4]
  }));
}

function buildDependencyMap() {
  const pages = walk(pagesDir).filter((file) => file.endsWith(".vue"));
  const baseComponents = readdirSync(baseComponentDir)
    .filter((entry) => entry.endsWith(".vue"))
    .map((entry) => entry.replace(/\.vue$/, ""));
  const usage = Object.fromEntries(baseComponents.map((component) => [component, []]));
  const pageEntries = [];
  const legacyHits = [];

  for (const file of pages) {
    const text = readText(file);
    const rel = normalize(relative(root, file));
    const usedComponents = baseComponents.filter((component) => new RegExp(`<${component}\\b`).test(text));
    for (const component of usedComponents) usage[component].push(rel);
    for (const legacyClass of legacyClassMap.keys()) {
      if (containsLegacyClass(text, legacyClass)) legacyHits.push({ file: rel, legacyClass });
    }
    pageEntries.push({ file: rel, usedComponents });
  }

  const duplicatedFeatureNames = Object.entries(
    pageEntries.reduce((acc, entry) => {
      const name = basename(entry.file);
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {})
  ).filter(([, count]) => count > 1);

  const result = {
    pageCount: pageEntries.length,
    componentUsage: usage,
    pages: pageEntries,
    duplicatedFeatureNames,
    legacyHits
  };
  ensureDir(outputDir);
  writeJson(join(outputDir, "dependency-map.json"), result);
  console.log(`Dependency map written for ${pageEntries.length} page files.`);
  if (legacyHits.length) {
    console.error(`Legacy UI classes detected: ${legacyHits.length}`);
    process.exitCode = 1;
  }
}

function runCodemod() {
  const files = walk(webSrc).filter((file) => /\.(vue|css)$/.test(file));
  const changes = [];
  for (const file of files) {
    let text = readText(file);
    const before = text;
    const replacements = [];
    text = replaceLegacyClasses(text, replacements);
    if (before !== text) {
      changes.push({ file: normalize(relative(root, file)), replacements });
      if (writeMode) writeText(file, text);
    }
  }
  ensureDir(outputDir);
  writeJson(join(outputDir, "codemod-report.json"), { writeMode, changedFiles: changes });
  console.log(`Codemod ${writeMode ? "updated" : "would update"} ${changes.length} files.`);
  if (changes.length && !writeMode) process.exitCode = 1;
}

function syncFigmaMetadata() {
  const tokens = readJson(tokenSourcePath);
  const governance = readJson(governancePath);
  const components = readdirSync(baseComponentDir)
    .filter((entry) => entry.endsWith(".vue"))
    .map((entry) => ({
      name: entry.replace(/\.vue$/, ""),
      source: normalize(relative(root, join(baseComponentDir, entry))),
      tokenNamespace: "ep",
      classNamespace: "eds"
    }));
  const payload = {
    system: "e-procurement-enterprise-ui",
    version: governance.version,
    tokenHash: hashText(JSON.stringify(tokens)),
    tokenGroups: Object.keys(tokens),
    components,
    spacingSystem: tokens.spacing,
    typographySystem: tokens.typography,
    sourceOfTruth: "apps/web/src/design-system"
  };
  writeJson(figmaSyncPath, payload);
  console.log(`Figma sync metadata wrote ${components.length} components.`);
}

function governanceCheck() {
  const governance = readJson(governancePath);
  const errors = [];
  if (!/^\d+\.\d+\.\d+$/.test(governance.version ?? "")) errors.push("governance.version must be semver.");
  if (!governance.approvedRfc || !existsSync(join(root, governance.approvedRfc))) errors.push("approved RFC file is missing.");
  if (!existsSync(tokenSourcePath)) errors.push("tokens.json source is missing.");
  if (!existsSync(baseComponentDir)) errors.push("base component directory is missing.");
  if (!existsSync(layoutsDir)) errors.push("layout system directory is missing.");

  const changed = execSync("git status --short", { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .filter((file) => /^(apps\/web\/src\/design-system|apps\/web\/src\/components\/base|apps\/web\/src\/layouts)\//.test(normalize(file)));
  if (changed.length && !governance.approvedRfc) errors.push("design-system/base/layout changes require approvedRfc.");

  if (errors.length) {
    console.error("UI governance check failed.");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`UI governance check passed for ${governance.version}. Protected changes: ${changed.length}.`);
}

function samplePath(path) {
  const section = path.startsWith("/supply-mall") ? "orders" : "basic";
  return path
    .replace(":supplierId", "sup-1")
    .replace(":requestId", "req-award")
    .replace(":projectId", "p-award")
    .replace(":section", section);
}

function smokeUserForPath(path) {
  const rules = [
    [/^\/modules/, "u6"],
    [/^\/suppliers(?:\/|$)/, "u1"],
    [/^\/procurement-requests\/new/, "u8"],
    [/^\/supplier-registration/, "u3"],
    [/^\/supplier-portal/, "u3"],
    [/^\/bidding/, "u12"],
    [/^\/expert-scoring/, "u4"],
    [/^\/integration-boundary/, "u6"],
    [/^\/permissions/, "u6"],
    [/^\/audit/, "u5"],
    [/^\/supply-mall/, "u8"],
    [/^\/scoring-templates/, "u1"],
    [/^\/payment-status/, "u13"],
    [/^\/settlement-materials/, "u13"],
    [/^\/supplier-onboarding-register/, ""],
    [/^\/login/, ""],
    [/^\/role-switch/, ""]
  ];
  return rules.find(([pattern]) => pattern.test(path))?.[1] ?? "u2";
}

const visualRequiredSelectors = {
  LIST_PAGE: [".eds-page-header", ".eds-filter-bar", ".eds-table", ".eds-pagination"],
  DETAIL_PAGE: [".eds-page-header", ".eds-summary-grid", ".eds-tabs"],
  FORM_PAGE: [".eds-form-section", ".eds-submit-panel"],
  DASHBOARD_PAGE: [".eds-page-header", ".eds-business-summary-strip", ".eds-task-item", ".eds-risk-list", ".eds-action-list", ".eds-activity-item"]
};

async function applyVisualUser(page, baseUrl, userId) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "commit", timeout: 15000 });
  await page.evaluate((nextUserId) => {
    if (!nextUserId) {
      window.sessionStorage.clear();
      window.localStorage.removeItem("mockUserId");
      return;
    }
    window.sessionStorage.setItem("demoAuthActive", "true");
    window.sessionStorage.setItem("demoUserId", nextUserId);
    window.localStorage.setItem("mockAuthEnabled", "true");
    window.localStorage.setItem("mockUserId", nextUserId);
  }, userId);
}

async function readVisualMetrics(page) {
  return page.evaluate(() => ({
    bodyLength: document.body.innerText.trim().length,
    surfaces: document.querySelectorAll(".eds-surface").length,
    tables: document.querySelectorAll(".eds-table").length,
    forms: document.querySelectorAll(".eds-form-section").length,
    tabs: document.querySelectorAll(".eds-tabs").length,
    pageHeaders: document.querySelectorAll(".eds-page-header").length,
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight
  }));
}

async function waitForVisualEvidence(page, kind) {
  const selectors = visualRequiredSelectors[kind] ?? [".eds-page-header"];
  await page
    .waitForFunction(
      (expectedSelectors) => {
        const bodyLength = document.body?.innerText.trim().length ?? 0;
        return bodyLength > 120 && expectedSelectors.every((selector) => document.querySelectorAll(selector).length > 0);
      },
      selectors,
      { timeout: 10000 }
    )
    .catch(() => undefined);

  let last = null;
  let stableCount = 0;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 6000) {
    const next = await readVisualMetrics(page);
    const stable = last && JSON.stringify(last) === JSON.stringify(next);
    stableCount = stable ? stableCount + 1 : 0;
    last = next;
    if (stableCount >= 2) return next;
    await page.waitForTimeout(250);
  }
  return last ?? readVisualMetrics(page);
}

async function visualRegression() {
  const baseUrl = process.env.UI_VISUAL_BASE_URL ?? "http://127.0.0.1:5173";
  const { chromium } = await import("playwright");
  const routes = parsePageClassifications()
    .filter((entry) => ["/", "/procurement-requests", "/procurement-requests/:requestId", "/suppliers", "/suppliers/:supplierId", "/supply-mall", "/expert-scoring", "/audit"].includes(entry.path))
    .map((entry) => ({ ...entry, sampledPath: samplePath(entry.path), userId: smokeUserForPath(entry.path) }));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const captures = [];
  for (const route of routes) {
    await applyVisualUser(page, baseUrl, route.userId);
    await page.goto(`${baseUrl}${route.sampledPath}`, { waitUntil: "commit", timeout: 15000 });
    const metrics = await waitForVisualEvidence(page, route.kind);
    const screenshot = await page.screenshot({ fullPage: true });
    captures.push({
      route: route.path,
      sampledPath: route.sampledPath,
      kind: route.kind,
      userId: route.userId,
      finalUrl: page.url(),
      screenshotHash: hashBuffer(screenshot),
      screenshotBytes: screenshot.length,
      metrics
    });
  }
  await browser.close();

  const current = { viewport: { width: 1440, height: 960 }, captures };
  ensureDir(outputDir);
  writeJson(join(outputDir, "visual-regression-current.json"), current);
  if (updateMode || !existsSync(visualBaselinePath)) {
    writeJson(visualBaselinePath, current);
    console.log(`Visual baseline ${updateMode ? "updated" : "created"} for ${captures.length} routes.`);
    return;
  }

  const baseline = readJson(visualBaselinePath);
  const failures = [];
  for (const capture of captures) {
    const expected = baseline.captures.find((item) => item.route === capture.route);
    if (!expected) {
      failures.push(`${capture.route}: missing baseline`);
      continue;
    }
    for (const key of ["surfaces", "tables", "forms", "tabs", "pageHeaders"]) {
      if (capture.metrics[key] !== expected.metrics[key]) failures.push(`${capture.route}: ${key} changed ${expected.metrics[key]} -> ${capture.metrics[key]}`);
    }
    if (Math.abs(capture.metrics.width - expected.metrics.width) > 24) failures.push(`${capture.route}: width layout shift`);
    if (Math.abs(capture.metrics.height - expected.metrics.height) > 160) failures.push(`${capture.route}: height layout shift`);
    if (process.env.UI_VISUAL_STRICT_PIXELS === "true" && capture.screenshotHash !== expected.screenshotHash) {
      failures.push(`${capture.route}: screenshot hash changed`);
    }
  }

  if (failures.length) {
    console.error("Visual regression failed.");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`Visual regression passed for ${captures.length} routes.`);
  }
}

function finalReport() {
  const classifications = parsePageClassifications();
  const visualBaseline = existsSync(visualBaselinePath) ? readJson(visualBaselinePath) : null;
  const smokeResultPath = join(root, "output/ui-page-kind-smoke/results.json");
  const smokeResult = existsSync(smokeResultPath) ? readJson(smokeResultPath) : null;
  const pageFiles = walk(pagesDir).filter((file) => file.endsWith(".vue"));
  const rootPages = readdirSync(pagesDir).filter((entry) => entry.endsWith(".vue"));
  const featureDirs = readdirSync(pagesDir).filter((entry) => statSync(join(pagesDir, entry)).isDirectory());
  const baseComponents = readdirSync(baseComponentDir).filter((entry) => entry.endsWith(".vue"));
  const kindCounts = classifications.reduce((acc, entry) => {
    acc[entry.kind] = (acc[entry.kind] ?? 0) + 1;
    return acc;
  }, {});
  const report = `# Enterprise UI Platform Report\n\n` +
    `## Scope\n\n` +
    `This report is generated from the current Vue 3 + Vite worktree and the enterprise UI platform tooling.\n\n` +
    `## Summary\n\n` +
    `- Pages classified: ${classifications.length}\n` +
    `- Root route pages rewritten as thin wrappers: ${rootPages.length}\n` +
    `- Feature folders: ${featureDirs.length}\n` +
    `- Page implementation files: ${pageFiles.length}\n` +
    `- Base components: ${baseComponents.length}\n` +
    `- Visual regression baseline routes: ${visualBaseline?.captures?.length ?? 0}\n` +
    `- Browser page-kind smoke routes: ${smokeResult?.results?.length ?? 0}\n` +
    `- Legacy design-system policy: token and eds/enterprise namespaces only\n\n` +
    `## Page Kinds\n\n` +
    Object.entries(kindCounts).map(([kind, count]) => `- ${kind}: ${count}`).join("\n") +
    `\n\n## Tooling Coverage\n\n` +
    `- UI linter: scripts/ui-violation-scan.mjs\n` +
    `- Token compiler: node scripts/ui-platform.mjs tokens:compile\n` +
    `- Component generator: node scripts/ui-platform.mjs component:generate Name --write\n` +
    `- Page generator: node scripts/ui-platform.mjs page:generate domain LIST --write\n` +
    `- Dependency map: node scripts/ui-platform.mjs dependency-map\n` +
    `- Codemod engine: node scripts/ui-platform.mjs codemod --write\n` +
    `- Visual regression: node scripts/ui-platform.mjs visual:regression\n` +
    `- Figma sync metadata: node scripts/ui-platform.mjs figma:sync\n` +
    `- Governance check: node scripts/ui-platform.mjs governance:check\n` +
    `- CI gate: npm run ui:ci\n\n` +
    `## Validation Evidence\n\n` +
    `- UI platform gate: npm run ui:platform\n` +
    `- UI linter fixture regression: npm run ui:scan:test\n` +
    `- UI compliance scan: npm run ui:scan\n` +
    `- Page-kind browser smoke: npm run ui:smoke\n` +
    `- Visual regression baseline/check: npm run ui:visual -- --update; npm run ui:visual\n` +
    `- Type and production build gate: npm run typecheck; npm run build\n\n` +
    `## Compliance Statement\n\n` +
    `The system is structured as a custom token-based enterprise procurement SaaS UI system on Vue 3 + Vite. It does not depend on Ant Design Vue or another external UI framework as the primary UI system.\n`;
  writeText(join(root, "docs/ui-enterprise-platform-report.md"), report);
  console.log("Enterprise UI platform report written.");
}

function printHelp() {
  console.log(`Enterprise UI platform commands:
  tokens:compile
  component:generate <Name> [--write]
  page:generate <domain> <LIST|DETAIL|FORM|DASHBOARD> [--write]
  dependency-map
  codemod [--write]
  figma:sync
  governance:check
  visual:regression [--update]
  report`);
}

try {
  if (command === "tokens:compile") compileTokens();
  else if (command === "component:generate") generateComponent();
  else if (command === "page:generate") generatePage();
  else if (command === "dependency-map") buildDependencyMap();
  else if (command === "codemod") runCodemod();
  else if (command === "figma:sync") syncFigmaMetadata();
  else if (command === "governance:check") governanceCheck();
  else if (command === "visual:regression") await visualRegression();
  else if (command === "report") finalReport();
  else printHelp();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
