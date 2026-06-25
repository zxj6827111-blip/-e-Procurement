import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type { ExpertAssignment, InternalProjectStatus, ProcurementProject, ScoringSheet } from "../types.js";

const reviewManagerRoles = new Set(["buyer", "group_manager"]);
const reviewReaderRoles = new Set(["buyer", "group_manager", "auditor"]);

function denyResponse(
  ctx: AppContext,
  req: Request,
  res: Response,
  status: number,
  code: string,
  message: string,
  action: string,
  objectType: string,
  objectId: string,
  projectId?: string,
  reason = code
) {
  const auditLog = ctx.auditService.record({
    context: req.auth,
    action,
    objectType,
    objectId,
    projectId,
    result: "denied",
    reason
  });
  return res.status(status).json({ error: { code, message, auditLogId: auditLog.id } });
}

function ensureProject(ctx: AppContext, projectId: string, res: Response) {
  const project = ctx.state.projects.find((item) => item.id === projectId);
  if (!project) {
    res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
    return null;
  }
  return project;
}

function ensureSheet(ctx: AppContext, sheetId: string, res: Response) {
  const sheet = ctx.state.scoringSheets.find((item) => item.id === sheetId);
  if (!sheet) {
    res.status(404).json({ error: { code: "SCORING_SHEET_NOT_FOUND", message: "Scoring sheet does not exist." } });
    return null;
  }
  return sheet;
}

function ensureAssignment(ctx: AppContext, assignmentId: string, res: Response) {
  const assignment = ctx.state.expertAssignments.find((item) => item.id === assignmentId);
  if (!assignment) {
    res.status(404).json({ error: { code: "EXPERT_ASSIGNMENT_NOT_FOUND", message: "Expert assignment does not exist." } });
    return null;
  }
  return assignment;
}

function canReadProject(req: Request, project: ProcurementProject) {
  if (req.auth.roleId === "buyer") return req.auth.user.managedProjectIds?.includes(project.id) ?? false;
  if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") return req.auth.orgScope.includes(project.orgId);
  if (req.auth.roleId === "expert") return project.assignedExpertIds.includes(req.auth.user.expertId ?? "");
  return false;
}

function assertReviewManager(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_expert_review");
  if (!reviewManagerRoles.has(req.auth.roleId)) {
    return denyResponse(ctx, req, res, 403, "EXPERT_REVIEW_MANAGER_REQUIRED", "Only procurement business roles can maintain expert review records.", action, "project", project.id, project.id);
  }
  if (canReadProject(req, project)) return true;
  return denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot maintain expert review for this project.", action, "project", project.id, project.id);
}

function assertReviewReader(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (!reviewReaderRoles.has(req.auth.roleId)) {
    return denyResponse(ctx, req, res, 403, "EXPERT_REVIEW_READ_DENIED", "Current role cannot read expert review summary.", action, "project", project.id, project.id);
  }
  if (canReadProject(req, project)) return true;
  return denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot read this project.", action, "project", project.id, project.id);
}

function assertExpertRole(ctx: AppContext, req: Request, res: Response, action: string, objectId: string, projectId?: string) {
  if (req.auth.roleId === "expert" && req.auth.user.expertId) return true;
  return denyResponse(ctx, req, res, 403, "EXPERT_ROLE_REQUIRED", "Only expert accounts can access this expert review action.", action, "expert_review", objectId, projectId);
}

function getAssignmentForExpert(ctx: AppContext, projectId: string, expertId: string | undefined) {
  return ctx.state.expertAssignments.find((item) => item.projectId === projectId && item.expertId === expertId && !["replaced", "archived"].includes(item.status));
}

function isBeforeDeadline(project: ProcurementProject) {
  if (!project.quoteDeadlineAt) return false;
  return new Date(project.quoteDeadlineAt).getTime() > Date.now();
}

function assertProjectAllowsExpertReview(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string, objectId = project.id) {
  ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_expert_review");
  if (isBeforeDeadline(project)) {
    return denyResponse(ctx, req, res, 400, "BID_DEADLINE_NOT_REACHED", "Expert review is allowed only after quote deadline.", action, "project", objectId, project.id, "deadline not reached");
  }
  return true;
}

function assertActiveExpertAssignment(ctx: AppContext, req: Request, res: Response, projectId: string, expertId: string | undefined, objectId: string, action: string) {
  const assignment = getAssignmentForExpert(ctx, projectId, expertId);
  if (assignment) return assignment;
  denyResponse(ctx, req, res, 403, "EXPERT_ASSIGNMENT_INACTIVE", "Expert assignment is not active for this project.", action, "expert_assignment", objectId, projectId);
  return null;
}

function assertExpertMayScore(ctx: AppContext, req: Request, res: Response, sheet: ScoringSheet) {
  if (!assertExpertRole(ctx, req, res, "scoring_sheet.expert_role.denied", sheet.id, sheet.projectId)) return false;
  ctx.policies.expertAssignment.assertOwnScoringSheet(req.auth, sheet.expertId, sheet.id, sheet.projectId);
  const assignment = assertActiveExpertAssignment(ctx, req, res, sheet.projectId, req.auth.user.expertId, sheet.id, "scoring_sheet.assignment.denied");
  if (!assignment) return false;
  if (!assignment?.avoidanceConfirmed) {
    return denyResponse(ctx, req, res, 403, "EXPERT_AVOIDANCE_REQUIRED", "Expert must confirm avoidance before scoring.", "expert_review.avoidance.required", "scoring_sheet", sheet.id, sheet.projectId);
  }
  if (!assignment.disciplineConfirmed) {
    return denyResponse(ctx, req, res, 403, "EXPERT_DISCIPLINE_REQUIRED", "Expert must confirm discipline before scoring.", "expert_review.discipline.required", "scoring_sheet", sheet.id, sheet.projectId);
  }
  if (!assignment.confidentialityConfirmed) {
    return denyResponse(ctx, req, res, 403, "EXPERT_CONFIDENTIALITY_REQUIRED", "Expert must confirm confidentiality before scoring.", "expert_review.confidentiality.required", "scoring_sheet", sheet.id, sheet.projectId);
  }
  return true;
}

function assertExpertMayReadSheet(ctx: AppContext, req: Request, res: Response, sheet: ScoringSheet, action: string) {
  if (!assertExpertRole(ctx, req, res, action, sheet.id, sheet.projectId)) return false;
  const project = ensureProject(ctx, sheet.projectId, res);
  if (!project) return false;
  if (!assertProjectAllowsExpertReview(ctx, req, res, project, action, sheet.id)) return false;
  ctx.policies.expertAssignment.assertOwnScoringSheet(req.auth, sheet.expertId, sheet.id, sheet.projectId);
  return Boolean(assertActiveExpertAssignment(ctx, req, res, sheet.projectId, req.auth.user.expertId, sheet.id, action));
}

function assertReportMutable(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  const frozen = ctx.state.reviewReports.some((item) => item.projectId === project.id && item.status === "frozen") || project.status === "review_report_frozen";
  if (!frozen) return true;
  return denyResponse(ctx, req, res, 400, "REVIEW_REPORT_FROZEN", "Review report is frozen and substantive conclusions cannot be changed.", action, "project", project.id, project.id);
}

function updateSheetScores(sheet: ScoringSheet, body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  const technical = input.technical === undefined ? sheet.technical : Number(input.technical);
  const service = input.service === undefined ? sheet.service : Number(input.service);
  const price = input.price === undefined ? sheet.price : Number(input.price);
  if (![technical, service, price].every((item) => Number.isFinite(item) && item >= 0 && item <= 100)) {
    return false;
  }
  sheet.technical = technical;
  sheet.service = service;
  sheet.price = price;
  sheet.total = Number((technical + service + price).toFixed(2));
  sheet.details = { technical, service, price };
  sheet.opinion = String(input.opinion ?? sheet.opinion);
  return true;
}

function publicExpertAssignment(ctx: AppContext, assignment: ExpertAssignment) {
  const expert = ctx.state.experts.find((item) => item.id === assignment.expertId);
  return {
    ...assignment,
    expertName: expert?.name ?? assignment.expertId,
    expertCategory: expert?.category ?? "",
    notifiedAt: assignment.notifiedAt ?? null,
    createdAt: assignment.createdAt ?? null
  };
}

function buildScoringSummary(ctx: AppContext, projectId: string) {
  const project = ctx.state.projects.find((item) => item.id === projectId);
  const sheets = ctx.state.scoringSheets.filter((item) => item.projectId === projectId);
  const submittedSheets = sheets.filter((item) => item.status === "submitted_locked" || item.status === "resubmitted_locked");
  const suppliers = project?.participantSupplierIds ?? [];
  const supplierScores = suppliers.map((supplierId) => {
    const supplierSheets = submittedSheets.filter((item) => item.supplierId === supplierId);
    const supplier = ctx.state.suppliers.find((item) => item.id === supplierId);
    const avg = (selector: (sheet: ScoringSheet) => number) =>
      supplierSheets.length === 0 ? 0 : Number((supplierSheets.reduce((sum, sheet) => sum + selector(sheet), 0) / supplierSheets.length).toFixed(2));
    return {
      supplierId,
      supplierName: supplier?.name ?? supplierId,
      submittedCount: supplierSheets.length,
      technical: avg((sheet) => sheet.technical),
      service: avg((sheet) => sheet.service),
      price: avg((sheet) => sheet.price),
      total: avg((sheet) => sheet.total)
    };
  });
  const ranked = supplierScores.sort((a, b) => b.total - a.total).map((item, index) => ({ ...item, rank: index + 1 }));
  const lowestBid = ctx.state.bids.filter((item) => item.projectId === projectId).sort((a, b) => a.amount - b.amount)[0];
  const recommendedSupplierId = ranked[0]?.supplierId ?? null;
  const allSubmitted = sheets.length > 0 && sheets.every((item) => item.status === "submitted_locked" || item.status === "resubmitted_locked");
  return {
    projectId,
    submittedExpertCount: new Set(submittedSheets.map((item) => item.expertId)).size,
    totalExpertCount: new Set(sheets.map((item) => item.expertId)).size,
    allSubmitted,
    supplierScores: ranked,
    ranking: ranked.map((item) => ({ supplierId: item.supplierId, rank: item.rank, total: item.total })),
    anomalies: {
      scoreSpread: ranked.length > 1 ? Number((ranked[0].total - ranked[ranked.length - 1].total).toFixed(2)) : 0,
      priceWarning: lowestBid && recommendedSupplierId && lowestBid.supplierId !== recommendedSupplierId,
      nonLowestPriceRecommended: Boolean(lowestBid && recommendedSupplierId && lowestBid.supplierId !== recommendedSupplierId)
    },
    recommendation: recommendedSupplierId
      ? {
          supplierId: recommendedSupplierId,
          isLowestPrice: lowestBid?.supplierId === recommendedSupplierId,
          note: lowestBid?.supplierId === recommendedSupplierId ? "lowest price and highest score aligned" : "highest score is not the lowest price; Phase 5 award reason is required"
        }
      : null
  };
}

function projectToReviewing(project: ProcurementProject) {
  if (project.externalTradeFlag) return;
  project.status = "expert_reviewing" satisfies InternalProjectStatus;
  project.displayStatus = "expert reviewing";
}

export function expertReviewRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/experts", (req, res) => {
    if (!["buyer", "group_manager", "auditor"].includes(req.auth.roleId)) {
      if (req.auth.roleId === "admin") {
        ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "expert", "list");
      }
      return denyResponse(ctx, req, res, 403, "EXPERT_DIRECTORY_ROLE_DENIED", "Current role cannot read expert directory.", "expert.directory.denied", "expert", "list");
    }
    return res.json({ experts: ctx.state.experts });
  });

  router.get("/experts/:expertId", (req, res) => {
    if (!["buyer", "group_manager", "auditor"].includes(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "EXPERT_DIRECTORY_ROLE_DENIED", "Current role cannot read expert details.", "expert.detail.denied", "expert", req.params.expertId);
    }
    const expert = ctx.state.experts.find((item) => item.id === req.params.expertId);
    if (!expert) return res.status(404).json({ error: { code: "EXPERT_NOT_FOUND", message: "Expert does not exist." } });
    return res.json({ expert, assignments: ctx.state.expertAssignments.filter((item) => item.expertId === expert.id).map((item) => publicExpertAssignment(ctx, item)) });
  });

  router.get("/projects/:projectId/expert-assignments", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (req.auth.roleId === "expert") {
      ctx.policies.expertAssignment.assertExpertProjectAccess(req.auth, project.id);
      return res.json({ assignments: ctx.state.expertAssignments.filter((item) => item.projectId === project.id && item.expertId === req.auth.user.expertId).map((item) => publicExpertAssignment(ctx, item)) });
    }
    if (!assertReviewReader(ctx, req, res, project, "expert_assignment.read.denied")) return;
    return res.json({ assignments: ctx.state.expertAssignments.filter((item) => item.projectId === project.id).map((item) => publicExpertAssignment(ctx, item)) });
  });

  router.post("/projects/:projectId/expert-assignments/draw", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertReviewManager(ctx, req, res, project, "expert_assignment.draw.denied")) return;
    if (!assertReportMutable(ctx, req, res, project, "expert_assignment.draw.denied")) return;
    const count = Number(req.body?.count ?? 1);
    const assignedIds = new Set(ctx.state.expertAssignments.filter((item) => item.projectId === project.id).map((item) => item.expertId));
    const candidates = ctx.state.experts.filter((item) => item.status.includes("可") && !assignedIds.has(item.id)).slice(0, Number.isFinite(count) && count > 0 ? count : 1);
    const now = new Date().toISOString();
    const assignments = candidates.map((expert) => {
      const assignment: ExpertAssignment = {
        id: `ea-${ctx.state.expertAssignments.length + 1}`,
        projectId: project.id,
        expertId: expert.id,
        method: "mock_draw",
        status: "assigned",
        avoidanceConfirmed: false,
        disciplineConfirmed: false,
        confidentialityConfirmed: false,
        reason: String(req.body?.reason ?? "mock draw"),
        notifiedAt: now,
        createdAt: now,
        confirmedAt: null
      };
      ctx.state.expertAssignments.push(assignment);
      ctx.r5ReviewAwardRepository.upsertExpertAssignment(assignment);
      project.assignedExpertIds = Array.from(new Set([...project.assignedExpertIds, expert.id]));
      return assignment;
    });
    projectToReviewing(project);
    ctx.r4SourcingRepository.upsertProject(project);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "expert_assignment.draw", "project", project.id, project.id, `count=${assignments.length}`);
    return res.status(201).json({ assignments: assignments.map((item) => publicExpertAssignment(ctx, item)), auditLogId: log.id });
  });

  router.post("/projects/:projectId/expert-assignments/appoint", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertReviewManager(ctx, req, res, project, "expert_assignment.appoint.denied")) return;
    if (!assertReportMutable(ctx, req, res, project, "expert_assignment.appoint.denied")) return;
    const expertId = String(req.body?.expertId ?? "");
    const reason = String(req.body?.reason ?? "").trim();
    if (!reason) {
      return denyResponse(ctx, req, res, 400, "EXPERT_APPOINT_REASON_REQUIRED", "Expert appointment reason is required.", "expert_assignment.appoint.reason.denied", "expert", expertId, project.id);
    }
    if (!ctx.state.experts.some((item) => item.id === expertId)) return res.status(404).json({ error: { code: "EXPERT_NOT_FOUND", message: "Expert does not exist." } });
    const now = new Date().toISOString();
    const assignment: ExpertAssignment = {
      id: `ea-${ctx.state.expertAssignments.length + 1}`,
      projectId: project.id,
      expertId,
      method: "appointed",
      status: "assigned",
      avoidanceConfirmed: false,
      disciplineConfirmed: false,
      confidentialityConfirmed: false,
      reason,
      notifiedAt: now,
      createdAt: now,
      confirmedAt: null
    };
    ctx.state.expertAssignments.push(assignment);
    ctx.r5ReviewAwardRepository.upsertExpertAssignment(assignment);
    project.assignedExpertIds = Array.from(new Set([...project.assignedExpertIds, expertId]));
    projectToReviewing(project);
    ctx.r4SourcingRepository.upsertProject(project);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "expert_assignment.appoint", "expert_assignment", assignment.id, project.id);
    return res.status(201).json({ assignment: publicExpertAssignment(ctx, assignment), auditLogId: log.id });
  });

  router.post("/expert-assignments/:assignmentId/replace", (req, res) => {
    const assignment = ensureAssignment(ctx, req.params.assignmentId, res);
    if (!assignment) return;
    const project = ensureProject(ctx, assignment.projectId, res);
    if (!project) return;
    if (!assertReviewManager(ctx, req, res, project, "expert_assignment.replace.denied")) return;
    if (!assertReportMutable(ctx, req, res, project, "expert_assignment.replace.denied")) return;
    const replacementExpertId = String(req.body?.replacementExpertId ?? "");
    const reason = String(req.body?.reason ?? "").trim();
    if (!reason) {
      return denyResponse(ctx, req, res, 400, "EXPERT_REPLACE_REASON_REQUIRED", "Expert replacement reason is required.", "expert_assignment.replace.reason.denied", "expert_assignment", assignment.id, project.id);
    }
    if (!ctx.state.experts.some((item) => item.id === replacementExpertId)) return res.status(404).json({ error: { code: "EXPERT_NOT_FOUND", message: "Replacement expert does not exist." } });
    assignment.status = "replaced";
    assignment.replacedByExpertId = replacementExpertId;
    assignment.replacementReason = reason;
    for (const sheet of ctx.state.scoringSheets.filter((item) => item.projectId === project.id && item.expertId === assignment.expertId && !["submitted_locked", "resubmitted_locked"].includes(item.status))) {
      sheet.status = "replaced";
      sheet.lockedAt = new Date().toISOString();
      ctx.r5ReviewAwardRepository.upsertScoringSheet(sheet);
    }
    const now = new Date().toISOString();
    const replacement: ExpertAssignment = {
      id: `ea-${ctx.state.expertAssignments.length + 1}`,
      projectId: project.id,
      expertId: replacementExpertId,
      method: "replacement",
      status: "assigned",
      avoidanceConfirmed: false,
      disciplineConfirmed: false,
      confidentialityConfirmed: false,
      reason,
      notifiedAt: now,
      createdAt: now,
      confirmedAt: null
    };
    ctx.state.expertAssignments.push(replacement);
    ctx.r5ReviewAwardRepository.upsertExpertAssignment(assignment);
    ctx.r5ReviewAwardRepository.upsertExpertAssignment(replacement);
    project.assignedExpertIds = Array.from(new Set(project.assignedExpertIds.filter((item) => item !== assignment.expertId).concat(replacementExpertId)));
    ctx.r4SourcingRepository.upsertProject(project);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "expert_assignment.replace", "expert_assignment", assignment.id, project.id);
    return res.status(201).json({ assignment: publicExpertAssignment(ctx, assignment), replacement: publicExpertAssignment(ctx, replacement), auditLogId: log.id });
  });

  router.post("/expert-assignments/:assignmentId/confirm", (req, res) => {
    const assignment = ensureAssignment(ctx, req.params.assignmentId, res);
    if (!assignment) return;
    if (!assertExpertRole(ctx, req, res, "expert_assignment.confirm.denied", assignment.id, assignment.projectId)) return;
    if (req.auth.user.expertId !== assignment.expertId) {
      return denyResponse(ctx, req, res, 403, "EXPERT_ASSIGNMENT_DENIED", "Expert can only confirm own assignment.", "expert_assignment.confirm.scope.denied", "expert_assignment", assignment.id, assignment.projectId);
    }
    const type = String(req.body?.type ?? "");
    if (!["avoidance", "discipline", "confidentiality"].includes(type)) {
      return res.status(400).json({ error: { code: "EXPERT_CONFIRM_TYPE_INVALID", message: "Confirmation type must be avoidance, discipline or confidentiality." } });
    }
    if (type === "avoidance") assignment.avoidanceConfirmed = true;
    if (type === "discipline") assignment.disciplineConfirmed = true;
    if (type === "confidentiality") assignment.confidentialityConfirmed = true;
    assignment.confirmedAt = new Date().toISOString();
    assignment.status = assignment.avoidanceConfirmed && assignment.disciplineConfirmed && assignment.confidentialityConfirmed ? "confirmed" : "assigned";
    ctx.r5ReviewAwardRepository.upsertExpertAssignment(assignment);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, `expert_assignment.confirm.${type}`, "expert_assignment", assignment.id, assignment.projectId);
    return res.json({ assignment: publicExpertAssignment(ctx, assignment), auditLogId: log.id });
  });

  router.get("/expert-review/my-scoring-sheets", (req, res) => {
    if (!assertExpertRole(ctx, req, res, "scoring_sheet.my.denied", "my")) return;
    return res.json({
      scoringSheets: ctx.state.scoringSheets.filter((item) => item.expertId === req.auth.user.expertId && getAssignmentForExpert(ctx, item.projectId, req.auth.user.expertId))
    });
  });

  router.get("/scoring-sheets/:sheetId", (req, res) => {
    const sheet = ensureSheet(ctx, req.params.sheetId, res);
    if (!sheet) return;
    if (!assertExpertMayReadSheet(ctx, req, res, sheet, "scoring_sheet.read.denied")) return;
    return res.json({ scoringSheet: sheet });
  });

  router.post("/scoring-sheets/:sheetId/save", (req, res) => {
    const sheet = ensureSheet(ctx, req.params.sheetId, res);
    if (!sheet) return;
    const project = ensureProject(ctx, sheet.projectId, res);
    if (!project) return;
    if (!assertProjectAllowsExpertReview(ctx, req, res, project, "scoring_sheet.save.denied", sheet.id)) return;
    if (!assertReportMutable(ctx, req, res, project, "scoring_sheet.save.denied")) return;
    if (!assertExpertMayScore(ctx, req, res, sheet)) return;
    if (sheet.status === "submitted_locked" || sheet.status === "resubmitted_locked") {
      return denyResponse(ctx, req, res, 403, "SCORING_SHEET_LOCKED", "Scoring sheet is locked and cannot be modified.", "scoring_sheet.save.denied", "scoring_sheet", sheet.id, sheet.projectId, "score already locked");
    }
    if (!updateSheetScores(sheet, req.body)) {
      return res.status(400).json({ error: { code: "SCORING_SCORE_INVALID", message: "Scores must be numbers between 0 and 100." } });
    }
    sheet.status = "saved";
    ctx.r5ReviewAwardRepository.upsertScoringSheet(sheet);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "scoring_sheet.save", "scoring_sheet", sheet.id, sheet.projectId);
    return res.json({ scoringSheet: sheet, auditLogId: log.id });
  });

  router.post("/scoring-sheets/:sheetId/submit-lock", (req, res) => {
    const sheet = ensureSheet(ctx, req.params.sheetId, res);
    if (!sheet) return;
    const project = ensureProject(ctx, sheet.projectId, res);
    if (!project) return;
    if (!assertProjectAllowsExpertReview(ctx, req, res, project, "scoring_sheet.submit_lock.denied", sheet.id)) return;
    if (!assertReportMutable(ctx, req, res, project, "scoring_sheet.submit_lock.denied")) return;
    if (!assertExpertMayScore(ctx, req, res, sheet)) return;
    if (sheet.status === "submitted_locked" || sheet.status === "resubmitted_locked") {
      return denyResponse(ctx, req, res, 403, "SCORING_SHEET_LOCKED", "Scoring sheet is locked and cannot be submitted again.", "scoring_sheet.submit_lock.denied", "scoring_sheet", sheet.id, sheet.projectId, "score already locked");
    }
    if (!updateSheetScores(sheet, req.body)) {
      return res.status(400).json({ error: { code: "SCORING_SCORE_INVALID", message: "Scores must be numbers between 0 and 100." } });
    }
    const now = new Date().toISOString();
    sheet.status = sheet.versionNo > 1 ? "resubmitted_locked" : "submitted_locked";
    sheet.lockedAt = now;
    sheet.submittedAt = now;
    const version = {
      id: `sv-${ctx.state.scoringVersions.length + 1}`,
      sheetId: sheet.id,
      versionNo: sheet.versionNo,
      reason: sheet.versionNo > 1 ? "reevaluation submit" : "initial submit",
      approvalStatus: "approved",
      snapshotJson: { technical: sheet.technical, service: sheet.service, price: sheet.price, total: sheet.total, opinion: sheet.opinion },
      createdAt: now
    };
    ctx.state.scoringVersions.push(version);
    ctx.r5ReviewAwardRepository.upsertScoringSheet(sheet);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "scoring_sheet.submit_lock", "scoring_sheet", sheet.id, sheet.projectId, `version=${version.versionNo}`);
    return res.json({ scoringSheet: sheet, version, auditLogId: log.id });
  });

  router.post("/scoring-sheets/:sheetId/reevaluation-request", (req, res) => {
    const sheet = ensureSheet(ctx, req.params.sheetId, res);
    if (!sheet) return;
    const project = ensureProject(ctx, sheet.projectId, res);
    if (!project) return;
    if (!assertReviewManager(ctx, req, res, project, "scoring_sheet.reevaluation_request.denied")) return;
    if (!assertReportMutable(ctx, req, res, project, "scoring_sheet.reevaluation_request.denied")) return;
    if (!["submitted_locked", "resubmitted_locked"].includes(sheet.status)) {
      return denyResponse(ctx, req, res, 400, "REEVALUATION_SOURCE_NOT_LOCKED", "Reevaluation can only be requested for submitted locked scoring sheets.", "scoring_sheet.reevaluation_request.status.denied", "scoring_sheet", sheet.id, sheet.projectId, `status=${sheet.status}`);
    }
    const reason = String(req.body?.reason ?? "").trim();
    if (!reason) {
      return denyResponse(ctx, req, res, 400, "REEVALUATION_REASON_REQUIRED", "Reevaluation request reason is required.", "scoring_sheet.reevaluation_request.reason.denied", "scoring_sheet", sheet.id, sheet.projectId);
    }
    sheet.status = "reevaluation_requested";
    const version = {
      id: `sv-${ctx.state.scoringVersions.length + 1}`,
      sheetId: sheet.id,
      versionNo: sheet.versionNo,
      reason,
      approvalStatus: "submitted",
      snapshotJson: { requestedFromVersionNo: sheet.versionNo, requestedBy: req.auth.user.id, total: sheet.total },
      createdAt: new Date().toISOString()
    };
    ctx.state.scoringVersions.push(version);
    ctx.r5ReviewAwardRepository.upsertScoringSheet(sheet);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "scoring_sheet.reevaluation_request", "scoring_sheet", sheet.id, sheet.projectId);
    return res.status(201).json({ scoringSheet: sheet, version, auditLogId: log.id });
  });

  router.post("/scoring-sheets/:sheetId/reevaluation-approve", (req, res) => {
    const sheet = ensureSheet(ctx, req.params.sheetId, res);
    if (!sheet) return;
    const project = ensureProject(ctx, sheet.projectId, res);
    if (!project) return;
    if (!assertReviewManager(ctx, req, res, project, "scoring_sheet.reevaluation_approve.denied")) return;
    if (!assertReportMutable(ctx, req, res, project, "scoring_sheet.reevaluation_approve.denied")) return;
    if (sheet.status !== "reevaluation_requested") {
      return denyResponse(ctx, req, res, 400, "REEVALUATION_STATUS_DENIED", "Only requested reevaluations can be approved.", "scoring_sheet.reevaluation_approve.status.denied", "scoring_sheet", sheet.id, sheet.projectId, `status=${sheet.status}`);
    }
    const newVersionNo = Math.max(0, ...ctx.state.scoringVersions.filter((item) => item.sheetId === sheet.id).map((item) => item.versionNo), sheet.versionNo) + 1;
    const version = {
      id: `sv-${ctx.state.scoringVersions.length + 1}`,
      sheetId: sheet.id,
      versionNo: newVersionNo,
      reason: String(req.body?.reason ?? "reevaluation approved"),
      approvalStatus: "approved",
      snapshotJson: { previousVersionNo: sheet.versionNo, previousTotal: sheet.total },
      createdAt: new Date().toISOString()
    };
    ctx.state.scoringVersions.push(version);
    sheet.versionNo = newVersionNo;
    sheet.status = "reevaluation_approved";
    sheet.lockedAt = null;
    sheet.submittedAt = null;
    ctx.r5ReviewAwardRepository.upsertScoringSheet(sheet);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "scoring_sheet.reevaluation_approve", "scoring_sheet", sheet.id, sheet.projectId, `version=${version.versionNo}`);
    return res.json({ scoringSheet: sheet, version, auditLogId: log.id });
  });

  router.get("/scoring-sheets/:sheetId/versions", (req, res) => {
    const sheet = ensureSheet(ctx, req.params.sheetId, res);
    if (!sheet) return;
    if (!assertExpertMayReadSheet(ctx, req, res, sheet, "scoring_sheet.version.denied")) return;
    return res.json({ versions: ctx.state.scoringVersions.filter((item) => item.sheetId === sheet.id) });
  });

  router.post("/expert-review/:projectId/materials/view-check", (req, res) => {
    if (!assertExpertRole(ctx, req, res, "expert.material.view.denied", req.params.projectId, req.params.projectId)) return;
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertProjectAllowsExpertReview(ctx, req, res, project, "expert.material.view.denied")) return;
    const assignment = assertActiveExpertAssignment(ctx, req, res, project.id, req.auth.user.expertId, project.id, "expert.material.assignment.denied");
    if (!assignment) return;
    if (!assignment.avoidanceConfirmed) {
      return denyResponse(ctx, req, res, 403, "EXPERT_AVOIDANCE_REQUIRED", "Expert must confirm avoidance before viewing materials.", "expert.material.avoidance.required", "project", project.id, project.id);
    }
    if (!assignment.disciplineConfirmed) {
      return denyResponse(ctx, req, res, 403, "EXPERT_DISCIPLINE_REQUIRED", "Expert must confirm discipline before viewing materials.", "expert.material.discipline.required", "project", project.id, project.id);
    }
    if (!assignment.confidentialityConfirmed) {
      return denyResponse(ctx, req, res, 403, "EXPERT_CONFIDENTIALITY_REQUIRED", "Expert must confirm confidentiality before viewing materials.", "expert.material.confidentiality.required", "project", project.id, project.id);
    }
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "expert.material.view", "project", req.params.projectId, req.params.projectId);
    return res.json({ allowed: true, auditLogId: log.id });
  });

  router.get("/projects/:projectId/scoring-summary", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertReviewReader(ctx, req, res, project, "scoring_summary.read.denied")) return;
    if (isBeforeDeadline(project)) {
      return denyResponse(ctx, req, res, 400, "BID_DEADLINE_NOT_REACHED", "Scoring summary is allowed only after quote deadline.", "scoring_summary.deadline.denied", "project", project.id, project.id, "deadline not reached");
    }
    return res.json({ summary: buildScoringSummary(ctx, project.id) });
  });

  router.post("/projects/:projectId/review-report", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertReviewManager(ctx, req, res, project, "review_report.generate.denied")) return;
    if (!assertReportMutable(ctx, req, res, project, "review_report.generate.denied")) return;
    const summary = buildScoringSummary(ctx, project.id);
    if (!summary.allSubmitted) {
      return denyResponse(ctx, req, res, 400, "SCORING_NOT_ALL_SUBMITTED", "All scoring sheets must be submitted before generating final review summary.", "review_report.generate.submission.denied", "project", project.id, project.id);
    }
    const report = {
      id: `rr-${ctx.state.reviewReports.length + 1}`,
      projectId: project.id,
      reportNo: `RR-${project.code}`,
      status: "generated" as const,
      summaryJson: summary,
      snapshotJson: { generatedBy: req.auth.user.id, generatedAt: new Date().toISOString(), note: String(req.body?.note ?? "") },
      generatedAt: new Date().toISOString(),
      frozenAt: null,
      createdBy: req.auth.user.id
    };
    ctx.state.reviewReports.push(report);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "review_report.generate", "review_report", report.id, project.id);
    return res.status(201).json({ report, auditLogId: log.id });
  });

  router.get("/projects/:projectId/review-report", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertReviewReader(ctx, req, res, project, "review_report.read.denied")) return;
    return res.json({ reports: ctx.state.reviewReports.filter((item) => item.projectId === project.id) });
  });

  router.post("/projects/:projectId/review-report/freeze", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertReviewManager(ctx, req, res, project, "review_report.freeze.denied")) return;
    const report = ctx.state.reviewReports.find((item) => item.projectId === project.id && item.status === "generated");
    if (!report) return res.status(404).json({ error: { code: "REVIEW_REPORT_NOT_FOUND", message: "Generated review report does not exist." } });
    report.status = "frozen";
    report.frozenAt = new Date().toISOString();
    project.status = "review_report_frozen";
    project.displayStatus = "review report frozen";
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "review_report.freeze", "review_report", report.id, project.id);
    return res.json({ report, project, auditLogId: log.id });
  });

  return router;
}
