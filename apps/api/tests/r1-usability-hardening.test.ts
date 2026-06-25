import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function boot() {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eproc-r1-"));
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot,
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

describe("R1 usability hardening", () => {
  it("refreshes the local mock session cookie when switching roles for UAT verification", async () => {
    const runtime = boot();
    const agent = request.agent(runtime.app);

    const initialLogin = await agent.post("/api/auth/mock-login").send({ userId: "u2" });
    expect(initialLogin.status).toBe(200);
    expect(initialLogin.body.roleId).toBe("buyer");

    const beforeSwitch = await agent.get("/api/me");
    expect(beforeSwitch.status).toBe(200);
    expect(beforeSwitch.body.roleId).toBe("buyer");

    const switched = await agent.post("/api/me/mock-role-switch").send({ userId: "u1" });
    expect(switched.status).toBe(200);
    expect(switched.body.roleId).toBe("group_manager");
    const sessionCookie = switched.headers["set-cookie"];
    const sessionCookieText = Array.isArray(sessionCookie) ? sessionCookie.join(";") : String(sessionCookie ?? "");
    expect(sessionCookieText).toContain("eproc_session=");

    const afterSwitch = await agent.get("/api/me");
    expect(afterSwitch.status).toBe(200);
    expect(afterSwitch.body.user.id).toBe("u1");
    expect(afterSwitch.body.roleId).toBe("group_manager");
  });

  it("voids procurement documents as a formal business action and hides them from supplier-facing lists", async () => {
    const runtime = boot();

    const created = await request(runtime.app)
      .post("/api/projects/p-award/procurement-documents")
      .set("x-mock-user-id", "u2")
      .send({
        title: "R1 可用性采购文件",
        contentSummary: "用于验证采购文件作废入口"
      });
    expect(created.status).toBe(201);

    const published = await request(runtime.app).post(`/api/procurement-documents/${created.body.procurementDocument.id}/publish`).set("x-mock-user-id", "u2");
    expect(published.status).toBe(200);
    expect(published.body.procurementDocument.status).toBe("locked");

    const supplierBeforeVoid = await request(runtime.app).get("/api/procurement-documents").set("x-mock-user-id", "u3");
    expect(supplierBeforeVoid.status).toBe(200);
    expect(supplierBeforeVoid.body.procurementDocuments.map((item: { id: string }) => item.id)).toContain(created.body.procurementDocument.id);

    const voided = await request(runtime.app)
      .post(`/api/procurement-documents/${created.body.procurementDocument.id}/void`)
      .set("x-mock-user-id", "u2")
      .send({ reason: "R1 页面停用采购文件" });
    expect(voided.status).toBe(200);
    expect(voided.body.procurementDocument.status).toBe("voided");
    expect(voided.body.procurementDocument.reviewStatus).toBe("voided");
    expect(voided.body.auditLogId).toMatch(/^audit-/);

    const supplierAfterVoid = await request(runtime.app).get("/api/procurement-documents").set("x-mock-user-id", "u3");
    expect(supplierAfterVoid.status).toBe(200);
    expect(supplierAfterVoid.body.procurementDocuments.map((item: { id: string }) => item.id)).not.toContain(created.body.procurementDocument.id);

    const publishAgain = await request(runtime.app).post(`/api/procurement-documents/${created.body.procurementDocument.id}/publish`).set("x-mock-user-id", "u2");
    expect(publishAgain.status).toBe(400);
    expect(publishAgain.body.error.code).toBe("PROCUREMENT_DOCUMENT_VOIDED");
  });
});
