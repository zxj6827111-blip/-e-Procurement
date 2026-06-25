import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function boot() {
  const ctx = createAppContext();
  ctx.state.bids.find((item) => item.id === "bid-award-1")!.responseFileMetadata = [
    {
      id: "rfm-award-1",
      fileName: "locked-response-sensitive.pdf",
      contentType: "application/pdf",
      sizeBytes: 4096,
      uploadedAt: "2026-06-17T15:18:00.000Z"
    }
  ];
  ctx.state.bidVersions.push({
    id: "bv-award-sensitive",
    bidId: "bid-award-1",
    projectId: "p-award",
    supplierId: "sup-1",
    versionNo: 1,
    amount: 1286000,
    status: "locked",
    responseFileMetadata: [
      {
        id: "rfm-version-1",
        fileName: "locked-response-sensitive.pdf",
        contentType: "application/pdf",
        sizeBytes: 4096,
        uploadedAt: "2026-06-17T15:18:00.000Z"
      }
    ],
    snapshotJson: {
      amount: 1286000,
      fileName: "locked-response-sensitive.pdf",
      responseFileMetadata: [{ fileName: "locked-response-sensitive.pdf" }]
    },
    createdAt: "2026-06-18T17:00:00.000Z",
    reason: "seed locked version"
  });
  ctx.state.auditLogs.push({
    id: "audit-sensitive-contract",
    actorId: "u2",
    roleId: "buyer",
    orgId: "org-east",
    projectId: "p-award",
    action: "contract_ledger.register",
    objectType: "contract_ledger",
    objectId: "cl-award-1",
    result: "recorded",
    reason: "contract amount 1286000 and evaluation stable delivery placeholder",
    createdAt: "2026-06-22T10:00:00.000Z"
  });
  return { ctx, app: createApp(ctx) };
}

function expectDenied(response: request.Response, code: string, sensitiveTokens: string[] = []) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.error.code).toBe(code);
  expect(response.body.error.auditLogId).toMatch(/^audit-/);
  for (const token of sensitiveTokens) {
    expect(response.text).not.toContain(token);
  }
}

function expectNoSensitive(response: request.Response, sensitiveTokens: string[]) {
  for (const token of sensitiveTokens) {
    expect(response.text).not.toContain(token);
  }
}

describe("Phase 10 No-Go permission hardening matrix", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  function addSameOrgRequestOutsideBuyerProject() {
    runtime.ctx.state.projects.push({
      id: "p-outside-buyer",
      code: "CG-2026-0624-999",
      name: "Outside Buyer Scope Project",
      orgId: "org-east",
      orgName: "East Region",
      type: "comparison",
      status: "project_created",
      displayStatus: "project created",
      category: "sensitive category",
      buyer: "Other Buyer",
      quoteDeadlineAt: null,
      beforeDeadline: false,
      externalTradeFlag: false,
      participantSupplierIds: [],
      assignedExpertIds: []
    });
    runtime.ctx.state.procurementRequests.push({
      id: "req-outside-buyer-project",
      code: "REQ-OUTSIDE-BUYER",
      projectId: "p-outside-buyer",
      title: "Outside Buyer Sensitive Request",
      orgId: "org-east",
      category: "sensitive category",
      description: "outside buyer sensitive description",
      budgetLabel: "sensitive-budget",
      methodSuggestion: "sensitive-method",
      externalTradeFlag: false,
      status: "project_created",
      approvalStatus: "approved",
      createdBy: "u1",
      createdAt: "2026-06-24T00:00:00.000Z",
      updatedAt: "2026-06-24T00:00:00.000Z"
    });
  }

  it.each([
    ["supplier", "u3"],
    ["expert", "u4"],
    ["admin", "u6"]
  ])("blocks %s from reading audit logs and hides audit substance", async (_role, userId) => {
    const response = await request(runtime.app).get("/api/audit-logs").set("x-mock-user-id", userId);
    expectDenied(response, "AUDIT_LOG_READ_DENIED", [
      "contract_ledger.register",
      "contract amount 1286000",
      "evaluation stable delivery placeholder"
    ]);
  });

  it.each([
    ["buyer", "u2"],
    ["group_manager", "u1"],
    ["auditor", "u5"]
  ])("lets %s read only in-scope audit logs", async (_role, userId) => {
    const response = await request(runtime.app).get("/api/audit-logs").set("x-mock-user-id", userId);
    expect(response.status).toBe(200);
    expect(response.body.auditLogs.length).toBeGreaterThan(0);
    expect(response.body.auditLogs.every((log: { projectId?: string; orgId: string }) => !log.projectId || ["p-pre", "p-award", "p-food", "p-ext"].includes(log.projectId))).toBe(true);
  });

  it("keeps supplier contract ledger list scoped to own enterprise", async () => {
    const response = await request(runtime.app).get("/api/contracts").set("x-mock-user-id", "u3");
    expect(response.status).toBe(200);
    expect(response.body.contracts).toHaveLength(1);
    expect(response.body.contracts[0].supplierId).toBe("sup-1");
    expect(response.text).toContain("1286000");
  });

  it.each([
    ["buyer", "u2"],
    ["group_manager", "u1"],
    ["auditor", "u5"]
  ])("lets %s read in-scope contract ledger list", async (_role, userId) => {
    const response = await request(runtime.app).get("/api/contracts").set("x-mock-user-id", userId);
    expect(response.status).toBe(200);
    expect(response.body.contracts.map((item: { id: string }) => item.id)).toContain("cl-award-1");
  });

  it.each([
    ["expert", "u4"],
    ["admin", "u6"]
  ])("blocks %s from business contract content", async (_role, userId) => {
    const response = await request(runtime.app).get("/api/contracts").set("x-mock-user-id", userId);
    expectDenied(response, "CONTRACT_READ_DENIED", ["1286000", "contract-ledger-attachment.pdf"]);
  });

  it.each([
    ["expert", "u4"],
    ["admin", "u6"]
  ])("blocks %s from supplier evaluation content", async (_role, userId) => {
    const response = await request(runtime.app).get("/api/suppliers/sup-1/evaluations").set("x-mock-user-id", userId);
    expectDenied(response, "SUPPLIER_EVALUATION_READ_DENIED", ["stable delivery placeholder", "improvementSuggestion"]);
  });

  it("keeps pre-deadline procurement and audit bid summary free of amount and response file fields", async () => {
    for (const userId of ["u2", "u1", "u5"]) {
      const response = await request(runtime.app).get("/api/projects/p-pre/bids/summary").set("x-mock-user-id", userId);
      expect(response.status).toBe(200);
      expect(response.body.submittedCount).toBe(1);
      expectNoSensitive(response, ["186000", "amount", "fileName", "responseFileMetadata", "file-pre-1"]);
    }
  });

  it("blocks admin from bid summary and versions business content", async () => {
    const summary = await request(runtime.app).get("/api/projects/p-award/bids/summary").set("x-mock-user-id", "u6");
    expectDenied(summary, "ADMIN_BUSINESS_DATA_DENIED", ["1286000", "locked-response-sensitive.pdf", "responseFileMetadata"]);

    const versions = await request(runtime.app).get("/api/bids/bid-award-1/versions").set("x-mock-user-id", "u6");
    expectDenied(versions, "ADMIN_BUSINESS_DATA_DENIED", ["1286000", "locked-response-sensitive.pdf", "responseFileMetadata"]);
  });

  it("keeps expert bid summary and versions from exposing full bids even after deadline", async () => {
    const summary = await request(runtime.app).get("/api/projects/p-award/bids/summary").set("x-mock-user-id", "u4");
    expect(summary.status).toBe(200);
    expectNoSensitive(summary, ["1286000", "locked-response-sensitive.pdf", "amount", "fileName", "responseFileMetadata"]);

    const versions = await request(runtime.app).get("/api/bids/bid-award-1/versions").set("x-mock-user-id", "u4");
    expectDenied(versions, "EXPERT_BID_DENIED", ["1286000", "locked-response-sensitive.pdf", "responseFileMetadata"]);
  });

  it("does not let admin read procurement request list or detail", async () => {
    const list = await request(runtime.app).get("/api/procurement-requests").set("x-mock-user-id", "u6");
    expectDenied(list, "ADMIN_BUSINESS_DATA_DENIED", ["req-pre", "budgetLabel", "methodSuggestion"]);

    const detail = await request(runtime.app).get("/api/procurement-requests/req-pre").set("x-mock-user-id", "u6");
    expectDenied(detail, "PROCUREMENT_REQUEST_SCOPE_DENIED", ["req-pre", "budgetLabel", "methodSuggestion"]);
  });

  it.each([
    ["buyer", "u2"],
    ["group_manager", "u1"],
    ["auditor", "u5"]
  ])("lets %s read procurement requests by scope", async (_role, userId) => {
    const response = await request(runtime.app).get("/api/procurement-requests").set("x-mock-user-id", userId);
    expect(response.status).toBe(200);
    expect(response.body.procurementRequests.length).toBeGreaterThan(0);
  });

  it("blocks buyer from same-org procurement request tied to an unmanaged project", async () => {
    addSameOrgRequestOutsideBuyerProject();

    const list = await request(runtime.app).get("/api/procurement-requests").set("x-mock-user-id", "u2");
    expect(list.status).toBe(200);
    expectNoSensitive(list, ["req-outside-buyer-project", "sensitive-budget", "sensitive-method", "outside buyer sensitive description"]);

    const detail = await request(runtime.app).get("/api/procurement-requests/req-outside-buyer-project").set("x-mock-user-id", "u2");
    expectDenied(detail, "PROCUREMENT_REQUEST_SCOPE_DENIED", ["sensitive-budget", "sensitive-method", "outside buyer sensitive description"]);

    const manager = await request(runtime.app).get("/api/procurement-requests/req-outside-buyer-project").set("x-mock-user-id", "u1");
    expect(manager.status).toBe(200);
    expect(manager.body.procurementRequest.id).toBe("req-outside-buyer-project");

    const auditor = await request(runtime.app).get("/api/procurement-requests/req-outside-buyer-project").set("x-mock-user-id", "u5");
    expect(auditor.status).toBe(200);
    expect(auditor.body.procurementRequest.id).toBe("req-outside-buyer-project");
  });

  it.each([
    ["buyer", "u2"],
    ["group_manager", "u1"],
    ["supplier", "u3"],
    ["expert", "u4"],
    ["auditor", "u5"]
  ])("blocks %s from admin-only configuration resources", async (_role, userId) => {
    for (const path of ["/api/roles", "/api/role-permissions", "/api/system-dictionaries"]) {
      const response = await request(runtime.app).get(path).set("x-mock-user-id", userId);
      expectDenied(response, "CONFIG_ADMIN_ONLY", ["config:manage", "approval_chain", "supplier:self-read"]);
    }
  });

  it("lets admin read admin-only configuration resources but not business resources", async () => {
    const rolePermissions = await request(runtime.app).get("/api/role-permissions").set("x-mock-user-id", "u6");
    expect(rolePermissions.status).toBe(200);
    expect(rolePermissions.text).toContain("config:manage");

    const contracts = await request(runtime.app).get("/api/contracts").set("x-mock-user-id", "u6");
    expectDenied(contracts, "CONTRACT_READ_DENIED", ["1286000"]);
  });

  it.each([
    ["buyer", "u2", 200],
    ["group_manager", "u1", 200],
    ["auditor", "u5", 200],
    ["admin", "u6", 200],
    ["supplier", "u3", 403],
    ["expert", "u4", 403]
  ])("applies procurement method rule visibility for %s", async (_role, userId, expectedStatus) => {
    const response = await request(runtime.app).get("/api/procurement-method-rules").set("x-mock-user-id", userId);
    expect(response.status).toBe(expectedStatus);
    if (expectedStatus === 403) {
      expectDenied(response, "PROCUREMENT_METHOD_RULE_READ_DENIED", ["conditionJson", "resultMethod"]);
    } else {
      expect(response.body.procurementMethodRules.length).toBeGreaterThan(0);
    }
  });
});
