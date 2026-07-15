import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";
import type { PricingReport } from "../src/types.js";
import { toR8ApprovalRuleView, toR8WorkflowNotificationView, toR8WorkflowTaskView } from "../src/workflow-ui-contract.js";

type SqlParam = string | number | bigint | null | Uint8Array;

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-r8-"));
}

function boot(dataRoot = makeDataRoot()) {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot,
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx), dataRoot };
}

function single<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).get(...params) as T | undefined;
}

function all<T>(runtime: ReturnType<typeof boot>, sql: string, ...params: SqlParam[]) {
  return runtime.ctx.runtimeDb.db.prepare(sql).all(...params) as T[];
}

async function createReadyRequest(runtime: ReturnType<typeof boot>) {
  const created = await request(runtime.app)
    .post("/api/procurement-requests")
    .set("x-mock-user-id", "u8")
    .send({
      title: "R8 workflow request",
      orgId: "org-hotel",
      requestDepartment: "R8 test department",
      requesterName: "R8 requester",
      budgetLabel: "1000",
      budgetAmount: 1000,
      methodSuggestion: "内部公开采购",
      lineItems: [
        {
          itemName: "R8 item",
          specification: "standard",
          quantity: 1,
          unit: "piece",
          budgetAmount: 1000
        }
      ]
    });
  expect(created.status).toBe(201);
  return created.body.procurementRequest as { id: string };
}

async function submitWorkflowRequest(runtime: ReturnType<typeof boot>) {
  const procurementRequest = await createReadyRequest(runtime);
  const submitted = await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/submit`).set("x-mock-user-id", "u8");
  expect(submitted.status).toBe(200);
  return submitted.body as {
    procurementRequest: { id: string; approvalStatus: string };
    workflow: { approvalInstance: { id: string }; task: { id: string } };
  };
}

function tinyPngBase64() {
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}

async function uploadProductImage(runtime: ReturnType<typeof boot>, userId = "u3", supplierId = "sup-1") {
  const response = await request(runtime.app)
    .post("/api/files/upload")
    .set("x-mock-user-id", userId)
    .send({
      originalName: "r8-product.png",
      contentType: "image/png",
      contentBase64: tinyPngBase64(),
      attachmentKind: "mall_product_image",
      objectType: "supplier",
      objectId: supplierId,
      supplierId
    });
  expect(response.status).toBe(201);
  return response.body.file.id as string;
}

async function createProduct(runtime: ReturnType<typeof boot>, override: Record<string, unknown> = {}, userId = "u3") {
  const supplierId = String(override.supplierId ?? "sup-1");
  const imageFileId = await uploadProductImage(runtime, userId, supplierId);
  const response = await request(runtime.app)
    .post("/api/mall/products")
    .set("x-mock-user-id", userId)
    .send({
      name: "R8 settlement product",
      category: "linen",
      brand: "R8",
      unit: "box",
      skuCode: `SKU-R8-${Math.floor(Math.random() * 100000)}`,
      specification: "standard",
      supplierId,
      serviceRegions: ["east"],
      procurementCategory: "linen",
      imageFileIds: [imageFileId],
      taxRate: 0.13,
      ...override
    });
  expect(response.status).toBe(201);
  return response.body.product;
}

function addPricingReport(runtime: ReturnType<typeof boot>, productId: string, salePrice = 100) {
  const report: PricingReport = {
    id: `pr-r8-${productId}`,
    projectId: "p-award",
    awardApprovalId: "aa-award-1",
    sourceReportId: "cr-award-1",
    selectedSupplierId: "sup-1",
    reportNo: `PR-R8-${productId}`,
    status: "approved",
    items: [
      {
        id: `pr-r8-${productId}-item-1`,
        productId,
        itemName: "R8 settlement product",
        specification: "standard",
        quantity: 1,
        unit: "box",
        purchasePrice: salePrice * 0.8,
        salePrice,
        serviceFeeRate: 0.1,
        grossMarginRate: 0.1,
        effectiveFrom: "2026-01-01",
        effectiveTo: "2027-01-01"
      }
    ],
    basisJson: { source: "r8-test" },
    createdBy: "u2",
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
    approvedAt: "2026-06-25T00:00:00.000Z"
  };
  runtime.ctx.state.pricingReports.push(report);
  runtime.ctx.r5ReviewAwardRepository.upsertPricingReport(report);
  return report;
}

async function createReceivedOrder(runtime: ReturnType<typeof boot>, quantity = 2, salePrice = 100) {
  const product = await createProduct(runtime);
  addPricingReport(runtime, product.id, salePrice);
  const listed = await request(runtime.app)
    .post(`/api/mall/products/${product.id}/status`)
    .set("x-mock-user-id", "u2")
    .send({ status: "listed", sourceType: "award_project", sourceProjectId: "p-award" });
  expect(listed.status).toBe(200);
  const cart = await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u2").send({ productId: product.id, quantity });
  expect(cart.status).toBe(200);
  const order = await request(runtime.app)
    .post("/api/mall/orders")
    .set("x-mock-user-id", "u2")
    .send({ shippingAddress: "R8 receiving address", invoiceTitle: "R8 hotel", departmentId: "housekeeping" });
  expect(order.status).toBe(201);
  const confirm = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/confirm`).set("x-mock-user-id", "u3");
  expect(confirm.status).toBe(200);
  const shipment = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/shipments`).set("x-mock-user-id", "u3").send({ carrier: "R8", trackingNo: `R8-${Date.now()}` });
  expect(shipment.status).toBe(201);
  const receipt = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/receive`).set("x-mock-user-id", "u2").send({ receivedItems: [{ productId: product.id, receivedQuantity: quantity }] });
  expect(receipt.status).toBe(200);
  return { product, order: receipt.body.order };
}

describe("R8 workflow, task center and notification formal source", () => {
  it("maintains approval rules in the R8 formal source and blocks disabled or missing rules", async () => {
    const runtime = boot();

    const created = await request(runtime.app)
      .post("/api/workflow/approval-rules")
      .set("x-mock-user-id", "u6")
      .send({
        ruleCode: "approval-r8-test-return",
        ruleName: "R8 return test",
        businessType: "procurement_request",
        methodTypes: ["r8-test"],
        nodeRoleIds: ["group_manager"],
        actions: ["submit", "approve", "reject"],
        orgScope: ["org-east"],
        defaultStrategy: "manual_review_required"
      });
    expect(created.status).toBe(201);
    expect(created.body.approvalRule.versionNo).toBe(1);
    expect(single(runtime, "select rule_status from r2_approval_rules where id = ?", created.body.approvalRule.id)).toEqual({ rule_status: "enabled" });

    const disabled = await request(runtime.app).patch(`/api/workflow/approval-rules/${created.body.approvalRule.id}`).set("x-mock-user-id", "u6").send({ status: "disabled" });
    expect(disabled.status).toBe(200);
    expect(disabled.body.approvalRule.versionNo).toBe(2);

    const start = await request(runtime.app)
      .post("/api/workflow/approval-instances")
      .set("x-mock-user-id", "u6")
      .send({
        businessType: "procurement_request",
        businessId: "req-pre",
        title: "Disabled rule return",
        methodType: "r8-test",
        amount: 10
      });
    expect(start.status).toBe(400);
    expect(start.body.error.code).toBe("APPROVAL_RULE_NOT_MATCHED");

    const legacyCreated = await request(runtime.app)
      .post("/api/approval-rules")
      .set("x-mock-user-id", "u6")
      .send({
        ruleCode: "approval-r8-legacy-invoice",
        ruleName: "R8 legacy invoice",
        businessType: "invoice",
        nodeRoleIds: ["group_manager"],
        actions: ["submit", "approve"]
      });
    expect(legacyCreated.status).toBe(201);
    expect(single(runtime, "select business_type from r2_approval_rules where id = ?", legacyCreated.body.approvalRule.id)).toEqual({ business_type: "invoice" });

    const auditorRule = await request(runtime.app)
      .post("/api/workflow/approval-rules")
      .set("x-mock-user-id", "u6")
      .send({
        ruleCode: "approval-r8-auditor-filtered",
        ruleName: "R8 auditor filtered",
        businessType: "invoice",
        nodeRoleIds: ["auditor", "group_manager"],
        approvalOrder: ["auditor"],
        actions: ["submit", "approve"]
      });
    expect(auditorRule.status).toBe(201);
    expect(auditorRule.body.approvalRule.nodeRoleIds).toEqual(["group_manager"]);
    expect(auditorRule.body.approvalRule.approvalOrder).toEqual([]);
  });

  it("matches high-value hotel procurement requests to an enabled approval rule", async () => {
    const runtime = boot();
    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        title: "R8 high value hotel request",
        orgId: "org-hotel",
        requestDepartment: "客房部",
        requesterName: "刘明",
        budgetLabel: "按酒店制度执行",
        budgetAmount: 5555555,
        lineItems: [
          {
            itemName: "环保牙具套装",
            category: "客房一次性用品",
            specification: "竹柄",
            quantity: 500,
            unit: "套",
            estimatedUnitPrice: 7.2,
            budgetAmount: 3600
          }
        ]
      });
    expect(created.status).toBe(201);

    const submitted = await request(runtime.app).post(`/api/procurement-requests/${created.body.procurementRequest.id}/submit`).set("x-mock-user-id", "u8");

    expect(submitted.status).toBe(200);
    expect(submitted.body.procurementRequest.approvalStatus).toBe("submitted");
    expect(submitted.body.workflow.approvalInstance.ruleCode).toBe("approval-procurement-request-high-value");
    expect(single(runtime, "select task_status from r2_task_items where approval_instance_id = ?", submitted.body.workflow.approvalInstance.id)).toEqual({ task_status: "pending" });
  });

  it("creates approval instances, pending tasks and notifications from procurement submission with role boundaries", async () => {
    const runtime = boot();
    const submitted = await submitWorkflowRequest(runtime);
    const instanceId = submitted.workflow.approvalInstance.id;

    expect(single(runtime, "select approval_status, current_role_id from r2_approval_instances where id = ?", instanceId)).toEqual({
      approval_status: "submitted",
      current_role_id: "group_manager"
    });
    expect(single(runtime, "select task_status from r2_task_items where approval_instance_id = ?", instanceId)).toEqual({ task_status: "pending" });
    expect(all(runtime, "select id from r2_notifications where business_type = 'procurement_request' and business_id = ?", submitted.procurementRequest.id).length).toBeGreaterThanOrEqual(2);

    const supplierTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u3");
    expect(supplierTasks.status).toBe(200);
    expect(supplierTasks.body.tasks.some((task: { id: string }) => task.id === submitted.workflow.task.id)).toBe(false);

    const buyerTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u2");
    expect(buyerTasks.status).toBe(200);
    expect(buyerTasks.body.tasks.some((task: { id: string }) => task.id === submitted.workflow.task.id)).toBe(false);

    const adminTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u6");
    expect(adminTasks.status).toBe(200);
    expect(adminTasks.body.tasks).toHaveLength(0);

    const supplierApprove = await request(runtime.app)
      .post(`/api/workflow/approval-instances/${instanceId}/actions`)
      .set("x-mock-user-id", "u3")
      .send({ action: "approve", opinion: "wrong role" });
    expect(supplierApprove.status).toBe(403);

    const approved = await request(runtime.app)
      .post(`/api/workflow/approval-instances/${instanceId}/actions`)
      .set("x-mock-user-id", "u1")
      .send({ action: "approve", opinion: "approved by workflow" });
    expect(approved.status).toBe(200);
    expect(approved.body.approvalInstance.approvalStatus).toBe("approved");
    expect(single(runtime, "select approval_status from r2_procurement_requests where id = ?", submitted.procurementRequest.id)).toEqual({ approval_status: "approved" });
    expect(single(runtime, "select task_status from r2_task_items where approval_instance_id = ?", instanceId)).toEqual({ task_status: "completed" });

    const repeat = await request(runtime.app).post(`/api/workflow/approval-instances/${instanceId}/actions`).set("x-mock-user-id", "u1").send({ action: "approve" });
    expect(repeat.status).toBe(400);
    expect(repeat.body.error.code).toBe("APPROVAL_INSTANCE_COMPLETED");
  });

  it("blocks forged workflow starts and keeps legacy approvals converged on formal wf instances", async () => {
    const runtime = boot();
    const procurementRequest = await createReadyRequest(runtime);

    const supplierForge = await request(runtime.app)
      .post("/api/workflow/approval-instances")
      .set("x-mock-user-id", "u3")
      .send({
        businessType: "procurement_request",
        businessId: procurementRequest.id,
        title: "forged workflow",
        orgId: "org-east"
      });
    expect(supplierForge.status).toBe(403);

    const adminMismatch = await request(runtime.app)
      .post("/api/workflow/approval-instances")
      .set("x-mock-user-id", "u6")
      .send({
        businessType: "procurement_request",
        businessId: procurementRequest.id,
        title: "bad scope",
        orgId: "org-east"
      });
    expect(adminMismatch.status).toBe(400);
    expect(adminMismatch.body.error.code).toBe("WORKFLOW_BUSINESS_SCOPE_MISMATCH");

    const adminMissing = await request(runtime.app)
      .post("/api/workflow/approval-instances")
      .set("x-mock-user-id", "u6")
      .send({
        businessType: "procurement_request",
        businessId: "req-not-exists"
      });
    expect(adminMissing.status).toBe(404);

    const submitted = await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/submit`).set("x-mock-user-id", "u8");
    expect(submitted.status).toBe(200);
    const instanceId = submitted.body.workflow.approvalInstance.id;
    const legacyApproved = await request(runtime.app).post(`/api/procurement-requests/${procurementRequest.id}/approve`).set("x-mock-user-id", "u1").send({ approved: true });
    expect(legacyApproved.status).toBe(200);
    expect(single(runtime, "select approval_status from r2_approval_instances where id = ?", instanceId)).toEqual({ approval_status: "approved" });
    expect(single(runtime, "select task_status from r2_task_items where approval_instance_id = ?", instanceId)).toEqual({ task_status: "completed" });

    const actionRows = all<{ approval_instance_id: string }>(runtime, "select approval_instance_id from r2_approval_actions where business_type = 'procurement_request' and business_id = ?", procurementRequest.id);
    expect(actionRows.some((row) => row.approval_instance_id === instanceId)).toBe(true);
  });

  it("supports rejection status sync and notification read state", async () => {
    const runtime = boot();
    const submitted = await submitWorkflowRequest(runtime);

    const rejected = await request(runtime.app)
      .post(`/api/workflow/approval-instances/${submitted.workflow.approvalInstance.id}/actions`)
      .set("x-mock-user-id", "u1")
      .send({ action: "reject", opinion: "missing budget proof" });
    expect(rejected.status).toBe(200);
    expect(single(runtime, "select approval_status from r2_procurement_requests where id = ?", submitted.procurementRequest.id)).toEqual({ approval_status: "rejected" });

    const notifications = await request(runtime.app).get("/api/workflow/notifications").set("x-mock-user-id", "u8");
    expect(notifications.status).toBe(200);
    const target = notifications.body.notifications.find((item: { businessId: string; read: boolean }) => item.businessId === submitted.procurementRequest.id && item.read === false);
    expect(target).toBeTruthy();
    const read = await request(runtime.app).post(`/api/workflow/notifications/${target.id}/read`).set("x-mock-user-id", "u8");
    expect(read.status).toBe(200);
    expect(read.body.notification.read).toBe(true);
  });

  it("creates settlement, invoice, payment, supplier return and expert scoring tasks with restart persistence", async () => {
    const dataRoot = makeDataRoot();
    const runtime = boot(dataRoot);

    const { order } = await createReceivedOrder(runtime, 2, 100);
    const bill = await request(runtime.app).post("/api/settlement-finance/settlement-bills").set("x-mock-user-id", "u2").send({ purchaseOrderId: order.id, period: "2026-09" });
    expect(bill.status).toBe(201);
    const settlement = await request(runtime.app).post(`/api/settlement-finance/settlement-bills/${bill.body.settlementBill.id}/submit`).set("x-mock-user-id", "u3");
    expect(settlement.status).toBe(200);

    const settlementReview = await request(runtime.app).post(`/api/settlement-finance/settlement-bills/${bill.body.settlementBill.id}/review`).set("x-mock-user-id", "u1").send({ approved: true });
    expect(settlementReview.status).toBe(200);
    expect(single(runtime, "select task_status from r2_task_items where approval_instance_id = ?", settlement.body.workflow.approvalInstance.id)).toEqual({ task_status: "completed" });

    const invoice = await request(runtime.app)
      .post(`/api/settlement-finance/settlement-bills/${bill.body.settlementBill.id}/invoices`)
      .set("x-mock-user-id", "u3")
      .send({ invoiceNo: "R8-INV-1", amount: bill.body.settlementBill.settlementAmount, taxRate: 0.13 });
    expect(invoice.status).toBe(201);
    const invoiceReview = await request(runtime.app).post(`/api/settlement-finance/invoices/${invoice.body.invoice.id}/review`).set("x-mock-user-id", "u1").send({ approved: true });
    expect(invoiceReview.status).toBe(200);
    expect(single(runtime, "select task_status from r2_task_items where approval_instance_id = ?", invoice.body.workflow.approvalInstance.id)).toEqual({ task_status: "completed" });

    const directPaid = await request(runtime.app).post(`/api/settlement-finance/settlement-bills/${bill.body.settlementBill.id}/fund-ledger`).set("x-mock-user-id", "u2").send({ status: "paid" });
    expect(directPaid.status).toBe(400);

    const payment = await request(runtime.app).post(`/api/settlement-finance/settlement-bills/${bill.body.settlementBill.id}/fund-ledger`).set("x-mock-user-id", "u2").send({ status: "payment_requested" });
    expect(payment.status).toBe(201);
    const paymentTaskView = toR8WorkflowTaskView(payment.body.workflow.task, {
      userId: "u1",
      roleId: "group_manager",
      orgScope: ["org-group", "org-east", "org-hotel"]
    });
    expect(paymentTaskView.title).toBe("待处理付款");
    expect(paymentTaskView.targetPath).toContain("/payment-status");

    const supplierReturnTask = runtime.ctx.r8WorkflowTaskRepository.upsertTask({
      id: "task:return_request:r8-direct",
      taskCode: "TASK-RETURN-R8-DIRECT",
      taskType: "supplier_return_review",
      businessType: "return_request",
      businessId: "r8-direct",
      supplierId: "sup-1",
      assigneeRoleId: "supplier",
      title: "R8 return direct"
    });
    const supplierTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u3");
    expect(supplierTasks.body.tasks.map((task: { id: string }) => task.id)).toContain(supplierReturnTask.id);
    const supplierComplete = await request(runtime.app).post(`/api/workflow/tasks/${supplierReturnTask.id}/complete`).set("x-mock-user-id", "u3");
    expect(supplierComplete.status).toBe(200);

    const expertTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u7");
    expect(expertTasks.status).toBe(200);
    expect(expertTasks.body.tasks.some((task: { businessType: string; businessId: string }) => task.businessType === "expert_scoring" && task.businessId === "score-open")).toBe(true);

    const auditorApprove = await request(runtime.app).post(`/api/workflow/approval-instances/${payment.body.workflow.approvalInstance.id}/actions`).set("x-mock-user-id", "u5").send({ action: "approve" });
    expect(auditorApprove.status).toBe(403);

    const disallowedReturn = await request(runtime.app).post(`/api/workflow/approval-instances/${payment.body.workflow.approvalInstance.id}/actions`).set("x-mock-user-id", "u1").send({ action: "return" });
    expect(disallowedReturn.status).toBe(400);
    expect(disallowedReturn.body.error.code).toBe("WORKFLOW_ACTION_NOT_ALLOWED");

    const paymentApproval = await request(runtime.app).post(`/api/workflow/approval-instances/${payment.body.workflow.approvalInstance.id}/actions`).set("x-mock-user-id", "u1").send({ action: "approve", opinion: "付款申请审批通过" });
    expect(paymentApproval.status).toBe(200);
    expect(single(runtime, "select ledger_status from r2_fund_ledger_entries where id = ?", payment.body.fundLedgerEntry.id)).toEqual({ ledger_status: "pending_payment" });
    expect(single(runtime, "select bill_status from r2_settlement_bills where id = ?", bill.body.settlementBill.id)).toEqual({ bill_status: "payable" });

    const buyerConfirm = await request(runtime.app).post(`/api/settlement-finance/fund-ledger/${payment.body.fundLedgerEntry.id}/confirm-payment`).set("x-mock-user-id", "u2");
    expect(buyerConfirm.status).toBe(403);

    const financeConfirm = await request(runtime.app).post(`/api/settlement-finance/fund-ledger/${payment.body.fundLedgerEntry.id}/confirm-payment`).set("x-mock-user-id", "u13").send({ note: "财务付款流水已核对" });
    expect(financeConfirm.status).toBe(200);
    expect(financeConfirm.body.fundLedgerEntry.status).toBe("paid");
    expect(single(runtime, "select bill_status from r2_settlement_bills where id = ?", bill.body.settlementBill.id)).toEqual({ bill_status: "paid" });
    const repeatedConfirm = await request(runtime.app).post(`/api/settlement-finance/fund-ledger/${payment.body.fundLedgerEntry.id}/confirm-payment`).set("x-mock-user-id", "u13");
    expect(repeatedConfirm.status).toBe(200);

    expect(all<{ business_type: string }>(runtime, "select distinct business_type from r2_task_items where business_type in ('settlement_bill','invoice','payment_request')").map((row) => row.business_type).sort()).toEqual([
      "invoice",
      "payment_request",
      "settlement_bill"
    ]);

    const rebooted = boot(dataRoot);
    expect(single(rebooted, "select id from r2_approval_instances where id = ?", settlement.body.workflow.approvalInstance.id)).toBeTruthy();
    expect(single(rebooted, "select id from r2_task_items where id = ?", supplierReturnTask.id)).toBeTruthy();
    expect(single(rebooted, "select ledger_status from r2_fund_ledger_entries where id = ?", payment.body.fundLedgerEntry.id)).toEqual({ ledger_status: "paid" });
    expect(single(rebooted, "select bill_status from r2_settlement_bills where id = ?", bill.body.settlementBill.id)).toEqual({ bill_status: "paid" });
    expect(
      all(
        rebooted,
        `select id from r2_notifications where business_id in (?, ?, ?)`,
        bill.body.settlementBill.id,
        invoice.body.invoice.id,
        payment.body.fundLedgerEntry.id
      ).length
    ).toBeGreaterThanOrEqual(3);
  });

  it("maps workflow API payloads to frontend labels, actions and business links", async () => {
    const runtime = boot();
    const submitted = await submitWorkflowRequest(runtime);
    const groupTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u1");
    expect(groupTasks.status).toBe(200);
    const task = groupTasks.body.tasks.find((item: { id: string }) => item.id === submitted.workflow.task.id);
    expect(task).toBeTruthy();

    const taskView = toR8WorkflowTaskView(task, {
      userId: "u1",
      roleId: "group_manager",
      orgScope: ["org-group", "org-east", "org-hotel"]
    });
    expect(taskView.businessTypeLabel).toBe("采购申请");
    expect(taskView.taskTypeLabel).toBe("待审批采购申请");
    expect(taskView.title).toBe("待审批采购申请");
    expect(taskView.statusLabel).toBe("待处理");
    expect(taskView.targetPath).toContain(`/procurement-requests/${submitted.procurementRequest.id}`);
    expect(taskView.canComplete).toBe(true);

    const buyerMessages = await request(runtime.app).get("/api/workflow/notifications").set("x-mock-user-id", "u8");
    expect(buyerMessages.status).toBe(200);
    const message = buyerMessages.body.notifications.find((item: { businessId: string }) => item.businessId === submitted.procurementRequest.id);
    expect(message).toBeTruthy();
    const messageView = toR8WorkflowNotificationView(message);
    expect(messageView.businessTypeLabel).toBe("采购申请");
    expect(messageView.readLabel).toBe("未读");
    expect(messageView.targetLabel).toBe("打开采购申请");

    const rules = await request(runtime.app).get("/api/workflow/approval-rules").set("x-mock-user-id", "u6");
    expect(rules.status).toBe(200);
    const ruleView = toR8ApprovalRuleView(rules.body.approvalRules.find((item: { businessType: string }) => item.businessType === "procurement_request"));
    expect(ruleView.businessTypeLabel).toBe("采购申请");
    expect(ruleView.statusLabel).toBe("启用");
    expect(ruleView.nodeRoleLabels).toContain("集团采购管理人");
  });

  it("keeps workflow rule maintenance admin-only while allowing authorized read-only views", async () => {
    const runtime = boot();

    for (const [userId, expectedStatus] of [
      ["u1", 200],
      ["u2", 200],
      ["u5", 200],
      ["u6", 200],
      ["u3", 403],
      ["u4", 403]
    ] as const) {
      const response = await request(runtime.app).get("/api/workflow/approval-rules").set("x-mock-user-id", userId);
      expect(response.status).toBe(expectedStatus);
    }

    const ruleId = "apr-procurement-request-1";
    const auditorPatch = await request(runtime.app).patch(`/api/workflow/approval-rules/${ruleId}`).set("x-mock-user-id", "u5").send({ status: "disabled" });
    expect(auditorPatch.status).toBe(403);
    expect(auditorPatch.body.error.code).toBe("WORKFLOW_RULE_ADMIN_ONLY");

    const buyerPatch = await request(runtime.app).patch(`/api/workflow/approval-rules/${ruleId}`).set("x-mock-user-id", "u2").send({ status: "disabled" });
    expect(buyerPatch.status).toBe(403);
    expect(buyerPatch.body.error.code).toBe("WORKFLOW_RULE_ADMIN_ONLY");

    const adminPatch = await request(runtime.app).patch(`/api/workflow/approval-rules/${ruleId}`).set("x-mock-user-id", "u6").send({ status: "disabled" });
    expect(adminPatch.status).toBe(200);
    expect(adminPatch.body.approvalRule.status).toBe("disabled");
    expect(single(runtime, "select rule_status from r2_approval_rules where id = ?", ruleId)).toEqual({ rule_status: "disabled" });
  });

  it("restricts buyer workflow tasks and notifications to managed projects, not only org scope", async () => {
    const runtime = boot();
    runtime.ctx.state.users.push({
      id: "u-r8-outsider-buyer",
      name: "同组织非经办采购",
      roleId: "buyer",
      orgId: "org-east",
      orgScope: ["org-east", "org-hotel"],
      managedProjectIds: []
    });

    const task = runtime.ctx.r8WorkflowTaskRepository.upsertTask({
      id: "task:buyer-managed-project:r8",
      taskCode: "TASK-BUYER-R8",
      taskType: "approval_award",
      businessType: "award_approval",
      businessId: "aa-award-1",
      projectId: "p-award",
      orgId: "org-east",
      assigneeRoleId: "buyer",
      title: "R8 buyer managed project boundary"
    });
    const notification = runtime.ctx.r8WorkflowTaskRepository.createNotification({
      eventType: "award_approval.pending_approval",
      businessType: "award_approval",
      businessId: "aa-award-1",
      projectId: "p-award",
      orgId: "org-east",
      recipientRoleId: "buyer",
      title: "R8 buyer notification boundary",
      contentSummary: "Only the managed-project buyer can read this message."
    });

    const ownerTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u2");
    expect(ownerTasks.status).toBe(200);
    expect(ownerTasks.body.tasks.map((item: { id: string }) => item.id)).toContain(task.id);

    const outsiderTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u-r8-outsider-buyer");
    expect(outsiderTasks.status).toBe(200);
    expect(outsiderTasks.body.tasks.map((item: { id: string }) => item.id)).not.toContain(task.id);

    const outsiderComplete = await request(runtime.app).post(`/api/workflow/tasks/${task.id}/complete`).set("x-mock-user-id", "u-r8-outsider-buyer");
    expect(outsiderComplete.status).toBe(403);
    expect(outsiderComplete.body.error.code).toBe("WORKFLOW_TASK_PROCESS_DENIED");

    const ownerMessages = await request(runtime.app).get("/api/workflow/notifications").set("x-mock-user-id", "u2");
    expect(ownerMessages.status).toBe(200);
    expect(ownerMessages.body.notifications.map((item: { id: string }) => item.id)).toContain(notification.id);

    const outsiderMessages = await request(runtime.app).get("/api/workflow/notifications").set("x-mock-user-id", "u-r8-outsider-buyer");
    expect(outsiderMessages.status).toBe(200);
    expect(outsiderMessages.body.notifications.map((item: { id: string }) => item.id)).not.toContain(notification.id);

    const outsiderRead = await request(runtime.app).post(`/api/workflow/notifications/${notification.id}/read`).set("x-mock-user-id", "u-r8-outsider-buyer");
    expect(outsiderRead.status).toBe(403);
    expect(outsiderRead.body.error.code).toBe("WORKFLOW_NOTIFICATION_DENIED");
  });

  it("keeps supplier, expert, finance-facing, auditor and admin task boundaries visible to the R8 UI", async () => {
    const runtime = boot();
    runtime.ctx.state.users.push({
      id: "u-r8-other-supplier",
      name: "其他供应商",
      roleId: "supplier",
      supplierId: "sup-2",
      orgId: "org-hotel"
    });

    const supplierTask = runtime.ctx.r8WorkflowTaskRepository.upsertTask({
      id: "task:return_request:scope-r8",
      taskCode: "TASK-RETURN-SCOPE-R8",
      taskType: "supplier_return_review",
      businessType: "return_request",
      businessId: "return-scope-r8",
      supplierId: "sup-1",
      assigneeRoleId: "supplier",
      title: "Supplier scoped return task"
    });
    const financeTask = runtime.ctx.r8WorkflowTaskRepository.upsertTask({
      id: "task:payment_request:scope-r8",
      taskCode: "TASK-PAYMENT-SCOPE-R8",
      taskType: "approval_payment_request",
      businessType: "payment_request",
      businessId: "fund-scope-r8",
      projectId: "p-award",
      orgId: "org-east",
      supplierId: "sup-1",
      assigneeRoleId: "group_manager",
      title: "Finance payment review task"
    });

    const supplierTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u3");
    expect(supplierTasks.body.tasks.map((item: { id: string }) => item.id)).toContain(supplierTask.id);

    const otherSupplierTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u-r8-other-supplier");
    expect(otherSupplierTasks.body.tasks.map((item: { id: string }) => item.id)).not.toContain(supplierTask.id);

    const otherSupplierComplete = await request(runtime.app).post(`/api/workflow/tasks/${supplierTask.id}/complete`).set("x-mock-user-id", "u-r8-other-supplier");
    expect(otherSupplierComplete.status).toBe(403);

    const expert4Tasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u7");
    expect(expert4Tasks.body.tasks.some((task: { businessType: string; businessId: string }) => task.businessType === "expert_scoring" && task.businessId === "score-open")).toBe(true);
    const expert1Tasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u4");
    expect(expert1Tasks.body.tasks.some((task: { businessType: string; businessId: string }) => task.businessType === "expert_scoring" && task.businessId === "score-open")).toBe(false);

    const financeTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u1");
    expect(financeTasks.body.tasks.map((item: { id: string }) => item.id)).toContain(financeTask.id);
    expect(financeTasks.body.tasks.find((item: { id: string; businessType: string }) => item.id === financeTask.id)?.businessType).toBe("payment_request");

    const auditorTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u5");
    expect(auditorTasks.status).toBe(200);
    expect(auditorTasks.body.tasks).toHaveLength(0);
    const auditorComplete = await request(runtime.app).post(`/api/workflow/tasks/${financeTask.id}/complete`).set("x-mock-user-id", "u5");
    expect(auditorComplete.status).toBe(403);

    const adminMenus = await request(runtime.app).get("/api/me/menus").set("x-mock-user-id", "u6");
    expect(adminMenus.status).toBe(200);
    expect(adminMenus.body.menus).not.toContain("myTasks");
    const adminTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u6");
    expect(adminTasks.status).toBe(200);
    expect(adminTasks.body.tasks).toHaveLength(0);
    const adminComplete = await request(runtime.app).post(`/api/workflow/tasks/${financeTask.id}/complete`).set("x-mock-user-id", "u6");
    expect(adminComplete.status).toBe(403);
  });
});
