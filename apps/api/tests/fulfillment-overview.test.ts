import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function boot() {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eproc-fulfillment-overview-"));
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot,
      mockAuthEnabled: true
    }
  });
  return createApp(ctx);
}

describe("fulfillment overview", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = boot();
  });

  it("supports keyword, status and pagination without per-project requests", async () => {
    const paged = await request(app)
      .get("/api/project-workbench/fulfillment-overview?page=1&pageSize=1")
      .set("x-mock-user-id", "u2");
    expect(paged.status).toBe(200);
    expect(paged.body.rows).toHaveLength(1);
    expect(paged.body.pagination).toEqual(expect.objectContaining({ page: 1, pageSize: 1 }));
    expect(paged.body.pagination.total).toBeGreaterThan(1);
    expect(paged.body.summary.pending).toBeGreaterThan(0);

    const searched = await request(app)
      .get("/api/project-workbench/fulfillment-overview?keyword=PO-2026-0001")
      .set("x-mock-user-id", "u2");
    expect(searched.status).toBe(200);
    expect(searched.body.rows).toEqual([
      expect.objectContaining({
        projectId: "p-award",
        orderId: "po-award-1",
        fulfillmentStatus: "pending_receipt"
      })
    ]);
    expect(searched.body.projectOptions).toEqual([
      expect.objectContaining({ id: "p-award", fulfillmentStatus: "pending_receipt" })
    ]);

    const exceptions = await request(app)
      .get("/api/project-workbench/fulfillment-overview?status=exception")
      .set("x-mock-user-id", "u2");
    expect(exceptions.status).toBe(200);
    expect(exceptions.body.rows.length).toBeGreaterThan(0);
    expect(exceptions.body.rows.every((row: { fulfillmentStatus: string }) => row.fulfillmentStatus === "exception")).toBe(true);
    expect(exceptions.body.rows).toEqual(expect.arrayContaining([expect.objectContaining({ projectId: "p-food", orderId: "po-food-1" })]));
  });

  it("keeps supplier scope isolated and rejects non-business roles", async () => {
    const supplier = await request(app)
      .get("/api/project-workbench/fulfillment-overview")
      .set("x-mock-user-id", "u3");
    expect(supplier.status).toBe(200);
    expect(supplier.body.rows.length).toBeGreaterThan(0);
    expect(supplier.body.rows.every((row: { supplierId: string }) => row.supplierId === "sup-1")).toBe(true);

    const expert = await request(app)
      .get("/api/project-workbench/fulfillment-overview")
      .set("x-mock-user-id", "u4");
    expect(expert.status).toBe(403);
    expect(expert.body.error.code).toBe("FULFILLMENT_OVERVIEW_READ_DENIED");
    expect(expert.body.error.auditLogId).toMatch(/^audit-/);
  });
});
