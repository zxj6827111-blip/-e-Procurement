import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const scanScript = join(root, "scripts/ui-violation-scan.mjs");

function writeFixture(baseDir, files) {
  for (const [file, content] of Object.entries(files)) {
    const fullPath = join(baseDir, file);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
}

function runScan(baseDir) {
  return spawnSync(process.execPath, [scanScript], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      UI_SCAN_ROOTS: baseDir,
      UI_SCAN_PACKAGE_FILES: "package.json",
      UI_SCAN_ROUTER_FILE: `${baseDir}/router/index.ts`,
      UI_SCAN_CLASSIFICATION_FILE: `${baseDir}/router/page-classification.ts`,
      UI_SCAN_PAGES_DIR: `${baseDir}/pages`,
      UI_SCAN_STRICT_ROOT_PAGES: "false",
      UI_SCAN_DOMAIN_DECOMPOSITION: "false"
    }
  });
}

const cases = [
  {
    name: "LIST route missing table structure",
    expectedRule: "page-kind-structure-missing-component",
    files: {
      "router/index.ts": 'const FooPage = {};\nexport const routes = [{ path: "/foo", component: FooPage, meta: getPageClassification("/foo") }];\n',
      "router/page-classification.ts":
        'export const pageClassifications = [{ path: "/foo", domain: "foo", kind: "LIST_PAGE", component: "FooPage" }];',
      "pages/FooPage.vue": '<template><PageHeader /><FilterBar /></template>',
      "styles.css": ".eds-page-header{}\n.eds-filter-bar{}\n"
    }
  },
  {
    name: "Component reused across page kinds",
    expectedRule: "component-reused-across-page-kinds",
    files: {
      "router/index.ts":
        'const FooPage = {};\nexport const routes = [{ path: "/foo", component: FooPage, meta: getPageClassification("/foo") }, { path: "/foo/:id", component: FooPage, meta: getPageClassification("/foo/:id") }];\n',
      "router/page-classification.ts":
        'export const pageClassifications = [{ path: "/foo", domain: "foo", kind: "LIST_PAGE", component: "FooPage" }, { path: "/foo/:id", domain: "foo", kind: "DETAIL_PAGE", component: "FooPage" }];',
      "pages/FooPage.vue": "<template><PageHeader /><FilterBar /><DataTable /><PaginationBar /><SummaryCards /><EnterpriseTabs /></template>",
      "styles.css": ".eds-page-header{}\n.eds-filter-bar{}\n.eds-table{}\n.eds-pagination{}\n.eds-tabs{}\n.eds-summary-grid{}\n"
    }
  },
  {
    name: "Dashboard without enough tables",
    expectedRule: "dashboard-not-table-first",
    files: {
      "router/index.ts": 'const DashboardPage = {};\nexport const routes = [{ path: "/", component: DashboardPage, meta: getPageClassification("/") }];\n',
      "router/page-classification.ts":
        'export const pageClassifications = [{ path: "/", domain: "dashboard", kind: "DASHBOARD_PAGE", component: "DashboardPage" }];',
      "pages/DashboardPage.vue": "<template><PageHeader /><SummaryCards /><DataTable /></template>",
      "styles.css": ".eds-page-header{}\n.eds-table{}\n.eds-summary-grid{}\n"
    }
  },
  {
    name: "FORM route missing submit panel",
    expectedRule: "page-kind-structure-missing-component",
    files: {
      "router/index.ts": 'const CreatePage = {};\nexport const routes = [{ path: "/create", component: CreatePage, meta: getPageClassification("/create") }];\n',
      "router/page-classification.ts":
        'export const pageClassifications = [{ path: "/create", domain: "foo", kind: "FORM_PAGE", component: "CreatePage" }];',
      "pages/CreatePage.vue": "<template><FormSection /></template>",
      "styles.css": ".eds-form-section{}\n"
    }
  }
];

let failed = false;

for (const testCase of cases) {
  const baseDir = mkdtempSync(join(tmpdir(), "ui-scan-fixture-")).replaceAll("\\", "/");
  try {
    writeFixture(baseDir, testCase.files);
    const result = runScan(baseDir);
    const output = `${result.stdout}\n${result.stderr}`;
    if (result.status === 0 || !output.includes(testCase.expectedRule)) {
      failed = true;
      console.error(`FAILED: ${testCase.name}`);
      console.error(output);
    } else {
      console.log(`passed: ${testCase.name}`);
    }
  } finally {
    rmSync(baseDir, { recursive: true, force: true });
  }
}

if (failed) process.exit(1);
