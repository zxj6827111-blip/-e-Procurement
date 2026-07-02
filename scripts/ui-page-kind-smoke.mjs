import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.UI_SMOKE_BASE_URL ?? "http://127.0.0.1:5173";
const outDir = join(process.cwd(), "output", "ui-page-kind-smoke");
const classificationText = readFileSync(join(process.cwd(), "apps/web/src/router/page-classification.ts"), "utf8");

const userByRoute = [
  { pattern: /^\/modules/, userId: "u6" },
  { pattern: /^\/suppliers(?:\/|$)/, userId: "u1" },
  { pattern: /^\/procurement-requests\/new/, userId: "u8" },
  { pattern: /^\/supplier-registration/, userId: "u3" },
  { pattern: /^\/supplier-portal/, userId: "u3" },
  { pattern: /^\/bidding/, userId: "u12" },
  { pattern: /^\/expert-scoring/, userId: "u4" },
  { pattern: /^\/expert-review/, userId: "u2" },
  { pattern: /^\/approval-rules/, userId: "u1" },
  { pattern: /^\/integration-boundary/, userId: "u6" },
  { pattern: /^\/permissions/, userId: "u6" },
  { pattern: /^\/audit/, userId: "u5" },
  { pattern: /^\/file-center/, userId: "u2" },
  { pattern: /^\/supply-mall/, userId: "u8" },
  { pattern: /^\/scoring-templates/, userId: "u1" },
  { pattern: /^\/payment-status/, userId: "u13" },
  { pattern: /^\/settlement-materials/, userId: "u13" },
  { pattern: /^\/archive-audit/, userId: "u2" },
  { pattern: /^\/supplier-onboarding-register/, userId: "" },
  { pattern: /^\/login/, userId: "" },
  { pattern: /^\/role-switch/, userId: "" }
];

const requiredSelectors = {
  LIST_PAGE: [".eds-page-header", ".eds-filter-bar", ".eds-table", ".eds-pagination"],
  DETAIL_PAGE: [".eds-page-header", ".eds-summary-grid", ".eds-tabs"],
  FORM_PAGE: [".eds-form-section", ".eds-submit-panel"],
  DASHBOARD_PAGE: [".eds-page-header", ".eds-summary-grid", ".eds-table"]
};

function pageClassifications() {
  return [...classificationText.matchAll(/\{\s*path:\s*"([^"]+)",\s*domain:\s*"([^"]+)",\s*kind:\s*"([^"]+)",\s*component:\s*"([^"]+)"([^}]*)\}/g)]
    .map((match) => ({
      path: match[1],
      domain: match[2],
      kind: match[3],
      component: match[4],
      exceptionReason: /exceptionReason:\s*"([^"]+)"/.exec(match[5])?.[1] ?? ""
    }));
}

function samplePath(path) {
  const section = path.startsWith("/supply-mall") ? "orders" : "basic";
  return path
    .replace(":supplierId", "sup-1")
    .replace(":requestId", "req-award")
    .replace(":projectId", "p-award")
    .replace(":section", section);
}

function userForPath(path) {
  return userByRoute.find((item) => item.pattern.test(path))?.userId ?? "u2";
}

async function applyUser(page, userId) {
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

async function waitForPageEvidence(page, selectors) {
  await page
    .waitForFunction(
      (expectedSelectors) => {
        const bodyLength = document.body?.innerText.trim().length ?? 0;
        return bodyLength > 120 && expectedSelectors.every((selector) => document.querySelectorAll(selector).length > 0);
      },
      selectors,
      { timeout: 8000 }
    )
    .catch(() => undefined);
}

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleErrors = [];
const httpErrors = [];
page.on("console", (message) => {
  const text = message.text();
  if (message.type() === "error" && !text.startsWith("Failed to load resource:")) consoleErrors.push(text);
});
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("response", (response) => {
  const status = response.status();
  const url = response.url();
  if (status >= 400 && !url.endsWith("/favicon.ico")) httpErrors.push(`${status} ${url}`);
});

const results = [];

for (const entry of pageClassifications()) {
  const path = samplePath(entry.path);
  const userId = userForPath(entry.path);
  await applyUser(page, userId);
  await page.goto(`${baseUrl}${path}`, { waitUntil: "commit", timeout: 15000 });

  const selectors = entry.exceptionReason ? [".eds-page-header"] : requiredSelectors[entry.kind] ?? [];
  await waitForPageEvidence(page, selectors);
  const counts = {};
  for (const selector of selectors) counts[selector] = await page.locator(selector).count();
  const bodyText = await page.locator("body").innerText();
  const redirected = !page.url().endsWith(path);
  const passed = !redirected && bodyText.length > 120 && Object.values(counts).every((count) => count > 0);

  results.push({
    route: entry.path,
    sampledPath: path,
    kind: entry.kind,
    userId,
    finalUrl: page.url(),
    redirected,
    bodyLength: bodyText.length,
    counts,
    passed
  });
}

await browser.close();

const payload = {
  passed: results.every((result) => result.passed) && consoleErrors.length === 0 && httpErrors.length === 0,
  results,
  consoleErrors,
  httpErrors
};
writeFileSync(join(outDir, "results.json"), JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
if (!payload.passed) process.exit(1);
