import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-stage2-"));
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

function expectDenied(response: request.Response, code: string) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.error.code).toBe(code);
}

describe("Stage 2 supplier admission, procurement request and project initiation", () => {
  let dataRoot: string;

  beforeEach(() => {
    dataRoot = makeDataRoot();
  });

  it("persists supplier admission attachments, request attachments and created project across reboot", async () => {
    const runtime1 = boot(dataRoot);

    const createdSupplier = await request(runtime1.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({
        name: "Stage2 持久化供应商",
        category: "客房一次性用品",
        contactName: "张三",
        contactPhone: "13900000001",
        qualificationAttachments: [
          {
            fileName: "supplier-license.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("supplier-license-content", "utf8").toString("base64")
          }
        ]
      });
    expect(createdSupplier.status).toBe(201);
    const supplierId = createdSupplier.body.supplier.id as string;

    const qualificationReview = await request(runtime1.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "qualification_initial_review", status: "passed", score: 90, opinion: "Stage2 资质初审通过" });
    expect(qualificationReview.status).toBe(201);

    const review = await request(runtime1.app)
      .post(`/api/suppliers/${supplierId}/reviews`)
      .set("x-mock-user-id", "u1")
      .send({ reviewType: "admission_assessment", status: "passed", score: 95, opinion: "准入通过" });
    expect(review.status).toBe(201);

    const createdRequest = await request(runtime1.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        title: "Stage2 持久化采购申请",
        orgId: "org-hotel",
        requestDepartment: "客房部",
        requesterName: "刘明",
        category: "客房一次性用品",
        budgetLabel: "20万元以内",
        budgetAmount: 200000,
        purpose: "阶段2持久化验证",
        expectedArrivalAt: "2026-07-10",
        receivingLocation: "上海滨江华礼酒店后勤仓",
        attachments: [
          {
            fileName: "request-note.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from("request-attachment-content", "utf8").toString("base64")
          }
        ],
        lineItems: [
          {
            itemName: "环保牙具套装",
            category: "客房一次性用品",
            specification: "竹柄",
            quantity: 500,
            unit: "套",
            estimatedUnitPrice: 7.2,
            budgetAmount: 3600,
            requiredByDate: "2026-07-10",
            remark: "首批"
          }
        ]
      });
    expect(createdRequest.status).toBe(201);
    const requestId = createdRequest.body.procurementRequest.id as string;

    const submitted = await request(runtime1.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u8");
    expect(submitted.status).toBe(200);

    const approved = await request(runtime1.app)
      .post(`/api/procurement-requests/${requestId}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true, opinion: "同意立项" });
    expect(approved.status).toBe(200);
    expect(approved.body.procurementRequest.approvalStatus).toBe("approved");

    const method = await request(runtime1.app)
      .post(`/api/procurement-requests/${requestId}/method-decision`)
      .set("x-mock-user-id", "u2")
      .send({ ruleId: "pmr-2" });
    expect(method.status).toBe(200);

    const project = await request(runtime1.app)
      .post("/api/projects")
      .set("x-mock-user-id", "u2")
      .send({ requestId, name: "Stage2 持久化项目" });
    expect(project.status).toBe(201);
    expect(project.body.project.sourceLineItems).toHaveLength(1);
    expect(project.body.project.attachments).toHaveLength(1);

    const runtime2 = boot(dataRoot);
    const supplierAfterReboot = await request(runtime2.app).get(`/api/suppliers/${supplierId}`).set("x-mock-user-id", "u2");
    expect(supplierAfterReboot.status).toBe(200);
    expect(supplierAfterReboot.body.supplier.qualificationAttachments).toHaveLength(1);

    const requestAfterReboot = await request(runtime2.app).get(`/api/procurement-requests/${requestId}`).set("x-mock-user-id", "u2");
    expect(requestAfterReboot.status).toBe(200);
    expect(requestAfterReboot.body.procurementRequest.attachments).toHaveLength(1);
    expect(requestAfterReboot.body.procurementRequest.status).toBe("project_created");

    const projectAfterReboot = await request(runtime2.app).get(`/api/projects/${project.body.project.id}`).set("x-mock-user-id", "u2");
    expect(projectAfterReboot.status).toBe(200);
    expect(projectAfterReboot.body.project.name).toBe("Stage2 持久化项目");
  });

  it("enforces supplier isolation and auditor read-only for stage2 flows", async () => {
    const runtime = boot(dataRoot);

    const ownSupplier = await request(runtime.app).get("/api/suppliers/sup-1").set("x-mock-user-id", "u3");
    expect(ownSupplier.status).toBe(200);

    const otherSupplier = await request(runtime.app).get("/api/suppliers/sup-2").set("x-mock-user-id", "u3");
    expectDenied(otherSupplier, "SUPPLIER_SCOPE_DENIED");

    const supplierWriteDenied = await request(runtime.app)
      .post("/api/suppliers/sup-2/reviews")
      .set("x-mock-user-id", "u3")
      .send({ reviewType: "admission_assessment", status: "passed", opinion: "bad write" });
    expectDenied(supplierWriteDenied, "PHASE1_BUSINESS_ACTION_DENIED");

    const auditorWriteDenied = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u5")
      .send({ title: "审计不应创建", orgId: "org-hotel" });
    expectDenied(auditorWriteDenied, "PHASE1_BUSINESS_ACTION_DENIED");

    const auditLogs = await request(runtime.app).get("/api/audit-logs").set("x-mock-user-id", "u5");
    expect(auditLogs.status).toBe(200);
    expect(Array.isArray(auditLogs.body.auditLogs)).toBe(true);
  });

  it("requires approval before method decision and project creation", async () => {
    const runtime = boot(dataRoot);

    const created = await request(runtime.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        title: "Stage2 审批前校验",
        orgId: "org-hotel",
        requestDepartment: "客房部",
        requesterName: "刘明",
        category: "客房一次性用品",
        lineItems: [{ itemName: "一次性拖鞋", specification: "防滑", quantity: 200, unit: "双" }]
      });
    expect(created.status).toBe(201);
    const requestId = created.body.procurementRequest.id as string;

    await request(runtime.app).post(`/api/procurement-requests/${requestId}/submit`).set("x-mock-user-id", "u8");

    const methodDenied = await request(runtime.app)
      .post(`/api/procurement-requests/${requestId}/method-decision`)
      .set("x-mock-user-id", "u2")
      .send({ ruleId: "pmr-1" });
    expectDenied(methodDenied, "PROCUREMENT_REQUEST_SCOPE_DENIED");

    const projectDenied = await request(runtime.app)
      .post("/api/projects")
      .set("x-mock-user-id", "u2")
      .send({ requestId, name: "未审批不得立项" });
    expectDenied(projectDenied, "PROCUREMENT_REQUEST_SCOPE_DENIED");

    await request(runtime.app)
      .post(`/api/procurement-requests/${requestId}/approve`)
      .set("x-mock-user-id", "u1")
      .send({ approved: true });

    const notReadyProject = await request(runtime.app)
      .post("/api/projects")
      .set("x-mock-user-id", "u2")
      .send({ requestId, name: "未判定方式不得立项" });
    expectDenied(notReadyProject, "PROCUREMENT_REQUEST_NOT_READY");
  });
});
