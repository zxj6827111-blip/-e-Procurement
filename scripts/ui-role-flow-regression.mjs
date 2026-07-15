import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = process.cwd();
const outDir = join(root, "output", "ui-role-flow");
const runtimeDataDir = join(outDir, "runtime-data", String(Date.now()));
const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const apiPort = Number(process.env.UI_ROLE_FLOW_API_PORT ?? 3346);
const webPort = Number(process.env.UI_ROLE_FLOW_WEB_PORT ?? 5306);
const apiBaseUrl = process.env.UI_ROLE_FLOW_API_BASE_URL ?? `http://127.0.0.1:${apiPort}`;
const webBaseUrl = process.env.UI_ROLE_FLOW_WEB_BASE_URL ?? `http://127.0.0.1:${webPort}`;
const externalMode = process.env.UI_ROLE_FLOW_EXTERNAL_SERVICES === "true";

const actors = {
  groupManager: { label: "集团审批", userId: "u1" },
  buyer: { label: "采购经办", userId: "u2" },
  expert: { label: "专家评审", userId: "u7", expertId: "exp-4" },
  hotelBuyer: { label: "酒店采购", userId: "u8" },
  platformOperator: { label: "平台运营", userId: "u10" },
  auditor: { label: "监督审计", userId: "u5" }
};

const supplierQuotationUsers = new Map([
  ["sup-1", "u12"],
  ["sup-2", "u15"],
  ["sup-3", "u17"]
]);

const supplierAdminUsers = new Map([
  ["sup-1", "u11"],
  ["sup-2", "u14"],
  ["sup-3", "u16"]
]);

const roleIdByUserId = {
  u1: "group_manager",
  u2: "buyer",
  u5: "auditor",
  u7: "expert",
  u8: "hotel_buyer",
  u10: "platform_operator",
  u12: "supplier_quotation",
  u15: "supplier_quotation",
  u17: "supplier_quotation"
};

mkdirSync(outDir, { recursive: true });

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
  child.stdout.pipe(createWriteStream(path.join(outDir, `${name}.out.log`), { flags: "a" }));
  child.stderr.pipe(createWriteStream(path.join(outDir, `${name}.err.log`), { flags: "a" }));
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

async function loadRoleModel() {
  const moduleUrl = pathToFileURL(path.join(root, "apps/web/src/permissions/role-model.ts")).href;
  return import(moduleUrl);
}

function sameItems(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

const geminiExpectedNavByRole = {
  buyer: ["工作台", "我的待办", "消息中心", "采购申请", "采购项目", "采购文件", "公告与邀请", "商品目录", "评审定标", "定标审批", "订单履约", "档案审计"],
  platform_operator: ["工作台", "我的待办", "消息中心", "采购申请", "采购项目", "商品目录", "评审定标", "评分模板", "定标审批", "订单履约", "档案审计"],
  group_manager: ["工作台", "我的待办", "消息中心", "审批规则", "需求审批", "采购项目", "采购文件", "公告与邀请", "报价进度", "专家库管理", "评审定标", "评分模板", "定标审批", "供应商管理", "商品目录", "档案审计"],
  auditor: ["工作台", "我的待办", "消息中心", "审批规则", "档案审计", "采购监督", "定标监督", "供应商监督", "操作日志", "集成配置"]
};

function jsonHeaders(userId) {
  return {
    "content-type": "application/json",
    "x-mock-user-id": userId
  };
}

async function requestAs(actor, method, path, body, expectedStatus = 200) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: jsonHeaders(actor.userId),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status !== expectedStatus) {
    throw new Error(`${actor.label} ${method} ${path} expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function postAs(actor, path, body, expectedStatus = 200) {
  return requestAs(actor, "POST", path, body, expectedStatus);
}

function getAs(actor, path, expectedStatus = 200) {
  return requestAs(actor, "GET", path, undefined, expectedStatus);
}

function activeCategoryAuthorization(supplier) {
  const now = Date.now();
  return (supplier.categoryAuthorizations ?? [])
    .filter((item) => {
      const notExpired = !item.expiresAt || new Date(item.expiresAt).getTime() >= now;
      return item.status === "active" && notExpired;
    })
    .sort((a, b) => String(a.category).localeCompare(String(b.category), "zh-Hans"))[0];
}

async function selectSupplierQuotationActor() {
  const { suppliers } = await getAs(actors.groupManager, "/api/suppliers");
  const candidates = suppliers
    .map((supplier) => ({
      supplier,
      authorization: activeCategoryAuthorization(supplier),
      userId: supplierQuotationUsers.get(supplier.id),
      adminUserId: supplierAdminUsers.get(supplier.id)
    }))
    .filter(({ supplier, authorization, userId, adminUserId }) => {
      const admissionStatus = supplier.admissionStatus ?? (supplier.status === "限制名单" ? "restricted" : "admitted");
      const riskText = String(supplier.risk ?? "");
      return (
        admissionStatus === "admitted" &&
        supplier.status !== "限制名单" &&
        !supplier.restrictionReason &&
        !riskText.includes("限制") &&
        !riskText.includes("黑名单") &&
        authorization &&
        userId &&
        adminUserId
      );
    });
  if (candidates.length === 0) {
    throw new Error("未找到具备有效品类授权和报价账号的供应商，无法执行端到端报价流。");
  }
  const { supplier, authorization, userId, adminUserId } = candidates[0];
  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    category: authorization.category,
    actor: { label: `供应商报价(${supplier.id})`, userId },
    adminActor: { label: `供应商管理员(${supplier.id})`, userId: adminUserId }
  };
}

async function runApiFlow() {
  const trace = [];
  const suffix = Date.now();
  const selectedSupplier = await selectSupplierQuotationActor();
  const requestTitle = `酒店${selectedSupplier.category}补采-${suffix}`;
  const projectName = `酒店${selectedSupplier.category}补采项目-${suffix}`;

  const createdRequest = await postAs(
    actors.hotelBuyer,
    "/api/procurement-requests",
    {
      title: requestTitle,
      orgId: "org-hotel",
      requestDepartment: "客房部",
      requesterName: "酒店采购",
      category: selectedSupplier.category,
      budgetAmount: 120000,
      purpose: `补充酒店${selectedSupplier.category}运营库存`,
      expectedArrivalAt: "2026-07-10",
      receivingLocation: "上海滨江华礼酒店仓库",
      lineItems: [
        {
          itemName: `${selectedSupplier.category}补采项`,
          category: selectedSupplier.category,
          specification: "标准规格",
          quantity: 100,
          unit: "套",
          estimatedUnitPrice: 1200,
          budgetAmount: 120000,
          requiredByDate: "2026-07-10"
        }
      ]
    },
    201
  );
  const requestId = createdRequest.procurementRequest.id;
  trace.push("酒店采购:发起采购申请");

  await postAs(actors.hotelBuyer, `/api/procurement-requests/${requestId}/submit`);
  trace.push("酒店采购:提交审批");

  await postAs(actors.groupManager, `/api/procurement-requests/${requestId}/approve`, { approved: true, opinion: "需求真实，预算合理，同意承接采购。" });
  trace.push("集团审批:需求审批通过");

  await postAs(actors.buyer, `/api/procurement-requests/${requestId}/method-decision`, { ruleId: "pmr-1" });
  trace.push("采购经办:判定采购方式");

  const createdProject = await postAs(actors.buyer, "/api/projects", { requestId, name: projectName }, 201);
  const projectId = createdProject.project.id;
  trace.push("采购经办:生成采购项目");

  const createdDocument = await postAs(
    actors.buyer,
    `/api/projects/${projectId}/procurement-documents`,
    {
      title: `${projectName}采购文件`,
      contentSummary: "供应商资质、报价响应、交付周期和验收要求。"
    },
    201
  );
  const documentId = createdDocument.procurementDocument.id;
  trace.push("采购经办:编制采购文件");

  await postAs(actors.buyer, `/api/procurement-documents/${documentId}/publish`);
  trace.push("采购经办:发布锁定采购文件");

  const createdAnnouncement = await postAs(
    actors.buyer,
    `/api/projects/${projectId}/announcements`,
    {
      documentId,
      title: `${projectName}公告`,
      procurementMethod: "internal_open",
      scope: "invited_suppliers",
      registrationDeadlineAt: "2099-12-20T17:00:00.000Z",
      quoteDeadlineAt: "2099-12-31T17:00:00.000Z"
    },
    201
  );
  const announcementId = createdAnnouncement.announcement.id;
  trace.push("采购经办:创建公告");

  await postAs(actors.buyer, `/api/announcements/${announcementId}/publish`, { supplierIds: [selectedSupplier.supplierId] });
  trace.push(`采购经办:发布公告并邀请供应商(${selectedSupplier.supplierId})`);

  const registered = await postAs(selectedSupplier.actor, `/api/announcements/${announcementId}/registrations`, { materialMetadata: [] }, 201);
  const registrationId = registered.registration.id;
  trace.push("供应商报价:报名应标");

  await postAs(actors.buyer, `/api/registrations/${registrationId}/qualify`, { status: "qualified" });
  trace.push("采购经办:报名资格审核通过");

  const draftBid = await postAs(
    selectedSupplier.actor,
    `/api/projects/${projectId}/bids`,
    {
      amount: 118000,
      deliveryDays: 5,
      responseSummary: "可按公告要求供货并完成验收配合。",
      lineItems: [{ itemName: `${selectedSupplier.category}补采项`, quantity: 100, unit: "套", unitPrice: 1180, totalPrice: 118000 }]
    },
    201
  );
  const bidId = draftBid.bid.id;
  trace.push("供应商报价:提交报价草稿");

  await postAs(selectedSupplier.actor, `/api/bids/${bidId}/submit`);
  trace.push("供应商报价:正式提交报价");

  await postAs(actors.buyer, `/api/projects/${projectId}/bids/cutoff`, { action: "manual_cutoff" });
  await postAs(actors.buyer, `/api/projects/${projectId}/bids/lock`);
  trace.push("采购经办:截标并锁定报价");

  const assignment = await postAs(
    actors.buyer,
    `/api/projects/${projectId}/expert-assignments/appoint`,
    { expertId: actors.expert.expertId, reason: `${selectedSupplier.category}品类评审` },
    201
  );
  const assignmentId = assignment.assignment.id;
  trace.push("采购经办:抽取专家");

  for (const type of ["avoidance", "discipline", "confidentiality"]) {
    await postAs(actors.expert, `/api/expert-assignments/${assignmentId}/confirm`, { type });
  }
  trace.push("专家评审:确认回避纪律保密");

  const mySheets = await getAs(actors.expert, "/api/expert-review/my-scoring-sheets");
  const sheet = mySheets.scoringSheets.find((item) => item.projectId === projectId && item.supplierId === selectedSupplier.supplierId);
  if (!sheet) throw new Error(`专家评分单未生成: ${projectId}`);

  await postAs(actors.expert, `/api/scoring-sheets/${sheet.id}/submit-lock`, {
    technical: 45,
    service: 30,
    price: 20,
    opinion: "供应商资质、价格和交付能力满足当前采购要求。"
  });
  trace.push("专家评审:评分并锁定");

  await postAs(actors.buyer, `/api/projects/${projectId}/comparison-report`, undefined, 201);
  await postAs(actors.buyer, `/api/projects/${projectId}/review-report`, { note: "评审结果满足定标条件。" }, 201);
  await postAs(actors.buyer, `/api/projects/${projectId}/review-report/freeze`);
  trace.push("采购经办:生成并冻结评审报告");

  const award = await postAs(actors.buyer, `/api/projects/${projectId}/award-approvals`, { selectedSupplierId: selectedSupplier.supplierId }, 201);
  const awardId = award.approval.id;
  trace.push("采购经办:创建定标审批");

  const submittedAward = await postAs(actors.buyer, `/api/award-approvals/${awardId}/submit`);
  const workflowInstanceId = submittedAward.workflow.approvalInstance.id;
  trace.push("采购经办:提交定标审批");

  await postAs(actors.groupManager, `/api/workflow/approval-instances/${workflowInstanceId}/actions`, {
    action: "approve",
    opinion: "定标依据充分，同意。"
  });
  trace.push("集团审批:定标审批通过");

  const signing = await postAs(actors.buyer, `/api/projects/${projectId}/contracts/signing`, undefined, 201);
  const contractId = signing.contract.id;
  trace.push("采购经办:发起合同签订");

  // 业务规则：生成采购订单前必须已有供应商确认合同；确认前采购方须先上传正式合同文件。
  const contractFile = await postAs(
    actors.buyer,
    "/api/files/upload",
    {
      originalName: `contract-${suffix}.pdf`,
      contentType: "application/pdf",
      contentBase64: Buffer.from(`%PDF-1.4 e2e contract ${projectId}`).toString("base64"),
      attachmentKind: "contract_document",
      objectType: "contract_ledger",
      objectId: contractId,
      projectId,
      supplierId: selectedSupplier.supplierId
    },
    201
  );
  await postAs(actors.buyer, `/api/contracts/${contractId}/attachments`, {
    attachmentMetadata: [contractFile.file]
  });
  trace.push("采购经办:上传合同文件");

  await postAs(selectedSupplier.adminActor, `/api/contracts/${contractId}/confirm`);
  trace.push("供应商管理员:确认合同");

  await postAs(actors.buyer, `/api/projects/${projectId}/result-notifications`, { scope: "supplier_self", visibilityConfig: "supplier_self_only" }, 201);
  trace.push("采购经办:发送中标结果通知");

  const generatedOrder = await postAs(
    actors.buyer,
    `/api/project-workbench/projects/${projectId}/purchase-orders/generate`,
    {
      contractId,
      orderNo: `PO-FLOW-${suffix}`,
      expectedDeliveryAt: "2026-07-22",
      receivingLocation: "Shanghai hotel warehouse"
    },
    201
  );
  const orderId = generatedOrder.purchaseOrder.id;
  trace.push("采购经办:生成采购订单");

  const performanceNode = await postAs(
    actors.buyer,
    `/api/contracts/${contractId}/performance-nodes`,
    { nodeName: "delivery acceptance", planDate: "2026-07-22" },
    201
  );
  await postAs(actors.buyer, `/api/performance-nodes/${performanceNode.performanceNode.id}/status`, {
    status: "completed",
    acceptanceRecord: "accepted",
    paymentRecord: "pending settlement"
  });
  await postAs(
    actors.buyer,
    `/api/contracts/${contractId}/acceptance-payments`,
    {
      recordType: "acceptance",
      amount: 118000,
      summary: "contract acceptance record"
    },
    201
  );
  trace.push("采购经办:登记履约节点与验收");

  await postAs(actors.buyer, `/api/projects/${projectId}/award-products/auto-list`, undefined, 201);
  trace.push("采购经办:中标商品自动上架");

  await postAs(selectedSupplier.adminActor, `/api/project-workbench/purchase-orders/${orderId}/confirm`);
  trace.push("供应商管理员:确认采购订单");

  const orderLineItems = Array.isArray(generatedOrder.purchaseOrder.lineItems) ? generatedOrder.purchaseOrder.lineItems : [];
  await postAs(
    actors.buyer,
    `/api/project-workbench/purchase-orders/${orderId}/receipts`,
    {
      receiptType: "full",
      summary: "full receipt accepted",
      receivedItems: orderLineItems.map((item) => ({
        itemName: item.itemName,
        receivedQuantity: item.quantity,
        unit: item.unit,
        accepted: true
      }))
    },
    201
  );
  trace.push("采购经办:登记全量收货");

  const uploadedSettlementFile = await postAs(
    selectedSupplier.adminActor,
    "/api/files/upload",
    {
      originalName: `settlement-${suffix}.txt`,
      contentType: "text/plain",
      contentBase64: Buffer.from(`settlement-${projectId}`, "utf8").toString("base64"),
      attachmentKind: "settlement_material",
      objectType: "settlement_material",
      objectId: `${orderId}-settlement`,
      projectId,
      supplierId: selectedSupplier.supplierId
    },
    201
  );
  const settlement = await postAs(
    selectedSupplier.adminActor,
    `/api/project-workbench/purchase-orders/${orderId}/settlement-materials`,
    { materialType: "invoice", storedFileId: uploadedSettlementFile.file.id },
    201
  );
  const settlementMaterialId = settlement.settlementMaterial.id;
  trace.push("供应商管理员:提交结算材料");

  await postAs(actors.buyer, `/api/project-workbench/settlement-materials/${settlementMaterialId}/verify`, {
    approved: true,
    verificationOpinion: "settlement material verified"
  });
  trace.push("采购经办:核验结算材料");

  await postAs(
    actors.buyer,
    `/api/project-workbench/purchase-orders/${orderId}/evaluations`,
    {
      dimensions: {
        quality: 94,
        delivery: 93,
        service: 92,
        cooperation: 95,
        priceReasonableness: 91
      },
      description: "supplier performance meets expectations"
    },
    201
  );
  trace.push("采购经办:提交履约评价");

  await postAs(actors.buyer, `/api/projects/${projectId}/archive-check`);
  await postAs(actors.buyer, `/api/projects/${projectId}/archive-seal`);
  trace.push("采购经办:档案检查并封档");

  const pendingApprovalRequestTitle = `集团待审可见性验证-${suffix}`;
  const pendingApprovalRequest = await postAs(
    actors.hotelBuyer,
    "/api/procurement-requests",
    {
      title: pendingApprovalRequestTitle,
      orgId: "org-hotel",
      requestDepartment: "客房部",
      requesterName: "酒店采购",
      category: selectedSupplier.category,
      budgetAmount: 60000,
      purpose: "验证酒店提交后集团需求审批列表可见",
      expectedArrivalAt: "2026-07-21",
      receivingLocation: "上海滨江华礼酒店仓库",
      lineItems: [
        {
          itemName: `${selectedSupplier.category}审批可见性验证`,
          category: selectedSupplier.category,
          specification: "标准规格",
          quantity: 10,
          unit: "套",
          estimatedUnitPrice: 6000,
          budgetAmount: 60000,
          requiredByDate: "2026-07-21"
        }
      ]
    },
    201
  );
  const pendingApprovalRequestId = pendingApprovalRequest.procurementRequest.id;
  await postAs(actors.hotelBuyer, `/api/procurement-requests/${pendingApprovalRequestId}/submit`);
  trace.push("酒店采购:提交待审申请供集团列表可见性校验");

  return {
    requestId,
    requestTitle,
    pendingApprovalRequestId,
    pendingApprovalRequestTitle,
    projectId,
    projectName,
    awardId,
    contractId,
    orderId,
    settlementMaterialId,
    supplierId: selectedSupplier.supplierId,
    supplierName: selectedSupplier.supplierName,
    supplierQuotationUserId: selectedSupplier.actor.userId,
    supplierAdminUserId: selectedSupplier.adminActor.userId,
    category: selectedSupplier.category,
    trace
  };
}

async function applyUser(page, userId) {
  await page.goto(`${webBaseUrl}/login`, { waitUntil: "commit", timeout: 15000 });
  await page.evaluate((nextUserId) => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem("demoAuthActive", "true");
    window.sessionStorage.setItem("demoUserId", nextUserId);
    window.localStorage.setItem("mockAuthEnabled", "true");
    window.localStorage.setItem("mockUserId", nextUserId);
  }, userId);
}

async function bodyText(page) {
  await page.waitForFunction(() => (document.body?.innerText.trim().length ?? 0) > 80, undefined, { timeout: 10000 }).catch(() => undefined);
  return page.locator("body").innerText();
}

async function openAccountMenu(page) {
  const menu = page.locator(".enterprise-account-menu");
  if ((await menu.count()) === 0) return;
  await menu.evaluate((node) => node.setAttribute("open", ""));
}

async function checkRoleMenu(browser, roleModel) {
  const checks = [];
  const roles = [
    {
      userId: "u2",
      roleId: "buyer",
      label: "采购经办",
      path: "/procurement-requests",
      directForbiddenPath: "/approval-rules"
    },
    {
      userId: "u10",
      roleId: "platform_operator",
      label: "平台运营",
      path: "/procurement-requests",
      directForbiddenPath: "/approval-rules"
    },
    {
      userId: "u1",
      roleId: "group_manager",
      label: "集团采购管理",
      path: "/approval-rules",
      directForbiddenPath: ""
    },
    {
      userId: "u5",
      roleId: "auditor",
      label: "纪检审计",
      path: "/audit",
      directForbiddenPath: "/permissions"
    }
  ];

  for (const role of roles) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    await applyUser(page, role.userId);
    await page.goto(`${webBaseUrl}${role.path}`, { waitUntil: "commit", timeout: 15000 });
    await page.waitForSelector('[data-ui-check~="shell"], .enterprise-shell', { timeout: 10000 });
    await openAccountMenu(page);
    const geminiShellVisible = (await page.locator('[data-ui-check~="shell"]').count()) > 0;
    const navLabels = (await page.locator('[data-ui-check~="nav-item"], .enterprise-nav-label').allInnerTexts())
      .map((item) => item.trim())
      .filter(Boolean);
    const expectedNav = roleModel.visibleNavItems(role.roleId).map((item) => item.label);
    const bellVisible = (await page.locator('[data-ui-check~="bell-button"], .enterprise-bell-button[aria-label="消息中心"]').count()) > 0;
    const expectedBell = roleModel.roleHasMessageBell(role.roleId);
    const accountSecurityVisible = (await page.locator('.enterprise-account-popover a[href="/account-security"]').count()) > 0;
    const expectedAccountSecurity = geminiShellVisible ? false : roleModel.visibleUtilityItems(role.roleId).some((item) => item.to === "/account-security");
    const direct = role.directForbiddenPath ? await checkForbiddenRoute(page, role.directForbiddenPath) : null;
    const result = {
      label: role.label,
      userId: role.userId,
      roleId: role.roleId,
      navLabels,
      expectedNav,
      bellVisible,
      expectedBell,
      accountSecurityVisible,
      expectedAccountSecurity,
      directForbiddenPath: role.directForbiddenPath ?? "",
      directForbiddenRedirected: direct?.redirected ?? true,
      directForbiddenFinalPath: direct?.finalPath ?? "",
      directForbiddenTextMatched: direct?.textMatched ?? true,
      passed:
        sameItems(navLabels, expectedNav) &&
        bellVisible === expectedBell &&
        accountSecurityVisible === expectedAccountSecurity &&
        (direct?.redirected ?? true) &&
        (direct ? direct.finalPath === "/permission-denied" && direct.textMatched : true)
    };
    await page.screenshot({ path: join(outDir, `menu-${role.userId}.png`), fullPage: true });
    await context.close();
    checks.push(result);
  }
  return checks;
}

async function checkForbiddenRoute(page, path) {
  await page.goto(`${webBaseUrl}${path}`, { waitUntil: "commit", timeout: 15000 });
  await page.waitForFunction(
    (forbiddenPath) => window.location.pathname !== forbiddenPath,
    path,
    { timeout: 3000 }
  ).catch(() => undefined);
  const finalPath = new URL(page.url()).pathname;
  const bodyText = await page.locator("body").innerText().catch(() => "");
  return { path, finalPath, redirected: finalPath !== path, textMatched: bodyText.includes("当前角色不可访问") };
}

async function checkFlowPages(browser, flow) {
  const pages = [
    { userId: "u8", label: "酒店采购申请列表", path: "/procurement-requests", requiredText: "采购申请" },
    { userId: "u1", label: "集团待审申请列表", path: "/procurement-requests", requiredText: flow.pendingApprovalRequestTitle },
    { userId: "u1", label: "集团需求审批详情", path: `/procurement-requests/${encodeURIComponent(flow.requestId)}`, requiredText: "需求" },
    { userId: "u2", label: "采购项目执行详情", path: `/project-workbench/${encodeURIComponent(flow.projectId)}`, requiredText: flow.projectName },
    { userId: "u2", label: "招采执行详情", path: `/project-workbench/${encodeURIComponent(flow.projectId)}/sourcing`, requiredText: "招采" },
    { userId: "u2", label: "采购项目履约详情", path: `/project-workbench/${encodeURIComponent(flow.projectId)}/fulfillment`, requiredText: "履约" },
    { userId: "u2", label: "消息中心", path: "/messages", requiredText: "消息中心" },
    { userId: "u2", label: "账号安全", path: "/account-security", requiredText: "账号安全" },
    { userId: flow.supplierQuotationUserId, label: "供应商报名页", path: "/supplier-registration", requiredText: "报名" },
    { userId: flow.supplierQuotationUserId, label: "供应商报价页", path: "/bidding", requiredText: "报价" },
    { userId: flow.supplierAdminUserId, label: "供应商订单履约", path: "/order-fulfillment", requiredText: "履约" },
    { userId: flow.supplierAdminUserId, label: "供应商结算材料", path: "/settlement-materials", requiredText: "结算" },
    { userId: "u13", label: "财务结算审核", path: "/settlement-materials", requiredText: "结算" },
    {
      userId: "u7",
      label: "专家评分页",
      path: "/expert-scoring",
      requiredText: "评审",
      actionSelector: '[data-ui-check~="expert-confirm-participation"]',
      postActionSelector: '[data-ui-check~="expert-scoring-view"]',
      postActionRequiredText: "评分"
    },
    { userId: "u2", label: "采购经办定标详情", path: `/award-result/${encodeURIComponent(flow.projectId)}`, requiredText: "定标" },
    { userId: flow.supplierQuotationUserId, label: "供应商中标结果", path: `/award-result/${encodeURIComponent(flow.projectId)}`, requiredText: "结果" },
    { userId: "u2", label: "采购经办档案审计", path: "/archive-audit", requiredText: "档案" }
  ];
  const checks = [];
  for (const item of pages) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    const consoleErrors = [];
    const httpErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) httpErrors.push(`${response.status()} ${response.url()}`);
    });
    await applyUser(page, item.userId);
    await page.goto(`${webBaseUrl}${item.path}`, { waitUntil: "commit", timeout: 15000 });
    await page.waitForSelector('[data-ui-check~="shell"], .enterprise-shell, .eds-state-error, body', { timeout: 10000 }).catch(() => undefined);
    await page
      .waitForFunction((requiredText) => document.body?.innerText?.includes(String(requiredText)), item.requiredText, { timeout: 10000 })
      .catch(() => undefined);
    let text = await bodyText(page);
    if (item.actionSelector) {
      const action = page.locator(item.actionSelector).first();
      if ((await action.count()) > 0) {
        await action.click({ timeout: 10000 });
      }
      if (item.postActionSelector) {
        await page.waitForSelector(item.postActionSelector, { timeout: 10000 }).catch(() => undefined);
      }
      if (item.postActionRequiredText) {
        await page
          .waitForFunction((requiredText) => document.body?.innerText?.includes(String(requiredText)), item.postActionRequiredText, { timeout: 10000 })
          .catch(() => undefined);
      }
      text = await bodyText(page);
    }
    const finalPath = new URL(page.url()).pathname;
    const geminiShellVisible = (await page.locator('[data-ui-check~="shell"]').count()) > 0;
    const legacyShellVisible = (await page.locator(".enterprise-shell").count()) > 0;
    const renderMode = geminiShellVisible ? "gemini" : legacyShellVisible ? "legacy-vue" : "unknown";
    const blocked = text.includes("请先登录") || text.includes("无权") || text.includes("加载失败");
    const pathLoaded = finalPath === item.path;
    const contentLoaded = text.includes(item.requiredText) && (!item.postActionRequiredText || text.includes(item.postActionRequiredText));
    const passed = pathLoaded && contentLoaded && !blocked && consoleErrors.length === 0 && httpErrors.length === 0;
    await page.screenshot({ path: join(outDir, `flow-${item.userId}-${item.label.replace(/[^\u4e00-\u9fa5A-Za-z0-9]+/g, "-")}.png`), fullPage: true });
    await context.close();
    checks.push({ ...item, finalPath, renderMode, passed, pathLoaded, contentLoaded, blocked, consoleErrors, httpErrors });
  }
  return checks;
}

async function main() {
  const evidence = {
    generatedAt: new Date().toISOString(),
    apiBaseUrl,
    webBaseUrl,
    menuChecks: [],
    flow: null,
    flowPageChecks: [],
    passed: false
  };
  const roleModel = await loadRoleModel();
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
        PORT: String(apiPort),
        HOST: "127.0.0.1"
      });
      webProcess = spawnService("web", ["--workspace", "@eprocurement/web", "run", "dev", "--", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], {
        VITE_API_BASE_URL: apiBaseUrl
      });
    }
    await waitForUrl(`${apiBaseUrl}/health`);
    await waitForUrl(`${webBaseUrl}/login`);
    browser = await chromium.launch({ headless: true });
    evidence.menuChecks = await checkRoleMenu(browser, roleModel);
    evidence.flow = await runApiFlow();
    evidence.flowPageChecks = await checkFlowPages(browser, evidence.flow);
    evidence.passed = evidence.menuChecks.every((item) => item.passed) && evidence.flowPageChecks.every((item) => item.passed);
  } finally {
    if (browser) await browser.close();
    if (!externalMode) {
      stopProcessTree(webProcess);
      stopProcessTree(apiProcess);
    }
  }
  writeFileSync(join(outDir, "ui-role-flow-regression.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ passed: evidence.passed, flowTrace: evidence.flow?.trace, menuChecks: evidence.menuChecks, flowPageChecks: evidence.flowPageChecks }, null, 2));
  if (!evidence.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
