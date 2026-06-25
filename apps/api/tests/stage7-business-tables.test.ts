import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-stage7-"));
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

function count(ctx: ReturnType<typeof createAppContext>, tableName: string) {
  return ctx.businessTableStore.countRows(tableName);
}

describe("Stage 7 formal business tables", () => {
  it("syncs seed and API writes into formal business tables across reboot", async () => {
    const dataRoot = makeDataRoot();
    const runtime1 = boot(dataRoot);

    expect(count(runtime1.ctx, "business_suppliers")).toBe(runtime1.ctx.state.suppliers.length);
    expect(count(runtime1.ctx, "business_procurement_requests")).toBe(runtime1.ctx.state.procurementRequests.length);
    expect(count(runtime1.ctx, "business_projects")).toBe(runtime1.ctx.state.projects.length);
    expect(count(runtime1.ctx, "business_bids")).toBe(runtime1.ctx.state.bids.length);

    const beforeRequests = count(runtime1.ctx, "business_procurement_requests");
    const createdRequest = await request(runtime1.app)
      .post("/api/procurement-requests")
      .set("x-mock-user-id", "u2")
      .send({
        title: "Stage7 正式表采购申请",
        orgId: "org-hotel",
        category: "客房一次性用品",
        budgetLabel: "正式表同步",
        budgetAmount: 58000,
        purpose: "验证正式业务表同步写入",
        lineItems: [
          {
            itemName: "正式表测试物资",
            specification: "标准",
            quantity: 10,
            unit: "箱"
          }
        ]
      });
    expect(createdRequest.status).toBe(201);
    expect(count(runtime1.ctx, "business_procurement_requests")).toBe(beforeRequests + 1);

    const row = runtime1.ctx.runtimeDb.db
      .prepare("select title, request_status, approval_status, budget_amount, line_items_json from business_procurement_requests where id = ?")
      .get(createdRequest.body.procurementRequest.id) as
      | {
          title: string;
          request_status: string;
          approval_status: string;
          budget_amount: number;
          line_items_json: string;
        }
      | undefined;
    expect(row?.title).toBe("Stage7 正式表采购申请");
    expect(row?.request_status).toBe("draft");
    expect(row?.approval_status).toBe("draft");
    expect(row?.budget_amount).toBe(58000);
    expect(JSON.parse(row?.line_items_json ?? "[]")[0].itemName).toBe("正式表测试物资");

    const runtime2 = boot(dataRoot);
    const rebootRow = runtime2.ctx.runtimeDb.db
      .prepare("select title from business_procurement_requests where id = ?")
      .get(createdRequest.body.procurementRequest.id) as { title: string } | undefined;
    expect(rebootRow?.title).toBe("Stage7 正式表采购申请");
  });
});
