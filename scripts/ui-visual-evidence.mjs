#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const outputDir = path.join(root, "output", "ui-visual-evidence");
const screenshotDir = path.join(outputDir, "screenshots");
const docsDir = path.join(root, "docs", "sellable-readiness");
const runtimeDataDir = path.join(outputDir, "runtime-data", String(Date.now()));
const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const apiPort = Number(process.env.UI_EVIDENCE_API_PORT ?? 3316);
const webPort = Number(process.env.UI_EVIDENCE_WEB_PORT ?? 5276);
const apiBaseUrl = process.env.UI_EVIDENCE_API_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
const webBaseUrl = process.env.UI_EVIDENCE_WEB_BASE_URL ?? `http://127.0.0.1:${webPort}`;
const externalMode = process.env.UI_EVIDENCE_EXTERNAL_SERVICES === "true";

function ensureDirs() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(runtimeDataDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });
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
  child.stdout.pipe(fs.createWriteStream(path.join(outputDir, `${name}.out.log`), { flags: "a" }));
  child.stderr.pipe(fs.createWriteStream(path.join(outputDir, `${name}.err.log`), { flags: "a" }));
  return child;
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

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function applyUser(page, userId) {
  await page.goto(`${webBaseUrl}/login`, { waitUntil: "commit", timeout: 15000 });
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

async function capture(page, entry, viewport) {
  await page.setViewportSize(viewport);
  if (entry.userId) await applyUser(page, entry.userId);
  await page.goto(`${webBaseUrl}${entry.path}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForFunction(() => (document.body?.innerText.trim().length ?? 0) > 80, null, { timeout: 12000 }).catch(() => undefined);
  const fileName = `${entry.key}-${viewport.width}x${viewport.height}.png`;
  const filePath = path.join(screenshotDir, fileName);
  const buffer = await page.screenshot({ path: filePath, fullPage: true });
  const metrics = await page.evaluate(() => ({
    bodyLength: document.body?.innerText.trim().length ?? 0,
    surfaces: document.querySelectorAll(".eds-surface").length,
    pageHeaders: document.querySelectorAll(".eds-page-header").length,
    tables: document.querySelectorAll(".eds-table").length,
    stateBlocks: document.querySelectorAll(".eds-state").length,
    shell: document.querySelectorAll(".enterprise-shell").length,
    authShell: document.querySelectorAll(".enterprise-login-layout").length,
    navGroups: document.querySelectorAll(".enterprise-nav-group").length,
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight
  }));
  return {
    key: entry.key,
    title: entry.title,
    path: entry.path,
    userId: entry.userId,
    viewport,
    screenshot: path.relative(root, filePath).replaceAll(path.sep, "/"),
    screenshotBytes: buffer.length,
    screenshotHash: sha256(buffer),
    finalUrl: page.url(),
    metrics,
    passed:
      buffer.length > 10000 &&
      metrics.bodyLength > 80 &&
      (entry.path === "/login" ? metrics.authShell > 0 : metrics.shell > 0 && metrics.pageHeaders > 0)
  };
}

function mdTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replaceAll("\n", "<br>").replaceAll("|", "\\|");
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
  ].join("\n");
}

ensureDirs();

let apiProcess;
let webProcess;

try {
  if (!externalMode) {
    apiProcess = spawnService("api", ["--workspace", "@eprocurement/api", "run", "dev"], {
      APP_ENV: "test",
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
  await waitForUrl(`${webBaseUrl}/login`);

  const routes = [
    { key: "login", title: "登录页", path: "/login", userId: "" },
    { key: "dashboard-group", title: "集团采购工作台", path: "/", userId: "u1" },
    { key: "dashboard-buyer", title: "采购经办工作台", path: "/", userId: "u2" },
    { key: "procurement-list", title: "采购申请列表", path: "/procurement-requests", userId: "u2" },
    { key: "project-detail", title: "采购项目详情", path: "/project-workbench/p-award", userId: "u2" },
    { key: "supplier-portal", title: "供应商门户", path: "/supplier-portal", userId: "u11" },
    { key: "bidding", title: "报价响应", path: "/bidding", userId: "u11" },
    { key: "expert-scoring", title: "专家评分", path: "/expert-scoring", userId: "u7" },
    { key: "settlement", title: "结算材料", path: "/settlement-materials", userId: "u9" },
    { key: "audit", title: "审计日志", path: "/audit", userId: "u5" }
  ];
  const viewports = [
    { width: 1440, height: 960 },
    { width: 390, height: 844 }
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
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
    if (status >= 500 && !url.endsWith("/favicon.ico")) httpErrors.push(`${status} ${url}`);
  });

  const captures = [];
  for (const route of routes) {
    for (const viewport of viewports) captures.push(await capture(page, route, viewport));
  }
  await browser.close();

  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl: webBaseUrl,
    apiBaseUrl,
    status: captures.every((item) => item.passed) && consoleErrors.length === 0 && httpErrors.length === 0 ? "PASS" : "FAIL",
    captures,
    consoleErrors,
    httpErrors
  };
  fs.writeFileSync(path.join(outputDir, "visual-evidence.json"), JSON.stringify(payload, null, 2), "utf8");

  const report = `# Sprint 8 UI Visual Evidence

- Generated at: ${payload.generatedAt}
- Result: ${payload.status}
- Web: ${webBaseUrl}
- API: ${apiBaseUrl}
- Screenshots: output/ui-visual-evidence/screenshots
- Console errors: ${consoleErrors.length}
- HTTP 5xx errors: ${httpErrors.length}

${mdTable(
  ["Page", "Viewport", "Status", "Screenshot", "Body", "Surfaces", "Tables", "Shell/Nav"],
  captures.map((item) => [
    item.title,
    `${item.viewport.width}x${item.viewport.height}`,
    item.passed ? "PASS" : "FAIL",
    item.screenshot,
    item.metrics.bodyLength,
    item.metrics.surfaces,
    item.metrics.tables,
    item.path === "/login" ? `login=${item.metrics.authShell}` : `shell=${item.metrics.shell}, nav=${item.metrics.navGroups}`
  ])
)}

## Evidence Boundary

These screenshots prove local Sprint 4-8 visual behavior across desktop and narrow mobile viewports. They are not customer UAT signoff and do not prove Production Go.`;

  fs.writeFileSync(path.join(docsDir, "04_VISUAL_REDESIGN_REPORT.md"), report.trimEnd() + "\n", "utf8");
  console.log(JSON.stringify({ status: payload.status, captures: captures.length, report: "docs/sellable-readiness/04_VISUAL_REDESIGN_REPORT.md" }, null, 2));
  if (payload.status !== "PASS") process.exitCode = 1;
} finally {
  if (!externalMode) {
    stopProcessTree(webProcess);
    stopProcessTree(apiProcess);
  }
}
