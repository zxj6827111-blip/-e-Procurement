import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-stage4-"));
}

function boot(dataRoot: string) {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot,
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

function expectDenied(response: request.Response, code: string, sensitiveTokens: string[] = []) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.error.code).toBe(code);
  if (response.body.error.auditLogId) {
    expect(response.body.error.auditLogId).toMatch(/^audit-/);
  }
  for (const token of sensitiveTokens) {
    expect(response.text).not.toContain(token);
  }
}

async function uploadAndAttachContractFile(runtime: ReturnType<typeof boot>, contractId: string) {
  const uploaded = await request(runtime.app)
    .post("/api/files/upload")
    .set("x-mock-user-id", "u2")
    .send({
      originalName: "hotel-contract.pdf",
      contentType: "application/pdf",
      contentBase64: Buffer.from("%PDF-1.4 hotel contract").toString("base64"),
      attachmentKind: "contract_document",
      objectType: "contract_ledger",
      objectId: contractId,
      projectId: "p-award",
      supplierId: "sup-1"
    });
  expect(uploaded.status).toBe(201);

  const attached = await request(runtime.app)
    .post(`/api/contracts/${contractId}/attachments`)
    .set("x-mock-user-id", "u2")
    .send({ attachmentMetadata: [uploaded.body.file] });
  expect(attached.status).toBe(200);
  return uploaded.body.file as { id: string; fileName: string };
}

describe("Phase 11 stage 4 fulfillment and archive chain", () => {
  let dataRoot: string;

  beforeEach(() => {
    dataRoot = makeDataRoot();
  });

  function resetAwardProject(runtime: ReturnType<typeof boot>) {
    runtime.ctx.state.resultNotifications = runtime.ctx.state.resultNotifications.filter((item) => item.projectId !== "p-award");
    runtime.ctx.state.purchaseOrders = runtime.ctx.state.purchaseOrders.filter((item) => item.projectId !== "p-award");
    runtime.ctx.state.receiptRecords = runtime.ctx.state.receiptRecords.filter((item) => item.projectId !== "p-award");
    runtime.ctx.state.settlementMaterials = runtime.ctx.state.settlementMaterials.filter((item) => item.projectId !== "p-award");
    runtime.ctx.state.supplierEvaluations = runtime.ctx.state.supplierEvaluations.filter((item) => item.projectId !== "p-award");
    runtime.ctx.state.archiveItems = runtime.ctx.state.archiveItems.filter((item) => item.projectId !== "p-award");
    runtime.ctx.state.projects = runtime.ctx.state.projects.map((item) =>
      item.id === "p-award"
        ? {
            ...item,
            status: "awarded_pending_order",
            displayStatus: "定标审批通过 / 待生成订单"
          }
        : item
    );
  }

  it("allows result notification before purchase order generation", async () => {
    const runtime = boot(dataRoot);
    resetAwardProject(runtime);

    const notified = await request(runtime.app)
      .post("/api/projects/p-award/result-notifications")
      .set("x-mock-user-id", "u2")
      .send({ scope: "supplier_self", visibilityConfig: "supplier_self_only" });
    expect(notified.status).toBe(201);
    expect(runtime.ctx.state.projects.find((item) => item.id === "p-award")?.status).toBe("result_notified");

    const generated = await request(runtime.app)
      .post("/api/project-workbench/projects/p-award/purchase-orders/generate")
      .set("x-mock-user-id", "u2")
      .send({ orderNo: "PO-NOTIFY-FIRST" });
    expect(generated.status).toBe(201);
    expect(runtime.ctx.state.projects.find((item) => item.id === "p-award")?.status).toBe("contract_registered");
  });

  it("does not move project status backward when notification follows order generation", async () => {
    const runtime = boot(dataRoot);
    resetAwardProject(runtime);

    const generated = await request(runtime.app)
      .post("/api/project-workbench/projects/p-award/purchase-orders/generate")
      .set("x-mock-user-id", "u2")
      .send({ orderNo: "PO-ORDER-FIRST" });
    expect(generated.status).toBe(201);
    expect(runtime.ctx.state.projects.find((item) => item.id === "p-award")?.status).toBe("contract_registered");

    const notified = await request(runtime.app)
      .post("/api/projects/p-award/result-notifications")
      .set("x-mock-user-id", "u2")
      .send({ scope: "supplier_self", visibilityConfig: "supplier_self_only" });
    expect(notified.status).toBe(201);
    expect(runtime.ctx.state.projects.find((item) => item.id === "p-award")?.status).toBe("contract_registered");
  });

  it("requires supplier-confirmed contract before purchase order generation", async () => {
    const runtime = boot(dataRoot);
    resetAwardProject(runtime);
    runtime.ctx.state.contractLedgers = runtime.ctx.state.contractLedgers.filter((item) => item.projectId !== "p-award");

    const withoutContract = await request(runtime.app)
      .post("/api/project-workbench/projects/p-award/purchase-orders/generate")
      .set("x-mock-user-id", "u2")
      .send({ orderNo: "PO-CONTRACT-REQUIRED" });
    expectDenied(withoutContract, "CONTRACT_CONFIRMATION_REQUIRED");

    const signing = await request(runtime.app).post("/api/projects/p-award/contracts/signing").set("x-mock-user-id", "u2").send();
    expect(signing.status).toBe(201);
    expect(signing.body.contract.status).toBe("pending_supplier_confirmation");

    const beforeConfirmation = await request(runtime.app)
      .post("/api/project-workbench/projects/p-award/purchase-orders/generate")
      .set("x-mock-user-id", "u2")
      .send({ orderNo: "PO-CONTRACT-PENDING" });
    expectDenied(beforeConfirmation, "CONTRACT_CONFIRMATION_REQUIRED");

    const withoutDocument = await request(runtime.app).post(`/api/contracts/${signing.body.contract.id}/confirm`).set("x-mock-user-id", "u11").send();
    expectDenied(withoutDocument, "CONTRACT_DOCUMENT_REQUIRED");

    const supplierUpload = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u11")
      .send({
        originalName: "supplier-must-not-upload.pdf",
        contentType: "application/pdf",
        contentBase64: Buffer.from("supplier file").toString("base64"),
        attachmentKind: "contract_document",
        objectType: "contract_ledger",
        objectId: signing.body.contract.id,
        projectId: "p-award",
        supplierId: "sup-1"
      });
    expectDenied(supplierUpload, "CONTRACT_FILE_UPLOAD_DENIED");

    const contractFile = await uploadAndAttachContractFile(runtime, signing.body.contract.id);

    const supplierDownload = await request(runtime.app).get(`/api/files/${contractFile.id}/download`).set("x-mock-user-id", "u11");
    expect(supplierDownload.status).toBe(200);
    expect(supplierDownload.headers["content-disposition"]).toContain("hotel-contract.pdf");

    const otherSupplierDownload = await request(runtime.app).get(`/api/files/${contractFile.id}/download`).set("x-mock-user-id", "u15");
    expectDenied(otherSupplierDownload, "SUPPLIER_FILE_DOWNLOAD_DENIED");

    const confirmed = await request(runtime.app).post(`/api/contracts/${signing.body.contract.id}/confirm`).set("x-mock-user-id", "u11").send();
    expect(confirmed.status).toBe(200);
    expect(runtime.ctx.state.projects.find((item) => item.id === "p-award")?.status).toBe("contract_registered");

    const generated = await request(runtime.app)
      .post("/api/project-workbench/projects/p-award/purchase-orders/generate")
      .set("x-mock-user-id", "u2")
      .send({ orderNo: "PO-CONTRACT-CONFIRMED" });
    expect(generated.status).toBe(201);
    expect(generated.body.purchaseOrder.contractId).toBe(signing.body.contract.id);

    const supplierWorkbench = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u11");
    expect(supplierWorkbench.status).toBe(200);
    expect(supplierWorkbench.body.contracts).toEqual([expect.objectContaining({ id: signing.body.contract.id, status: "registered" })]);

    const otherSupplierWorkbench = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u15");
    expect(otherSupplierWorkbench.status).toBe(200);
    expect(otherSupplierWorkbench.body.contracts).toHaveLength(0);
  });

  it("keeps workbench access and supplier scope aligned with stage 4 permissions", async () => {
    const runtime = boot(dataRoot);
    runtime.ctx.state.users.push({ id: "u8", name: "供应商二", roleId: "supplier", supplierId: "sup-2", orgId: "org-hotel" });

    const buyer = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u2");
    expect(buyer.status).toBe(200);
    expect(buyer.body.project.status).toBe("awarded_pending_order");

    const ownSupplier = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u3");
    expect(ownSupplier.status).toBe(200);
    expect(ownSupplier.body.suppliers).toHaveLength(1);
    expect(ownSupplier.body.suppliers[0].id).toBe("sup-1");

    const otherSupplier = await request(runtime.app).get("/api/project-workbench/projects/p-food").set("x-mock-user-id", "u3");
    expectDenied(otherSupplier, "SUPPLIER_PROJECT_SCOPE_DENIED");

    const expert = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u4");
    expectDenied(expert, "PROJECT_WORKBENCH_READ_DENIED");

    const admin = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u6");
    expectDenied(admin, "PROJECT_WORKBENCH_READ_DENIED");
  });

  it("lists only the current supplier's project purchase orders for dashboard aggregation", async () => {
    const runtime = boot(dataRoot);

    const supplierOrders = await request(runtime.app).get("/api/project-workbench/purchase-orders").set("x-mock-user-id", "u3");
    expect(supplierOrders.status).toBe(200);
    expect(supplierOrders.body.purchaseOrders.length).toBeGreaterThan(0);
    expect(supplierOrders.body.purchaseOrders.every((item: { supplierId: string }) => item.supplierId === "sup-1")).toBe(true);
    expect(supplierOrders.body.purchaseOrders.some((item: { id: string }) => item.id === "po-award-1")).toBe(true);

    const expertOrders = await request(runtime.app).get("/api/project-workbench/purchase-orders").set("x-mock-user-id", "u4");
    expectDenied(expertOrders, "PURCHASE_ORDER_LIST_READ_DENIED");
  });

  it("runs awarded project through order, settlement, evaluation and archive seal", async () => {
    const runtime = boot(dataRoot);
    resetAwardProject(runtime);
    runtime.ctx.state.users.push({ id: "u8", name: "供应商二", roleId: "supplier", supplierId: "sup-2", orgId: "org-hotel" });

    const generated = await request(runtime.app)
      .post("/api/project-workbench/projects/p-award/purchase-orders/generate")
      .set("x-mock-user-id", "u2")
      .send({
        orderNo: "PO-STAGE4-001",
        expectedDeliveryAt: "2026-07-22",
        receivingLocation: "华东区域中心仓"
      });
    expect(generated.status).toBe(201);
    expect(generated.body.purchaseOrder.status).toBe("pending_confirmation");
    expect(generated.body.auditLogId).toMatch(/^audit-/);

    const orderId = generated.body.purchaseOrder.id as string;
    const generatedOrder = generated.body.purchaseOrder as {
      lineItems: Array<{ itemName: string; quantity: number; unit: string }>;
    };

    const wrongSupplier = await request(runtime.app).post(`/api/project-workbench/purchase-orders/${orderId}/confirm`).set("x-mock-user-id", "u8");
    expectDenied(wrongSupplier, "SUPPLIER_ORDER_SCOPE_DENIED");

    const confirmed = await request(runtime.app).post(`/api/project-workbench/purchase-orders/${orderId}/confirm`).set("x-mock-user-id", "u3");
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.purchaseOrder.status).toBe("supplier_confirmed");

    const changed = await request(runtime.app)
      .post(`/api/project-workbench/purchase-orders/${orderId}/change`)
      .set("x-mock-user-id", "u2")
      .send({ statusRemark: "调整到货窗口并留痕" });
    expect(changed.status).toBe(200);
    expect(changed.body.purchaseOrder.statusRemark).toBe("调整到货窗口并留痕");

    const partialReceipt = await request(runtime.app)
      .post(`/api/project-workbench/purchase-orders/${orderId}/receipts`)
      .set("x-mock-user-id", "u2")
      .send({
        receiptType: "partial",
        summary: "首批到货，先登记部分收货",
        receivedItems: generatedOrder.lineItems.map((item, index) => ({
          itemName: item.itemName,
          receivedQuantity: index === 0 ? Math.max(1, Math.floor(item.quantity / 2)) : 0,
          unit: item.unit,
          accepted: true
        }))
      });
    expect(partialReceipt.status).toBe(201);
    expect(partialReceipt.body.purchaseOrder.status).toBe("partially_received");

    const fullReceipt = await request(runtime.app)
      .post(`/api/project-workbench/purchase-orders/${orderId}/receipts`)
      .set("x-mock-user-id", "u2")
      .send({
        receiptType: "full",
        summary: "全部到货并验收通过",
        receivedItems: generatedOrder.lineItems.map((item) => ({
          itemName: item.itemName,
          receivedQuantity: item.quantity,
          unit: item.unit,
          accepted: true
        }))
      });
    expect(fullReceipt.status).toBe(201);
    expect(fullReceipt.body.purchaseOrder.status).toBe("received");

    const upload = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u3")
      .send({
        originalName: "invoice-stage4.txt",
        contentType: "text/plain",
        contentBase64: Buffer.from("stage4-invoice-content", "utf8").toString("base64"),
        attachmentKind: "settlement_material",
        objectType: "settlement_material",
        objectId: `${orderId}-invoice`,
        projectId: "p-award",
        supplierId: "sup-1"
      });
    expect(upload.status).toBe(201);

    const download = await request(runtime.app).get(`/api/files/${upload.body.file.id}/download`).set("x-mock-user-id", "u3");
    expect(download.status).toBe(200);
    expect(download.text).toBe("stage4-invoice-content");
    expect(download.headers["x-audit-log-id"]).toMatch(/^audit-/);

    const settlement = await request(runtime.app)
      .post(`/api/project-workbench/purchase-orders/${orderId}/settlement-materials`)
      .set("x-mock-user-id", "u3")
      .send({
        materialType: "invoice",
        storedFileId: upload.body.file.id
      });
    expect(settlement.status).toBe(201);
    expect(settlement.body.settlementMaterial.status).toBe("pending_verification");

    const deniedAuditorVerify = await request(runtime.app)
      .post(`/api/project-workbench/settlement-materials/${settlement.body.settlementMaterial.id}/verify`)
      .set("x-mock-user-id", "u5")
      .send({ approved: true });
    expectDenied(deniedAuditorVerify, "SETTLEMENT_VERIFIER_REQUIRED");

    const verified = await request(runtime.app)
      .post(`/api/project-workbench/settlement-materials/${settlement.body.settlementMaterial.id}/verify`)
      .set("x-mock-user-id", "u2")
      .send({ approved: true, verificationOpinion: "资料齐全，核验通过" });
    expect(verified.status).toBe(200);
    expect(verified.body.settlementMaterial.status).toBe("verified");

    const evaluationV1 = await request(runtime.app)
      .post(`/api/project-workbench/purchase-orders/${orderId}/evaluations`)
      .set("x-mock-user-id", "u2")
      .send({
        dimensions: {
          quality: 92,
          delivery: 91,
          service: 90,
          cooperation: 93,
          priceReasonableness: 89
        },
        description: "阶段4首次履约评价"
      });
    expect(evaluationV1.status).toBe(201);
    expect(evaluationV1.body.supplierEvaluation.status).toBe("submitted_locked");
    expect(evaluationV1.body.supplierEvaluation.versionNo).toBe(1);

    const evaluationV2 = await request(runtime.app)
      .post(`/api/project-workbench/purchase-orders/${orderId}/evaluations`)
      .set("x-mock-user-id", "u2")
      .send({
        dimensions: {
          quality: 94,
          delivery: 92,
          service: 91,
          cooperation: 94,
          priceReasonableness: 90
        },
        description: "阶段4更正版履约评价",
        correctionReason: "补充完整到货表现"
      });
    expect(evaluationV2.status).toBe(201);
    expect(evaluationV2.body.supplierEvaluation.status).toBe("submitted_locked");
    expect(evaluationV2.body.supplierEvaluation.versionNo).toBe(2);
    expect(evaluationV2.body.supplierEvaluation.previousEvaluationId).toBe(evaluationV1.body.supplierEvaluation.id);

    const archiveCheck = await request(runtime.app).post("/api/projects/p-award/archive-check").set("x-mock-user-id", "u2");
    expect(archiveCheck.status).toBe(200);
    expect(archiveCheck.body.status).toBe("complete");
    expect(archiveCheck.body.missingItems).toHaveLength(0);

    const archiveSeal = await request(runtime.app).post("/api/projects/p-award/archive-seal").set("x-mock-user-id", "u2");
    expect(archiveSeal.status).toBe(200);
    expect(archiveSeal.body.archiveItems.every((item: { status: string }) => item.status === "sealed")).toBe(true);

    const closeAfterSeal = await request(runtime.app)
      .post(`/api/project-workbench/purchase-orders/${orderId}/close`)
      .set("x-mock-user-id", "u2")
      .send({ reason: "sealed close denied" });
    expectDenied(closeAfterSeal, "ARCHIVE_ALREADY_SEALED");

    const blockedAfterSeal = await request(runtime.app)
      .post(`/api/project-workbench/purchase-orders/${orderId}/settlement-materials`)
      .set("x-mock-user-id", "u3")
      .send({ materialType: "other", fileName: "blocked.txt" });
    expectDenied(blockedAfterSeal, "ARCHIVE_ALREADY_SEALED");

    const auditView = await request(runtime.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u5");
    expect(auditView.status).toBe(200);
    expect(auditView.body.auditLogs.map((item: { action: string }) => item.action)).toEqual(
      expect.arrayContaining([
        "purchase_order.generate",
        "purchase_order.confirm",
        "receipt.record",
        "settlement_material.upload",
        "settlement_material.verify",
        "supplier_evaluation.submit_locked",
        "archive.check",
        "archive.seal"
      ])
    );
  });

  it("supports exception receipt handling and archive supplement workflow", async () => {
    const runtime = boot(dataRoot);
    resetAwardProject(runtime);

    const generated = await request(runtime.app)
      .post("/api/project-workbench/projects/p-award/purchase-orders/generate")
      .set("x-mock-user-id", "u2")
      .send({
        orderNo: "PO-STAGE4-EXCEPTION",
        expectedDeliveryAt: "2026-07-23",
        receivingLocation: "华东区域中心仓"
      });
    expect(generated.status).toBe(201);
    const orderId = generated.body.purchaseOrder.id as string;
    const generatedOrder = generated.body.purchaseOrder as {
      lineItems: Array<{ itemName: string; unit: string }>;
    };

    await request(runtime.app).post(`/api/project-workbench/purchase-orders/${orderId}/confirm`).set("x-mock-user-id", "u3");

    const receipt = await request(runtime.app)
      .post(`/api/project-workbench/purchase-orders/${orderId}/receipts`)
      .set("x-mock-user-id", "u2")
      .send({
        receiptType: "exception",
        exceptionType: "quality_issue",
        summary: "抽检发现质量问题，先记异常收货",
        receivedItems: [
          {
            itemName: generatedOrder.lineItems[0]?.itemName ?? "item",
            receivedQuantity: 1,
            unit: generatedOrder.lineItems[0]?.unit ?? "件",
            accepted: false
          }
        ]
      });
    expect(receipt.status).toBe(201);
    expect(receipt.body.purchaseOrder.status).toBe("exception");
    expect(receipt.body.receiptRecord.handlingStatus).toBe("pending_resolution");

    const handled = await request(runtime.app)
      .post(`/api/project-workbench/receipts/${receipt.body.receiptRecord.id}/handle`)
      .set("x-mock-user-id", "u2")
      .send({
        handlingStatus: "supplemented",
        handlingNote: "补录处理完成"
      });
    expect(handled.status).toBe(200);
    expect(handled.body.receiptRecord.handlingStatus).toBe("supplemented");
    expect(["performing", "partially_received", "received"]).toContain(handled.body.purchaseOrder.status);

    const supplementRequest = await request(runtime.app)
      .post("/api/archive-items/ai-ext-result/supplement-requests")
      .set("x-mock-user-id", "u2")
      .send({ reason: "补传外部中标结果盖章件" });
    expect(supplementRequest.status).toBe(201);
    expect(supplementRequest.body.supplementRequest.approvalStatus).toBe("submitted");

    const approved = await request(runtime.app)
      .post(`/api/archive-supplement-requests/${supplementRequest.body.supplementRequest.id}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true });
    expect(approved.status).toBe(200);
    expect(approved.body.supplementRequest.approvalStatus).toBe("approved");

    const applied = await request(runtime.app)
      .post(`/api/archive-supplement-requests/${supplementRequest.body.supplementRequest.id}/apply`)
      .set("x-mock-user-id", "u2")
      .send({ fileName: "external-result-sealed.pdf" });
    expect(applied.status).toBe(200);
    expect(["supplemented", "complete"]).toContain(applied.body.archiveItem.status);
    expect(applied.body.supplementRequest.appliedBy).toBe("u2");
  });

  it("persists stage 4 fulfillment data across reboot", async () => {
    const runtime1 = boot(dataRoot);
    resetAwardProject(runtime1);

    const generated = await request(runtime1.app)
      .post("/api/project-workbench/projects/p-award/purchase-orders/generate")
      .set("x-mock-user-id", "u2")
      .send({
        orderNo: "PO-STAGE4-PERSIST",
        expectedDeliveryAt: "2026-07-24",
        receivingLocation: "华东区域中心仓"
      });
    expect(generated.status).toBe(201);

    const orderId = generated.body.purchaseOrder.id as string;
    const upload = await request(runtime1.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u3")
      .send({
        originalName: "persist-delivery.txt",
        contentType: "text/plain",
        contentBase64: Buffer.from("persisted-stage4-file", "utf8").toString("base64"),
        attachmentKind: "settlement_material",
        objectType: "settlement_material",
        objectId: `${orderId}-persist`,
        projectId: "p-award",
        supplierId: "sup-1"
      });
    expect(upload.status).toBe(201);

    const material = await request(runtime1.app)
      .post(`/api/project-workbench/purchase-orders/${orderId}/settlement-materials`)
      .set("x-mock-user-id", "u3")
      .send({
        materialType: "delivery_note",
        storedFileId: upload.body.file.id
      });
    expect(material.status).toBe(201);

    const runtime2 = boot(dataRoot);

    const workbench = await request(runtime2.app).get("/api/project-workbench/projects/p-award").set("x-mock-user-id", "u2");
    expect(workbench.status).toBe(200);
    expect(workbench.body.purchaseOrders.some((item: { id: string; orderNo: string }) => item.id === orderId && item.orderNo === "PO-STAGE4-PERSIST")).toBe(true);
    expect(workbench.body.settlementMaterials.some((item: { id: string; fileId?: string }) => item.id === material.body.settlementMaterial.id && item.fileId === upload.body.file.id)).toBe(true);

    const downloaded = await request(runtime2.app).get(`/api/files/${upload.body.file.id}/download`).set("x-mock-user-id", "u3");
    expect(downloaded.status).toBe(200);
    expect(downloaded.text).toBe("persisted-stage4-file");
  });
});
