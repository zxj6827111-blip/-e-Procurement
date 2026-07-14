#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const startedAt = new Date();
const outDir = path.join(root, "output", "ui-abnormal-path");
const docsDir = path.join(root, "docs", "sellable-readiness");
const screenshotsDir = path.join(outDir, "screenshots");
const runtimeDataDir = path.join(outDir, "runtime-data", String(Date.now()));
const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const apiPort = Number(process.env.UI_ABNORMAL_PATH_API_PORT ?? 3386);
const webPort = Number(process.env.UI_ABNORMAL_PATH_WEB_PORT ?? 5346);
const apiBaseUrl = process.env.UI_ABNORMAL_PATH_API_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
const webBaseUrl = process.env.UI_ABNORMAL_PATH_WEB_BASE_URL ?? `http://127.0.0.1:${webPort}`;
const externalMode = process.env.UI_ABNORMAL_PATH_EXTERNAL_SERVICES === "true";

const results = [];

function ensureDirs() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });
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
  child.stdout.pipe(fs.createWriteStream(path.join(outDir, `${name}.out.log`), { flags: "a" }));
  child.stderr.pipe(fs.createWriteStream(path.join(outDir, `${name}.err.log`), { flags: "a" }));
  return child;
}

function stopProcessTree(child) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
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
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.stdin?.destroy();
  child.unref();
}

async function waitForUrl(url, timeoutMs = 60000) {
  const started = Date.now();
  let lastError = "";
  while (Date.now() - started < timeoutMs) {
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

function jsonHeaders(userId, hasBody = true) {
  const headers = {};
  if (hasBody) headers["content-type"] = "application/json";
  if (userId) headers["x-mock-user-id"] = userId;
  return headers;
}

async function requestApi({ userId, method = "GET", route, body }) {
  const response = await fetch(`${apiBaseUrl}${route}`, {
    method,
    headers: jsonHeaders(userId, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  return { status: response.status, payload };
}

async function apiOk({ userId, method = "GET", route, body, expectedStatus = 200 }) {
  const result = await requestApi({ userId, method, route, body });
  if (result.status !== expectedStatus) {
    throw new Error(`${method} ${route} expected ${expectedStatus}, got ${result.status}: ${JSON.stringify(result.payload)}`);
  }
  return result.payload;
}

function addResult(result) {
  results.push({
    ...result,
    passed: Boolean(result.passed),
    checkedAt: new Date().toISOString()
  });
}

async function expectApiError({ id, title, userId, method = "GET", route, body, expectedCode }) {
  const actual = await requestApi({ userId, method, route, body });
  const actualCode = actual.payload?.error?.code ?? "";
  const passed = actual.status >= 400 && actualCode === expectedCode;
  addResult({
    id,
    title,
    layer: "API",
    expected: expectedCode,
    actual: `${actual.status} ${actualCode || JSON.stringify(actual.payload).slice(0, 120)}`,
    passed,
    detail: `${method} ${route}`
  });
  return actual;
}

function requestPayload(title, extra = {}) {
  return {
    title,
    orgId: "org-hotel",
    requestDepartment: "Housekeeping",
    requesterName: "Hotel Buyer U8",
    category: "amenity",
    budgetLabel: "demo budget",
    budgetAmount: 3600,
    purpose: "negative-path regression setup",
    expectedArrivalAt: "2026-07-15",
    receivingLocation: "hotel warehouse",
    lineItems: [{ itemName: "amenity kit", category: "amenity", specification: "standard", quantity: 100, unit: "set", budgetAmount: 3600 }],
    ...extra
  };
}

async function createRequest(title, extra = {}) {
  const payload = await apiOk({
    userId: "u8",
    method: "POST",
    route: "/api/procurement-requests",
    body: requestPayload(title, extra),
    expectedStatus: 201
  });
  return payload.procurementRequest.id;
}

async function createApprovedRequest(title, extra = {}) {
  const requestId = await createRequest(title, extra);
  await apiOk({ userId: "u8", method: "POST", route: `/api/procurement-requests/${requestId}/submit`, body: {} });
  await apiOk({ userId: "u1", method: "POST", route: `/api/procurement-requests/${requestId}/approve`, body: { approved: true, opinion: "abnormal regression approval" } });
  return requestId;
}

async function createProjectFromRequest(title, extra = {}, methodBody = { ruleId: "pmr-1" }) {
  const requestId = await createApprovedRequest(title, extra);
  await apiOk({ userId: "u2", method: "POST", route: `/api/procurement-requests/${requestId}/method-decision`, body: methodBody });
  const payload = await apiOk({ userId: "u2", method: "POST", route: "/api/projects", body: { requestId, name: `${title} project` }, expectedStatus: 201 });
  return { requestId, projectId: payload.project.id };
}

async function runApiAbnormalCases() {
  await expectApiError({
    id: "api-unauthenticated-business-list",
    title: "未登录访问业务列表必须被拦截",
    route: "/api/procurement-requests",
    expectedCode: "UNAUTHENTICATED"
  });

  await expectApiError({
    id: "api-buyer-create-request-denied",
    title: "采购经办不能代替酒店采购发起采购申请",
    userId: "u2",
    method: "POST",
    route: "/api/procurement-requests",
    body: { title: "buyer should not create request", orgId: "org-hotel" },
    expectedCode: "PROCUREMENT_REQUEST_INITIATOR_REQUIRED"
  });

  await expectApiError({
    id: "api-admin-business-mutation-denied",
    title: "系统管理员不能写入业务申请数据",
    userId: "u6",
    method: "POST",
    route: "/api/procurement-requests",
    body: { title: "admin should not create request", orgId: "org-hotel" },
    expectedCode: "PHASE1_BUSINESS_ACTION_DENIED"
  });

  await expectApiError({
    id: "api-forged-attachment-denied",
    title: "伪造采购申请附件引用必须拒绝",
    userId: "u8",
    method: "POST",
    route: "/api/procurement-requests",
    body: requestPayload("forged attachment request", {
      attachments: [{ id: "file-does-not-exist", fileName: "fake.pdf", contentType: "application/pdf", sizeBytes: 12 }]
    }),
    expectedCode: "PROCUREMENT_REQUEST_ATTACHMENT_INVALID"
  });

  const requestId = await createRequest("abnormal request status guards");
  await apiOk({ userId: "u8", method: "POST", route: `/api/procurement-requests/${requestId}/submit`, body: {} });

  await expectApiError({
    id: "api-wrong-approval-role-denied",
    title: "非集团审批角色不能审批采购申请",
    userId: "u2",
    method: "POST",
    route: `/api/procurement-requests/${requestId}/approve`,
    body: { approved: true, opinion: "wrong role" },
    expectedCode: "PROCUREMENT_REQUEST_APPROVER_REQUIRED"
  });

  await expectApiError({
    id: "api-project-before-approval-denied",
    title: "审批未通过前不能转采购项目",
    userId: "u2",
    method: "POST",
    route: "/api/projects",
    body: { requestId, name: "too early project" },
    expectedCode: "PROCUREMENT_REQUEST_SCOPE_DENIED"
  });

  await expectApiError({
    id: "api-delete-submitted-request-denied",
    title: "已提交申请不能硬删除",
    userId: "u8",
    method: "DELETE",
    route: `/api/procurement-requests/${requestId}`,
    expectedCode: "PROCUREMENT_REQUEST_DELETE_DENIED"
  });

  await apiOk({ userId: "u1", method: "POST", route: `/api/procurement-requests/${requestId}/approve`, body: { approved: true, opinion: "approved" } });

  await expectApiError({
    id: "api-project-before-method-denied",
    title: "未判定采购方式前不能创建采购项目",
    userId: "u2",
    method: "POST",
    route: "/api/projects",
    body: { requestId, name: "missing method project" },
    expectedCode: "PROCUREMENT_REQUEST_NOT_READY"
  });

  const createdProject = await createProjectFromRequest("abnormal cancel after project");
  await expectApiError({
    id: "api-cancel-after-project-denied",
    title: "申请已转项目后不能从申请页撤销",
    userId: "u8",
    method: "POST",
    route: `/api/procurement-requests/${createdProject.requestId}/cancel`,
    body: { reason: "late cancel" },
    expectedCode: "PROCUREMENT_REQUEST_CANCEL_DENIED"
  });

  await expectApiError({
    id: "api-supplier-project-transition-denied",
    title: "供应商不能直接推进采购项目状态",
    userId: "u3",
    method: "POST",
    route: "/api/projects/p-pre/transitions",
    body: { status: "bidding_locked" },
    expectedCode: "PHASE1_BUSINESS_ACTION_DENIED"
  });

  await expectApiError({
    id: "api-non-sequential-transition-denied",
    title: "项目状态不能跳级推进",
    userId: "u2",
    method: "POST",
    route: "/api/projects/p-pre/transitions",
    body: { status: "closed" },
    expectedCode: "PROJECT_STATUS_TRANSITION_DENIED"
  });

  const externalProject = await createProjectFromRequest(
    "external trade internal action guard",
    {
      category: "maintenance",
      budgetAmount: 240000,
      externalTradeFlag: true,
      lineItems: [{ itemName: "maintenance service", category: "maintenance", specification: "onsite", quantity: 1, unit: "service", budgetAmount: 240000 }]
    },
    { ruleId: "pmr-3", externalTradeFlag: true }
  );
  await expectApiError({
    id: "api-external-project-internal-action-denied",
    title: "外部交易项目不能执行内部招采动作",
    userId: "u2",
    method: "POST",
    route: `/api/projects/${externalProject.projectId}/internal-actions/internal_bid`,
    body: {},
    expectedCode: "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED"
  });

  await expectApiError({
    id: "api-supplier-scope-denied",
    title: "供应商不能读取其他供应商档案/参与数据",
    userId: "u3",
    route: "/api/suppliers/sup-2/project-participations",
    expectedCode: "SUPPLIER_SCOPE_DENIED"
  });

  await expectApiError({
    id: "api-file-upload-scope-denied",
    title: "无业务归属的文件上传必须拒绝",
    userId: "u13",
    method: "POST",
    route: "/api/files/upload",
    body: {
      originalName: "invalid-scope.txt",
      contentType: "text/plain",
      contentBase64: Buffer.from("invalid scope").toString("base64"),
      attachmentKind: "generic",
      objectType: "generic",
      objectId: "invalid-scope"
    },
    expectedCode: "FILE_UPLOAD_SCOPE_DENIED"
  });

  await expectApiError({
    id: "api-mall-invalid-quantity-denied",
    title: "商城购物车数量不能为 0",
    userId: "u8",
    method: "POST",
    route: "/api/mall/cart/items",
    body: { productId: "mp-amenity-kit", quantity: 0 },
    expectedCode: "MALL_CART_QUANTITY_INVALID"
  });

  await apiOk({ userId: "u8", method: "POST", route: "/api/mall/cart/items", body: { productId: "mp-amenity-kit", quantity: 2 } });
  const orderPayload = await apiOk({
    userId: "u8",
    method: "POST",
    route: "/api/mall/orders",
    body: { shippingAddress: "hotel warehouse", invoiceTitle: "hotel invoice" },
    expectedStatus: 201
  });
  await expectApiError({
    id: "api-mall-wrong-supplier-confirm-denied",
    title: "非订单所属供应商不能确认商城订单",
    userId: "u11",
    method: "POST",
    route: `/api/mall/orders/${orderPayload.order.id}/confirm`,
    body: {},
    expectedCode: "MALL_SUPPLIER_SCOPE_DENIED"
  });
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

function attachDiagnostics(page) {
  const diagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = request.url();
    const errorText = request.failure()?.errorText ?? "";
    if (!url.includes("/favicon") && !errorText.includes("net::ERR_ABORTED")) {
      diagnostics.failedRequests.push(`${request.method()} ${url} ${errorText}`.trim());
    }
  });
  return diagnostics;
}

async function gotoApp(page, route) {
  await page.goto(`${webBaseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => Boolean(document.body?.innerText?.trim().length), null, { timeout: 15000 }).catch(() => undefined);
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

async function addBrowserResult({ id, title, page, diagnostics, expected, passed, detail }) {
  const screenshotPath = path.join(screenshotsDir, `${id}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  const diagnosticIssues = [...diagnostics.consoleErrors, ...diagnostics.pageErrors, ...diagnostics.failedRequests];
  addResult({
    id,
    title,
    layer: "Browser",
    expected,
    actual: detail,
    passed: passed && diagnosticIssues.length === 0,
    detail: diagnosticIssues.length ? `${detail}; diagnostics=${diagnosticIssues.slice(0, 3).join(" | ")}` : detail,
    screenshot: path.relative(root, screenshotPath).replaceAll("\\", "/")
  });
}

async function runBrowserAbnormalCases(browser) {
  const permissionPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const permissionDiagnostics = attachDiagnostics(permissionPage);
  await applyUser(permissionPage, "u2");
  await gotoApp(permissionPage, "/approval-rules");
  await permissionPage.waitForURL("**/permission-denied", { timeout: 15000 }).catch(() => undefined);
  const permissionText = cleanText(await permissionPage.locator("body").innerText());
  const permissionStateCount = await permissionPage.locator(".eds-state-warning").count();
  await addBrowserResult({
    id: "browser-direct-permission-denied",
    title: "采购经办直达审批规则页必须进入无权限页",
    page: permissionPage,
    diagnostics: permissionDiagnostics,
    expected: "/permission-denied + 当前角色不可访问",
    passed: permissionPage.url().includes("/permission-denied") && permissionStateCount > 0,
    detail: `${new URL(permissionPage.url()).pathname}; body=${permissionText.slice(0, 80)}`
  });
  await permissionPage.close();

  const unknownRolePage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const unknownDiagnostics = attachDiagnostics(unknownRolePage);
  await unknownRolePage.route("**/api/auth/session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        user: { id: "u-unknown-role", name: "异常角色", roleId: "unknown_role", orgId: "org-hotel" },
        roleId: "unknown_role",
        orgScope: ["org-hotel"],
        mockAuthEnabled: true,
        mode: "local"
      })
    });
  });
  await applyUser(unknownRolePage, "u-unknown-role");
  await gotoApp(unknownRolePage, "/");
  await unknownRolePage.waitForURL("**/permission-denied", { timeout: 15000 }).catch(() => undefined);
  const unknownText = cleanText(await unknownRolePage.locator("body").innerText());
  const unknownPermissionStateCount = await unknownRolePage.locator(".eds-state-warning").count();
  await addBrowserResult({
    id: "browser-unknown-role-fail-closed",
    title: "未知角色必须失败关闭到无权限页",
    page: unknownRolePage,
    diagnostics: unknownDiagnostics,
    expected: "unknown_role -> /permission-denied",
    passed: unknownRolePage.url().includes("/permission-denied") && unknownPermissionStateCount > 0,
    detail: `${new URL(unknownRolePage.url()).pathname}; body=${unknownText.slice(0, 80)}`
  });
  await unknownRolePage.close();

  const createPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const createDiagnostics = attachDiagnostics(createPage);
  const procurementPosts = [];
  createPage.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/procurement-requests")) procurementPosts.push(request.url());
  });
  await applyUser(createPage, "u8");
  await gotoApp(createPage, "/procurement-requests/new");
  await createPage.waitForSelector('[data-ui-check~="procurement-request-create-form"]', { timeout: 15000 });
  await createPage.locator('[data-ui-check~="procurement-request-title-input"]').fill("");
  await createPage.locator('[data-ui-check~="procurement-request-submit-create"]').click();
  await createPage.waitForTimeout(300);
  const createText = cleanText(await createPage.locator("body").innerText());
  const requiredAlertCount = await createPage.locator(".bg-rose-50, .text-rose-700").count();
  await addBrowserResult({
    id: "browser-create-request-required-field",
    title: "新建采购申请空标题必须前端拦截且不调用创建接口",
    page: createPage,
    diagnostics: createDiagnostics,
    expected: "required field error + no POST /api/procurement-requests",
    passed: requiredAlertCount > 0 && procurementPosts.length === 0,
    detail: `posts=${procurementPosts.length}; body=${createText.slice(0, 100)}`
  });
  await createPage.close();

  const notFoundPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const notFoundDiagnostics = attachDiagnostics(notFoundPage);
  await applyUser(notFoundPage, "u2");
  await gotoApp(notFoundPage, "/not-found-visual-check");
  const notFoundText = cleanText(await notFoundPage.locator("body").innerText());
  const errorStateCount = await notFoundPage.locator(".eds-state-error").count();
  await addBrowserResult({
    id: "browser-unknown-route-state",
    title: "未知路由必须展示错误状态而不是空白页",
    page: notFoundPage,
    diagnostics: notFoundDiagnostics,
    expected: "错误状态页面",
    passed: errorStateCount > 0,
    detail: `${new URL(notFoundPage.url()).pathname}; body=${notFoundText.slice(0, 100)}`
  });
  await notFoundPage.close();
}

function mdTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replaceAll("\n", "<br>").replaceAll("|", "\\|");
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
  ].join("\n");
}

function writeEvidence(finishedAt) {
  const passed = results.filter((item) => item.passed).length;
  const failed = results.length - passed;
  const jsonPath = path.join(outDir, "abnormal-path-regression.json");
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        apiBaseUrl,
        webBaseUrl,
        externalMode,
        summary: { total: results.length, passed, failed },
        results
      },
      null,
      2
    )
  );

  const report = [
    "# 异常路径专项回归报告",
    "",
    `- 执行时间：${finishedAt.toISOString()}`,
    `- API：${apiBaseUrl}`,
    `- Web：${webBaseUrl}`,
    `- 结果：${failed === 0 ? "通过" : "不通过"}（${passed}/${results.length}）`,
    "",
    "## 覆盖范围",
    "",
    "- 未登录访问、错误角色、系统管理员业务隔离",
    "- 采购申请创建、提交、审批、方式判定、转项目、撤销/删除的反向校验",
    "- 项目状态机跳级、外部交易分支误用内部动作",
    "- 供应商数据隔离、文件上传范围、商城订单供应商归属",
    "- 浏览器侧直达无权限页、未知角色失败关闭、新建采购申请必填校验、未知路由错误态",
    "",
    "## 明细",
    "",
    mdTable(
      ["层级", "用例", "预期", "实际", "结果"],
      results.map((item) => [item.layer, item.title, item.expected, item.actual, item.passed ? "通过" : "失败"])
    ),
    "",
    "## 证据文件",
    "",
    `- JSON：\`${path.relative(root, jsonPath).replaceAll("\\", "/")}\``,
    `- 截图目录：\`${path.relative(root, screenshotsDir).replaceAll("\\", "/")}\``,
    `- 日志目录：\`${path.relative(root, outDir).replaceAll("\\", "/")}\``,
    ""
  ].join("\n");
  const reportPath = path.join(docsDir, "10_ABNORMAL_PATH_REGRESSION_REPORT.md");
  fs.writeFileSync(reportPath, report);
  return { jsonPath, reportPath, passed, failed };
}

async function main() {
  ensureDirs();
  let apiProcess;
  let webProcess;
  let browser;
  try {
    if (!externalMode) {
      apiProcess = spawnService("api", ["--workspace", "@eprocurement/api", "run", "dev"], {
        APP_ENV: "local",
        APP_DATA_DIR: runtimeDataDir,
        APP_SEED_ON_BOOT: "true",
        DISABLE_MOCK_AUTH: "false",
        HOST: "127.0.0.1",
        PORT: String(apiPort)
      });
      webProcess = spawnService("web", ["--workspace", "@eprocurement/web", "run", "dev", "--", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], {
        VITE_API_BASE_URL: apiBaseUrl
      });
    }

    await waitForUrl(`${apiBaseUrl}/health`);
    await waitForUrl(webBaseUrl);

    await runApiAbnormalCases();

    browser = await chromium.launch({ headless: true });
    await runBrowserAbnormalCases(browser);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    if (!externalMode) {
      stopProcessTree(webProcess);
      stopProcessTree(apiProcess);
    }
  }

  const evidence = writeEvidence(new Date());
  if (evidence.failed > 0) {
    console.error(`Abnormal path regression failed: ${evidence.passed}/${results.length} passed. Report: ${evidence.reportPath}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Abnormal path regression passed: ${evidence.passed}/${results.length}. Report: ${evidence.reportPath}`);
}

main().catch((error) => {
  addResult({
    id: "runner-unhandled-error",
    title: "异常路径专项回归执行器",
    layer: "Runner",
    expected: "runner completes",
    actual: error instanceof Error ? error.message : String(error),
    passed: false,
    detail: error instanceof Error ? error.stack ?? error.message : String(error)
  });
  const evidence = writeEvidence(new Date());
  console.error(`Abnormal path regression crashed. Report: ${evidence.reportPath}`);
  console.error(error);
  process.exitCode = 1;
});
