import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-stage1-"));
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

describe("Stage 1 production foundation", () => {
  let dataRoot: string;

  beforeEach(() => {
    dataRoot = makeDataRoot();
  });

  it("supports formal login and cookie session", async () => {
    const runtime = boot(dataRoot);
    const login = await request(runtime.app).post("/api/auth/login").send({ username: "u2", password: "pass-u2" });
    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]?.[0]).toContain("eproc_session=");

    const me = await request(runtime.app).get("/api/me").set("cookie", login.headers["set-cookie"]);
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe("u2");
  });

  it("persists new procurement request across reboot", async () => {
    const runtime1 = boot(dataRoot);
    const created = await request(runtime1.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u8")
      .send({
        title: "阶段1重启留存测试",
        orgId: "org-hotel",
        requestDepartment: "Housekeeping",
        requesterName: "Buyer U2",
        lineItems: [{ itemName: "Toothbrush Kit", specification: "standard", quantity: 12, unit: "set" }],
        budgetLabel: "10万元以内",
        methodSuggestion: "询价 / 比选",
        approvalStatus: "draft"
      });
    expect(created.status).toBe(201);

    const runtime2 = boot(dataRoot);
    const list = await request(runtime2.app).get("/api/procurement-requests").set("x-mock-user-id", "u8");
    expect(list.status).toBe(200);
    expect(list.body.procurementRequests.some((item: { title: string }) => item.title === "阶段1重启留存测试")).toBe(true);
  });

  it("uploads and downloads real file content through unified file center", async () => {
    const runtime = boot(dataRoot);
    const contentBase64 = Buffer.from("stage1-real-file", "utf8").toString("base64");
    const uploaded = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u3")
      .send({
        originalName: "delivery-note.txt",
        contentType: "text/plain",
        contentBase64,
        attachmentKind: "settlement_material",
        objectType: "settlement_material",
        objectId: "sm-test-1",
        projectId: "p-award",
        supplierId: "sup-1"
      });
    expect(uploaded.status).toBe(201);

    const downloaded = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u3");
    expect(downloaded.status).toBe(200);
    expect(downloaded.text).toBe("stage1-real-file");
    expect(downloaded.headers["x-audit-log-id"]).toMatch(/^audit-/);
  });

  it("enforces supplier file scope isolation", async () => {
    const runtime = boot(dataRoot);
    const denied = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u3")
      .send({
        originalName: "other-supplier.txt",
        contentType: "text/plain",
        contentBase64: Buffer.from("denied", "utf8").toString("base64"),
        attachmentKind: "settlement_material",
        objectType: "settlement_material",
        objectId: "sm-test-2",
        projectId: "p-award",
        supplierId: "sup-2"
      });
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("SUPPLIER_FILE_SCOPE_DENIED");
  });

  it("serves bid response download from real storage after approval", async () => {
    const runtime = boot(dataRoot);
    const approval = await request(runtime.app)
      .post("/api/bid-view-approvals")
      .set("x-mock-user-id", "u2")
      .send({ projectId: "p-pre", targetSupplierId: "sup-1", viewContent: "response_file_download", allowDownload: true });
    await request(runtime.app).post(`/api/bid-view-approvals/${approval.body.approval.id}/submit`).set("x-mock-user-id", "u2");
    await request(runtime.app).post(`/api/bid-view-approvals/${approval.body.approval.id}/approve`).set("x-mock-user-id", "u1").send({ approved: true });

    const downloaded = await request(runtime.app)
      .get(`/api/bid-files/file-pre-1/download?approvalId=${approval.body.approval.id}`)
      .set("x-mock-user-id", "u2");
    expect(downloaded.status).toBe(200);
    const body = Buffer.from(downloaded.body).toString("utf8");
    expect(body).toContain("业务附件：响应文件-一次性用品.pdf");
    expect(body).toContain("业务流转、归档和审计留痕");
  });
});
