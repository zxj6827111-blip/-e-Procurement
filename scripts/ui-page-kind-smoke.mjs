#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import path, { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = process.cwd();
const outDir = join(root, "output", "ui-page-kind-smoke");
const runtimeDataDir = join(outDir, "runtime-data", String(Date.now()));
const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const apiPort = Number(process.env.UI_SMOKE_API_PORT ?? 3336);
const webPort = Number(process.env.UI_SMOKE_WEB_PORT ?? 5296);
const apiBaseUrl = process.env.UI_SMOKE_API_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
const baseUrl = process.env.UI_SMOKE_BASE_URL ?? `http://127.0.0.1:${webPort}`;
const externalMode = process.env.UI_SMOKE_EXTERNAL_SERVICES === "true";

const userByRoute = [
  { pattern: /^\/modules(?:\/|$)/, userId: "u6" },
  { pattern: /^\/permissions(?:\/|$)/, userId: "u6" },
  { pattern: /^\/suppliers(?:\/|$)/, userId: "u1" },
  { pattern: /^\/supplier-portal(?:\/|$)/, userId: "u11" },
  { pattern: /^\/procurement-requests\/new$/, userId: "u8" },
  { pattern: /^\/procurement-requests(?:\/|$)/, userId: "u2" },
  { pattern: /^\/supplier-onboarding-register$/, userId: "" },
  { pattern: /^\/supplier-registration$/, userId: "u11" },
  { pattern: /^\/bidding$/, userId: "u12" },
  { pattern: /^\/expert-scoring$/, userId: "u7" },
  { pattern: /^\/expert-review$/, userId: "u2" },
  { pattern: /^\/approval-rules$/, userId: "u1" },
  { pattern: /^\/integration-boundary$/, userId: "u5" },
  { pattern: /^\/audit$/, userId: "u5" },
  { pattern: /^\/archive-audit$/, userId: "u5" },
  { pattern: /^\/file-center$/, userId: "u2" },
  { pattern: /^\/supply-mall(?:\/|$)/, userId: "u8" },
  { pattern: /^\/scoring-templates$/, userId: "u10" },
  { pattern: /^\/payment-status$/, userId: "u13" },
  { pattern: /^\/settlement-materials$/, userId: "u13" },
  { pattern: /^\/award-result(?:\/|$)/, userId: "u2" },
  { pattern: /^\/project-workbench(?:\/|$)/, userId: "u2" },
  { pattern: /^\/announcements-invitations$/, userId: "u2" },
  { pattern: /^\/bid-control$/, userId: "u2" },
  { pattern: /^\/external-trade$/, userId: "u2" },
  { pattern: /^\/my-tasks$/, userId: "u2" },
  { pattern: /^\/messages$/, userId: "u2" },
  { pattern: /^\/account-security$/, userId: "u2" },
  { pattern: /^\/role-switch$/, userId: "u2" },
  { pattern: /^\/login$/, userId: "" },
  { pattern: /^\/$/, userId: "u2" }
];

const routeOverrides = new Map([
  [
    "/login",
    {
      all: [".enterprise-login-layout", ".enterprise-login-card", ".eds-page-header"],
      any: [".enterprise-login-proof-item", ".eds-form-section", "form"],
      minBodyLength: 120
    }
  ],
  [
    "/permission-denied",
    {
      all: [".eds-page-header", ".eds-state-warning"],
      any: [],
      minBodyLength: 40,
      expectedText: "当前角色不可访问"
    }
  ],
  [
    "/:pathMatch(.*)*",
    {
      all: [".eds-page-header", ".eds-state-error"],
      any: [],
      minBodyLength: 40,
      expectedText: "页面暂时无法加载"
    }
  ],
  [
    "/supplier-onboarding-register",
    {
      all: [".eds-page-header", ".eds-form-section"],
      any: [".eds-submit-panel", "form"],
      minBodyLength: 120
    }
  ],
  [
    "/role-switch",
    {
      all: [".eds-page-header", ".eds-form-section"],
      any: [],
      minBodyLength: 80
    }
  ]
]);

const kindExpectations = {
  LIST_PAGE: {
    all: [".enterprise-shell", ".eds-page-header"],
    any: [".eds-table", ".eds-filter-bar", ".eds-pagination", ".eds-summary-grid", ".eds-tabs", ".eds-form-section"],
    minBodyLength: 140
  },
  DETAIL_PAGE: {
    all: [".enterprise-shell", ".eds-page-header"],
    any: [".eds-summary-grid", ".eds-tabs", ".eds-form-section", ".eds-table", ".eds-table-wrap"],
    minBodyLength: 140
  },
  FORM_PAGE: {
    all: [".enterprise-shell", ".eds-page-header"],
    any: [".eds-form-section", ".eds-submit-panel", ".eds-table", ".eds-tabs", "form"],
    minBodyLength: 120
  },
  DASHBOARD_PAGE: {
    all: [".enterprise-shell", ".eds-page-header"],
    any: [".eds-business-summary-strip", ".eds-task-item", ".eds-risk-list", ".eds-action-list", ".eds-activity-item", ".eds-table"],
    minBodyLength: 180
  }
};

function ensureDirs() {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(runtimeDataDir, { recursive: true });
}

function npmArgs(args) {
  return process.platform === "win32" ? ["/d", "/s", "/c", "npm.cmd", ...args] : args;
}

function spawnService(name, args, extraEnv = {}) {
  const child = spawn(npmCommand, npmArgs(args), {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    windowsHide: true,
    detached: process.platform !== "win32"
  });
  child.stdout.pipe(writeStream(`${name}.out.log`));
  child.stderr.pipe(writeStream(`${name}.err.log`));
  return child;
}

function writeStream(fileName) {
  return createWriteStream(path.join(outDir, fileName), { flags: "a" });
}

function stopProcessTree(child) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    } else {
      process.kill(-child.pid, "SIGTERM");
    }
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      // best-effort cleanup
    }
  }
}

async function waitForUrl(url, timeoutMs = 60000) {
  const startedAt = Date.now();
  let lastError = "";
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
}

async function loadPageClassifications() {
  const moduleUrl = pathToFileURL(path.join(root, "apps/web/src/router/page-classification.ts")).href;
  const { pageClassifications } = await import(moduleUrl);
  return pageClassifications;
}

function userForPath(pathname) {
  return userByRoute.find((item) => item.pattern.test(pathname))?.userId ?? "u2";
}

const apiCache = new Map();

async function apiGetJson(requestPath, userId) {
  const cacheKey = `${userId}:${requestPath}`;
  if (apiCache.has(cacheKey)) return apiCache.get(cacheKey);
  const response = await fetch(`${apiBaseUrl}${requestPath}`, {
    headers: userId ? { "x-mock-user-id": userId } : undefined
  });
  if (!response.ok) {
    throw new Error(`API ${requestPath} for ${userId || "anonymous"} failed: ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();
  apiCache.set(cacheKey, payload);
  return payload;
}

async function readFirstSupplierId(userId) {
  const payload = await apiGetJson("/api/suppliers", userId);
  return payload?.suppliers?.[0]?.id ?? "";
}

async function readFirstRequestId(userId) {
  const payload = await apiGetJson("/api/procurement-requests", userId);
  return payload?.procurementRequests?.[0]?.id ?? "";
}

async function readFirstProjectId(userId) {
  const payload = await apiGetJson("/api/projects", userId);
  return payload?.projects?.[0]?.id ?? "";
}

function sampleSectionForRoute(routePath) {
  if (routePath.startsWith("/supplier-portal")) return "qualifications";
  if (routePath.startsWith("/suppliers/")) return "basic";
  if (routePath.startsWith("/supply-mall")) return "orders";
  return "basic";
}

async function samplePath(routePath, userId) {
  if (routePath === "/:pathMatch(.*)*") return "/not-found-visual-check";

  let resolvedPath = routePath;
  if (resolvedPath.includes(":supplierId")) {
    const supplierId = await readFirstSupplierId(userId);
    resolvedPath = resolvedPath.replace(":supplierId", encodeURIComponent(supplierId || "sup-1"));
  }
  if (resolvedPath.includes(":requestId")) {
    const requestId = await readFirstRequestId(userId);
    resolvedPath = resolvedPath.replace(":requestId", encodeURIComponent(requestId || "req-award"));
  }
  if (resolvedPath.includes(":projectId")) {
    const projectId = await readFirstProjectId(userId);
    resolvedPath = resolvedPath.replace(":projectId", encodeURIComponent(projectId || "proj-award"));
  }
  if (resolvedPath.includes(":section")) {
    resolvedPath = resolvedPath.replace(":section", sampleSectionForRoute(routePath));
  }
  return resolvedPath;
}

async function applyUser(page, userId) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "commit", timeout: 15000 });
  await page.evaluate((nextUserId) => {
    window.sessionStorage.clear();
    if (!nextUserId) {
      window.localStorage.removeItem("mockAuthEnabled");
      window.localStorage.removeItem("mockUserId");
      return;
    }
    window.sessionStorage.setItem("demoAuthActive", "true");
    window.sessionStorage.setItem("demoUserId", nextUserId);
    window.localStorage.setItem("mockAuthEnabled", "true");
    window.localStorage.setItem("mockUserId", nextUserId);
  }, userId);
}

function selectorsForEntry(entry) {
  return routeOverrides.get(entry.path) ?? kindExpectations[entry.kind] ?? { all: [], any: [], minBodyLength: 80 };
}

async function waitForPageEvidence(page, expectation) {
  await page
    .waitForFunction(
      (config) => {
        const bodyLength = document.body?.innerText.trim().length ?? 0;
        if (bodyLength < config.minBodyLength) return false;
        const allMatched = config.all.every((selector) => document.querySelectorAll(selector).length > 0);
        const anyMatched = config.any.length === 0 || config.any.some((selector) => document.querySelectorAll(selector).length > 0);
        const textMatched = !config.expectedText || (document.body?.innerText ?? "").includes(config.expectedText);
        return allMatched && anyMatched && textMatched;
      },
      expectation,
      { timeout: 10000 }
    )
    .catch(() => undefined);
}

async function collectSelectorCounts(page, selectors) {
  const counts = {};
  for (const selector of selectors) counts[selector] = await page.locator(selector).count();
  return counts;
}

async function runSmoke() {
  ensureDirs();
  const classifications = await loadPageClassifications();

  let apiProcess;
  let webProcess;
  try {
    if (!externalMode) {
      apiProcess = spawnService("api", ["--workspace", "@eprocurement/api", "run", "dev"], {
        APP_ENV: "local",
        APP_DATA_DIR: runtimeDataDir,
        APP_SEED_ON_BOOT: "true",
        DISABLE_MOCK_AUTH: "false",
        PORT: String(apiPort),
        HOST: "127.0.0.1"
      });
      webProcess = spawnService("web", ["--workspace", "@eprocurement/web", "run", "dev", "--", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], {
        VITE_API_BASE_URL: apiBaseUrl
      });
    }

    await waitForUrl(`${apiBaseUrl}/health`);
    await waitForUrl(`${baseUrl}/login`);

    const browser = await chromium.launch({ headless: true });
    try {
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

      for (const entry of classifications) {
        const userId = userForPath(entry.path);
        const sampledPath = await samplePath(entry.path, userId);
        const expectation = selectorsForEntry(entry);
        const trackedSelectors = [...new Set([...expectation.all, ...expectation.any])];

        await applyUser(page, userId);
        await page.goto(`${baseUrl}${sampledPath}`, { waitUntil: "commit", timeout: 15000 });
        await waitForPageEvidence(page, expectation);

        const counts = await collectSelectorCounts(page, trackedSelectors);
        const bodyText = await page.locator("body").innerText();
        const finalPath = new URL(page.url()).pathname;
        const routeMatched = finalPath === sampledPath;
        const allMatched = expectation.all.every((selector) => (counts[selector] ?? 0) > 0);
        const anyMatched = expectation.any.length === 0 || expectation.any.some((selector) => (counts[selector] ?? 0) > 0);
        const textMatched = !expectation.expectedText || bodyText.includes(expectation.expectedText);
        const passed = routeMatched && bodyText.length >= expectation.minBodyLength && allMatched && anyMatched && textMatched;

        results.push({
          route: entry.path,
          sampledPath,
          kind: entry.kind,
          userId,
          finalUrl: page.url(),
          finalPath,
          routeMatched,
          bodyLength: bodyText.length,
          counts,
          allMatched,
          anyMatched,
          textMatched,
          passed
        });
      }

      await page.close();

      const payload = {
        passed: results.every((result) => result.passed) && consoleErrors.length === 0 && httpErrors.length === 0,
        baseUrl,
        apiBaseUrl,
        results,
        consoleErrors,
        httpErrors
      };
      writeFileSync(join(outDir, "results.json"), JSON.stringify(payload, null, 2));
      console.log(JSON.stringify(payload, null, 2));
      if (!payload.passed) process.exitCode = 1;
    } finally {
      await browser.close();
    }
  } finally {
    if (!externalMode) {
      stopProcessTree(webProcess);
      stopProcessTree(apiProcess);
    }
  }
}

runSmoke().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
