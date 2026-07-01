import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec, spawn } from "node:child_process";
import { chromium } from "playwright";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoRoot, "output", "m6c-browser-evidence");
const apiPort = Number(process.env.M6C_API_PORT ?? 3216);
const webPort = Number(process.env.M6C_WEB_PORT ?? 5276);
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;
const dataRoot = process.env.M6C_APP_DATA_DIR || path.join(repoRoot, "output", "m6c-browser-data");

const roles = [
  {
    label: "集团采购管理",
    userId: "u1",
    expectedRole: "集团采购管理人",
    routes: ["/", "/procurement-requests", "/my-tasks", "/integration-boundary"],
    forbiddenRoutes: ["/permissions"]
  },
  {
    label: "采购经办",
    userId: "u2",
    expectedRole: "采购经办人",
    routes: ["/", "/procurement-requests", "/suppliers", "/my-tasks"],
    forbiddenRoutes: ["/permissions"]
  },
  {
    label: "酒店采购",
    userId: "u8",
    expectedRole: "酒店采购",
    routes: ["/supply-mall", "/procurement-requests", "/order-fulfillment", "/my-tasks"],
    forbiddenRoutes: ["/permissions", "/integration-boundary"]
  },
  {
    label: "供应商管理员",
    userId: "u11",
    expectedRole: "供应商管理员",
    routes: ["/", "/suppliers", "/supplier-registration", "/order-fulfillment", "/my-tasks"],
    forbiddenRoutes: ["/procurement-requests", "/permissions"]
  },
  {
    label: "供应商报价人员",
    userId: "u12",
    expectedRole: "供应商报价人员",
    routes: ["/", "/bidding", "/supplier-registration", "/order-fulfillment", "/my-tasks"],
    forbiddenRoutes: ["/procurement-requests", "/permissions"]
  },
  {
    label: "专家",
    userId: "u7",
    expectedRole: "专家",
    routes: ["/expert-scoring", "/my-tasks", "/messages"],
    forbiddenRoutes: ["/suppliers", "/procurement-requests", "/permissions"]
  },
  {
    label: "财务审核",
    userId: "u13",
    expectedRole: "财务审核",
    routes: ["/", "/settlement-materials", "/payment-status", "/my-tasks"],
    forbiddenRoutes: ["/procurement-requests", "/permissions"]
  },
  {
    label: "审计监督",
    userId: "u5",
    expectedRole: "纪检审计",
    routes: ["/", "/archive-audit", "/audit", "/my-tasks", "/integration-boundary"],
    forbiddenRoutes: ["/permissions"]
  },
  {
    label: "系统管理员",
    userId: "u6",
    expectedRole: "系统管理员",
    routes: ["/permissions"],
    forbiddenRoutes: ["/procurement-requests", "/suppliers", "/my-tasks"]
  }
];

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function spawnService(label, args, env) {
  const command = [npmCommand(), ...args].map((part) => (/\s/.test(part) ? `"${part}"` : part)).join(" ");
  const child = exec(command, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
      FORCE_COLOR: "0"
    },
    windowsHide: true
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  return child;
}

async function fetchOk(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(name, probe, timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await probe()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${name} did not become ready within ${timeoutMs}ms`);
}

async function stopService(child) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  } else {
    child.kill();
  }
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 3000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function withTimeout(label, promise, timeoutMs = 30000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function captureRole(browser, role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const consoleMessages = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText ?? "request failed" });
  });

  const roleResult = {
    label: role.label,
    userId: role.userId,
    expectedRole: role.expectedRole,
    login: "not_run",
    routes: [],
    forbiddenRoutes: [],
    consoleMessages: [],
    failedRequests: [],
    passed: false
  };

  await page.goto(`${webBaseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.evaluate(
    ({ userId }) => {
      sessionStorage.setItem("demoAuthActive", "true");
      sessionStorage.setItem("demoUserId", userId);
      localStorage.setItem("mockUserId", userId);
      localStorage.setItem("mockAuthEnabled", "true");
    },
    { userId: role.userId }
  );
  await page.goto(`${webBaseUrl}${role.routes[0]}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(500);
  const shellText = await page.locator("body").innerText();
  roleResult.login = shellText.includes(role.expectedRole) ? "ok" : "role_label_missing";

  for (const route of role.routes) {
    const consoleStart = consoleMessages.length;
    const failedStart = failedRequests.length;
    await page.goto(`${webBaseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(500);
    const visibleText = await page.locator("body").innerText();
    const currentPath = new URL(page.url()).pathname;
    roleResult.routes.push({
      route,
      finalPath: currentPath,
      status: currentPath === route || (route === "/" && currentPath === "/") ? "loaded" : "redirected",
      hasUserLabel: visibleText.includes(role.expectedRole),
      hasErrorAlert: visibleText.includes("数据加载失败") || visibleText.includes("操作失败") || visibleText.includes("请求失败") || visibleText.includes("请先登录"),
      consoleMessages: consoleMessages.slice(consoleStart),
      failedRequests: failedRequests.slice(failedStart)
    });
  }
  roleResult.consoleMessages = consoleMessages.slice();
  roleResult.failedRequests = failedRequests.slice();

  for (const route of role.forbiddenRoutes) {
    const consoleStart = consoleMessages.length;
    const failedStart = failedRequests.length;
    await page.goto(`${webBaseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(500);
    const currentPath = new URL(page.url()).pathname;
    roleResult.forbiddenRoutes.push({
      route,
      finalPath: currentPath,
      redirected: currentPath !== route,
      consoleMessages: consoleMessages.slice(consoleStart),
      failedRequests: failedRequests.slice(failedStart)
    });
  }

  await page.screenshot({ path: path.join(outputDir, `m6c-${role.userId}.png`), fullPage: true });
  await context.close();

  roleResult.passed =
    roleResult.login === "ok" &&
    roleResult.routes.every((item) => item.status === "loaded" && item.hasUserLabel && !item.hasErrorAlert && item.consoleMessages.length === 0 && item.failedRequests.length === 0) &&
    roleResult.forbiddenRoutes.every((item) => item.redirected);
  return roleResult;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(dataRoot, { recursive: true });
  const api = spawnService("api", ["--workspace", "@eprocurement/api", "run", "dev"], {
    APP_ENV: "test",
    PORT: String(apiPort),
    HOST: "127.0.0.1",
    APP_DATA_DIR: dataRoot,
    DISABLE_MOCK_AUTH: "false"
  });
  const web = spawnService("web", ["--workspace", "@eprocurement/web", "run", "dev", "--", "--host", "127.0.0.1", "--port", String(webPort)], {
    VITE_API_BASE_URL: apiBaseUrl
  });

  const evidence = {
    scope: "M6-C browser role smoke",
    generatedAt: new Date().toISOString(),
    apiBaseUrl,
    webBaseUrl,
    dataRoot: "output/m6c-browser-data",
    roles: [],
    passed: false,
    notes: [
      "Local/UAT browser validation uses mock-login because M6-C does not claim real production SSO.",
      "Formal production remains gated by real SSO, production database, object storage, monitoring, external integrations and customer sign-off."
    ]
  };

  let browser;
  try {
    await waitFor("API health", () => fetchOk(`${apiBaseUrl}/health`));
    await waitFor("Web app", () => fetchOk(webBaseUrl));
    browser = await chromium.launch({ headless: true });
    for (const role of roles) {
      process.stdout.write(`[browser] validating ${role.label}\n`);
      evidence.roles.push(await withTimeout(`role ${role.label}`, captureRole(browser, role), 45000));
    }
    evidence.passed = evidence.roles.every((role) => role.passed);
  } finally {
    if (browser) await browser.close();
    await stopService(web);
    await stopService(api);
  }

  const evidenceFile = path.join(outputDir, "m6c-browser-role-smoke.json");
  await fs.writeFile(evidenceFile, JSON.stringify(evidence, null, 2), "utf8");
  process.stdout.write(JSON.stringify({ passed: evidence.passed, evidenceFile, roles: evidence.roles.map((role) => ({ label: role.label, passed: role.passed })) }, null, 2));
  if (!evidence.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
