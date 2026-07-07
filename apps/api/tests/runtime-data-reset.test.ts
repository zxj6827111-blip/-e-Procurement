import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createIsolatedRuntime } from "./helpers/test-runtime.js";

function boot() {
  return createIsolatedRuntime("eproc-runtime-reset-");
}

async function createHotelRequest(runtime: ReturnType<typeof boot>, auth: { cookie?: string[]; userId?: string } = { userId: "u8" }) {
  const builder = request(runtime.app)
    .post("/api/procurement-requests")
    .send({
      title: `Runtime Reset Regression ${Date.now()}`,
      orgId: "org-hotel",
      requestDepartment: "Housekeeping",
      requesterName: "Hotel Buyer U8",
      lineItems: [{ itemName: "Linen Set", category: "linen", specification: "standard", quantity: 10, unit: "set" }]
    });
  if (auth.cookie) builder.set("Cookie", auth.cookie);
  if (auth.userId) builder.set("x-mock-user-id", auth.userId);
  const response = await builder;
  expect(response.status).toBe(201);
  return response.body.procurementRequest as { id: string; title: string };
}

describe("runtime data reset boundary", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  it("keeps newly created workflow data after logout", async () => {
    const login = await request(runtime.app).post("/api/auth/mock-login").send({ userId: "u8" });
    expect(login.status).toBe(200);
    const cookieHeader = login.headers["set-cookie"];
    expect(cookieHeader).toBeDefined();
    const cookie = Array.isArray(cookieHeader) ? cookieHeader : [String(cookieHeader)];

    const created = await createHotelRequest(runtime, { cookie });
    const logout = await request(runtime.app).post("/api/auth/logout").set("Cookie", cookie).send({});
    expect(logout.status).toBe(200);

    const list = await request(runtime.app).get("/api/procurement-requests").set("x-mock-user-id", "u8");
    expect(list.status).toBe(200);
    expect(list.body.procurementRequests).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id, title: created.title })]));
    expect(runtime.ctx.state.procurementRequests.some((item) => item.id === created.id && item.title === created.title)).toBe(true);
  });

  it("resets business data only through the controlled homepage action endpoint", async () => {
    const seedRequestIds = new Set(runtime.ctx.state.procurementRequests.map((item) => item.id));
    const created = await createHotelRequest(runtime);
    expect(seedRequestIds.has(created.id)).toBe(false);
    expect(runtime.ctx.runtimeDb.db.prepare("select id from r2_procurement_requests where id = ?").get(created.id)).toBeTruthy();
    expect(runtime.ctx.runtimeDb.db.prepare("select id from process_instances where business_id = ?").get(created.id)).toBeTruthy();

    const reset = await request(runtime.app).post("/api/runtime/reset-data").set("x-mock-user-id", "u1").send({ confirm: true });
    expect(reset.status).toBe(200);
    expect(reset.body.auditLogId).toMatch(/^audit-/);

    expect(runtime.ctx.state.procurementRequests.some((item) => item.id === created.id || item.title === created.title)).toBe(false);
    expect(runtime.ctx.runtimeDb.db.prepare("select id from business_procurement_requests where id = ?").get(created.id)).toBeUndefined();
    expect(runtime.ctx.runtimeDb.db.prepare("select id from r2_procurement_requests where id = ?").get(created.id)).toBeUndefined();
    expect(runtime.ctx.runtimeDb.db.prepare("select id from process_instances where business_id = ?").get(created.id)).toBeUndefined();
  });

  it("rejects unconfirmed or unauthorized reset attempts", async () => {
    const missingConfirm = await request(runtime.app).post("/api/runtime/reset-data").set("x-mock-user-id", "u1").send({});
    expect(missingConfirm.status).toBe(400);
    expect(missingConfirm.body.error.code).toBe("RUNTIME_DATA_RESET_CONFIRM_REQUIRED");

    const supplierReset = await request(runtime.app).post("/api/runtime/reset-data").set("x-mock-user-id", "u3").send({ confirm: true });
    expect(supplierReset.status).toBe(403);
    expect(supplierReset.body.error.code).toBe("RUNTIME_DATA_RESET_FORBIDDEN");
  });
});
