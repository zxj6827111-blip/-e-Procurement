import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function boot() {
  const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eproc-settlement-overview-"));
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot,
      mockAuthEnabled: true
    }
  });
  const order = ctx.state.purchaseOrders.find((item) => item.id === "po-award-1");
  if (!order) throw new Error("Seed order po-award-1 is required.");
  order.status = "received";
  order.updatedAt = "2026-07-15T09:00:00.000Z";
  order.lineItems.forEach((item) => {
    item.receivedQuantity = item.quantity;
  });
  return createApp(ctx);
}

describe("settlement overview", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = boot();
  });

  it("lists billable orders with keyword, status and pagination", async () => {
    const searched = await request(app)
      .get("/api/project-workbench/settlement-overview?keyword=PO-2026-0001&status=pending_bill_creation&page=1&pageSize=1")
      .set("x-mock-user-id", "u2");

    expect(searched.status).toBe(200);
    expect(searched.body.rows).toEqual([
      expect.objectContaining({
        projectId: "p-award",
        orderId: "po-award-1",
        orderNo: "PO-2026-0001",
        settlementStatus: "pending_bill_creation",
        nextActionLabel: "生成结算单"
      })
    ]);
    expect(searched.body.projectOptions).toEqual([
      expect.objectContaining({ id: "p-award", settlementStatus: "pending_bill_creation" })
    ]);
    expect(searched.body.summary.pendingBillCreation).toBe(1);
    expect(searched.body.pagination).toEqual(expect.objectContaining({ page: 1, pageSize: 1, total: 1 }));
  });

  it("keeps supplier scope isolated and rejects expert access", async () => {
    const supplier = await request(app)
      .get("/api/project-workbench/settlement-overview?keyword=PO-2026-0001")
      .set("x-mock-user-id", "u3");
    expect(supplier.status).toBe(200);
    expect(supplier.body.rows).toHaveLength(1);
    expect(supplier.body.rows[0]).toEqual(expect.objectContaining({
      supplierId: "sup-1",
      nextActionLabel: "等待生成结算单"
    }));

    const expert = await request(app)
      .get("/api/project-workbench/settlement-overview")
      .set("x-mock-user-id", "u4");
    expect(expert.status).toBe(403);
    expect(expert.body.error.code).toBe("SETTLEMENT_OVERVIEW_READ_DENIED");
  });
});
