#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const command = process.argv[2] ?? "";
const outputDir = path.join(root, "output", "ui-second-pass");
const docsDir = path.join(root, "docs", "sellable-readiness");
const reviewPackDir = path.join(docsDir, "visual-review-pack");
const runtimeDataDir = path.join(outputDir, "runtime-data", `${command}-${Date.now()}`);
const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const portOffsets = {
  "layout-check": 0,
  "login-role-smoke": 10,
  "visual-review-pack": 20
};
const portOffset = portOffsets[command] ?? 30;
const apiPort = Number(process.env.UI_SECOND_PASS_API_PORT ?? 3326 + portOffset);
const webPort = Number(process.env.UI_SECOND_PASS_WEB_PORT ?? 5286 + portOffset);
const apiBaseUrl = process.env.UI_SECOND_PASS_API_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
const webBaseUrl = process.env.UI_SECOND_PASS_WEB_BASE_URL ?? `http://127.0.0.1:${webPort}`;
const externalMode = process.env.UI_SECOND_PASS_EXTERNAL_SERVICES === "true";

const roleCases = [
  { userId: "u1", role: "集团采购管理人", expectedPath: "/" },
  { userId: "u2", role: "采购经办人", expectedPath: "/" },
  { userId: "u8", role: "酒店采购", expectedPath: "/procurement-requests" },
  { userId: "u11", role: "供应商管理员", expectedPath: "/" },
  { userId: "u12", role: "供应商报价员", expectedPath: "/bidding" },
  { userId: "u7", role: "专家", expectedPath: "/expert-scoring" },
  { userId: "u13", role: "财务审核", expectedPath: "/" },
  { userId: "u5", role: "审计", expectedPath: "/" },
  { userId: "u6", role: "管理员", expectedPath: "/permissions" }
];

const screenshots = [
  { key: "login-desktop", title: "登录页桌面", path: "/login", userId: "", viewport: { width: 1366, height: 768 } },
  { key: "login-mobile", title: "登录页移动端", path: "/login", userId: "", viewport: { width: 390, height: 844 } },
  { key: "buyer-dashboard", title: "采购经办工作台", path: "/", userId: "u2", viewport: { width: 1440, height: 900 } },
  { key: "group-dashboard", title: "集团采购工作台", path: "/", userId: "u1", viewport: { width: 1440, height: 900 } },
  { key: "supplier-portal", title: "供应商门户", path: "/supplier-portal", userId: "u11", viewport: { width: 1440, height: 900 } },
  { key: "project-detail", title: "采购项目详情", path: "/project-workbench", dynamicProject: "detail", userId: "u2", viewport: { width: 1440, height: 900 } },
  { key: "project-sourcing", title: "招采执行详情", path: "/project-workbench", dynamicProject: "sourcing", userId: "u2", viewport: { width: 1440, height: 900 } },
  { key: "bid-response", title: "报价响应", path: "/bidding", userId: "u12", viewport: { width: 1440, height: 900 } },
  { key: "expert-scoring", title: "专家评分", path: "/expert-scoring", userId: "u7", viewport: { width: 1440, height: 900 } },
  { key: "project-fulfillment", title: "履约结算详情", path: "/project-workbench", dynamicProject: "fulfillment", userId: "u2", viewport: { width: 1440, height: 900 } },
  { key: "settlement", title: "结算材料", path: "/settlement-materials", userId: "u13", viewport: { width: 1440, height: 900 } },
  { key: "audit", title: "审计日志", path: "/audit", userId: "u5", viewport: { width: 1440, height: 900 } },
  { key: "permission-denied", title: "无权限页", path: "/approval-rules", expectFinalPath: "/permission-denied", expectText: "当前角色不可访问", userId: "u2", viewport: { width: 1440, height: 900 } },
  { key: "error-state", title: "错误状态", path: "/not-found-visual-check", expectFinalPath: "/not-found-visual-check", expectText: "页面暂时无法加载", userId: "u2", viewport: { width: 1440, height: 900 } },
  { key: "empty-state", title: "空状态", path: "/file-center", userId: "u2", viewport: { width: 1440, height: 900 } }
];

function ensureDirs() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(reviewPackDir, { recursive: true });
  fs.mkdirSync(runtimeDataDir, { recursive: true });
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
  child.stdout.pipe(fs.createWriteStream(path.join(outputDir, `${command}-${name}.out.log`), { flags: "a" }));
  child.stderr.pipe(fs.createWriteStream(path.join(outputDir, `${command}-${name}.err.log`), { flags: "a" }));
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

function mdTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replaceAll("\n", "<br>").replaceAll("|", "\\|");
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
  ].join("\n");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function applyUser(page, userId) {
  await page.goto(`${webBaseUrl}/login`, { waitUntil: "commit", timeout: 15000 });
  await page.evaluate((nextUserId) => {
    window.sessionStorage.clear();
    if (!nextUserId) {
      window.localStorage.removeItem("mockUserId");
      return;
    }
    window.sessionStorage.setItem("demoAuthActive", "true");
    window.sessionStorage.setItem("demoUserId", nextUserId);
    window.localStorage.setItem("mockAuthEnabled", "true");
    window.localStorage.setItem("mockUserId", nextUserId);
  }, userId);
}

async function readFirstProjectPath(userId, mode) {
  const response = await fetch(`${apiBaseUrl}/api/projects`, {
    headers: { "x-mock-user-id": userId }
  });
  if (!response.ok) return "/project-workbench";
  const payload = await response.json().catch(() => null);
  const projectId = payload?.projects?.[0]?.id;
  if (!projectId) return "/project-workbench";
  const encoded = encodeURIComponent(projectId);
  if (mode === "sourcing") return `/project-workbench/${encoded}/sourcing`;
  if (mode === "fulfillment") return `/project-workbench/${encoded}/fulfillment`;
  return `/project-workbench/${encoded}`;
}

async function collectPageDiagnostics(page) {
  return page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const sidebar = document.querySelector(".enterprise-sidebar");
    const loginLayout = document.querySelector(".enterprise-login-layout");
    const loginBrand = document.querySelector(".enterprise-login-brand");
    const loginCard = document.querySelector(".enterprise-login-card");
    const tableWraps = [...document.querySelectorAll(".eds-table-wrap")];
    const bodyText = document.body?.innerText ?? "";
    const loginRect = loginLayout?.getBoundingClientRect();
    const loginBrandRect = loginBrand?.getBoundingClientRect();
    const loginCardRect = loginCard?.getBoundingClientRect();
    return {
      path: location.pathname,
      bodyText,
      bodyLength: bodyText.trim().length,
      bodyScrollsY: document.documentElement.scrollHeight > window.innerHeight + 1,
      bodyScrollsX: document.documentElement.scrollWidth > window.innerWidth + 1,
      documentScrollHeight: document.documentElement.scrollHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : 0,
      sidebarBg: sidebar ? getComputedStyle(sidebar).backgroundColor : "",
      loginWidthRatio: loginRect ? Number((loginRect.width / window.innerWidth).toFixed(2)) : 0,
      loginBrandRatio:
        loginRect && loginBrandRect ? Number((loginBrandRect.width / loginRect.width).toFixed(2)) : 0,
      loginCardRatio:
        loginRect && loginCardRect ? Number((loginCardRect.width / loginRect.width).toFixed(2)) : 0,
      primaryColor: rootStyle.getPropertyValue("--ep-color-primary").trim(),
      sidebarToken: rootStyle.getPropertyValue("--ep-color-sidebar").trim(),
      navIcons: document.querySelectorAll(".enterprise-nav-icon").length,
      navGroups: document.querySelectorAll(".enterprise-nav-group").length,
      shell: document.querySelectorAll(".enterprise-shell").length,
      loginLayout: loginLayout ? 1 : 0,
      workbenchLayout: document.querySelectorAll(".eds-workbench-layout").length,
      workbenchSide: document.querySelectorAll(".eds-workbench-side").length,
      surfaces: document.querySelectorAll(".eds-surface").length,
      workbenchSurfaces: document.querySelectorAll(".eds-workbench-layout .eds-surface").length,
      tables: document.querySelectorAll(".eds-table").length,
      tableHorizontalOverflow: tableWraps.filter((node) => node.scrollWidth > node.clientWidth + 1).length,
      stackedActionButtons: document.querySelectorAll(".eds-action-list .eds-button").length,
      gradientMentions: [...document.styleSheets]
        .map((sheet) => {
          try {
            return [...sheet.cssRules].map((rule) => rule.cssText).join("\n");
          } catch {
            return "";
          }
        })
        .join("\n")
        .match(/linear-gradient|radial-gradient/g)?.length ?? 0
    };
  });
}

async function runLayoutCheck(browser) {
  const page = await browser.newPage();
  const checks = [];
  async function addLoginViewport(width, height) {
    await page.setViewportSize({ width, height });
    await page.goto(`${webBaseUrl}/login`, { waitUntil: "networkidle", timeout: 30000 });
    const metrics = await collectPageDiagnostics(page);
    checks.push({
      key: `login-no-scroll-${width}x${height}`,
      passed: metrics.loginLayout === 1 && !metrics.bodyScrollsY,
      evidence: `scrollHeight=${metrics.documentScrollHeight}, viewport=${metrics.viewportHeight}, loginLayout=${metrics.loginLayout}`
    });
    checks.push({
      key: `login-balanced-portal-${width}x${height}`,
      passed: metrics.loginWidthRatio >= 0.68 && metrics.loginBrandRatio >= 0.32 && metrics.loginCardRatio >= 0.38,
      evidence: `loginWidthRatio=${metrics.loginWidthRatio}, brandRatio=${metrics.loginBrandRatio}, cardRatio=${metrics.loginCardRatio}`
    });
  }

  await addLoginViewport(1366, 768);
  await addLoginViewport(1440, 900);

  await page.setViewportSize({ width: 1440, height: 900 });
  await applyUser(page, "u2");
  await page.goto(`${webBaseUrl}/`, { waitUntil: "networkidle", timeout: 30000 });
  const dashboard = await collectPageDiagnostics(page);
  checks.push({
    key: "app-shell-sidebar-width",
    passed: dashboard.sidebarWidth > 0 && dashboard.sidebarWidth <= 260,
    evidence: `sidebarWidth=${dashboard.sidebarWidth}`
  });
  checks.push({
    key: "app-shell-light-sidebar",
    passed: dashboard.sidebarToken.toUpperCase() === "#FFFFFF" && !/rgb\(11,\s*34,\s*54\)|rgb\(18,\s*59,\s*93\)/i.test(dashboard.sidebarBg),
    evidence: `sidebarToken=${dashboard.sidebarToken}, computed=${dashboard.sidebarBg}`
  });
  checks.push({
    key: "no-single-character-nav-icons",
    passed: dashboard.navIcons === 0 && dashboard.bodyText.includes("待办事项"),
    evidence: `navIcons=${dashboard.navIcons}, bodyLength=${dashboard.bodyLength}`
  });
  checks.push({
    key: "dashboard-information-architecture",
    passed:
      dashboard.workbenchLayout === 1 &&
      dashboard.workbenchSide === 1 &&
      dashboard.bodyText.includes("待办事项") &&
      dashboard.bodyText.includes("风险提醒") &&
      dashboard.bodyText.includes("常用操作") &&
      dashboard.bodyText.includes("进行中项目"),
    evidence: `layout=${dashboard.workbenchLayout}, side=${dashboard.workbenchSide}`
  });
  checks.push({
    key: "dashboard-not-function-matrix",
    passed: !dashboard.bodyText.includes("权限边界") && !dashboard.bodyText.includes("今日重点") && !dashboard.bodyText.includes("可发起动作"),
    evidence: "legacy workbench section titles are absent"
  });
  checks.push({
    key: "controlled-decoration",
    passed: dashboard.gradientMentions <= 2,
    evidence: `gradientMentions=${dashboard.gradientMentions}`
  });
  checks.push({
    key: "dashboard-no-horizontal-overflow",
    passed: !dashboard.bodyScrollsX && dashboard.tableHorizontalOverflow === 0,
    evidence: `bodyScrollWidth=${dashboard.documentScrollWidth}, viewport=${dashboard.viewportWidth}, tableOverflow=${dashboard.tableHorizontalOverflow}`
  });
  checks.push({
    key: "dashboard-panel-count",
    passed: dashboard.workbenchSurfaces > 0 && dashboard.workbenchSurfaces <= 4,
    evidence: `workbenchSurfaces=${dashboard.workbenchSurfaces}`
  });
  checks.push({
    key: "dashboard-no-stacked-action-buttons",
    passed: dashboard.stackedActionButtons === 0,
    evidence: `stackedActionButtons=${dashboard.stackedActionButtons}`
  });
  await page.close();

  const payload = { generatedAt: new Date().toISOString(), status: checks.every((item) => item.passed) ? "PASS" : "FAIL", checks };
  fs.writeFileSync(path.join(outputDir, "layout-check.json"), JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(
    path.join(docsDir, "06_UI_LAYOUT_CHECK_REPORT.md"),
    `# UI Layout Check Report

- Generated at: ${payload.generatedAt}
- Result: ${payload.status}

${mdTable(["Check", "Status", "Evidence"], checks.map((item) => [item.key, item.passed ? "PASS" : "FAIL", item.evidence]))}

## Boundary

This check validates second-pass visual layout rules: one-screen login on desktop, light commercial shell, no single-character nav icons, and dashboard information architecture. It does not change production readiness decisions.
`,
    "utf8"
  );
  return payload;
}

async function runLoginRoleSmoke(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const checks = [];

  await page.goto(`${webBaseUrl}/login`, { waitUntil: "networkidle", timeout: 30000 });
  const loginMetrics = await collectPageDiagnostics(page);
  const roleOptions = await page.locator(".eds-role-select-panel option").allTextContents();
  const roleOptionValues = await page.locator(".eds-role-select-panel option").evaluateAll((options) =>
    options.map((option) => option instanceof HTMLOptionElement ? option.value : "")
  );
  checks.push({
    key: "local-role-select-visible",
    passed: roleOptions.length >= roleCases.length && roleCases.every((item) => roleOptionValues.includes(item.userId)),
    evidence: roleOptions.join(" / ")
  });
  checks.push({
    key: "local-login-no-scroll-1366x768",
    passed: !loginMetrics.bodyScrollsY,
    evidence: `scrollHeight=${loginMetrics.documentScrollHeight}, viewport=${loginMetrics.viewportHeight}`
  });

  for (const role of roleCases) {
    await page.goto(`${webBaseUrl}/login`, { waitUntil: "networkidle", timeout: 30000 });
    await page.locator(".eds-role-select-panel select").selectOption(role.userId);
    await page.getByRole("button", { name: "进入该角色工作台" }).click();
    await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 10000 }).catch(() => undefined);
    await page.waitForSelector(".enterprise-shell", { timeout: 10000 }).catch(() => undefined);
    const finalPath = new URL(page.url()).pathname;
    const bodyText = await page.locator("body").innerText();
    const shellCount = await page.locator(".enterprise-shell").count();
    const blocked = bodyText.includes("请先登录") || bodyText.includes("无权访问") || bodyText.includes("页面暂时无法加载");
    checks.push({
      key: `role-entry-${role.userId}`,
      passed: finalPath === role.expectedPath && shellCount === 1 && !blocked,
      evidence: `${role.role}: finalPath=${finalPath}, expected=${role.expectedPath}, shell=${shellCount}`
    });
  }

  const productionContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const productionPage = await productionContext.newPage();
  await productionPage.route("**/api/auth/providers", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mode: "production",
        issuer: "https://idp.example.test",
        loginUrl: "https://idp.example.test/login",
        localPasswordLoginEnabled: false,
        mockAuthEnabled: false,
        ssoAdapter: { mode: "http", contract: {} }
      })
    });
  });
  await productionPage.goto(`${webBaseUrl}/login`, { waitUntil: "networkidle", timeout: 30000 });
  const productionRoleSelectors = await productionPage.locator(".eds-role-select-panel").count();
  const productionBodyText = await productionPage.locator("body").innerText();
  await productionPage.goto(`${webBaseUrl}/role-switch`, { waitUntil: "networkidle", timeout: 30000 });
  const roleSwitchFinalPath = new URL(productionPage.url()).pathname;
  const roleSwitchSelectors = await productionPage.locator(".eds-role-select-panel, .eds-form-section select").count();
  const roleSwitchBodyText = await productionPage.locator("body").innerText();
  await productionContext.close();
  checks.push({
    key: "production-hides-local-role-select",
    passed: productionRoleSelectors === 0 && productionBodyText.includes("生产环境") && !productionBodyText.includes("选择验证角色"),
    evidence: `mode=production; roleSelectors=${productionRoleSelectors}; bodyHasProduction=${productionBodyText.includes("生产环境")}`
  });
  checks.push({
    key: "production-blocks-role-switch-route",
    passed: roleSwitchFinalPath !== "/role-switch" && roleSwitchSelectors === 0 && !roleSwitchBodyText.includes("切换账号"),
    evidence: `finalPath=${roleSwitchFinalPath}; selectors=${roleSwitchSelectors}`
  });
  await page.close();

  const payload = { generatedAt: new Date().toISOString(), status: checks.every((item) => item.passed) ? "PASS" : "FAIL", checks };
  fs.writeFileSync(path.join(outputDir, "login-role-smoke.json"), JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(
    path.join(docsDir, "07_LOGIN_ROLE_SMOKE_REPORT.md"),
    `# Login Role Smoke Report

- Generated at: ${payload.generatedAt}
- Result: ${payload.status}

${mdTable(["Check", "Status", "Evidence"], checks.map((item) => [item.key, item.passed ? "PASS" : "FAIL", item.evidence]))}

## Boundary

This smoke covers Local/UAT role selection and verifies runtime production mode hides and blocks local role entry. It does not enable mock login in production.
`,
    "utf8"
  );
  return payload;
}

async function capture(page, entry) {
  await page.setViewportSize(entry.viewport);
  if (entry.userId) await applyUser(page, entry.userId);
  const targetPath = entry.dynamicProject ? await readFirstProjectPath(entry.userId, entry.dynamicProject) : entry.path;
  await page.goto(`${webBaseUrl}${targetPath}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForFunction(() => (document.body?.innerText.trim().length ?? 0) > 80, null, { timeout: 12000 }).catch(() => undefined);
  const fileName = `${entry.key}-${entry.viewport.width}x${entry.viewport.height}.png`;
  const filePath = path.join(reviewPackDir, fileName);
  const buffer = await page.screenshot({ path: filePath, fullPage: true });
  const metrics = await collectPageDiagnostics(page);
  return {
    key: entry.key,
    title: entry.title,
    path: targetPath,
    userId: entry.userId,
    viewport: `${entry.viewport.width}x${entry.viewport.height}`,
    screenshot: path.relative(root, filePath).replaceAll(path.sep, "/"),
    screenshotBytes: buffer.length,
    screenshotHash: sha256(buffer),
    finalPath: new URL(page.url()).pathname,
    bodyLength: metrics.bodyLength,
    shell: metrics.shell,
    loginLayout: metrics.loginLayout,
    surfaces: metrics.surfaces,
    tables: metrics.tables,
    passed:
      buffer.length > 10000 &&
      metrics.bodyLength > 80 &&
      (entry.path === "/login" ? metrics.loginLayout === 1 : metrics.shell === 1) &&
      (!entry.expectFinalPath || new URL(page.url()).pathname === entry.expectFinalPath) &&
      (!entry.expectText || metrics.bodyText.includes(entry.expectText))
  };
}

async function runVisualReviewPack(browser) {
  const page = await browser.newPage();
  const captures = [];
  for (const entry of screenshots) captures.push(await capture(page, entry));
  await page.close();

  const payload = { generatedAt: new Date().toISOString(), status: captures.every((item) => item.passed) ? "PASS" : "FAIL", captures };
  fs.writeFileSync(path.join(outputDir, "visual-review-pack.json"), JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(
    path.join(reviewPackDir, "README.md"),
    `# Visual Review Pack

- Generated at: ${payload.generatedAt}
- Result: ${payload.status}
- Web: ${webBaseUrl}
- API: ${apiBaseUrl}

${mdTable(
  ["Page", "Viewport", "Status", "Screenshot", "Body", "Shell/Login", "Tables"],
  captures.map((item) => [
    item.title,
    item.viewport,
    item.passed ? "PASS" : "FAIL",
    item.screenshot,
    item.bodyLength,
    item.path === "/login" ? `login=${item.loginLayout}` : `shell=${item.shell}`,
    item.tables
  ])
)}

## Manual Review Focus

- 登录页是否在 1366x768 一屏内完成。
- 默认商业主题是否是浅色政企 SaaS，而不是深色后台模板。
- 菜单是否没有单字方块图标。
- 工作台是否以待办、风险、操作和进行中项目组织。
- 表格、状态标签、空状态、错误状态和无权限路径是否统一。
`,
    "utf8"
  );
  return payload;
}

async function withServices(task) {
  ensureDirs();
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
    await waitForUrl(`${webBaseUrl}/login`);
    const browser = await chromium.launch({ headless: true });
    try {
      return await task(browser);
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

const commands = {
  "layout-check": runLayoutCheck,
  "login-role-smoke": runLoginRoleSmoke,
  "visual-review-pack": runVisualReviewPack
};

if (!commands[command]) {
  console.error(`Unknown UI second pass command: ${command || "(missing)"}`);
  console.error(`Available: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}

withServices(commands[command])
  .then((payload) => {
    console.log(JSON.stringify({ status: payload.status, reportDir: "docs/sellable-readiness", output: "output/ui-second-pass" }, null, 2));
    if (payload.status !== "PASS") process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
