import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type { Expert, ExpertAssignment, InternalProjectStatus, ProcurementDocumentAttachment, ProcurementProject, ScoringCategory, ScoringDetailValue, ScoringSheet, ScoringTemplate } from "../types.js";

const reviewManagerRoles = new Set(["buyer", "platform_operator"]);
const reviewApprovalRoles = new Set(["buyer", "platform_operator", "group_manager"]);
const reviewReaderRoles = new Set(["buyer", "platform_operator", "group_manager", "auditor"]);
const reviewRecordDetailReaderRoles = new Set(["buyer", "platform_operator", "group_manager", "auditor"]);
const scoringTemplateReaderRoles = new Set(["buyer", "platform_operator", "group_manager", "auditor"]);
const scoringTemplateMaintainerRoles = new Set(["platform_operator", "group_manager"]);
const expertDirectoryMaintainerRoles = new Set(["group_manager"]);
const expertDirectoryReaderRoles = new Set(["buyer", "platform_operator", "group_manager", "auditor"]);
const defaultReviewScopes = ["技术评审", "商务评审", "财务评审", "供应链评审", "业务部门评审"];

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

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
  }
  if (typeof value === "string") {
    return Array.from(new Set(value.split(/[,\n;，；、]/).map((item) => item.trim()).filter(Boolean)));
  }
  return [];
}

function booleanInput(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on", "启用", "是"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off", "停用", "否"].includes(normalized)) return false;
  return fallback;
}

function nextExpertId(ctx: AppContext) {
  const maxNo = ctx.state.experts.reduce((max, expert) => {
    const match = /^exp-(\d+)$/.exec(expert.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `exp-${maxNo + 1}`;
}

function assertExpertDirectoryMaintainer(ctx: AppContext, req: Request, res: Response, action: string, expertId = "expert") {
  if (expertDirectoryMaintainerRoles.has(req.auth.roleId)) return true;
  denyResponse(
    ctx,
    req,
    res,
    403,
    "EXPERT_DIRECTORY_MAINTAINER_REQUIRED",
    "Only group procurement managers can maintain expert directory records.",
    action,
    "expert",
    expertId
  );
  return false;
}

function validateExpertAccountIds(ctx: AppContext, accountUserIds: string[]) {
  const invalidIds = accountUserIds.filter((userId) => {
    const user = ctx.state.users.find((item) => item.id === userId);
    return !user || user.roleId !== "expert" || user.status === "disabled" || user.status === "offboarded";
  });
  return invalidIds;
}

function syncExpertAccountBindings(ctx: AppContext, expert: Expert, accountUserIds: string[]) {
  const targetIds = new Set(accountUserIds);
  for (const otherExpert of ctx.state.experts) {
    if (otherExpert.id === expert.id) continue;
    otherExpert.accountUserIds = (otherExpert.accountUserIds ?? []).filter((userId) => !targetIds.has(userId));
    ctx.r5ReviewAwardRepository.upsertExpert(otherExpert);
  }
  for (const user of ctx.state.users) {
    if (targetIds.has(user.id)) {
      user.roleId = "expert";
      user.expertId = expert.id;
    } else if (user.expertId === expert.id) {
      delete user.expertId;
    }
  }
  ctx.businessTableStore.syncState(ctx.state);
  ctx.authStore.seedAccounts(ctx.state.users, ctx.config.allowLocalPasswordLogin);
}

function buildExpertFromBody(ctx: AppContext, req: Request, existing?: Expert): { expert?: Expert; error?: { code: string; message: string; status: number } } {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = String(body.name ?? existing?.name ?? "").trim();
  if (!name) {
    return { error: { status: 400, code: "EXPERT_NAME_REQUIRED", message: "Expert name is required." } };
  }
  const requestedId = existing?.id ?? String(body.id ?? "").trim();
  const id = requestedId || nextExpertId(ctx);
  const accountUserIds = normalizeStringArray(body.accountUserIds ?? existing?.accountUserIds ?? []);
  const invalidAccountIds = validateExpertAccountIds(ctx, accountUserIds);
  if (invalidAccountIds.length > 0) {
    return { error: { status: 400, code: "EXPERT_ACCOUNT_INVALID", message: `Invalid expert account ids: ${invalidAccountIds.join(", ")}` } };
  }
  const active = booleanInput(body.active, existing?.active ?? true);
  const status = String(body.status ?? existing?.status ?? (active ? "可抽取" : "停用")).trim() || (active ? "可抽取" : "停用");
  const reviewScopes = normalizeStringArray(body.reviewScopes ?? existing?.reviewScopes ?? ["技术评审", "商务评审"]);
  const supplierAssessmentScopes = normalizeStringArray(body.supplierAssessmentScopes ?? existing?.supplierAssessmentScopes ?? defaultReviewScopes);
  const expert: Expert = {
    ...(existing ?? { id }),
    id,
    name,
    category: String(body.category ?? existing?.category ?? "综合评审").trim() || "综合评审",
    status,
    accountUserIds,
    ownerOrgId: String(body.ownerOrgId ?? existing?.ownerOrgId ?? req.auth.user.orgId).trim() || req.auth.user.orgId,
    branchOrgId: String(body.branchOrgId ?? existing?.branchOrgId ?? req.auth.user.orgId).trim() || req.auth.user.orgId,
    reviewScopes,
    supplierAssessmentScopes,
    sharedAccount: booleanInput(body.sharedAccount, existing?.sharedAccount ?? false),
    active,
    avoidanceTags: normalizeStringArray(body.avoidanceTags ?? existing?.avoidanceTags ?? []),
    maintainedAt: new Date().toISOString(),
    maintenanceLog: String(body.maintenanceLog ?? existing?.maintenanceLog ?? "").trim()
  };
  return { expert };
}

function expertCanBeDrawn(expert: Expert) {
  if (expert.active === false) return false;
  if (expert.status.includes("停用") || expert.status.includes("禁用") || expert.status.includes("回避")) return false;
  return expert.status.includes("可") || expert.status.toLowerCase().includes("available") || expert.status.includes("启用");
}

function canReadProject(req: Request, project: ProcurementProject) {
  if (req.auth.roleId === "buyer" || req.auth.roleId === "platform_operator") {
    return (req.auth.user.managedProjectIds?.includes(project.id) ?? false) || req.auth.orgScope.includes(project.orgId);
  }
  if (req.auth.roleId === "group_manager" || req.auth.roleId === "auditor") return req.auth.orgScope.includes(project.orgId);
  if (req.auth.roleId === "expert") return project.assignedExpertIds.includes(req.auth.user.expertId ?? "");
  return false;
}

function assertReviewManager(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_expert_review");
  if (!reviewManagerRoles.has(req.auth.roleId)) {
    denyResponse(ctx, req, res, 403, "EXPERT_REVIEW_MANAGER_REQUIRED", "Only procurement business roles can maintain expert review records.", action, "project", project.id, project.id);
    return false;
  }
  if (canReadProject(req, project)) return true;
  denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot maintain expert review for this project.", action, "project", project.id, project.id);
  return false;
}

function assertReviewReader(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (!reviewReaderRoles.has(req.auth.roleId)) {
    denyResponse(ctx, req, res, 403, "EXPERT_REVIEW_READ_DENIED", "Current role cannot read expert review summary.", action, "project", project.id, project.id);
    return false;
  }
  if (canReadProject(req, project)) return true;
  denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot read this project.", action, "project", project.id, project.id);
  return false;
}

function assertReviewRecordDetailReader(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (!reviewRecordDetailReaderRoles.has(req.auth.roleId)) {
    denyResponse(ctx, req, res, 403, "EXPERT_REVIEW_DETAIL_READ_DENIED", "Current role cannot read expert review detail records.", action, "project", project.id, project.id);
    return false;
  }
  if (canReadProject(req, project)) return true;
  denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot read this project review detail.", action, "project", project.id, project.id);
  return false;
}

function assertScoringTemplateReader(ctx: AppContext, req: Request, res: Response, action: string, templateId = "scoring_template") {
  if (scoringTemplateReaderRoles.has(req.auth.roleId)) return true;
  denyResponse(ctx, req, res, 403, "SCORING_TEMPLATE_READ_DENIED", "Current role cannot read scoring templates.", action, "scoring_template", templateId);
  return false;
}

function assertScoringTemplateMaintainer(ctx: AppContext, req: Request, res: Response, action: string, templateId = "scoring_template") {
  if (scoringTemplateMaintainerRoles.has(req.auth.roleId)) return true;
  denyResponse(ctx, req, res, 403, "SCORING_TEMPLATE_MAINTAINER_REQUIRED", "Only group procurement managers or platform operators can maintain scoring templates.", action, "scoring_template", templateId);
  return false;
}

function assertExpertRole(ctx: AppContext, req: Request, res: Response, action: string, objectId: string, projectId?: string) {
  if (req.auth.roleId === "expert" && req.auth.user.expertId) return true;
  denyResponse(ctx, req, res, 403, "EXPERT_ROLE_REQUIRED", "Only expert accounts can access this expert review action.", action, "expert_review", objectId, projectId);
  return false;
}

function getAssignmentForExpert(ctx: AppContext, projectId: string, expertId: string | undefined) {
  return ctx.state.expertAssignments.find((item) => item.projectId === projectId && item.expertId === expertId && !["replaced", "archived"].includes(item.status));
}

function findProjectExpertAssignment(ctx: AppContext, projectId: string, expertId: string) {
  return ctx.state.expertAssignments.find((item) => item.projectId === projectId && item.expertId === expertId);
}

function assertProjectExpertNotAssigned(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, expertId: string, action: string) {
  const duplicate = findProjectExpertAssignment(ctx, project.id, expertId);
  if (!duplicate) return true;
  denyResponse(
    ctx,
    req,
    res,
    409,
    "EXPERT_ASSIGNMENT_DUPLICATE",
    "Expert already has an assignment in this project.",
    action,
    "expert_assignment",
    duplicate.id,
    project.id,
    `duplicateExpert=${expertId}`
  );
  return false;
}

function isBeforeDeadline(project: ProcurementProject) {
  if (!project.quoteDeadlineAt) return false;
  return new Date(project.quoteDeadlineAt).getTime() > Date.now();
}

function assertProjectAllowsExpertReview(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string, objectId = project.id) {
  ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_expert_review");
  if (isBeforeDeadline(project)) {
    denyResponse(ctx, req, res, 400, "BID_DEADLINE_NOT_REACHED", "Expert review is allowed only after quote deadline.", action, "project", objectId, project.id, "deadline not reached");
    return false;
  }
  if (!["bidding_locked", "expert_reviewing", "review_report_frozen", "award_approving", "awarded_pending_order", "result_notified"].includes(project.status)) {
    denyResponse(ctx, req, res, 400, "BID_NOT_LOCKED", "Expert review is allowed only after bids are locked.", action, "project", objectId, project.id, `status=${project.status}`);
    return false;
  }
  return true;
}

function assertReviewApprover(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  ctx.policies.externalTradeBlocking.assertInternalActionAllowed(req.auth, project, "internal_expert_review");
  if (!reviewApprovalRoles.has(req.auth.roleId)) {
    denyResponse(ctx, req, res, 403, "EXPERT_REVIEW_APPROVER_REQUIRED", "Only authorized review approvers can approve expert review changes.", action, "project", project.id, project.id);
    return false;
  }
  if (!canReadProject(req, project)) {
    denyResponse(ctx, req, res, 403, "PROJECT_SCOPE_DENIED", "Current user cannot approve expert review changes for this project.", action, "project", project.id, project.id);
    return false;
  }
  return true;
}

function assertProjectAllowsExpertAssignment(ctx: AppContext, req: Request, res: Response, project: ProcurementProject, action: string) {
  if (!assertProjectAllowsExpertReview(ctx, req, res, project, action)) return false;
  if (!["bidding_locked", "expert_reviewing"].includes(project.status)) {
    denyResponse(ctx, req, res, 400, "EXPERT_ASSIGNMENT_STAGE_DENIED", "Expert assignment is allowed only before the review report is frozen.", action, "project", project.id, project.id, `status=${project.status}`);
    return false;
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

type ScoringItem = {
  id: string;
  category: ScoringCategory;
  categoryLabel: string;
  label: string;
  reference: string;
  evidence: string;
  maxScore: number;
};

type ScoringTemplateRouteError = {
  code: string;
  message: string;
};

type ScoringTemplateItemValidationResult = { items: ScoringItem[] } | { error: ScoringTemplateRouteError };
type ScoringTemplateBuildResult = { template: ScoringTemplate } | { error: ScoringTemplateRouteError };

const defaultScoringItems: ScoringItem[] = [
  {
    id: "technical_compliance",
    category: "technical",
    categoryLabel: "技术分",
    label: "技术响应与规格符合度",
    reference: "对照采购文件中的规格、参数、样品和检测资料。",
    evidence: "报价响应文件、样品或检测报告",
    maxScore: 25
  },
  {
    id: "technical_quality",
    category: "technical",
    categoryLabel: "技术分",
    label: "质量保障与交付能力",
    reference: "评估质量控制、供货稳定性、交付计划和风险控制。",
    evidence: "质量承诺、交付计划、供应能力说明",
    maxScore: 15
  },
  {
    id: "business_service",
    category: "service",
    categoryLabel: "商务分",
    label: "服务承诺与售后保障",
    reference: "评估响应速度、售后安排、补货和退换货机制。",
    evidence: "服务承诺、售后方案",
    maxScore: 20
  },
  {
    id: "business_terms",
    category: "service",
    categoryLabel: "商务分",
    label: "商务条款与履约条件",
    reference: "评估账期、交付周期、合同配合度和履约风险。",
    evidence: "商务偏离表、履约承诺",
    maxScore: 10
  },
  {
    id: "price_reasonableness",
    category: "price",
    categoryLabel: "价格分",
    label: "报价合理性",
    reference: "综合报价水平、价格完整性和报价偏离情况。",
    evidence: "报价清单、分项报价、澄清回复",
    maxScore: 30
  }
];

function isScoringCategory(value: unknown): value is ScoringCategory {
  return value === "technical" || value === "service" || value === "price";
}

function scoringTemplate(ctx: AppContext, sheet: ScoringSheet) {
  return ctx.state.scoringTemplates.find((template) => template.id === sheet.templateId) ?? ctx.state.scoringTemplates.find((template) => template.status === "enabled") ?? ctx.state.scoringTemplates[0] ?? null;
}

function scoringItemsFromTemplate(template: ScoringTemplate | null): ScoringItem[] {
  const rawItems = Array.isArray(template?.configJson?.items) ? template?.configJson?.items : [];
  const items = rawItems
    .map((rawItem, index): ScoringItem | null => {
      const item = rawItem as Record<string, unknown>;
      const category = isScoringCategory(item.category) ? item.category : null;
      const maxScore = Number(item.maxScore ?? item.score ?? 0);
      if (!category || !Number.isFinite(maxScore) || maxScore <= 0) return null;
      const fallback = defaultScoringItems[index] ?? defaultScoringItems[0];
      return {
        id: String(item.id ?? `item-${index + 1}`),
        category,
        categoryLabel: String(item.categoryLabel ?? fallback.categoryLabel),
        label: String(item.label ?? item.name ?? fallback.label),
        reference: String(item.reference ?? fallback.reference),
        evidence: String(item.evidence ?? fallback.evidence),
        maxScore
      };
    })
    .filter((item): item is ScoringItem => Boolean(item));
  return items.length ? items : defaultScoringItems;
}

function nextScoringTemplateId(ctx: AppContext) {
  const maxNo = ctx.state.scoringTemplates.reduce((max, template) => {
    const match = /^st-(\d+)$/.exec(template.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `st-${maxNo + 1}`;
}

function templateInUse(ctx: AppContext, templateId: string) {
  return ctx.state.scoringSheets.some((sheet) => sheet.templateId === templateId);
}

function publicScoringTemplate(ctx: AppContext, template: ScoringTemplate) {
  const items = scoringItemsFromTemplate(template);
  return {
    ...template,
    items,
    totalScore: Number(items.reduce((sum, item) => sum + item.maxScore, 0).toFixed(2)),
    inUse: templateInUse(ctx, template.id),
    sheetCount: ctx.state.scoringSheets.filter((sheet) => sheet.templateId === template.id).length
  };
}

function validateScoringTemplateItems(rawItems: unknown): ScoringTemplateItemValidationResult {
  const itemsInput = Array.isArray(rawItems) ? rawItems : [];
  const seen = new Set<string>();
  const items: ScoringItem[] = [];
  for (const [index, rawItem] of itemsInput.entries()) {
    const item = rawItem && typeof rawItem === "object" ? (rawItem as Record<string, unknown>) : {};
    const category = isScoringCategory(item.category) ? item.category : null;
    const maxScore = Number(item.maxScore ?? 0);
    const id = String(item.id ?? `item-${index + 1}`).trim() || `item-${index + 1}`;
    const label = String(item.label ?? item.name ?? "").trim();
    if (!category) return { error: { code: "SCORING_TEMPLATE_CATEGORY_INVALID", message: "Scoring item category must be technical, service or price." } };
    if (!label) return { error: { code: "SCORING_TEMPLATE_ITEM_LABEL_REQUIRED", message: "Scoring item label is required." } };
    if (seen.has(id)) return { error: { code: "SCORING_TEMPLATE_ITEM_DUPLICATE", message: "Scoring item id must be unique." } };
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 100) {
      return { error: { code: "SCORING_TEMPLATE_SCORE_INVALID", message: "Scoring item max score must be greater than 0 and no more than 100." } };
    }
    seen.add(id);
    items.push({
      id,
      category,
      categoryLabel: String(item.categoryLabel ?? (category === "technical" ? "技术分" : category === "service" ? "商务分" : "价格分")),
      label,
      reference: String(item.reference ?? "").trim(),
      evidence: String(item.evidence ?? "").trim(),
      maxScore: Number(maxScore.toFixed(2))
    });
  }
  if (items.length === 0) return { error: { code: "SCORING_TEMPLATE_ITEMS_REQUIRED", message: "At least one scoring item is required." } };
  const total = Number(items.reduce((sum, item) => sum + item.maxScore, 0).toFixed(2));
  if (total !== 100) {
    return { error: { code: "SCORING_TEMPLATE_TOTAL_INVALID", message: "Scoring template total score must equal 100." } };
  }
  return { items };
}

function buildScoringTemplateFromBody(ctx: AppContext, body: unknown, existing?: ScoringTemplate, options: { clone?: boolean } = {}): ScoringTemplateBuildResult {
  const input = (body ?? {}) as Record<string, unknown>;
  const rawItems = input.items ?? (input.configJson && typeof input.configJson === "object" ? (input.configJson as Record<string, unknown>).items : existing?.configJson.items);
  const validation = validateScoringTemplateItems(rawItems);
  if ("error" in validation) return validation;
  const id = options.clone || !existing ? nextScoringTemplateId(ctx) : existing.id;
  const templateCode = String(input.templateCode ?? existing?.templateCode ?? "").trim();
  const templateName = String(input.templateName ?? existing?.templateName ?? "").trim();
  if (!templateCode) return { error: { code: "SCORING_TEMPLATE_CODE_REQUIRED", message: "Template code is required." } };
  if (!templateName) return { error: { code: "SCORING_TEMPLATE_NAME_REQUIRED", message: "Template name is required." } };
  const duplicateCode = ctx.state.scoringTemplates.find((template) => template.templateCode === templateCode && template.id !== id);
  if (duplicateCode) return { error: { code: "SCORING_TEMPLATE_CODE_DUPLICATE", message: "Template code already exists." } };
  const statusInput = String(input.status ?? existing?.status ?? "draft");
  const status = statusInput === "enabled" ? "enabled" : statusInput === "disabled" ? "disabled" : "draft";
  const template: ScoringTemplate = {
    id,
    templateCode,
    templateName,
    versionNo: existing && !options.clone ? Number(existing.versionNo ?? 1) + 1 : 1,
    status,
    configJson: {
      ...(existing?.configJson ?? {}),
      ...(input.configJson && typeof input.configJson === "object" ? (input.configJson as Record<string, unknown>) : {}),
      items: validation.items
    }
  };
  return { template };
}

function upsertScoringTemplateState(ctx: AppContext, template: ScoringTemplate) {
  const existingIndex = ctx.state.scoringTemplates.findIndex((item) => item.id === template.id);
  if (template.status === "enabled") {
    for (const item of ctx.state.scoringTemplates) {
      if (item.id !== template.id && item.status === "enabled") {
        item.status = "disabled";
        ctx.r5ReviewAwardRepository.upsertScoringTemplate(item);
      }
    }
  }
  if (existingIndex >= 0) ctx.state.scoringTemplates[existingIndex] = template;
  else ctx.state.scoringTemplates.push(template);
  ctx.r5ReviewAwardRepository.upsertScoringTemplate(template);
}

function scoreNumber(value: unknown, fallback = 0) {
  const score = Number(value);
  return Number.isFinite(score) ? score : fallback;
}

function categoryTotals(details: Record<string, number | ScoringDetailValue>) {
  return Object.values(details).reduce(
    (totals, value) => {
      if (typeof value === "number") return totals;
      const category = value.category;
      if (!category) return totals;
      totals[category] += scoreNumber(value.score);
      return totals;
    },
    { technical: 0, service: 0, price: 0 } satisfies Record<ScoringCategory, number>
  );
}

function normalizeScoringDetails(sheet: ScoringSheet, body: Record<string, unknown>, items: ScoringItem[]) {
  const rawDetails = body.details && typeof body.details === "object" ? (body.details as Record<string, unknown>) : null;
  if (!rawDetails) return null;
  const normalized: Record<string, ScoringDetailValue> = {};
  for (const item of items) {
    const raw = rawDetails[item.id];
    const rawObject = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    const previous = sheet.details?.[item.id];
    const previousObject = previous && typeof previous === "object" ? previous : undefined;
    const score = scoreNumber(rawObject?.score ?? raw ?? previousObject?.score ?? 0);
    if (score < 0 || score > item.maxScore) return null;
    normalized[item.id] = {
      score: Number(score.toFixed(2)),
      comment: String(rawObject?.comment ?? previousObject?.comment ?? ""),
      label: item.label,
      category: item.category,
      categoryLabel: item.categoryLabel,
      maxScore: item.maxScore,
      reference: item.reference,
      evidence: item.evidence
    };
  }
  return normalized;
}

function updateSheetScores(ctx: AppContext, sheet: ScoringSheet, body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  const items = scoringItemsFromTemplate(scoringTemplate(ctx, sheet));
  const normalizedDetails = normalizeScoringDetails(sheet, input, items);
  const itemTotals = normalizedDetails ? categoryTotals(normalizedDetails) : null;
  const technical = itemTotals ? itemTotals.technical : input.technical === undefined ? sheet.technical : Number(input.technical);
  const service = itemTotals ? itemTotals.service : input.service === undefined ? sheet.service : Number(input.service);
  const price = itemTotals ? itemTotals.price : input.price === undefined ? sheet.price : Number(input.price);
  if (![technical, service, price].every((item) => Number.isFinite(item) && item >= 0 && item <= 100)) {
    return false;
  }
  sheet.technical = Number(technical.toFixed(2));
  sheet.service = Number(service.toFixed(2));
  sheet.price = Number(price.toFixed(2));
  sheet.total = Number((technical + service + price).toFixed(2));
  sheet.details = normalizedDetails ?? { technical: sheet.technical, service: sheet.service, price: sheet.price };
  sheet.opinion = String(input.opinion ?? sheet.opinion);
  return true;
}

function attachmentLabel(file: ProcurementDocumentAttachment) {
  return {
    id: file.id,
    fileName: file.fileName,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    uploadedAt: file.uploadedAt
  };
}

function scoringSheetMaterials(ctx: AppContext, sheet: ScoringSheet) {
  const registration = ctx.state.supplierRegistrations.find((item) => item.projectId === sheet.projectId && item.supplierId === sheet.supplierId);
  const bid = ctx.state.bids.find((item) => item.projectId === sheet.projectId && item.supplierId === sheet.supplierId && ["submitted", "locked"].includes(item.status));
  return {
    registrationMaterials: (registration?.materialMetadata ?? []).map(attachmentLabel),
    supplementMaterials: (registration?.supplementMaterialMetadata ?? []).map(attachmentLabel),
    bidMaterials: (bid?.responseFileMetadata ?? []).map(attachmentLabel),
    bidSummary: bid
      ? {
          amount: bid.amount,
          taxRate: bid.taxRate ?? null,
          taxInclusive: bid.taxInclusive ?? null,
          deliveryDays: bid.deliveryDays ?? null,
          responseSummary: bid.responseSummary ?? "",
          serviceCommitment: bid.serviceCommitment ?? "",
          submittedAt: bid.submittedAt,
          lockedAt: bid.lockedAt,
          fileName: bid.fileName
        }
      : null
  };
}

function sheetCategoryScore(sheet: ScoringSheet, category: ScoringCategory) {
  return category === "technical" ? sheet.technical : category === "service" ? sheet.service : sheet.price;
}

function scoringDetailValuesForSheet(sheet: ScoringSheet, items: ScoringItem[]) {
  const details: Record<string, ScoringDetailValue> = {};
  const itemsByCategory = items.reduce<Record<ScoringCategory, ScoringItem[]>>(
    (grouped, item) => {
      grouped[item.category].push(item);
      return grouped;
    },
    { technical: [], service: [], price: [] }
  );
  const legacyAllocated: Record<string, number> = {};
  for (const [category, categoryItems] of Object.entries(itemsByCategory) as Array<[ScoringCategory, ScoringItem[]]>) {
    const categoryTotal = sheetCategoryScore(sheet, category);
    const categoryMax = categoryItems.reduce((sum, item) => sum + item.maxScore, 0) || 1;
    let allocated = 0;
    categoryItems.forEach((item, index) => {
      const score = index === categoryItems.length - 1 ? categoryTotal - allocated : Number(((categoryTotal * item.maxScore) / categoryMax).toFixed(2));
      allocated += score;
      legacyAllocated[item.id] = Number(score.toFixed(2));
    });
  }
  for (const item of items) {
    const raw = sheet.details?.[item.id];
    const value = raw && typeof raw === "object" ? raw : undefined;
    details[item.id] = {
      score: value?.score ?? legacyAllocated[item.id] ?? 0,
      comment: value?.comment ?? "",
      label: item.label,
      category: item.category,
      categoryLabel: item.categoryLabel,
      maxScore: item.maxScore,
      reference: item.reference,
      evidence: item.evidence
    };
  }
  return details;
}

function publicScoringSheet(ctx: AppContext, sheet: ScoringSheet) {
  const project = ctx.state.projects.find((item) => item.id === sheet.projectId);
  const supplier = ctx.state.suppliers.find((item) => item.id === sheet.supplierId);
  const expert = ctx.state.experts.find((item) => item.id === sheet.expertId);
  const template = scoringTemplate(ctx, sheet);
  const scoringItems = scoringItemsFromTemplate(template);
  return {
    ...sheet,
    details: scoringDetailValuesForSheet(sheet, scoringItems),
    projectCode: project?.code ?? sheet.projectId,
    projectName: project?.name ?? sheet.projectId,
    supplierName: supplier?.name ?? sheet.supplierId,
    expertName: expert?.name ?? sheet.expertId,
    templateName: template?.templateName ?? sheet.templateId,
    scoringItems,
    materials: scoringSheetMaterials(ctx, sheet)
  };
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

function buildReviewRecordDetail(ctx: AppContext, project: ProcurementProject) {
  const sheets = ctx.state.scoringSheets.filter((item) => item.projectId === project.id);
  const submittedSheets = sheets.filter((item) => item.status === "submitted_locked" || item.status === "resubmitted_locked");
  const summary = buildScoringSummary(ctx, project.id);
  const template = ctx.state.scoringTemplates.find((item) => item.id === submittedSheets[0]?.templateId) ?? ctx.state.scoringTemplates.find((item) => item.status === "enabled") ?? null;
  const scoringItems = scoringItemsFromTemplate(template);
  const sheetRecords = submittedSheets.map((sheet) => {
    const publicSheet = publicScoringSheet(ctx, sheet);
    const publicDetails = publicSheet.details as Record<string, ScoringDetailValue>;
    const detailValues = scoringItems.map((item) => {
      const value = publicDetails[item.id];
      return {
        ...item,
        score: value?.score ?? 0,
        comment: value?.comment ?? ""
      };
    });
    return {
      sheetId: sheet.id,
      projectId: sheet.projectId,
      expertId: sheet.expertId,
      expertName: publicSheet.expertName,
      supplierId: sheet.supplierId,
      supplierName: publicSheet.supplierName,
      templateId: sheet.templateId,
      templateName: publicSheet.templateName,
      technical: sheet.technical,
      service: sheet.service,
      price: sheet.price,
      total: sheet.total,
      opinion: sheet.opinion,
      status: sheet.status,
      versionNo: sheet.versionNo,
      submittedAt: sheet.submittedAt,
      lockedAt: sheet.lockedAt,
      details: detailValues,
      materials: publicSheet.materials
    };
  });
  const supplierRecords = (summary.supplierScores as Array<{ supplierId: string; supplierName: string; submittedCount: number; technical: number; service: number; price: number; total: number; rank: number }>).map((supplier) => ({
    ...supplier,
    sheets: sheetRecords.filter((sheet) => sheet.supplierId === supplier.supplierId)
  }));
  return {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      displayStatus: project.displayStatus,
      quoteDeadlineAt: project.quoteDeadlineAt,
      budgetAmount: project.budgetAmount
    },
    generatedAt: new Date().toISOString(),
    template: template
      ? {
          id: template.id,
          templateCode: template.templateCode,
          templateName: template.templateName,
          versionNo: template.versionNo
        }
      : null,
    scoringItems,
    summary,
    supplierRecords,
    sheetRecords,
    reports: ctx.state.reviewReports.filter((item) => item.projectId === project.id)
  };
}

function projectToReviewing(project: ProcurementProject) {
  if (project.externalTradeFlag) return;
  project.status = "expert_reviewing" satisfies InternalProjectStatus;
  project.displayStatus = "expert reviewing";
}

function enabledScoringTemplateId(ctx: AppContext) {
  return ctx.state.scoringTemplates.find((template) => template.status === "enabled")?.id ?? ctx.state.scoringTemplates[0]?.id ?? "st-1";
}

function createScoringSheetsForAssignment(ctx: AppContext, project: ProcurementProject, assignment: ExpertAssignment) {
  const hasExistingSheetsForExpert = ctx.state.scoringSheets.some(
    (sheet) => sheet.projectId === project.id && sheet.expertId === assignment.expertId && !["replaced", "archived"].includes(sheet.status)
  );
  if (hasExistingSheetsForExpert) return;
  const templateId = enabledScoringTemplateId(ctx);
  const expertUser = ctx.state.users.find((user) => user.expertId === assignment.expertId);
  for (const supplierId of project.participantSupplierIds) {
    const existing = ctx.state.scoringSheets.some(
      (sheet) =>
        sheet.projectId === project.id &&
        sheet.expertId === assignment.expertId &&
        sheet.supplierId === supplierId &&
        !["replaced", "archived"].includes(sheet.status)
    );
    if (existing) continue;
    const sheet: ScoringSheet = {
      id: `score-${ctx.state.scoringSheets.length + 1}`,
      projectId: project.id,
      expertId: assignment.expertId,
      supplierId,
      templateId,
      technical: 0,
      service: 0,
      price: 0,
      total: 0,
      status: "scoring",
      opinion: "",
      versionNo: 1,
      submittedAt: null,
      lockedAt: null
    };
    ctx.state.scoringSheets.push(sheet);
    ctx.r5ReviewAwardRepository.upsertScoringSheet(sheet);
    ctx.r8WorkflowTaskRepository.upsertTask({
      id: `task:expert_scoring:${sheet.id}`,
      taskCode: `TASK-EXPERT-${sheet.id}`,
      taskType: "expert_scoring",
      businessType: "expert_scoring",
      businessId: sheet.id,
      projectId: project.id,
      orgId: project.orgId,
      supplierId,
      assigneeRoleId: "expert",
      assigneeUserId: expertUser?.id,
      title: `Expert scoring ${project.code}`,
      sourceJson: { assignmentId: assignment.id, expertId: assignment.expertId, supplierId, status: sheet.status }
    });
  }
}

function expertUserForAssignment(ctx: AppContext, assignment: ExpertAssignment) {
  return ctx.state.users.find((user) => user.expertId === assignment.expertId);
}

function syncExpertConfirmationTask(ctx: AppContext, project: ProcurementProject, assignment: ExpertAssignment) {
  if (["confirmed", "submitted_locked", "replaced", "archived"].includes(assignment.status)) return;
  const expertUser = expertUserForAssignment(ctx, assignment);
  const task = ctx.r8WorkflowTaskRepository.upsertTask({
    id: `task:expert_confirmation:${assignment.id}`,
    taskCode: `TASK-EXPERT-CONFIRM-${assignment.id}`,
    taskType: "review_award_expert_confirmation",
    businessType: "review_award",
    businessId: project.id,
    projectId: project.id,
    orgId: project.orgId,
    assigneeRoleId: "expert",
    assigneeUserId: expertUser?.id,
    title: `Expert confirmation ${project.code}`,
    sourceJson: { assignmentId: assignment.id, expertId: assignment.expertId, status: assignment.status }
  });
  if (!ctx.r8WorkflowTaskRepository.findNotificationBySource("assignmentId", assignment.id)) {
    ctx.r8WorkflowTaskRepository.createNotification({
      eventType: "review_award.expert_confirmation_required",
      businessType: "review_award",
      businessId: project.id,
      projectId: project.id,
      orgId: project.orgId,
      recipientRoleId: "expert",
      recipientUserId: expertUser?.id,
      title: `${project.code} 专家评审确认`,
      contentSummary: "请确认回避、评审纪律和保密承诺后进入评分。",
      sourceJson: { taskId: task.id, assignmentId: assignment.id, expertId: assignment.expertId }
    });
  }
}

export function expertReviewRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/scoring-templates", (req, res) => {
    if (!assertScoringTemplateReader(ctx, req, res, "scoring_template.read.denied")) return;
    return res.json({ scoringTemplates: ctx.state.scoringTemplates.map((template) => publicScoringTemplate(ctx, template)) });
  });

  router.post("/scoring-templates", (req, res) => {
    if (!assertScoringTemplateMaintainer(ctx, req, res, "scoring_template.create.denied")) return;
    const result = buildScoringTemplateFromBody(ctx, req.body);
    if ("error" in result) return res.status(400).json({ error: result.error });
    upsertScoringTemplateState(ctx, result.template);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "scoring_template.create", "scoring_template", result.template.id);
    return res.status(201).json({ scoringTemplate: publicScoringTemplate(ctx, result.template), auditLogId: log.id });
  });

  router.patch("/scoring-templates/:templateId", (req, res) => {
    if (!assertScoringTemplateMaintainer(ctx, req, res, "scoring_template.update.denied", req.params.templateId)) return;
    const existing = ctx.state.scoringTemplates.find((template) => template.id === req.params.templateId);
    if (!existing) return res.status(404).json({ error: { code: "SCORING_TEMPLATE_NOT_FOUND", message: "Scoring template does not exist." } });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const config = body.configJson && typeof body.configJson === "object" ? (body.configJson as Record<string, unknown>) : {};
    const hasItemsInput = Boolean(body.items ?? config.items);
    if (templateInUse(ctx, existing.id) && hasItemsInput) {
      return denyResponse(
        ctx,
        req,
        res,
        409,
        "SCORING_TEMPLATE_IN_USE",
        "This scoring template has been used by scoring sheets. Clone it before changing scoring items.",
        "scoring_template.update.in_use.denied",
        "scoring_template",
        existing.id
      );
    }
    const result = hasItemsInput
      ? buildScoringTemplateFromBody(ctx, req.body, existing)
      : {
          template: {
            ...existing,
            templateName: String(body.templateName ?? existing.templateName).trim() || existing.templateName,
            status: ["enabled", "disabled", "draft"].includes(String(body.status)) ? String(body.status) : existing.status
          }
        };
    if ("error" in result) return res.status(400).json({ error: result.error });
    upsertScoringTemplateState(ctx, result.template);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "scoring_template.update", "scoring_template", result.template.id);
    return res.json({ scoringTemplate: publicScoringTemplate(ctx, result.template), auditLogId: log.id });
  });

  router.post("/scoring-templates/:templateId/clone", (req, res) => {
    if (!assertScoringTemplateMaintainer(ctx, req, res, "scoring_template.clone.denied", req.params.templateId)) return;
    const existing = ctx.state.scoringTemplates.find((template) => template.id === req.params.templateId);
    if (!existing) return res.status(404).json({ error: { code: "SCORING_TEMPLATE_NOT_FOUND", message: "Scoring template does not exist." } });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = buildScoringTemplateFromBody(
      ctx,
      {
        ...body,
        templateCode: body.templateCode ?? `${existing.templateCode}-copy`,
        templateName: body.templateName ?? `${existing.templateName} 副本`,
        status: body.status ?? "draft",
        items: body.items ?? scoringItemsFromTemplate(existing)
      },
      existing,
      { clone: true }
    );
    if ("error" in result) return res.status(400).json({ error: result.error });
    upsertScoringTemplateState(ctx, result.template);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "scoring_template.clone", "scoring_template", result.template.id);
    return res.status(201).json({ scoringTemplate: publicScoringTemplate(ctx, result.template), auditLogId: log.id });
  });

  router.post("/scoring-templates/:templateId/enable", (req, res) => {
    if (!assertScoringTemplateMaintainer(ctx, req, res, "scoring_template.enable.denied", req.params.templateId)) return;
    const template = ctx.state.scoringTemplates.find((item) => item.id === req.params.templateId);
    if (!template) return res.status(404).json({ error: { code: "SCORING_TEMPLATE_NOT_FOUND", message: "Scoring template does not exist." } });
    const items = scoringItemsFromTemplate(template);
    const total = Number(items.reduce((sum, item) => sum + item.maxScore, 0).toFixed(2));
    if (total !== 100) return res.status(400).json({ error: { code: "SCORING_TEMPLATE_TOTAL_INVALID", message: "Scoring template total score must equal 100 before enabling." } });
    template.status = "enabled";
    upsertScoringTemplateState(ctx, template);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "scoring_template.enable", "scoring_template", template.id);
    return res.json({ scoringTemplate: publicScoringTemplate(ctx, template), auditLogId: log.id });
  });

  router.get("/experts", (req, res) => {
    if (!expertDirectoryReaderRoles.has(req.auth.roleId)) {
      if (req.auth.roleId === "admin") {
        ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "expert", "list");
      }
      return denyResponse(ctx, req, res, 403, "EXPERT_DIRECTORY_ROLE_DENIED", "Current role cannot read expert directory.", "expert.directory.denied", "expert", "list");
    }
    return res.json({ experts: ctx.state.experts });
  });

  router.post("/experts", (req, res) => {
    if (!assertExpertDirectoryMaintainer(ctx, req, res, "expert.directory.create.denied")) return;
    const requestedId = String(req.body?.id ?? "").trim();
    if (requestedId && ctx.state.experts.some((item) => item.id === requestedId)) {
      return res.status(409).json({ error: { code: "EXPERT_ALREADY_EXISTS", message: "Expert already exists." } });
    }
    const result = buildExpertFromBody(ctx, req);
    if (!result.expert) return res.status(result.error!.status).json({ error: { code: result.error!.code, message: result.error!.message } });
    ctx.state.experts.push(result.expert);
    syncExpertAccountBindings(ctx, result.expert, result.expert.accountUserIds ?? []);
    ctx.r5ReviewAwardRepository.upsertExpert(result.expert);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "expert.directory.create", "expert", result.expert.id, undefined, result.expert.maintenanceLog);
    return res.status(201).json({ expert: result.expert, auditLogId: log.id });
  });

  router.get("/experts/:expertId", (req, res) => {
    if (!expertDirectoryReaderRoles.has(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "EXPERT_DIRECTORY_ROLE_DENIED", "Current role cannot read expert details.", "expert.detail.denied", "expert", req.params.expertId);
    }
    const expert = ctx.state.experts.find((item) => item.id === req.params.expertId);
    if (!expert) return res.status(404).json({ error: { code: "EXPERT_NOT_FOUND", message: "Expert does not exist." } });
    return res.json({ expert, assignments: ctx.state.expertAssignments.filter((item) => item.expertId === expert.id).map((item) => publicExpertAssignment(ctx, item)) });
  });

  router.patch("/experts/:expertId", (req, res) => {
    const expert = ctx.state.experts.find((item) => item.id === req.params.expertId);
    if (!expert) return res.status(404).json({ error: { code: "EXPERT_NOT_FOUND", message: "Expert does not exist." } });
    if (!assertExpertDirectoryMaintainer(ctx, req, res, "expert.directory.update.denied", expert.id)) return;
    const result = buildExpertFromBody(ctx, req, expert);
    if (!result.expert) return res.status(result.error!.status).json({ error: { code: result.error!.code, message: result.error!.message } });
    Object.assign(expert, result.expert);
    syncExpertAccountBindings(ctx, expert, expert.accountUserIds ?? []);
    ctx.r5ReviewAwardRepository.upsertExpert(expert);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "expert.directory.update", "expert", expert.id, undefined, expert.maintenanceLog);
    return res.json({ expert, auditLogId: log.id });
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
    if (!assertProjectAllowsExpertAssignment(ctx, req, res, project, "expert_assignment.draw.denied")) return;
    if (!assertReportMutable(ctx, req, res, project, "expert_assignment.draw.denied")) return;
    const count = Number(req.body?.count ?? 1);
    const requestedScopes = normalizeStringArray(req.body?.reviewScopes);
    const assignedIds = new Set(ctx.state.expertAssignments.filter((item) => item.projectId === project.id).map((item) => item.expertId));
    const candidates = ctx.state.experts
      .filter((item) => {
        if (!expertCanBeDrawn(item) || assignedIds.has(item.id)) return false;
        if (requestedScopes.length === 0) return true;
        return (item.reviewScopes ?? []).some((scope) => requestedScopes.includes(scope));
      })
      .slice(0, Number.isFinite(count) && count > 0 ? count : 1);
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
      syncExpertConfirmationTask(ctx, project, assignment);
      return assignment;
    });
    projectToReviewing(project);
    ctx.r4SourcingRepository.upsertProject(project);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "expert_assignment.draw", "project", project.id, project.id, `count=${assignments.length}`);
    for (const assignment of assignments) {
      ctx.eventBus.emit({
        eventCode: "ExpertAssignmentCreated",
        businessType: "review_award",
        businessId: project.id,
        businessTitle: project.name,
        actor: req.auth.user,
        orgId: project.orgId,
        projectId: project.id,
        idempotencyKey: `review_award:${project.id}:expert_assignment:${assignment.id}`,
        payloadJson: {
          projectId: project.id,
          projectName: project.name,
          assignmentId: assignment.id,
          expertId: assignment.expertId,
          method: assignment.method
        }
      });
    }
    return res.status(201).json({ assignments: assignments.map((item) => publicExpertAssignment(ctx, item)), auditLogId: log.id });
  });

  router.post("/projects/:projectId/expert-assignments/appoint", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertReviewManager(ctx, req, res, project, "expert_assignment.appoint.denied")) return;
    if (!assertProjectAllowsExpertAssignment(ctx, req, res, project, "expert_assignment.appoint.denied")) return;
    if (!assertReportMutable(ctx, req, res, project, "expert_assignment.appoint.denied")) return;
    const expertId = String(req.body?.expertId ?? "");
    const reason = String(req.body?.reason ?? "").trim();
    if (!reason) {
      return denyResponse(ctx, req, res, 400, "EXPERT_APPOINT_REASON_REQUIRED", "Expert appointment reason is required.", "expert_assignment.appoint.reason.denied", "expert", expertId, project.id);
    }
    if (!ctx.state.experts.some((item) => item.id === expertId)) return res.status(404).json({ error: { code: "EXPERT_NOT_FOUND", message: "Expert does not exist." } });
    if (!assertProjectExpertNotAssigned(ctx, req, res, project, expertId, "expert_assignment.appoint.duplicate.denied")) return;
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
    syncExpertConfirmationTask(ctx, project, assignment);
    projectToReviewing(project);
    ctx.r4SourcingRepository.upsertProject(project);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "expert_assignment.appoint", "expert_assignment", assignment.id, project.id);
    ctx.eventBus.emit({
      eventCode: "ExpertAssignmentCreated",
      businessType: "review_award",
      businessId: project.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      projectId: project.id,
      idempotencyKey: `review_award:${project.id}:expert_assignment:${assignment.id}`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name,
        assignmentId: assignment.id,
        expertId: assignment.expertId,
        method: assignment.method
      }
    });
    return res.status(201).json({ assignment: publicExpertAssignment(ctx, assignment), auditLogId: log.id });
  });

  router.post("/expert-assignments/:assignmentId/replace", (req, res) => {
    const assignment = ensureAssignment(ctx, req.params.assignmentId, res);
    if (!assignment) return;
    const project = ensureProject(ctx, assignment.projectId, res);
    if (!project) return;
    if (!assertReviewManager(ctx, req, res, project, "expert_assignment.replace.denied")) return;
    if (!assertProjectAllowsExpertAssignment(ctx, req, res, project, "expert_assignment.replace.denied")) return;
    if (!assertReportMutable(ctx, req, res, project, "expert_assignment.replace.denied")) return;
    const replacementExpertId = String(req.body?.replacementExpertId ?? "");
    const reason = String(req.body?.reason ?? "").trim();
    if (!reason) {
      return denyResponse(ctx, req, res, 400, "EXPERT_REPLACE_REASON_REQUIRED", "Expert replacement reason is required.", "expert_assignment.replace.reason.denied", "expert_assignment", assignment.id, project.id);
    }
    if (!ctx.state.experts.some((item) => item.id === replacementExpertId)) return res.status(404).json({ error: { code: "EXPERT_NOT_FOUND", message: "Replacement expert does not exist." } });
    if (!assertProjectExpertNotAssigned(ctx, req, res, project, replacementExpertId, "expert_assignment.replace.duplicate.denied")) return;
    assignment.status = "replaced";
    assignment.replacedByExpertId = replacementExpertId;
    assignment.replacementReason = reason;
    ctx.r8WorkflowTaskRepository.completeTaskById(`task:expert_confirmation:${assignment.id}`, req.auth.user.id, "cancelled");
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
    syncExpertConfirmationTask(ctx, project, replacement);
    ctx.r4SourcingRepository.upsertProject(project);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "expert_assignment.replace", "expert_assignment", assignment.id, project.id);
    ctx.eventBus.emit({
      eventCode: "ExpertAssignmentReplaced",
      businessType: "review_award",
      businessId: project.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      projectId: project.id,
      idempotencyKey: `review_award:${project.id}:expert_assignment_replaced:${assignment.id}:${replacement.id}`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name,
        assignmentId: replacement.id,
        replacedAssignmentId: assignment.id,
        expertId: replacement.expertId,
        replacedExpertId: assignment.expertId,
        method: replacement.method
      }
    });
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
    if (assignment.status === "confirmed") {
      const project = ctx.state.projects.find((item) => item.id === assignment.projectId);
      ctx.r8WorkflowTaskRepository.completeTaskById(`task:expert_confirmation:${assignment.id}`, req.auth.user.id);
      if (project) createScoringSheetsForAssignment(ctx, project, assignment);
      ctx.eventBus.emit({
        eventCode: "ExpertAssignmentConfirmed",
        businessType: "review_award",
        businessId: assignment.projectId,
        businessTitle: project?.name ?? assignment.projectId,
        actor: req.auth.user,
        orgId: project?.orgId,
        projectId: assignment.projectId,
        idempotencyKey: `review_award:${assignment.projectId}:expert_assignment_confirmed:${assignment.id}`,
        payloadJson: {
          projectId: assignment.projectId,
          projectName: project?.name,
          assignmentId: assignment.id,
          expertId: assignment.expertId
        }
      });
    }
    return res.json({ assignment: publicExpertAssignment(ctx, assignment), auditLogId: log.id });
  });

  router.get("/expert-review/my-scoring-sheets", (req, res) => {
    if (!assertExpertRole(ctx, req, res, "scoring_sheet.my.denied", "my")) return;
    return res.json({
      scoringSheets: ctx.state.scoringSheets
        .filter((item) => item.expertId === req.auth.user.expertId && getAssignmentForExpert(ctx, item.projectId, req.auth.user.expertId))
        .map((item) => {
          const project = ctx.state.projects.find((projectItem) => projectItem.id === item.projectId);
          const supplier = ctx.state.suppliers.find((supplierItem) => supplierItem.id === item.supplierId);
          return {
            ...item,
            projectCode: project?.code ?? item.projectId,
            projectName: project?.name ?? item.projectId,
            supplierName: supplier?.name ?? item.supplierId
          };
        })
    });
  });

  router.get("/expert-review/my-assignments", (req, res) => {
    if (!assertExpertRole(ctx, req, res, "expert_assignment.my.denied", "my")) return;
    return res.json({
      assignments: ctx.state.expertAssignments
        .filter((item) => item.expertId === req.auth.user.expertId && !["replaced", "archived"].includes(item.status))
        .filter((item) => {
          const project = ctx.state.projects.find((projectItem) => projectItem.id === item.projectId);
          return Boolean(project && !project.externalTradeFlag);
        })
        .map((item) => publicExpertAssignment(ctx, item))
    });
  });

  router.get("/scoring-sheets/:sheetId", (req, res) => {
    const sheet = ensureSheet(ctx, req.params.sheetId, res);
    if (!sheet) return;
    if (!assertExpertMayReadSheet(ctx, req, res, sheet, "scoring_sheet.read.denied")) return;
    return res.json({ scoringSheet: publicScoringSheet(ctx, sheet) });
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
    if (!updateSheetScores(ctx, sheet, req.body)) {
      return res.status(400).json({ error: { code: "SCORING_SCORE_INVALID", message: "Scores must be numbers between 0 and 100." } });
    }
    sheet.status = "saved";
    ctx.r5ReviewAwardRepository.upsertScoringSheet(sheet);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "scoring_sheet.save", "scoring_sheet", sheet.id, sheet.projectId);
    return res.json({ scoringSheet: publicScoringSheet(ctx, sheet), auditLogId: log.id });
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
    if (!updateSheetScores(ctx, sheet, req.body)) {
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
      snapshotJson: { technical: sheet.technical, service: sheet.service, price: sheet.price, total: sheet.total, opinion: sheet.opinion, details: sheet.details ?? {} },
      createdAt: now
    };
    ctx.state.scoringVersions.push(version);
    ctx.r5ReviewAwardRepository.upsertScoringSheet(sheet);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "scoring_sheet.submit_lock", "scoring_sheet", sheet.id, sheet.projectId, `version=${version.versionNo}`);
    ctx.eventBus.emit({
      eventCode: "ExpertScoreSubmitted",
      businessType: "expert_scoring",
      businessId: sheet.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      supplierId: sheet.supplierId,
      projectId: sheet.projectId,
      idempotencyKey: `expert_scoring:${sheet.id}:submitted:${version.versionNo}`,
      payloadJson: {
        projectId: sheet.projectId,
        projectName: project.name,
        supplierId: sheet.supplierId,
        expertId: sheet.expertId,
        sheetId: sheet.id,
        status: sheet.status,
        versionNo: version.versionNo,
        total: sheet.total
      }
    });
    return res.json({ scoringSheet: publicScoringSheet(ctx, sheet), version, auditLogId: log.id });
  });

  router.post("/scoring-sheets/:sheetId/reevaluation-request", (req, res) => {
    const sheet = ensureSheet(ctx, req.params.sheetId, res);
    if (!sheet) return;
    const project = ensureProject(ctx, sheet.projectId, res);
    if (!project) return;
    if (!assertReviewApprover(ctx, req, res, project, "scoring_sheet.reevaluation_request.denied")) return;
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
    if (!assertReviewApprover(ctx, req, res, project, "scoring_sheet.reevaluation_approve.denied")) return;
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

  router.get("/projects/:projectId/review-record-detail", (req, res) => {
    const project = ensureProject(ctx, req.params.projectId, res);
    if (!project) return;
    if (!assertReviewRecordDetailReader(ctx, req, res, project, "review_record_detail.read.denied")) return;
    if (isBeforeDeadline(project)) {
      return denyResponse(ctx, req, res, 400, "BID_DEADLINE_NOT_REACHED", "Review detail is allowed only after quote deadline.", "review_record_detail.deadline.denied", "project", project.id, project.id, "deadline not reached");
    }
    return res.json({ detail: buildReviewRecordDetail(ctx, project) });
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
      snapshotJson: { generatedBy: req.auth.user.id, generatedAt: new Date().toISOString(), note: String(req.body?.note ?? ""), detail: buildReviewRecordDetail(ctx, project) },
      generatedAt: new Date().toISOString(),
      frozenAt: null,
      createdBy: req.auth.user.id
    };
    ctx.state.reviewReports.push(report);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "review_report.generate", "review_report", report.id, project.id);
    ctx.eventBus.emit({
      eventCode: "ReviewReportGenerated",
      businessType: "review_award",
      businessId: project.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      projectId: project.id,
      idempotencyKey: `review_award:${project.id}:review_report_generated:${report.id}`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name,
        reportId: report.id
      }
    });
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
    ctx.eventBus.emit({
      eventCode: "ReviewReportFrozen",
      businessType: "review_award",
      businessId: project.id,
      businessTitle: project.name,
      actor: req.auth.user,
      orgId: project.orgId,
      projectId: project.id,
      idempotencyKey: `review_award:${project.id}:review_report_frozen:${report.id}`,
      payloadJson: {
        projectId: project.id,
        projectName: project.name,
        reportId: report.id
      }
    });
    return res.json({ report, project, auditLogId: log.id });
  });

  return router;
}
