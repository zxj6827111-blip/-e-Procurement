import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function boot() {
  const ctx = createAppContext();
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

describe("Phase 4 expert review and scoring report", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  it("lets group manager maintain expert directory and bind expert account", async () => {
    const denied = await request(runtime.app)
      .post("/api/experts")
      .set("x-mock-user-id", "u2")
      .send({ name: "林小姐", accountUserIds: ["u4"], reviewScopes: ["技术评审"] });
    expectDenied(denied, "EXPERT_DIRECTORY_MAINTAINER_REQUIRED");

    const created = await request(runtime.app)
      .post("/api/experts")
      .set("x-mock-user-id", "u1")
      .send({
        name: "林小姐",
        category: "工程服务",
        ownerOrgId: "org-group",
        branchOrgId: "org-east",
        accountUserIds: ["u4"],
        reviewScopes: ["技术评审", "商务评审"],
        supplierAssessmentScopes: ["技术评审", "供应链评审"],
        sharedAccount: true,
        active: true,
        status: "可抽取",
        maintenanceLog: "新增评审专家"
      });
    expect(created.status).toBe(201);
    expect(created.body.expert.name).toBe("林小姐");
    expect(created.body.expert.accountUserIds).toEqual(["u4"]);
    expect(runtime.ctx.state.users.find((item) => item.id === "u4")?.expertId).toBe(created.body.expert.id);
    expect(runtime.ctx.state.experts.find((item) => item.id === "exp-1")?.accountUserIds ?? []).not.toContain("u4");

    const expertRow = runtime.ctx.runtimeDb.db
      .prepare("select branch_org_id, review_scopes_json, supplier_assessment_scopes_json, shared_account, active_flag from r2_experts where id = ?")
      .get(created.body.expert.id) as { branch_org_id: string; review_scopes_json: string; supplier_assessment_scopes_json: string; shared_account: number; active_flag: number };
    expect(expertRow.branch_org_id).toBe("org-east");
    expect(JSON.parse(expertRow.review_scopes_json)).toContain("技术评审");
    expect(JSON.parse(expertRow.supplier_assessment_scopes_json)).toContain("供应链评审");
    expect(expertRow.shared_account).toBe(1);
    expect(expertRow.active_flag).toBe(1);

    const userRow = runtime.ctx.runtimeDb.db.prepare("select expert_id from r2_users where id = 'u4'").get() as { expert_id: string };
    expect(userRow.expert_id).toBe(created.body.expert.id);
  });

  it("excludes disabled or out-of-scope experts from automatic draw", async () => {
    const assignableProject = runtime.ctx.state.projects.find((item) => item.id === "p-food")!;
    assignableProject.status = "bidding_locked";
    assignableProject.displayStatus = "bidding locked";
    assignableProject.beforeDeadline = false;

    const updated = await request(runtime.app)
      .patch("/api/experts/exp-1")
      .set("x-mock-user-id", "u1")
      .send({
        name: "赵教授",
        category: "酒店运营",
        active: false,
        status: "停用",
        reviewScopes: ["技术评审"],
        supplierAssessmentScopes: ["技术评审"],
        maintenanceLog: "暂停参与抽取"
      });
    expect(updated.status).toBe(200);
    expect(updated.body.expert.active).toBe(false);

    const draw = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/draw")
      .set("x-mock-user-id", "u2")
      .send({ count: 2, reason: "按范围抽取", reviewScopes: ["技术评审"] });
    expect(draw.status).toBe(201);
    expect(draw.body.assignments.some((item: { expertId: string }) => item.expertId === "exp-1")).toBe(false);
    expect(draw.body.assignments.every((item: { expertId: string }) => item.expertId !== "exp-4")).toBe(true);
  });

  it("enforces expert directory and draw permissions across business roles", async () => {
    const assignableProject = runtime.ctx.state.projects.find((item) => item.id === "p-food")!;
    assignableProject.status = "bidding_locked";
    assignableProject.displayStatus = "bidding locked";
    assignableProject.beforeDeadline = false;
    assignableProject.quoteDeadlineAt = "2026-01-01T00:00:00.000Z";

    const cases = [
      { role: "group_manager", userId: "u1", getExperts: 200, create: 201, update: 200, draw: 403, drawCode: "EXPERT_REVIEW_MANAGER_REQUIRED" },
      { role: "buyer", userId: "u2", getExperts: 200, create: 403, update: 403, draw: 201 },
      { role: "platform_operator", userId: "u10", getExperts: 200, create: 403, update: 403, draw: 201 },
      { role: "auditor", userId: "u5", getExperts: 200, create: 403, update: 403, draw: 403, drawCode: "EXPERT_REVIEW_MANAGER_REQUIRED" },
      { role: "expert", userId: "u4", getExperts: 403, create: 403, update: 403, draw: 403, getCode: "EXPERT_DIRECTORY_ROLE_DENIED", drawCode: "EXPERT_REVIEW_MANAGER_REQUIRED" },
      { role: "supplier", userId: "u3", getExperts: 403, create: 403, update: 403, draw: 403, getCode: "EXPERT_DIRECTORY_ROLE_DENIED", drawCode: "EXPERT_REVIEW_MANAGER_REQUIRED" },
      { role: "hotel_buyer", userId: "u8", getExperts: 403, create: 403, update: 403, draw: 403, getCode: "EXPERT_DIRECTORY_ROLE_DENIED", drawCode: "EXPERT_REVIEW_MANAGER_REQUIRED" },
      { role: "admin", userId: "u6", getExperts: 403, create: 403, update: 403, draw: 403, getCode: "ADMIN_BUSINESS_DATA_DENIED", drawCode: "EXPERT_REVIEW_MANAGER_REQUIRED" }
    ];

    for (const item of cases) {
      const getExperts = await request(runtime.app).get("/api/experts").set("x-mock-user-id", item.userId);
      expect(getExperts.status, `${item.role} GET /api/experts`).toBe(item.getExperts);
      if (item.getCode) expect(getExperts.body.error.code).toBe(item.getCode);

      const create = await request(runtime.app)
        .post("/api/experts")
        .set("x-mock-user-id", item.userId)
        .send({ name: `矩阵专家-${item.role}`, category: "矩阵", reviewScopes: ["技术评审"], supplierAssessmentScopes: ["技术评审"], active: true, status: "可抽取" });
      expect(create.status, `${item.role} POST /api/experts`).toBe(item.create);
      if (item.create === 403) expect(create.body.error.code).toBe("EXPERT_DIRECTORY_MAINTAINER_REQUIRED");

      const update = await request(runtime.app)
        .patch("/api/experts/exp-1")
        .set("x-mock-user-id", item.userId)
        .send({ name: "赵教授", category: "酒店运营", reviewScopes: ["技术评审"], supplierAssessmentScopes: ["技术评审"], active: true, status: "可抽取" });
      expect(update.status, `${item.role} PATCH /api/experts/exp-1`).toBe(item.update);
      if (item.update === 403) expect(update.body.error.code).toBe("EXPERT_DIRECTORY_MAINTAINER_REQUIRED");

      assignableProject.assignedExpertIds = [];
      runtime.ctx.state.expertAssignments = runtime.ctx.state.expertAssignments.filter((assignment) => assignment.projectId !== "p-food");
      const draw = await request(runtime.app)
        .post("/api/projects/p-food/expert-assignments/draw")
        .set("x-mock-user-id", item.userId)
        .send({ count: 1, reason: "矩阵抽取", reviewScopes: ["技术评审"] });
      expect(draw.status, `${item.role} POST draw`).toBe(item.draw);
      if (item.drawCode) expect(draw.body.error.code).toBe(item.drawCode);
    }
  });

  it("lets business roles manage expert assignments with mandatory reasons and blocks external-trade review", async () => {
    const assignableProject = runtime.ctx.state.projects.find((item) => item.id === "p-food")!;
    assignableProject.status = "bidding_locked";
    assignableProject.displayStatus = "bidding locked";
    assignableProject.beforeDeadline = false;

    const missingReason = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-1" });
    expectDenied(missingReason, "EXPERT_APPOINT_REASON_REQUIRED");

    const appointed = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-1", reason: "category match" });
    expect(appointed.status).toBe(201);
    expect(appointed.body.assignment.expertId).toBe("exp-1");
    expect(runtime.ctx.state.projects.find((item) => item.id === "p-food")?.assignedExpertIds).toContain("exp-1");

    const replaced = await request(runtime.app)
      .post(`/api/expert-assignments/${appointed.body.assignment.id}/replace`)
      .set("x-mock-user-id", "u2")
      .send({ replacementExpertId: "exp-3", reason: "avoidance relation" });
    expect(replaced.status).toBe(201);
    expect(replaced.body.replacement.expertId).toBe("exp-3");

    const external = await request(runtime.app)
      .post("/api/projects/p-ext/expert-assignments/draw")
      .set("x-mock-user-id", "u2")
      .send({ count: 1 });
    expectDenied(external, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");
  });

  it("blocks duplicate expert assignment in the same project", async () => {
    const assignableProject = runtime.ctx.state.projects.find((item) => item.id === "p-food")!;
    assignableProject.status = "bidding_locked";
    assignableProject.displayStatus = "bidding locked";
    assignableProject.beforeDeadline = false;
    assignableProject.assignedExpertIds = [];
    runtime.ctx.state.expertAssignments = runtime.ctx.state.expertAssignments.filter((assignment) => assignment.projectId !== "p-food");

    const first = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-1", reason: "first appoint" });
    expect(first.status).toBe(201);

    const duplicateAppoint = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-1", reason: "duplicate appoint" });
    expectDenied(duplicateAppoint, "EXPERT_ASSIGNMENT_DUPLICATE", ["duplicate appoint"]);
    expect(runtime.ctx.state.expertAssignments.filter((assignment) => assignment.projectId === "p-food" && assignment.expertId === "exp-1")).toHaveLength(1);

    const second = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-3", reason: "second appoint" });
    expect(second.status).toBe(201);

    const duplicateReplacement = await request(runtime.app)
      .post(`/api/expert-assignments/${first.body.assignment.id}/replace`)
      .set("x-mock-user-id", "u2")
      .send({ replacementExpertId: "exp-3", reason: "replace to existing expert" });
    expectDenied(duplicateReplacement, "EXPERT_ASSIGNMENT_DUPLICATE", ["replace to existing expert"]);
    expect(runtime.ctx.state.expertAssignments.find((assignment) => assignment.id === first.body.assignment.id)?.status).toBe("assigned");

    const draw = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/draw")
      .set("x-mock-user-id", "u2")
      .send({ count: 10, reason: "draw after manual appoint" });
    expect(draw.status).toBe(201);
    const drawnExpertIds = draw.body.assignments.map((assignment: { expertId: string }) => assignment.expertId);
    expect(drawnExpertIds).not.toContain("exp-1");
    expect(drawnExpertIds).not.toContain("exp-3");
    expect(new Set(drawnExpertIds).size).toBe(drawnExpertIds.length);
  });

  it("creates expert confirmation tasks and notifications before scoring sheets exist", async () => {
    const assignableProject = runtime.ctx.state.projects.find((item) => item.id === "p-food")!;
    assignableProject.status = "bidding_locked";
    assignableProject.displayStatus = "bidding locked";
    assignableProject.beforeDeadline = false;

    const appointed = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-1", reason: "confirmation handoff regression" });
    expect(appointed.status).toBe(201);
    const assignmentId = appointed.body.assignment.id as string;

    const myAssignments = await request(runtime.app).get("/api/expert-review/my-assignments").set("x-mock-user-id", "u4");
    expect(myAssignments.status).toBe(200);
    expect(myAssignments.body.assignments).toEqual(expect.arrayContaining([expect.objectContaining({ id: assignmentId, projectId: "p-food", status: "assigned" })]));

    const expertTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u4");
    expect(expertTasks.status).toBe(200);
    expect(expertTasks.body.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `task:expert_confirmation:${assignmentId}`,
          businessType: "review_award",
          businessId: "p-food",
          taskType: "review_award_expert_confirmation",
          status: "pending"
        })
      ])
    );

    const expertMessages = await request(runtime.app).get("/api/workflow/notifications").set("x-mock-user-id", "u4");
    expect(expertMessages.status).toBe(200);
    expect(expertMessages.body.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          businessType: "review_award",
          businessId: "p-food",
          recipientUserId: "u4",
          read: false
        })
      ])
    );

    const emptySheets = await request(runtime.app).get("/api/expert-review/my-scoring-sheets").set("x-mock-user-id", "u4");
    expect(emptySheets.status).toBe(200);
    expect(emptySheets.body.scoringSheets.some((item: { projectId: string }) => item.projectId === "p-food")).toBe(false);

    for (const type of ["avoidance", "discipline", "confidentiality"]) {
      const confirmed = await request(runtime.app)
        .post(`/api/expert-assignments/${assignmentId}/confirm`)
        .set("x-mock-user-id", "u4")
        .send({ type });
      expect(confirmed.status).toBe(200);
    }

    const completedTasks = await request(runtime.app).get("/api/workflow/tasks").set("x-mock-user-id", "u4");
    expect(completedTasks.body.tasks.find((item: { id: string }) => item.id === `task:expert_confirmation:${assignmentId}`)?.status).toBe("completed");

    const generatedSheets = await request(runtime.app).get("/api/expert-review/my-scoring-sheets").set("x-mock-user-id", "u4");
    expect(generatedSheets.body.scoringSheets.some((item: { projectId: string }) => item.projectId === "p-food")).toBe(true);
  });

  it("maintains scoring templates and applies the enabled template to newly generated sheets", async () => {
    const expertDenied = await request(runtime.app)
      .post("/api/scoring-templates")
      .set("x-mock-user-id", "u4")
      .send({ templateCode: "expert-denied", templateName: "expert denied", items: [] });
    expectDenied(expertDenied, "SCORING_TEMPLATE_MAINTAINER_REQUIRED", ["expert-denied"]);

    const created = await request(runtime.app)
      .post("/api/scoring-templates")
      .set("x-mock-user-id", "u10")
      .send({
        templateCode: "hotel-cleaning-v1",
        templateName: "客房清洁用品评分模板",
        status: "draft",
        items: [
          { id: "spec_match", category: "technical", categoryLabel: "技术分", label: "规格响应", reference: "参数与样品符合", evidence: "响应文件", maxScore: 40 },
          { id: "service_plan", category: "service", categoryLabel: "商务分", label: "服务方案", reference: "交付与售后", evidence: "服务承诺", maxScore: 30 },
          { id: "price_score", category: "price", categoryLabel: "价格分", label: "价格竞争力", reference: "报价清单", evidence: "报价文件", maxScore: 30 }
        ]
      });
    expect(created.status).toBe(201);
    expect(created.body.scoringTemplate.totalScore).toBe(100);
    expect(created.body.scoringTemplate.status).toBe("draft");

    const enabled = await request(runtime.app)
      .post(`/api/scoring-templates/${created.body.scoringTemplate.id}/enable`)
      .set("x-mock-user-id", "u10");
    expect(enabled.status).toBe(200);
    expect(enabled.body.scoringTemplate.status).toBe("enabled");

    const assignableProject = runtime.ctx.state.projects.find((item) => item.id === "p-food")!;
    assignableProject.status = "bidding_locked";
    assignableProject.displayStatus = "bidding locked";
    assignableProject.beforeDeadline = false;
    assignableProject.assignedExpertIds = [];
    runtime.ctx.state.expertAssignments = runtime.ctx.state.expertAssignments.filter((assignment) => assignment.projectId !== "p-food");
    runtime.ctx.state.scoringSheets = runtime.ctx.state.scoringSheets.filter((sheet) => sheet.projectId !== "p-food");

    const appointed = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-1", reason: "template application regression" });
    expect(appointed.status).toBe(201);

    for (const type of ["avoidance", "discipline", "confidentiality"]) {
      const confirmed = await request(runtime.app)
        .post(`/api/expert-assignments/${appointed.body.assignment.id}/confirm`)
        .set("x-mock-user-id", "u4")
        .send({ type });
      expect(confirmed.status).toBe(200);
    }

    const mySheets = await request(runtime.app).get("/api/expert-review/my-scoring-sheets").set("x-mock-user-id", "u4");
    const generatedSheet = mySheets.body.scoringSheets.find((item: { projectId: string }) => item.projectId === "p-food");
    expect(generatedSheet.templateId).toBe(created.body.scoringTemplate.id);

    const sheetDetail = await request(runtime.app).get(`/api/scoring-sheets/${generatedSheet.id}`).set("x-mock-user-id", "u4");
    expect(sheetDetail.status).toBe(200);
    expect(sheetDetail.body.scoringSheet.templateName).toBe("客房清洁用品评分模板");
    expect(sheetDetail.body.scoringSheet.scoringItems.map((item: { id: string }) => item.id)).toEqual(["spec_match", "service_plan", "price_score"]);

    const blockedMutation = await request(runtime.app)
      .patch(`/api/scoring-templates/${created.body.scoringTemplate.id}`)
      .set("x-mock-user-id", "u10")
      .send({ items: [{ id: "changed", category: "technical", label: "已使用模板改项", maxScore: 100 }] });
    expectDenied(blockedMutation, "SCORING_TEMPLATE_IN_USE", ["已使用模板改项"]);
  });

  it("blocks expert assignment before bids are locked", async () => {
    const blockedOpenProject = await request(runtime.app)
      .post("/api/projects/p-pre/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-1", reason: "should wait for bid lock" });
    expectDenied(blockedOpenProject, "BID_DEADLINE_NOT_REACHED", ["should wait for bid lock"]);

    const cutoffWithoutLockProject = runtime.ctx.state.projects.find((item) => item.id === "p-food")!;
    cutoffWithoutLockProject.status = "bidding_open";
    cutoffWithoutLockProject.displayStatus = "bid cutoff completed";
    cutoffWithoutLockProject.beforeDeadline = false;

    const blockedAfterCutoff = await request(runtime.app)
      .post("/api/projects/p-food/expert-assignments/appoint")
      .set("x-mock-user-id", "u2")
      .send({ expertId: "exp-1", reason: "cutoff without bid lock" });
    expectDenied(blockedAfterCutoff, "BID_NOT_LOCKED", ["cutoff without bid lock"]);
  });

  it("requires expert confirmations before material access and scoring", async () => {
    const sheet = await request(runtime.app).get("/api/scoring-sheets/score-open").set("x-mock-user-id", "u7");
    expect(sheet.status).toBe(200);

    const material = await request(runtime.app).post("/api/expert-review/p-award/materials/view-check").set("x-mock-user-id", "u7");
    expectDenied(material, "EXPERT_AVOIDANCE_REQUIRED");

    const saveBeforeConfirm = await request(runtime.app)
      .post("/api/scoring-sheets/score-open/save")
      .set("x-mock-user-id", "u7")
      .send({ technical: 40, service: 25, price: 20, opinion: "before confirm" });
    expectDenied(saveBeforeConfirm, "EXPERT_AVOIDANCE_REQUIRED", ["before confirm"]);

    for (const type of ["avoidance", "discipline", "confidentiality"]) {
      const confirmed = await request(runtime.app)
        .post("/api/expert-assignments/ea-3/confirm")
        .set("x-mock-user-id", "u7")
        .send({ type });
      expect(confirmed.status).toBe(200);
    }

    const saved = await request(runtime.app)
      .post("/api/scoring-sheets/score-open/save")
      .set("x-mock-user-id", "u7")
      .send({ technical: 40, service: 25, price: 20, opinion: "confirmed score" });
    expect(saved.status).toBe(200);
    expect(saved.body.scoringSheet.total).toBe(85);
  });

  it("supports itemized expert scoring details and dedicated review record detail", async () => {
    for (const type of ["avoidance", "discipline", "confidentiality"]) {
      const confirmed = await request(runtime.app)
        .post("/api/expert-assignments/ea-3/confirm")
        .set("x-mock-user-id", "u7")
        .send({ type });
      expect(confirmed.status).toBe(200);
    }

    const itemizedPayload = {
      details: {
        technical_compliance: { score: 20, comment: "technical compliance ok" },
        technical_quality: { score: 12, comment: "stable supply capacity" },
        business_service: { score: 18, comment: "service commitment accepted" },
        business_terms: { score: 8, comment: "terms are acceptable" },
        price_reasonableness: { score: 26, comment: "price is reasonable" }
      },
      opinion: "itemized expert opinion"
    };

    const saved = await request(runtime.app).post("/api/scoring-sheets/score-open/save").set("x-mock-user-id", "u7").send(itemizedPayload);
    expect(saved.status).toBe(200);
    expect(saved.body.scoringSheet.technical).toBe(32);
    expect(saved.body.scoringSheet.service).toBe(26);
    expect(saved.body.scoringSheet.price).toBe(26);
    expect(saved.body.scoringSheet.total).toBe(84);
    expect(saved.body.scoringSheet.details.technical_compliance.comment).toBe("technical compliance ok");

    const detail = await request(runtime.app).get("/api/scoring-sheets/score-open").set("x-mock-user-id", "u7");
    expect(detail.status).toBe(200);
    expect(detail.body.scoringSheet.scoringItems.length).toBeGreaterThan(0);
    expect(detail.body.scoringSheet.supplierName).toBeTruthy();
    expect(detail.body.scoringSheet.materials).toHaveProperty("registrationMaterials");

    const submitted = await request(runtime.app).post("/api/scoring-sheets/score-open/submit-lock").set("x-mock-user-id", "u7").send(itemizedPayload);
    expect(submitted.status).toBe(200);
    expect(submitted.body.version.snapshotJson.details.technical_quality.comment).toBe("stable supply capacity");

    const blockedExpertProjectDetail = await request(runtime.app).get("/api/projects/p-award/review-record-detail").set("x-mock-user-id", "u7");
    expectDenied(blockedExpertProjectDetail, "EXPERT_REVIEW_DETAIL_READ_DENIED", ["itemized expert opinion"]);

    runtime.ctx.state.scoringSheets = runtime.ctx.state.scoringSheets.filter((item) => item.id !== "score-open");
    const projectDetail = await request(runtime.app).get("/api/projects/p-award/review-record-detail").set("x-mock-user-id", "u2");
    expect(projectDetail.status).toBe(200);
    expect(projectDetail.body.detail.supplierRecords[0].supplierId).toBe("sup-1");
    expect(projectDetail.body.detail.sheetRecords[0].details[0]).toHaveProperty("label");
    expect(projectDetail.body.detail.sheetRecords[0]).toHaveProperty("opinion");
  });

  it("enforces expert-only scoring isolation and lock semantics", async () => {
    const buyerRead = await request(runtime.app).get("/api/scoring-sheets/score-1").set("x-mock-user-id", "u2");
    expectDenied(buyerRead, "EXPERT_ROLE_REQUIRED", ["综合服务能力"]);

    const otherExpertRead = await request(runtime.app).get("/api/scoring-sheets/score-3").set("x-mock-user-id", "u4");
    expectDenied(otherExpertRead, "EXPERT_SCORE_SCOPE_DENIED", ["质量控制"]);

    const buyerSave = await request(runtime.app).post("/api/scoring-sheets/score-open/save").set("x-mock-user-id", "u2").send({ opinion: "buyer edit" });
    expectDenied(buyerSave, "EXPERT_ROLE_REQUIRED", ["buyer edit"]);

    const locked = await request(runtime.app).post("/api/scoring-sheets/score-1/save").set("x-mock-user-id", "u4").send({ opinion: "locked edit" });
    expectDenied(locked, "SCORING_SHEET_LOCKED", ["locked edit"]);
  });

  it("creates reevaluation versions without replacing history", async () => {
    const openRequest = await request(runtime.app)
      .post("/api/scoring-sheets/score-open/reevaluation-request")
      .set("x-mock-user-id", "u2")
      .send({ reason: "invalid open reevaluation" });
    expectDenied(openRequest, "REEVALUATION_SOURCE_NOT_LOCKED", ["invalid open reevaluation"]);

    const requestRes = await request(runtime.app)
      .post("/api/scoring-sheets/score-1/reevaluation-request")
      .set("x-mock-user-id", "u2")
      .send({ reason: "score review requested" });
    expect(requestRes.status).toBe(201);

    const approved = await request(runtime.app)
      .post("/api/scoring-sheets/score-1/reevaluation-approve")
      .set("x-mock-user-id", "u2")
      .send({ reason: "approved for correction" });
    expect(approved.status).toBe(200);
    expect(approved.body.version.versionNo).toBe(3);
    expect(runtime.ctx.state.scoringVersions.filter((item) => item.sheetId === "score-1")).toHaveLength(4);
  });

  it("revokes replaced expert access to old open scoring sheets", async () => {
    const reviewingProject = runtime.ctx.state.projects.find((item) => item.id === "p-award")!;
    reviewingProject.status = "expert_reviewing";
    reviewingProject.displayStatus = "expert reviewing";
    reviewingProject.beforeDeadline = false;
    const replacementExpert = await request(runtime.app)
      .post("/api/experts")
      .set("x-mock-user-id", "u1")
      .send({
        name: "phase4 replacement expert",
        category: "regression",
        reviewScopes: ["technical"],
        supplierAssessmentScopes: ["technical"],
        active: true,
        status: "available"
      });
    expect(replacementExpert.status).toBe(201);

    const replaced = await request(runtime.app)
      .post("/api/expert-assignments/ea-3/replace")
      .set("x-mock-user-id", "u2")
      .send({ replacementExpertId: replacementExpert.body.expert.id, reason: "phase4 replacement regression" });
    expect(replaced.status).toBe(201);

    const read = await request(runtime.app).get("/api/scoring-sheets/score-open").set("x-mock-user-id", "u7");
    expectDenied(read, "EXPERT_ASSIGNMENT_INACTIVE");

    const save = await request(runtime.app)
      .post("/api/scoring-sheets/score-open/save")
      .set("x-mock-user-id", "u7")
      .send({ technical: 10, service: 10, price: 10, opinion: "stale expert edit" });
    expectDenied(save, "EXPERT_ASSIGNMENT_INACTIVE", ["stale expert edit"]);

    const mySheets = await request(runtime.app).get("/api/expert-review/my-scoring-sheets").set("x-mock-user-id", "u7");
    expect(mySheets.status).toBe(200);
    expect(mySheets.body.scoringSheets.some((item: { id: string }) => item.id === "score-open")).toBe(false);
  });

  it("blocks expert-review actions for external-trade projects even if dirty data exists", async () => {
    runtime.ctx.state.projects.find((item) => item.id === "p-ext")!.assignedExpertIds.push("exp-4");
    runtime.ctx.state.expertAssignments.push({
      id: "ea-ext-dirty",
      projectId: "p-ext",
      expertId: "exp-4",
      method: "dirty",
      status: "confirmed",
      avoidanceConfirmed: true,
      disciplineConfirmed: true,
      confidentialityConfirmed: true
    });
    runtime.ctx.state.scoringSheets.push({
      id: "score-ext-dirty",
      projectId: "p-ext",
      expertId: "exp-4",
      supplierId: "sup-4",
      templateId: "st-1",
      technical: 0,
      service: 0,
      price: 0,
      total: 0,
      status: "scoring",
      opinion: "",
      versionNo: 1,
      submittedAt: null,
      lockedAt: null
    });

    const material = await request(runtime.app).post("/api/expert-review/p-ext/materials/view-check").set("x-mock-user-id", "u7");
    expectDenied(material, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED");

    const save = await request(runtime.app)
      .post("/api/scoring-sheets/score-ext-dirty/save")
      .set("x-mock-user-id", "u7")
      .send({ technical: 10, service: 10, price: 10, opinion: "external dirty edit" });
    expectDenied(save, "EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED", ["external dirty edit"]);
  });

  it("generates scoring summary and freezes review report only after all sheets are submitted", async () => {
    const notAllSubmitted = await request(runtime.app).post("/api/projects/p-award/review-report").set("x-mock-user-id", "u2");
    expectDenied(notAllSubmitted, "SCORING_NOT_ALL_SUBMITTED");

    runtime.ctx.state.scoringSheets = runtime.ctx.state.scoringSheets.filter((item) => item.id !== "score-open");

    const summary = await request(runtime.app).get("/api/projects/p-award/scoring-summary").set("x-mock-user-id", "u2");
    expect(summary.status).toBe(200);
    expect(summary.body.summary.ranking[0].supplierId).toBe("sup-1");
    expect(summary.body.summary.allSubmitted).toBe(true);

    const report = await request(runtime.app).post("/api/projects/p-award/review-report").set("x-mock-user-id", "u2").send({ note: "phase4 report" });
    expect(report.status).toBe(201);
    expect(report.body.report.status).toBe("generated");

    const frozen = await request(runtime.app).post("/api/projects/p-award/review-report/freeze").set("x-mock-user-id", "u2");
    expect(frozen.status).toBe(200);
    expect(frozen.body.project.status).toBe("review_report_frozen");

    const afterFreeze = await request(runtime.app)
      .post("/api/scoring-sheets/score-1/reevaluation-request")
      .set("x-mock-user-id", "u2")
      .send({ reason: "late change" });
    expectDenied(afterFreeze, "REVIEW_REPORT_FROZEN", ["late change"]);
  });
});
