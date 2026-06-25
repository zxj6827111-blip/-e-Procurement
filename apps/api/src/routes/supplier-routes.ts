import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type { Supplier, SupplierAdmissionRuleSnapshot, SupplierAdmissionScoreItem } from "../types.js";
import { isProcurementMaintainerRole, isSupplierAdminRole, isSupplierRole, supplierIdMatches } from "../role-groups.js";
import { resolveAttachments } from "./file-helpers.js";

const defaultAdmissionRule: SupplierAdmissionRuleSnapshot = {
  scoreTemplateCode: "PDF_SUPPLIER_ADMISSION_V1",
  passScore: 70,
  regularScore: 85,
  preferredScore: 92,
  blacklistBelowScore: 60,
  cycleDays: 90,
  templateItems: [
    { id: "qualification", name: "资质完整性", weight: 30 },
    { id: "delivery", name: "履约能力", weight: 25 },
    { id: "quality", name: "质量稳定性", weight: 25 },
    { id: "service", name: "服务响应", weight: 20 }
  ]
};

const registrationAdapterBoundary = "本地模拟验证码和实名校验：验证码固定接受 123456，实名校验仅校验统一社会信用代码/法人/企业名称格式；未连接真实短信、工商实名或统一身份平台。";

function denyBusinessAction(ctx: AppContext, req: Request, res: Response, objectType: string, objectId: string) {
  const auditLog = ctx.auditService.record({
    context: req.auth,
    action: "phase1.business-action.denied",
    objectType,
    objectId,
    result: "denied",
    reason: `${req.auth.roleId} cannot maintain Phase 1 business data`
  });
  return res.status(403).json({
    error: {
      code: "PHASE1_BUSINESS_ACTION_DENIED",
      message: "Only procurement business roles can maintain Phase 1 supplier data.",
      auditLogId: auditLog.id
    }
  });
}

function ensureBusinessMaintainer(ctx: AppContext, req: Request, res: Response, objectType: string, objectId: string) {
  if (isProcurementMaintainerRole(req.auth.roleId)) return true;
  denyBusinessAction(ctx, req, res, objectType, objectId);
  return false;
}

function canMaintainSupplierSelf(req: Request, supplierId: string) {
  return isSupplierAdminRole(req.auth.roleId) && supplierIdMatches(req.auth.user, supplierId);
}

function assertSupplierReadable(ctx: AppContext, req: Request, res: Response, supplierId: string) {
  if (req.auth.roleId === "admin") {
    ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "supplier", supplierId);
  }
  if (isSupplierRole(req.auth.roleId) && !supplierIdMatches(req.auth.user, supplierId)) {
    ctx.policies.supplierDataIsolation.assertSupplierAccess(req.auth, supplierId);
  }
  return true;
}

function ensureSupplier(ctx: AppContext, supplierId: string, res: Response) {
  const supplier = ctx.state.suppliers.find((item) => item.id === supplierId);
  if (!supplier) {
    res.status(404).json({ error: { code: "SUPPLIER_NOT_FOUND", message: "Supplier does not exist." } });
    return null;
  }
  return supplier;
}

function phase1Supplier(supplier: Supplier): Supplier {
  const admissionStatus = supplier.admissionStatus ?? (supplier.id === "sup-4" ? "restricted" : "admitted");
  const categoryAuthorizations =
    supplier.categoryAuthorizations ??
    supplier.categoryAuth.map((category) => ({
      category,
      status: admissionStatus === "restricted" ? ("suspended" as const) : ("active" as const),
      authorizedAt: "2026-06-01T00:00:00.000Z"
    }));
  return {
    ...supplier,
    admissionStatus,
    contactName: supplier.contactName ?? "",
    contactPhone: supplier.contactPhone ?? "",
    contactEmail: supplier.contactEmail ?? "",
    categoryAuthorizations,
    admissionLevel: supplier.admissionLevel ?? (admissionStatus === "restricted" ? "blacklisted" : admissionStatus === "pending" ? "trial" : "regular"),
    admissionRuleCode: supplier.admissionRuleCode ?? defaultAdmissionRule.scoreTemplateCode,
    admissionRuleSnapshot: supplier.admissionRuleSnapshot ?? defaultAdmissionRule,
    periodicAssessment:
      supplier.periodicAssessment ??
      ({
        cycle: "quarterly",
        nextDueAt: nextAssessmentAt(supplier.regularizedAt ?? supplier.registrationTrace?.submittedAt ?? "2026-06-01T00:00:00.000Z", defaultAdmissionRule.cycleDays),
        latestScore: supplier.evaluationScore ?? undefined,
        latestResult: admissionStatus === "restricted" ? "blacklisted" : admissionStatus === "admitted" ? "passed" : "pending"
      } as const),
    serviceRegions: supplier.serviceRegions ?? [],
    admissionReviews: supplier.admissionReviews ?? [],
    sealSamples: supplier.sealSamples ?? [],
    qualificationAttachments: supplier.qualificationAttachments ?? [],
    restrictionReason: supplier.restrictionReason ?? (admissionStatus === "restricted" ? supplier.risk : undefined)
  };
}

function nextAssessmentAt(fromIso: string, cycleDays: number) {
  const date = new Date(fromIso);
  date.setUTCDate(date.getUTCDate() + cycleDays);
  return date.toISOString();
}

function normalizeScoreItems(raw: unknown): SupplierAdmissionScoreItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const value = (item ?? {}) as Record<string, unknown>;
    const template = defaultAdmissionRule.templateItems[index] ?? { id: `custom-${index + 1}`, name: `自定义项 ${index + 1}`, weight: 0 };
    return {
      id: String(value.id ?? template.id),
      name: String(value.name ?? template.name),
      weight: Number(value.weight ?? template.weight),
      score: Number(value.score ?? 0),
      comment: value.comment === undefined ? undefined : String(value.comment)
    };
  });
}

function calculateScoreFromItems(items: SupplierAdmissionScoreItem[]) {
  if (items.length === 0) return undefined;
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, Number(item.weight)), 0);
  if (totalWeight <= 0) return Math.round(items.reduce((sum, item) => sum + Number(item.score), 0) / items.length);
  return Math.round(items.reduce((sum, item) => sum + Number(item.score) * Math.max(0, Number(item.weight)), 0) / totalWeight);
}

function levelFromScore(score: number | undefined, status: "pending" | "passed" | "rejected") {
  if (status === "rejected") return "blacklisted" as const;
  if (score !== undefined && score < defaultAdmissionRule.blacklistBelowScore) return "blacklisted" as const;
  if (score !== undefined && score >= defaultAdmissionRule.preferredScore) return "preferred" as const;
  if (score !== undefined && score >= defaultAdmissionRule.regularScore) return "regular" as const;
  return status === "passed" ? ("regular" as const) : ("trial" as const);
}

function syncSuppliersFromR3(ctx: AppContext) {
  ctx.r3SupplierProductRepository.syncSupplierState(ctx.state.suppliers);
}

function persistSupplierToR3(ctx: AppContext, supplier: Supplier) {
  ctx.r3SupplierProductRepository.upsertSupplier(phase1Supplier(supplier));
}

export function supplierRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/suppliers/registration-boundary", (_req, res) => {
    return res.json({
      captchaProvider: "local_mock",
      realNameProvider: "local_mock",
      adapterBoundary: registrationAdapterBoundary,
      requiredFields: ["name", "socialCreditCode", "legalRepresentative", "contactName", "contactPhone", "category", "agreementAccepted", "captchaCode"],
      agreementVersion: "local-supplier-entry-agreement-v1"
    });
  });

  router.post("/suppliers/register", (req, res) => {
    const name = String(req.body?.name ?? "").trim();
    const category = String(req.body?.category ?? "").trim();
    const socialCreditCode = String(req.body?.socialCreditCode ?? "").trim();
    const legalRepresentative = String(req.body?.legalRepresentative ?? "").trim();
    const contactName = String(req.body?.contactName ?? "").trim();
    const contactPhone = String(req.body?.contactPhone ?? "").trim();
    const captchaCode = String(req.body?.captchaCode ?? "").trim();
    const agreementAccepted = Boolean(req.body?.agreementAccepted);
    if (!name || !category || !socialCreditCode || !legalRepresentative || !contactName || !contactPhone) {
      return res.status(400).json({ error: { code: "SUPPLIER_REGISTER_REQUIRED_FIELDS", message: "Supplier name, category, credit code, legal representative and contact are required." } });
    }
    if (!agreementAccepted) {
      return res.status(400).json({ error: { code: "SUPPLIER_AGREEMENT_REQUIRED", message: "Supplier entry agreement must be accepted before registration." } });
    }
    if (captchaCode !== "123456") {
      return res.status(400).json({ error: { code: "SUPPLIER_CAPTCHA_INVALID", message: "Local mock captcha code is invalid." } });
    }
    if (!/^[0-9A-Z]{15,18}$/.test(socialCreditCode) || legalRepresentative.length < 2 || name.length < 2) {
      return res.status(400).json({ error: { code: "SUPPLIER_REAL_NAME_MOCK_FAILED", message: "Local mock real-name check failed." } });
    }
    if (ctx.state.suppliers.some((item) => item.socialCreditCode === socialCreditCode)) {
      return res.status(409).json({ error: { code: "SUPPLIER_REGISTER_DUPLICATE", message: "Supplier social credit code already exists." } });
    }
    const now = new Date().toISOString();
    const supplierId = `sup-${ctx.state.suppliers.length + 1}`;
    const adminUserId = `u-supplier-admin-${supplierId}`;
    const quotationUserId = `u-supplier-quotation-${supplierId}`;
    const supplier: Supplier = {
      id: supplierId,
      name,
      status: "pending",
      admissionStatus: "pending",
      admissionLevel: "trial",
      admissionRuleCode: defaultAdmissionRule.scoreTemplateCode,
      admissionRuleSnapshot: defaultAdmissionRule,
      periodicAssessment: { cycle: "quarterly", nextDueAt: nextAssessmentAt(now, defaultAdmissionRule.cycleDays), latestResult: "pending" },
      registrationTrace: {
        submittedAt: now,
        agreementAcceptedAt: now,
        captchaProvider: "local_mock",
        captchaVerified: true,
        realNameProvider: "local_mock",
        realNameVerified: true,
        adapterBoundary: registrationAdapterBoundary,
        adminUserId,
        quotationUserId
      },
      supplierType: req.body?.supplierType === undefined ? "registered_supplier" : String(req.body.supplierType),
      supplierSource: req.body?.supplierSource === undefined ? "local_mock_registration" : String(req.body.supplierSource),
      socialCreditCode,
      businessLicenseNo: req.body?.businessLicenseNo === undefined ? undefined : String(req.body.businessLicenseNo),
      legalRepresentative,
      registeredAddress: req.body?.registeredAddress === undefined ? undefined : String(req.body.registeredAddress),
      businessScope: req.body?.businessScope === undefined ? undefined : String(req.body.businessScope),
      contactName,
      contactPhone,
      contactEmail: req.body?.contactEmail === undefined ? undefined : String(req.body.contactEmail),
      serviceRegions: Array.isArray(req.body?.serviceRegions)
        ? req.body.serviceRegions.map((item: Record<string, unknown>, index: number) => ({
            id: String(item.id ?? `sr-${supplierId}-${index + 1}`),
            region: String(item.region ?? ""),
            storeName: String(item.storeName ?? ""),
            category: String(item.category ?? category),
            status: "active"
          }))
        : [],
      categoryAuth: [category],
      categoryAuthorizations: [{ category, status: "suspended", authorizedAt: now }],
      qualification: "pending_initial_review",
      qualificationAttachments: resolveAttachments(ctx, req.body?.qualificationAttachments, {
        fallbackPrefix: `${supplierId}-register`,
        objectType: "supplier",
        objectId: supplierId,
        attachmentKind: "supplier_qualification",
        supplierId,
        uploadedBy: "system"
      }).map((item) => ({
        id: item.id,
        fileName: item.fileName,
        qualificationType: String(req.body?.qualificationType ?? "营业执照/资质证明"),
        validUntil: req.body?.validUntil === undefined ? undefined : String(req.body.validUntil),
        uploadedAt: item.uploadedAt
      })),
      admissionReviews: [],
      sealSamples: [],
      risk: "pending_admission",
      evaluationScore: null
    };
    ctx.state.suppliers.push(supplier);
    ctx.state.users.push(
      { id: adminUserId, name: `${name} 管理员`, roleId: "supplier_admin", orgId: "org-supplier", supplierId, status: "active" },
      { id: quotationUserId, name: `${name} 报价员`, roleId: "supplier_quotation", orgId: "org-supplier", supplierId, status: "active" }
    );
    ctx.authStore.seedAccounts(ctx.state.users, ctx.config.mockAuthEnabled);
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.auditService.record({
      context: req.auth,
      action: "supplier.register.local_mock",
      objectType: "supplier",
      objectId: supplier.id,
      result: "allowed",
      reason: "local mock captcha and real-name boundary passed"
    });
    return res.status(201).json({ supplier: phase1Supplier(supplier), accounts: { adminUserId, quotationUserId }, adapterBoundary: registrationAdapterBoundary, auditLogId: auditLog.id });
  });

  router.get("/suppliers", (req, res) => {
    syncSuppliersFromR3(ctx);
    if (req.auth.roleId === "admin") {
      ctx.policies.adminBusinessIsolation.assertBusinessAccessAllowed(req.auth, "supplier", "list");
    }
    if (isSupplierRole(req.auth.roleId)) {
      return res.json({ suppliers: ctx.state.suppliers.filter((item) => item.id === req.auth.user.supplierId).map(phase1Supplier) });
    }
    return res.json({ suppliers: ctx.state.suppliers.map(phase1Supplier) });
  });

  router.post("/suppliers/admissions", (req, res) => {
    if (!ensureBusinessMaintainer(ctx, req, res, "supplier", "new")) return;
    const name = String(req.body?.name ?? "").trim();
    const category = String(req.body?.category ?? "").trim();
    if (!name || !category) {
      return res.status(400).json({ error: { code: "SUPPLIER_ADMISSION_INVALID", message: "Supplier name and category are required." } });
    }
    const now = new Date().toISOString();
    const supplier: Supplier = {
      id: `sup-${ctx.state.suppliers.length + 1}`,
      name,
      status: String(req.body?.admissionStatus ?? "admitted"),
      admissionStatus: (String(req.body?.admissionStatus ?? "admitted") as Supplier["admissionStatus"]) ?? "admitted",
      supplierType: req.body?.supplierType === undefined ? undefined : String(req.body.supplierType),
      supplierSource: req.body?.supplierSource === undefined ? undefined : String(req.body.supplierSource),
      socialCreditCode: req.body?.socialCreditCode === undefined ? undefined : String(req.body.socialCreditCode),
      businessLicenseNo: req.body?.businessLicenseNo === undefined ? undefined : String(req.body.businessLicenseNo),
      legalRepresentative: req.body?.legalRepresentative === undefined ? undefined : String(req.body.legalRepresentative),
      registeredAddress: req.body?.registeredAddress === undefined ? undefined : String(req.body.registeredAddress),
      businessScope: req.body?.businessScope === undefined ? undefined : String(req.body.businessScope),
      contactName: String(req.body?.contactName ?? ""),
      contactPhone: String(req.body?.contactPhone ?? ""),
      contactEmail: String(req.body?.contactEmail ?? ""),
      serviceRegions: Array.isArray(req.body?.serviceRegions)
        ? req.body.serviceRegions.map((item: Record<string, unknown>, index: number) => ({
            id: String(item.id ?? `sr-${ctx.state.suppliers.length + 1}-${index + 1}`),
            region: String(item.region ?? ""),
            storeName: String(item.storeName ?? ""),
            category: String(item.category ?? category),
            status: "active"
          }))
        : [],
      categoryAuth: [category],
      categoryAuthorizations: [{ category, status: "active", authorizedAt: now }],
      qualification: String(req.body?.qualification ?? "pending_review"),
      qualificationAttachments: resolveAttachments(ctx, req.body?.qualificationAttachments, {
        fallbackPrefix: `sqa-${ctx.state.suppliers.length + 1}`,
        objectType: "supplier",
        objectId: `sup-${ctx.state.suppliers.length + 1}`,
        attachmentKind: "supplier_qualification",
        uploadedBy: req.auth.user.id
      }).map((item) => ({
        id: item.id,
        fileName: item.fileName,
        qualificationType: String(req.body?.qualificationType ?? "营业执照/资质证明"),
        uploadedAt: item.uploadedAt
      })),
      admissionReviews: [],
      sealSamples: [],
      risk: "pending_review",
      evaluationScore: null
    };
    if ((supplier.qualificationAttachments ?? []).length === 0) {
      supplier.qualificationAttachments = [
        {
          id: `sqa-${ctx.state.suppliers.length + 1}`,
          fileName: String(req.body?.fileName ?? "供应商资质证明.pdf"),
          qualificationType: String(req.body?.qualificationType ?? "营业执照/资质证明"),
          uploadedAt: now
        }
      ];
    }
    persistSupplierToR3(ctx, supplier);
    ctx.state.suppliers.push(supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.admission.create", "supplier", supplier.id);
    return res.status(201).json({ supplier: phase1Supplier(supplier), auditLogId: auditLog.id });
  });

  router.patch("/suppliers/:supplierId/profile", (req, res) => {
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    if (isSupplierRole(req.auth.roleId)) {
      if (!canMaintainSupplierSelf(req, req.params.supplierId)) {
        return denyBusinessAction(ctx, req, res, "supplier", req.params.supplierId);
      }
    } else if (!ensureBusinessMaintainer(ctx, req, res, "supplier", req.params.supplierId)) {
      return;
    }
    supplier.name = req.body?.name === undefined ? supplier.name : String(req.body.name);
    supplier.supplierType = req.body?.supplierType === undefined ? supplier.supplierType : String(req.body.supplierType);
    supplier.supplierSource = req.body?.supplierSource === undefined ? supplier.supplierSource : String(req.body.supplierSource);
    supplier.socialCreditCode = req.body?.socialCreditCode === undefined ? supplier.socialCreditCode : String(req.body.socialCreditCode);
    supplier.businessLicenseNo = req.body?.businessLicenseNo === undefined ? supplier.businessLicenseNo : String(req.body.businessLicenseNo);
    supplier.legalRepresentative = req.body?.legalRepresentative === undefined ? supplier.legalRepresentative : String(req.body.legalRepresentative);
    supplier.registeredAddress = req.body?.registeredAddress === undefined ? supplier.registeredAddress : String(req.body.registeredAddress);
    supplier.businessScope = req.body?.businessScope === undefined ? supplier.businessScope : String(req.body.businessScope);
    supplier.contactName = req.body?.contactName === undefined ? supplier.contactName : String(req.body.contactName);
    supplier.contactPhone = req.body?.contactPhone === undefined ? supplier.contactPhone : String(req.body.contactPhone);
    supplier.contactEmail = req.body?.contactEmail === undefined ? supplier.contactEmail : String(req.body.contactEmail);
    supplier.categoryAuth = Array.isArray(req.body?.categoryAuth) ? req.body.categoryAuth.map(String) : supplier.categoryAuth;
    supplier.serviceRegions = Array.isArray(req.body?.serviceRegions)
      ? req.body.serviceRegions.map((item: Record<string, unknown>, index: number) => ({
          id: String(item.id ?? `sr-${supplier.id}-${index + 1}`),
          region: String(item.region ?? ""),
          storeName: String(item.storeName ?? ""),
          category: String(item.category ?? supplier.categoryAuth[0] ?? ""),
          status: String(item.status ?? "active") === "suspended" ? "suspended" : "active"
        }))
      : supplier.serviceRegions;
    if (req.body?.qualificationAttachments !== undefined) {
      supplier.qualificationAttachments = resolveAttachments(ctx, req.body.qualificationAttachments, {
        fallbackPrefix: `${supplier.id}-profile`,
        objectType: "supplier",
        objectId: supplier.id,
        attachmentKind: "supplier_qualification",
        supplierId: supplier.id,
        uploadedBy: req.auth.user.id
      }).map((item) => ({
        id: item.id,
        fileName: item.fileName,
        qualificationType: String(req.body?.qualificationType ?? "certificate"),
        validUntil: req.body?.validUntil === undefined ? undefined : String(req.body.validUntil),
        uploadedAt: item.uploadedAt
      }));
      ctx.r3SupplierProductRepository.replaceSupplierQualifications(supplier.id, supplier.qualificationAttachments, supplier.qualification);
    }
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.profile.update", "supplier", supplier.id);
    return res.json({ supplier: phase1Supplier(supplier), auditLogId: auditLog.id });
  });

  router.get("/suppliers/:supplierId", (req, res) => {
    syncSuppliersFromR3(ctx);
    assertSupplierReadable(ctx, req, res, req.params.supplierId);
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    return res.json({ supplier: phase1Supplier(supplier) });
  });

  router.get("/suppliers/:supplierId/qualifications", (req, res) => {
    syncSuppliersFromR3(ctx);
    assertSupplierReadable(ctx, req, res, req.params.supplierId);
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    const normalized = phase1Supplier(supplier);
    return res.json({
      supplierId: supplier.id,
      qualification: normalized.qualification,
      attachments: normalized.qualificationAttachments ?? []
    });
  });

  router.post("/suppliers/:supplierId/category-authorizations", (req, res) => {
    if (!ensureBusinessMaintainer(ctx, req, res, "supplier", req.params.supplierId)) return;
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    const category = String(req.body?.category ?? "").trim();
    if (!category) {
      return res.status(400).json({ error: { code: "SUPPLIER_CATEGORY_INVALID", message: "Category is required." } });
    }
    const normalized = phase1Supplier(supplier);
    supplier.categoryAuthorizations = normalized.categoryAuthorizations ?? [];
    const existing = supplier.categoryAuthorizations.find((item) => item.category === category);
    if (existing) {
      existing.status = "active";
      existing.expiresAt = req.body?.expiresAt ? String(req.body.expiresAt) : existing.expiresAt;
    } else {
      supplier.categoryAuthorizations.push({
        category,
        status: "active",
        authorizedAt: new Date().toISOString(),
        expiresAt: req.body?.expiresAt ? String(req.body.expiresAt) : undefined
      });
    }
    if (!supplier.categoryAuth.includes(category)) supplier.categoryAuth.push(category);
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.category-authorize", "supplier", supplier.id);
    return res.json({ supplier: phase1Supplier(supplier), auditLogId: auditLog.id });
  });

  router.post("/suppliers/:supplierId/restrictions", (req, res) => {
    if (!ensureBusinessMaintainer(ctx, req, res, "supplier", req.params.supplierId)) return;
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    supplier.admissionStatus = "restricted";
    supplier.status = "restricted";
    supplier.admissionLevel = "blacklisted";
    supplier.restrictionReason = String(req.body?.reason ?? "restricted by procurement control");
    supplier.restrictedAt = new Date().toISOString();
    supplier.periodicAssessment = { ...(phase1Supplier(supplier).periodicAssessment ?? { cycle: "quarterly", nextDueAt: nextAssessmentAt(supplier.restrictedAt, defaultAdmissionRule.cycleDays) }), latestResult: "blacklisted", latestScore: supplier.evaluationScore ?? undefined };
    supplier.categoryAuthorizations = phase1Supplier(supplier).categoryAuthorizations?.map((item) => ({ ...item, status: "suspended" })) ?? [];
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.restrict", "supplier", supplier.id, undefined, supplier.restrictionReason);
    return res.json({ supplier: phase1Supplier(supplier), auditLogId: auditLog.id });
  });

  router.post("/suppliers/:supplierId/status", (req, res) => {
    if (!ensureBusinessMaintainer(ctx, req, res, "supplier", req.params.supplierId)) return;
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    const status = String(req.body?.admissionStatus ?? "");
    if (!["pending", "admitted", "rejected", "restricted", "inactive"].includes(status)) {
      return res.status(400).json({ error: { code: "SUPPLIER_STATUS_INVALID", message: "Unsupported supplier admission status." } });
    }
    supplier.admissionStatus = status as Supplier["admissionStatus"];
    supplier.status = status;
    if (status === "admitted") {
      supplier.admissionLevel = supplier.evaluationScore !== null && supplier.evaluationScore !== undefined ? levelFromScore(supplier.evaluationScore, "passed") : "regular";
      supplier.regularizedAt = supplier.regularizedAt ?? new Date().toISOString();
      supplier.restrictionReason = undefined;
      supplier.restrictedAt = undefined;
      supplier.categoryAuthorizations = phase1Supplier(supplier).categoryAuthorizations?.map((item) => ({ ...item, status: "active" })) ?? [];
      supplier.periodicAssessment = { cycle: "quarterly", lastAssessedAt: supplier.regularizedAt, nextDueAt: nextAssessmentAt(supplier.regularizedAt, defaultAdmissionRule.cycleDays), latestScore: supplier.evaluationScore ?? undefined, latestResult: "passed" };
    }
    if (status === "restricted") {
      supplier.admissionLevel = "blacklisted";
      supplier.periodicAssessment = { ...(phase1Supplier(supplier).periodicAssessment ?? { cycle: "quarterly", nextDueAt: nextAssessmentAt(new Date().toISOString(), defaultAdmissionRule.cycleDays) }), latestResult: "blacklisted", latestScore: supplier.evaluationScore ?? undefined };
    }
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.status.update", "supplier", supplier.id, undefined, `status=${status}`);
    return res.json({ supplier: phase1Supplier(supplier), auditLogId: auditLog.id });
  });

  router.get("/suppliers/:supplierId/project-participations", (req, res) => {
    syncSuppliersFromR3(ctx);
    assertSupplierReadable(ctx, req, res, req.params.supplierId);
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    const projects = ctx.state.projects.filter((project) => project.participantSupplierIds.includes(supplier.id));
    return res.json({ supplierId: supplier.id, projects });
  });

  router.post("/suppliers/:supplierId/reviews", (req, res) => {
    if (!ensureBusinessMaintainer(ctx, req, res, "supplier", req.params.supplierId)) return;
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    const reviewType = String(req.body?.reviewType ?? "qualification_initial_review");
    if (!["qualification_initial_review", "admission_assessment", "regularization_review", "periodic_assessment"].includes(reviewType)) {
      return res.status(400).json({ error: { code: "SUPPLIER_REVIEW_TYPE_INVALID", message: "Unsupported supplier review type." } });
    }
    supplier.admissionReviews = supplier.admissionReviews ?? [];
    const scoreItems = normalizeScoreItems(req.body?.scoreItems);
    const calculatedScore = calculateScoreFromItems(scoreItems);
    const score = req.body?.score === undefined ? calculatedScore : Number(req.body.score);
    const status = String(req.body?.status ?? "pending") as "pending" | "passed" | "rejected";
    const regularizationDecision =
      req.body?.regularizationDecision === undefined
        ? levelFromScore(score, status)
        : (String(req.body.regularizationDecision) as "trial" | "regular" | "preferred" | "blacklisted");
    const review = {
      id: `sar-${supplier.id}-${supplier.admissionReviews.length + 1}`,
      reviewType: reviewType as "qualification_initial_review" | "admission_assessment" | "regularization_review" | "periodic_assessment",
      status,
      score,
      scoreTemplateCode: String(req.body?.scoreTemplateCode ?? defaultAdmissionRule.scoreTemplateCode),
      scoreItems,
      regularizationDecision,
      reviewer: req.auth.user.name,
      opinion: String(req.body?.opinion ?? ""),
      reviewedAt: new Date().toISOString()
    };
    supplier.admissionReviews.push(review);
    if (review.reviewType === "qualification_initial_review") {
      supplier.qualification = review.status === "passed" ? "initial_review_passed" : review.status === "rejected" ? "initial_review_rejected" : supplier.qualification;
    }
    if (review.reviewType === "admission_assessment") {
      supplier.admissionStatus = review.status === "passed" ? (review.regularizationDecision === "blacklisted" ? "restricted" : "admitted") : review.status === "rejected" ? "rejected" : supplier.admissionStatus;
      supplier.status = supplier.admissionStatus ?? supplier.status;
      supplier.admissionLevel = review.regularizationDecision;
      supplier.admissionRuleCode = review.scoreTemplateCode;
      supplier.admissionRuleSnapshot = defaultAdmissionRule;
      supplier.evaluationScore = review.score ?? supplier.evaluationScore;
      if (supplier.admissionStatus === "admitted") {
        supplier.regularizedAt = review.reviewedAt;
        supplier.categoryAuthorizations = phase1Supplier(supplier).categoryAuthorizations?.map((item) => ({ ...item, status: "active" })) ?? [];
      }
      if (supplier.admissionStatus === "restricted") {
        supplier.restrictionReason = review.opinion || "admission score below blacklist threshold";
        supplier.restrictedAt = review.reviewedAt;
        supplier.categoryAuthorizations = phase1Supplier(supplier).categoryAuthorizations?.map((item) => ({ ...item, status: "suspended" })) ?? [];
      }
      supplier.periodicAssessment = {
        cycle: "quarterly",
        lastAssessedAt: review.reviewedAt,
        nextDueAt: nextAssessmentAt(review.reviewedAt, defaultAdmissionRule.cycleDays),
        latestScore: review.score,
        latestResult: supplier.admissionStatus === "restricted" ? "blacklisted" : review.status === "passed" ? "passed" : "pending"
      };
    }
    if (review.reviewType === "regularization_review") {
      supplier.admissionLevel = review.regularizationDecision;
      supplier.admissionStatus = review.regularizationDecision === "blacklisted" ? "restricted" : review.status === "passed" ? "admitted" : supplier.admissionStatus;
      supplier.status = supplier.admissionStatus ?? supplier.status;
      supplier.regularizedAt = review.status === "passed" && review.regularizationDecision !== "blacklisted" ? review.reviewedAt : supplier.regularizedAt;
      supplier.evaluationScore = review.score ?? supplier.evaluationScore;
    }
    if (review.reviewType === "periodic_assessment") {
      supplier.evaluationScore = review.score ?? supplier.evaluationScore;
      supplier.periodicAssessment = {
        cycle: "quarterly",
        lastAssessedAt: review.reviewedAt,
        nextDueAt: nextAssessmentAt(review.reviewedAt, defaultAdmissionRule.cycleDays),
        latestScore: review.score,
        latestResult: review.regularizationDecision === "blacklisted" ? "blacklisted" : review.status === "passed" ? "passed" : "warning"
      };
      if (review.regularizationDecision === "blacklisted") {
        supplier.admissionStatus = "restricted";
        supplier.status = "restricted";
        supplier.admissionLevel = "blacklisted";
        supplier.restrictionReason = review.opinion || "periodic assessment failed";
        supplier.restrictedAt = review.reviewedAt;
        supplier.categoryAuthorizations = phase1Supplier(supplier).categoryAuthorizations?.map((item) => ({ ...item, status: "suspended" })) ?? [];
      }
    }
    ctx.r3SupplierProductRepository.addSupplierReview(supplier.id, review);
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(
      req.auth,
      "supplier.review.record",
      "supplier",
      supplier.id,
      undefined,
      `${review.reviewType}:${review.status}`
    );
    return res.status(201).json({ supplier: phase1Supplier(supplier), review, auditLogId: auditLog.id });
  });

  router.post("/suppliers/:supplierId/seal-samples", (req, res) => {
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    if (isSupplierRole(req.auth.roleId)) {
      if (!canMaintainSupplierSelf(req, req.params.supplierId)) {
        return denyBusinessAction(ctx, req, res, "supplier", req.params.supplierId);
      }
    } else if (!ensureBusinessMaintainer(ctx, req, res, "supplier", req.params.supplierId)) {
      return;
    }
    const sampleName = String(req.body?.sampleName ?? "").trim();
    if (!sampleName) {
      return res.status(400).json({ error: { code: "SUPPLIER_SAMPLE_INVALID", message: "Sample name is required." } });
    }
    const uploaded = resolveAttachments(ctx, req.body?.attachments, {
      fallbackPrefix: `${supplier.id}-sample`,
      objectType: "supplier",
      objectId: supplier.id,
      attachmentKind: "supplier_seal_sample",
      supplierId: supplier.id,
      uploadedBy: req.auth.user.id
    })[0];
    supplier.sealSamples = supplier.sealSamples ?? [];
    const sample = {
      id: `ss-${supplier.id}-${supplier.sealSamples.length + 1}`,
      sampleName,
      specification: String(req.body?.specification ?? ""),
      confirmedBy: req.auth.user.name,
      confirmedAt: new Date().toISOString(),
      fileId: uploaded?.id,
      fileName: uploaded?.fileName,
      contentType: uploaded?.contentType,
      uploadedAt: uploaded?.uploadedAt,
      imageFileName: uploaded?.fileName
    };
    supplier.sealSamples.push(sample);
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.seal-sample.record", "supplier", supplier.id);
    return res.status(201).json({ supplier: phase1Supplier(supplier), sealSample: sample, auditLogId: auditLog.id });
  });

  return router;
}
