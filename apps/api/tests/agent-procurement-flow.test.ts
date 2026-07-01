import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-agent-flow-"));
}

function boot() {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot: makeDataRoot(),
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

const actors = {
  hotelDemand: { label: "hotel-demand-agent", userId: "u8" },
  groupApproval: { label: "group-approval-agent", userId: "u1" },
  procurement: { label: "procurement-execution-agent", userId: "u2" },
  supplierQuote: { label: "supplier-quotation-agent", userId: "u12" },
  expertScore: { label: "expert-score-agent", userId: "u4" },
  compliance: { label: "compliance-workflow-agent", userId: "u1" }
};

type Actor = (typeof actors)[keyof typeof actors];

function postAs(runtime: ReturnType<typeof boot>, actor: Actor, url: string) {
  return request(runtime.app).post(url).set("x-mock-user-id", actor.userId);
}

function getAs(runtime: ReturnType<typeof boot>, actor: Actor, url: string) {
  return request(runtime.app).get(url).set("x-mock-user-id", actor.userId);
}

async function step<T extends request.Response>(trace: string[], actor: Actor, action: string, response: Promise<T>, status = 200) {
  const result = await response;
  expect(result.status).toBe(status);
  trace.push(`${actor.label}:${action}`);
  return result;
}

async function confirmExpertAssignment(runtime: ReturnType<typeof boot>, trace: string[], assignmentId: string) {
  for (const type of ["avoidance", "discipline", "confidentiality"]) {
    await step(trace, actors.expertScore, `confirm-${type}`, postAs(runtime, actors.expertScore, `/api/expert-assignments/${assignmentId}/confirm`).send({ type }));
  }
}

describe("role-agent procurement flow", () => {
  it("runs hotel demand, group approval, procurement execution, expert scoring and formal award compliance", async () => {
    const runtime = boot();
    const trace: string[] = [];

    const createdRequest = await step(
      trace,
      actors.hotelDemand,
      "create-request",
      postAs(runtime, actors.hotelDemand, "/api/procurement-requests").send({
        title: "Agent flow linen purchase",
        orgId: "org-hotel",
        requestDepartment: "Housekeeping",
        requesterName: "Hotel buyer",
        category: "客房布草",
        budgetAmount: 120000,
        purpose: "hotel operating supply",
        expectedArrivalAt: "2026-07-10",
        receivingLocation: "Shanghai hotel warehouse",
        lineItems: [
          {
            itemName: "Linen set",
            category: "客房布草",
            specification: "standard",
            quantity: 100,
            unit: "set",
            estimatedUnitPrice: 120,
            budgetAmount: 12000,
            requiredByDate: "2026-07-10"
          }
        ]
      }),
      201
    );
    const requestId = createdRequest.body.procurementRequest.id as string;

    await step(trace, actors.hotelDemand, "submit-request", postAs(runtime, actors.hotelDemand, `/api/procurement-requests/${requestId}/submit`));

    const buyerApprove = await postAs(runtime, actors.procurement, `/api/procurement-requests/${requestId}/approve`).send({ approved: true });
    expect(buyerApprove.status).toBe(403);
    expect(buyerApprove.body.error.code).toBe("PROCUREMENT_REQUEST_APPROVER_REQUIRED");

    const approvedRequest = await step(
      trace,
      actors.groupApproval,
      "approve-request",
      postAs(runtime, actors.groupApproval, `/api/procurement-requests/${requestId}/approve`).send({ approved: true, opinion: "demand approved" })
    );
    expect(approvedRequest.body.procurementRequest.approvalStatus).toBe("approved");

    await step(trace, actors.procurement, "decide-method", postAs(runtime, actors.procurement, `/api/procurement-requests/${requestId}/method-decision`).send({ ruleId: "pmr-1" }));

    const createdProject = await step(
      trace,
      actors.procurement,
      "create-project",
      postAs(runtime, actors.procurement, "/api/projects").send({ requestId, name: "Agent flow procurement project" }),
      201
    );
    const projectId = createdProject.body.project.id as string;

    const groupDocument = await postAs(runtime, actors.groupApproval, `/api/projects/${projectId}/procurement-documents`).send({ title: "group should not create document" });
    expect(groupDocument.status).toBe(403);

    const createdDocument = await step(
      trace,
      actors.procurement,
      "create-procurement-document",
      postAs(runtime, actors.procurement, `/api/projects/${projectId}/procurement-documents`).send({
        title: "Agent flow procurement document",
        contentSummary: "supplier qualification and quotation requirements"
      }),
      201
    );
    const documentId = createdDocument.body.procurementDocument.id as string;

    const retiredReview = await postAs(runtime, actors.procurement, `/api/procurement-documents/${documentId}/submit-review`);
    expect(retiredReview.status).toBe(410);
    expect(retiredReview.body.error.code).toBe("PROCUREMENT_DOCUMENT_REVIEW_DISABLED");

    await step(trace, actors.procurement, "publish-document", postAs(runtime, actors.procurement, `/api/procurement-documents/${documentId}/publish`));

    const createdAnnouncement = await step(
      trace,
      actors.procurement,
      "create-announcement",
      postAs(runtime, actors.procurement, `/api/projects/${projectId}/announcements`).send({
        documentId,
        title: "Agent flow announcement",
        procurementMethod: "internal_open",
        scope: "invited_suppliers",
        registrationDeadlineAt: "2099-12-20T17:00:00.000Z",
        quoteDeadlineAt: "2099-12-31T17:00:00.000Z"
      }),
      201
    );
    const announcementId = createdAnnouncement.body.announcement.id as string;

    await step(trace, actors.procurement, "publish-announcement", postAs(runtime, actors.procurement, `/api/announcements/${announcementId}/publish`).send({ supplierIds: ["sup-1"] }));

    const registered = await step(trace, actors.supplierQuote, "register", postAs(runtime, actors.supplierQuote, `/api/announcements/${announcementId}/registrations`).send({ materialMetadata: [] }), 201);
    const registrationId = registered.body.registration.id as string;

    await step(trace, actors.procurement, "qualify-registration", postAs(runtime, actors.procurement, `/api/registrations/${registrationId}/qualify`).send({ status: "qualified" }));

    const draftBid = await step(
      trace,
      actors.supplierQuote,
      "draft-bid",
      postAs(runtime, actors.supplierQuote, `/api/projects/${projectId}/bids`).send({
        amount: 118000,
        deliveryDays: 5,
        responseSummary: "agent flow quote",
        lineItems: [{ itemName: "Linen set", quantity: 100, unit: "set", unitPrice: 1180, totalPrice: 118000 }]
      }),
      201
    );
    const bidId = draftBid.body.bid.id as string;

    await step(trace, actors.supplierQuote, "submit-bid", postAs(runtime, actors.supplierQuote, `/api/bids/${bidId}/submit`));
    await step(trace, actors.procurement, "cutoff-bids", postAs(runtime, actors.procurement, `/api/projects/${projectId}/bids/cutoff`).send({ action: "manual_cutoff" }));
    await step(trace, actors.procurement, "lock-bids", postAs(runtime, actors.procurement, `/api/projects/${projectId}/bids/lock`));

    const assignment = await step(
      trace,
      actors.procurement,
      "appoint-expert",
      postAs(runtime, actors.procurement, `/api/projects/${projectId}/expert-assignments/appoint`).send({ expertId: "exp-1", reason: "agent flow expert assignment" }),
      201
    );
    const assignmentId = assignment.body.assignment.id as string;

    await confirmExpertAssignment(runtime, trace, assignmentId);

    const mySheets = await step(trace, actors.expertScore, "load-scoring-sheet", getAs(runtime, actors.expertScore, "/api/expert-review/my-scoring-sheets"));
    const sheet = mySheets.body.scoringSheets.find((item: { projectId: string; supplierId: string }) => item.projectId === projectId && item.supplierId === "sup-1");
    expect(sheet).toBeTruthy();

    await step(
      trace,
      actors.expertScore,
      "submit-score",
      postAs(runtime, actors.expertScore, `/api/scoring-sheets/${sheet.id}/submit-lock`).send({ technical: 45, service: 30, price: 20, opinion: "agent flow supplier is qualified" })
    );

    await step(trace, actors.procurement, "generate-comparison", postAs(runtime, actors.procurement, `/api/projects/${projectId}/comparison-report`), 201);
    await step(trace, actors.procurement, "generate-review-report", postAs(runtime, actors.procurement, `/api/projects/${projectId}/review-report`).send({ note: "agent flow review" }), 201);
    await step(trace, actors.procurement, "freeze-review-report", postAs(runtime, actors.procurement, `/api/projects/${projectId}/review-report/freeze`));

    const award = await step(
      trace,
      actors.procurement,
      "create-award",
      postAs(runtime, actors.procurement, `/api/projects/${projectId}/award-approvals`).send({ selectedSupplierId: "sup-1" }),
      201
    );
    const awardId = award.body.approval.id as string;

    const submittedAward = await step(trace, actors.procurement, "submit-award", postAs(runtime, actors.procurement, `/api/award-approvals/${awardId}/submit`));
    const workflowInstanceId = submittedAward.body.workflow.approvalInstance.id as string;

    const approvedAward = await step(
      trace,
      actors.compliance,
      "approve-award-workflow",
      postAs(runtime, actors.compliance, `/api/workflow/approval-instances/${workflowInstanceId}/actions`).send({ action: "approve", opinion: "formal compliance approval" })
    );
    expect(approvedAward.body.approvalInstance.approvalStatus).toBe("approved");
    expect(runtime.ctx.state.awardApprovals.find((item) => item.id === awardId)?.approvalStatus).toBe("approved");
    expect(runtime.ctx.state.projects.find((item) => item.id === projectId)?.status).toBe("awarded_pending_order");

    await step(trace, actors.procurement, "send-result-notification", postAs(runtime, actors.procurement, `/api/projects/${projectId}/result-notifications`).send({ scope: "supplier_self", visibilityConfig: "supplier_self_only" }), 201);

    expect(trace).toEqual([
      "hotel-demand-agent:create-request",
      "hotel-demand-agent:submit-request",
      "group-approval-agent:approve-request",
      "procurement-execution-agent:decide-method",
      "procurement-execution-agent:create-project",
      "procurement-execution-agent:create-procurement-document",
      "procurement-execution-agent:publish-document",
      "procurement-execution-agent:create-announcement",
      "procurement-execution-agent:publish-announcement",
      "supplier-quotation-agent:register",
      "procurement-execution-agent:qualify-registration",
      "supplier-quotation-agent:draft-bid",
      "supplier-quotation-agent:submit-bid",
      "procurement-execution-agent:cutoff-bids",
      "procurement-execution-agent:lock-bids",
      "procurement-execution-agent:appoint-expert",
      "expert-score-agent:confirm-avoidance",
      "expert-score-agent:confirm-discipline",
      "expert-score-agent:confirm-confidentiality",
      "expert-score-agent:load-scoring-sheet",
      "expert-score-agent:submit-score",
      "procurement-execution-agent:generate-comparison",
      "procurement-execution-agent:generate-review-report",
      "procurement-execution-agent:freeze-review-report",
      "procurement-execution-agent:create-award",
      "procurement-execution-agent:submit-award",
      "compliance-workflow-agent:approve-award-workflow",
      "procurement-execution-agent:send-result-notification"
    ]);
  });
});
