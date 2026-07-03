import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, sep } from "node:path";

const root = process.cwd();
const scanRoots = (process.env.UI_SCAN_ROOTS ?? "apps/web/src").split(",").map((item) => item.trim()).filter(Boolean);
const packageFiles = (process.env.UI_SCAN_PACKAGE_FILES ?? "package.json,apps/web/package.json").split(",").map((item) => item.trim()).filter(Boolean);
const routerFilePath = normalize(process.env.UI_SCAN_ROUTER_FILE ?? "apps/web/src/router/index.ts");
const classificationFilePath = normalize(process.env.UI_SCAN_CLASSIFICATION_FILE ?? "apps/web/src/router/page-classification.ts");
const pagesDirPath = normalize(process.env.UI_SCAN_PAGES_DIR ?? "apps/web/src/pages");
const strictRootPages = process.env.UI_SCAN_STRICT_ROOT_PAGES !== "false";
const enforceDomainDecomposition = process.env.UI_SCAN_DOMAIN_DECOMPOSITION !== "false";
const ignoreDirs = new Set(["node_modules", "dist", ".git"]);
const tokenFiles = new Set([
  normalize("apps/web/src/design-system/tokens.css"),
  normalize("apps/web/src/design-system/tokens.ts"),
  normalize("apps/web/src/design-system/tokens.json")
]);

const allowedPrimitiveFiles = new Set([
  normalize("apps/web/src/components/base/ActionCard.vue"),
  normalize("apps/web/src/components/base/AuditRail.vue"),
  normalize("apps/web/src/components/base/BusinessTimeline.vue"),
  normalize("apps/web/src/components/base/DataTable.vue"),
  normalize("apps/web/src/components/base/EmptyState.vue"),
  normalize("apps/web/src/components/base/EnvironmentBadge.vue"),
  normalize("apps/web/src/components/base/EnterpriseButton.vue"),
  normalize("apps/web/src/components/base/EnterpriseDialog.vue"),
  normalize("apps/web/src/components/base/EnterpriseTabs.vue"),
  normalize("apps/web/src/components/base/ErrorState.vue"),
  normalize("apps/web/src/components/base/KpiCard.vue"),
  normalize("apps/web/src/components/base/PageSection.vue"),
  normalize("apps/web/src/components/base/PermissionState.vue"),
  normalize("apps/web/src/components/base/ProcessStepBar.vue"),
  normalize("apps/web/src/components/base/RiskAlertPanel.vue"),
  normalize("apps/web/src/components/base/RoleBadge.vue"),
  normalize("apps/web/src/components/base/SplitDetailLayout.vue")
]);

const forbiddenLegacyClasses = [
  "project-operation-card",
  "project-operation-grid",
  "metric-strip",
  "mini-card",
  "supplier-card",
  "status-card",
  "product-card",
  "scenario-card",
  "next-action-card",
  "modal-backdrop",
  "modal-panel",
  "panel-head",
  "detail-summary-grid",
  "module-grid",
  "business-panel",
  "page-surface",
  "draft-card",
  "success-panel",
  "register-stepper",
  "login-card",
  "form-grid",
  "flow-guide-head",
  "step-strip",
  "step-chip",
  "supplier-onboarding-alert-grid",
  "supplier-onboarding-alert-card",
  "supplier-material-blocked",
  "tabbar",
  "workflow-summary",
  "workflow-summary-head",
  "workflow-mini-list",
  "process-timeline",
  "process-progress-grid",
  "process-event-list",
  "process-event-dot",
  "section-title",
  "stack-item",
  "workbench-grid",
  "award-result-grid",
  "decision-box",
  "tab-content",
  "timeline-list",
  "timeline-row",
  "notice",
  "empty",
  "inline-error",
  "error-alert",
  "success-alert",
  "eds-empty",
  "eds-error",
  "eds-success",
  "tag",
  "attachment-list",
  "attachment-item",
  "attachment-thumb",
  "attachment-file-icon",
  "attachment-meta",
  "danger-text",
  "supplier-onboarding-profile",
  "supplier-account-grid",
  "supplier-account-card",
  "supplier-layout",
  "supplier-detail",
  "formal-supplier-layout",
  "supplier-single-layout",
  "workbench-focus-grid",
  "detail-block",
  "temporary-password-box",
  "action-panel",
  "account-reset-note",
  "supplier-review-gate",
  "project-workbench",
  "auth-surface",
  "audit-ref",
  "full-row",
  "compact-input",
  "compact-select",
  "qty-input",
  "score-input",
  "filter-keyword",
  "score-print-area",
  "process-disclosure-head",
  "row-actions",
  "account-meta",
  "supplier-account-notice",
  "visual-placeholder",
  "muted",
  "eyebrow"
];

const externalUiPackages = [
  "antd",
  "ant-design-vue",
  "element-plus",
  "naive-ui",
  "@arco-design/web-vue",
  "vxe-table",
  "primevue",
  "quasar"
];

const allowedStaticClassPrefixes = ["eds-", "enterprise-", "router-link-"];
const allowedStaticClasses = new Set(["active"]);
const pageKindComponents = {
  LIST_PAGE: ["PageHeader", "FilterBar", "DataTable", "PaginationBar"],
  DETAIL_PAGE: ["PageHeader", "SummaryCards", "EnterpriseTabs"],
  FORM_PAGE: ["FormSection", "SubmitPanel"],
  DASHBOARD_PAGE: ["PageHeader", "SummaryCards", "DataTable"]
};
const domainDecompositionRequirements = {
  supplier: ["LIST_PAGE", "DETAIL_PAGE", "FORM_PAGE"],
  "procurement-request": ["LIST_PAGE", "DETAIL_PAGE", "FORM_PAGE"],
  project: ["LIST_PAGE", "DETAIL_PAGE"],
  award: ["LIST_PAGE", "DETAIL_PAGE"],
  "supply-mall": ["LIST_PAGE", "DETAIL_PAGE"]
};

const sourceRules = [
  {
    id: "no-gradient-background",
    pattern: /\blinear-gradient\b|\bradial-gradient\b|\bconic-gradient\b/i,
    message: "Gradient backgrounds are forbidden by the enterprise UI spec."
  },
  {
    id: "no-glassmorphism",
    pattern: /\bbackdrop-filter\b/i,
    message: "Glassmorphism effects are forbidden."
  },
  {
    id: "no-centered-hero",
    pattern: /\bhero\b/i,
    message: "Centered hero or marketing-style layouts are forbidden."
  },
  {
    id: "no-card-dashboard",
    pattern: /\bkpi-card\b|\bdashboard-grid\b|\bcard-dashboard\b|\bcard-kpi\b/i,
    message: "Card-based dashboards must be converted to table-first enterprise layouts."
  },
  {
    id: "no-decorative-animation",
    pattern: /@keyframes|\banimation\s*:/i,
    message: "Decorative animation is forbidden."
  },
  {
    id: "no-inline-style",
    pattern: /\s(?:style|:style|v-bind:style)=/i,
    message: "Inline styles are forbidden outside design-system primitives."
  },
  {
    id: "no-hardcoded-color",
    pattern: /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9A-Za-z_-])/,
    message: "Hardcoded colors are only allowed in design-system token files."
  }
];

function normalize(path) {
  return path.replaceAll("\\", "/");
}

function resolveFromRoot(path) {
  return isAbsolute(path) ? path : join(root, path);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsLegacyClass(line, legacyClass) {
  const escapedClass = escapeRegExp(legacyClass);
  if (new RegExp(`\\.${escapedClass}(?![A-Za-z0-9_-])`).test(line)) return true;

  const staticClassMatch = line.match(/\bclass\s*=\s*["']([^"']*)["']/);
  if (!staticClassMatch) return false;
  return staticClassMatch[1].split(/\s+/).some((className) => className === legacyClass || className.startsWith(`${legacyClass}-`) || className.startsWith(`${legacyClass}_`));
}

function collectDefinedEdsClasses() {
  const definedClasses = new Set();
  const cssFiles = scanRoots.flatMap((scanRoot) => walk(resolveFromRoot(scanRoot)))
    .filter((file) => file.endsWith(".css"));

  for (const file of cssFiles) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/\.((?:eds)-[A-Za-z0-9_-]+)/g)) {
      definedClasses.add(match[1]);
    }
  }

  return definedClasses;
}

function collectUsedEdsClassesFromLine(line) {
  const classes = new Set();

  for (const match of line.matchAll(/\bclass\s*=\s*["']([^"']*)["']/g)) {
    for (const className of match[1].split(/\s+/)) {
      if (className.startsWith("eds-")) classes.add(className);
    }
  }

  for (const match of line.matchAll(/["'`]((?:eds)-[A-Za-z0-9_-]+)(?:["'`\s])/g)) {
    classes.add(match[1]);
  }

  return classes;
}

function collectStaticClassesFromLine(line) {
  const classes = new Set();

  for (const match of line.matchAll(/(?<![:\w-])class\s*=\s*["']([^"']*)["']/g)) {
    for (const className of match[1].split(/\s+/)) {
      if (className) classes.add(className);
    }
  }

  return classes;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (ignoreDirs.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (/\.(vue|ts|css|json)$/.test(entry)) files.push(fullPath);
  }
  return files;
}

function addViolation(violations, file, line, rule, message, text = "") {
  violations.push({
    file: normalize(file),
    line,
    rule,
    message,
    text: text.trim()
  });
}

function parsePageClassifications(classificationText) {
  return [...classificationText.matchAll(/\{\s*path:\s*"([^"]+)",\s*domain:\s*"([^"]+)",\s*kind:\s*"([^"]+)",\s*component:\s*"([^"]+)"([^}]*)\}/g)].map(
    (match) => ({
      path: match[1],
      domain: match[2],
      kind: match[3],
      component: match[4],
      exceptionReason: /exceptionReason:\s*"[^"]+"/.test(match[5])
    })
  );
}

function parseRouterComponentRoutes(routerText) {
  return [...routerText.matchAll(/\{\s*path:\s*"([^"]+)"[^}]*component:\s*([A-Za-z0-9_]+)/g)].map((match) => ({
    path: match[1],
    component: match[2]
  }));
}

function getFeatureFilesForComponent(component) {
  const pagesDir = resolveFromRoot(pagesDirPath);
  const pageFile = join(pagesDir, `${component}.vue`);
  if (!statSync(pageFile, { throwIfNoEntry: false })?.isFile()) return [];

  const pageText = readFileSync(pageFile, "utf8");
  const files = [pageFile];
  const match = pageText.match(/from\s+"\.\/([^"]+)\//);
  if (!match) return files;

  const featureDir = join(pagesDir, match[1]);
  if (!statSync(featureDir, { throwIfNoEntry: false })?.isDirectory()) return files;
  return [...files, ...walk(featureDir).filter((file) => file.endsWith(".vue"))];
}

function getFeatureTextForComponent(component) {
  return getFeatureFilesForComponent(component)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
}

function usesComponent(text, component) {
  return new RegExp(`<${component}\\b`).test(text);
}

function countComponentUses(text, component) {
  return [...text.matchAll(new RegExp(`<${component}\\b`, "g"))].length;
}

function scanSourceRules(violations) {
  for (const scanRoot of scanRoots) {
    for (const file of walk(resolveFromRoot(scanRoot))) {
      const rel = normalize(relative(root, file));
      const lines = readFileSync(file, "utf8").split(/\r?\n/);

      lines.forEach((line, index) => {
        for (const rule of sourceRules) {
          if (rule.id === "no-hardcoded-color" && tokenFiles.has(rel)) continue;
          if (!rule.pattern.test(line)) continue;
          addViolation(violations, rel, index + 1, rule.id, rule.message, line);
        }

        if (!allowedPrimitiveFiles.has(rel) && /<(button|table)\b/i.test(line)) {
          addViolation(
            violations,
            rel,
            index + 1,
            "no-raw-ui-primitive",
            "Raw button/table elements must be wrapped by components/base primitives.",
            line
          );
        }

        for (const legacyClass of forbiddenLegacyClasses) {
          if (!containsLegacyClass(line, legacyClass)) continue;
          addViolation(
            violations,
            rel,
            index + 1,
            "no-legacy-ui-class",
            `Legacy UI class "${legacyClass}" must be replaced by design-system primitives.`,
            line
          );
        }
      });
    }
  }
}

function scanExternalUiFrameworks(violations) {
  for (const packageFile of packageFiles) {
    const rel = normalize(packageFile);
    const json = JSON.parse(readFileSync(resolveFromRoot(packageFile), "utf8"));
    const deps = { ...(json.dependencies ?? {}), ...(json.devDependencies ?? {}) };
    for (const pkg of externalUiPackages) {
      if (deps[pkg]) {
        addViolation(violations, rel, 1, "no-external-ui-package", `External UI package "${pkg}" is forbidden.`, pkg);
      }
    }
  }

  for (const scanRoot of scanRoots) {
    for (const file of walk(resolveFromRoot(scanRoot))) {
    const rel = normalize(relative(root, file));
    const text = readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/(from\s+["'](?:antd|ant-design-vue|element-plus|naive-ui|@arco-design\/web-vue|vxe-table|primevue|quasar)|<(?:a|el|n)-[a-z-]+|class=["'][^"']*\b(?:ant-|el-|n-))/i.test(line)) {
        addViolation(violations, rel, index + 1, "no-external-ui-usage", "External UI framework usage is forbidden.", line);
      }
    });
  }
  }
}

function scanRootPages(violations) {
  if (!strictRootPages) return;
  const pagesDir = resolveFromRoot(pagesDirPath);
  for (const entry of readdirSync(pagesDir)) {
    const fullPath = join(pagesDir, entry);
    if (!statSync(fullPath).isFile() || !entry.endsWith(".vue")) continue;
    const rel = normalize(relative(root, fullPath));
    const text = readFileSync(fullPath, "utf8");
    const lines = text.split(/\r?\n/);
    if (lines.length > 45) {
      addViolation(violations, rel, 1, "root-page-not-thin", "Root page entries must stay thin composition wrappers.", `${lines.length} lines`);
    }
    if (/<style\b|fetch\(|apiRequest|ref\(|computed\(|watch\(|onMounted\(/.test(text)) {
      addViolation(violations, rel, 1, "root-page-contains-logic", "Root page entries must not contain styling, API, or state logic.");
    }
  }
}

function scanPageClassification(violations) {
  const routerFile = routerFilePath;
  const classificationFile = classificationFilePath;
  const routerText = readFileSync(resolveFromRoot(routerFile), "utf8");
  const classificationText = readFileSync(resolveFromRoot(classificationFile), "utf8");
  const routePaths = [...routerText.matchAll(/\{\s*path:\s*"([^"]+)"/g)].map((match) => match[1]);
  const componentRoutePaths = [...routerText.matchAll(/\{\s*path:\s*"([^"]+)"[^}]*component:/g)].map((match) => match[1]);
  const routerComponentRoutes = parseRouterComponentRoutes(routerText);
  const pageClassifications = parsePageClassifications(classificationText);
  const classifiedComponentByPath = new Map(pageClassifications.map((entry) => [entry.path, entry.component]));
  const redirectRoutePaths = [...routerText.matchAll(/\{\s*path:\s*"([^"]+)"[^}]*redirect:/g)].map((match) => match[1]);
  const classifiedPaths = [...classificationText.matchAll(/path:\s*"([^"]+)"/g)].map((match) => match[1]);
  const redirectPaths = [...classificationText.matchAll(/"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => value.startsWith("/"));
  const classifiedSet = new Set(classifiedPaths);
  const redirectSet = new Set(redirectPaths);

  for (const path of componentRoutePaths) {
    if (!classifiedSet.has(path)) {
      addViolation(violations, routerFile, 1, "missing-page-classification", `Route "${path}" must be classified as LIST/DETAIL/FORM/DASHBOARD.`);
    }
    if (!routerText.includes(`meta: getPageClassification("${path}")`)) {
      addViolation(violations, routerFile, 1, "missing-route-meta", `Route "${path}" must carry page classification metadata.`);
    }
  }

  for (const route of routerComponentRoutes) {
    const classifiedComponent = classifiedComponentByPath.get(route.path);
    if (classifiedComponent && classifiedComponent !== route.component) {
      addViolation(
        violations,
        classificationFile,
        1,
        "page-classification-component-mismatch",
        `Route "${route.path}" uses component "${route.component}" but classification declares "${classifiedComponent}".`
      );
    }
  }

  for (const path of redirectRoutePaths) {
    if (!redirectSet.has(path)) {
      addViolation(violations, classificationFile, 1, "missing-redirect-classification", `Redirect route "${path}" must be declared as non-page route.`);
    }
  }

  for (const path of classifiedPaths) {
    if (!routePaths.includes(path)) {
      addViolation(violations, classificationFile, 1, "stale-page-classification", `Classified route "${path}" does not exist in router.`);
    }
  }

  const unknownKinds = [...classificationText.matchAll(/kind:\s*"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((kind) => !["LIST_PAGE", "DETAIL_PAGE", "FORM_PAGE", "DASHBOARD_PAGE"].includes(kind));
  for (const kind of unknownKinds) {
    addViolation(violations, classificationFile, 1, "invalid-page-kind", `Invalid page kind "${kind}".`);
  }

  const kindsByComponent = new Map();
  for (const entry of pageClassifications) {
    if (entry.exceptionReason) continue;
    const kinds = kindsByComponent.get(entry.component) ?? new Set();
    kinds.add(entry.kind);
    kindsByComponent.set(entry.component, kinds);
  }
  for (const [component, kinds] of kindsByComponent) {
    if (kinds.size <= 1) continue;
    addViolation(
      violations,
      classificationFile,
      1,
      "component-reused-across-page-kinds",
      `Component "${component}" is reused across page kinds: ${[...kinds].join(", ")}. Split route components or add an explicit exception.`
    );
  }

  if (enforceDomainDecomposition) {
    for (const [domain, requiredKinds] of Object.entries(domainDecompositionRequirements)) {
      const actualKinds = new Set(pageClassifications.filter((entry) => entry.domain === domain).map((entry) => entry.kind));
      for (const requiredKind of requiredKinds) {
        if (actualKinds.has(requiredKind)) continue;
        addViolation(
          violations,
          classificationFile,
          1,
          "missing-domain-page-kind",
          `Domain "${domain}" must include a ${requiredKind} route.`
        );
      }
    }
  }
}

function scanPageKindStructure(violations) {
  const classificationFile = classificationFilePath;
  const classificationText = readFileSync(resolveFromRoot(classificationFile), "utf8");
  const pageClassifications = parsePageClassifications(classificationText);

  for (const entry of pageClassifications) {
    if (entry.exceptionReason) continue;
    const featureText = getFeatureTextForComponent(entry.component);
    const requiredComponents = pageKindComponents[entry.kind] ?? [];
    for (const component of requiredComponents) {
      if (usesComponent(featureText, component)) continue;
      addViolation(
        violations,
        classificationFile,
        1,
        "page-kind-structure-missing-component",
        `${entry.kind} route "${entry.path}" (${entry.component}) must use ${component}.`
      );
    }

    if (entry.kind === "DASHBOARD_PAGE" && countComponentUses(featureText, "DataTable") < 2) {
      addViolation(
        violations,
        classificationFile,
        1,
        "dashboard-not-table-first",
        `DASHBOARD_PAGE route "${entry.path}" must contain at least two DataTable blocks.`
      );
    }
  }
}

function scanRouteFeatureFolders(violations) {
  if (!strictRootPages) return;
  const pagesDir = resolveFromRoot(pagesDirPath);
  const rootPageFiles = readdirSync(pagesDir).filter((entry) => entry.endsWith(".vue"));
  for (const pageFile of rootPageFiles) {
    if (pageFile === "ModuleEntrypointsPage.vue") continue;
    const fullPath = join(pagesDir, pageFile);
    const text = readFileSync(fullPath, "utf8");
    const match = text.match(/from\s+"\.\/([^"]+)\//);
    if (!match) {
      addViolation(
        violations,
        normalize(relative(root, fullPath)),
        1,
        "missing-feature-folder",
        "Root page entries must delegate to a feature-based folder."
      );
      continue;
    }
    const featureDir = join(pagesDir, match[1]);
    if (!statSync(featureDir).isDirectory()) {
      addViolation(
        violations,
        normalize(relative(root, fullPath)),
        1,
        "missing-feature-folder",
        `Feature folder "${match[1]}" does not exist.`
      );
    }
  }
}

function scanStaticTemplateClassNamespaces(violations) {
  for (const scanRoot of scanRoots) {
    for (const file of walk(resolveFromRoot(scanRoot))) {
      const rel = normalize(relative(root, file));
      if (!rel.endsWith(".vue")) continue;
      const lines = readFileSync(file, "utf8").split(/\r?\n/);

      lines.forEach((line, index) => {
        for (const className of collectStaticClassesFromLine(line)) {
          if (allowedStaticClasses.has(className)) continue;
          if (allowedStaticClassPrefixes.some((prefix) => className.startsWith(prefix))) continue;
          addViolation(
            violations,
            rel,
            index + 1,
            "non-design-system-class",
            `Static class "${className}" must use an approved design-system namespace.`,
            line
          );
        }
      });
    }
  }
}

function scanUndefinedDesignClasses(violations) {
  const definedClasses = collectDefinedEdsClasses();

  for (const scanRoot of scanRoots) {
    for (const file of walk(resolveFromRoot(scanRoot))) {
      const rel = normalize(relative(root, file));
      if (!/\.(vue|ts)$/.test(rel)) continue;
      const lines = readFileSync(file, "utf8").split(/\r?\n/);

      lines.forEach((line, index) => {
        for (const className of collectUsedEdsClassesFromLine(line)) {
          if (definedClasses.has(className)) continue;
          addViolation(
            violations,
            rel,
            index + 1,
            "undefined-design-class",
            `Design-system class "${className}" is used but has no CSS definition.`,
            line
          );
        }
      });
    }
  }
}

const violations = [];

scanSourceRules(violations);
scanExternalUiFrameworks(violations);
scanRootPages(violations);
scanPageClassification(violations);
scanRouteFeatureFolders(violations);
scanPageKindStructure(violations);
scanStaticTemplateClassNamespaces(violations);
scanUndefinedDesignClasses(violations);

if (violations.length > 0) {
  console.log("UI VIOLATION DETECTED");
  for (const violation of violations) {
    console.log(`${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
    if (violation.text) console.log(`  ${violation.text}`);
  }
  console.log(`Total violations: ${violations.length}`);
  process.exitCode = 1;
} else {
  console.log("UI compliance scan passed.");
}
