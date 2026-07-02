import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type {
  ProcurementDocumentAttachment,
  Supplier,
  SupplierAdmissionRuleSnapshot,
  SupplierAdmissionScoreItem,
  SupplierOnboardingCompanyMaterials,
  SupplierOnboardingContact,
  SupplierOnboardingProduct,
  SupplierOnboardingProfile,
  SupplierOnboardingQuestionnaire,
  SupplierOnboardingSite,
  User
} from "../types.js";
import { isProcurementMaintainerRole, isSupplierGovernanceRole, isSupplierRole, supplierIdMatches } from "../role-groups.js";
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
  const isSupplierObject = objectType === "supplier";
  const auditLog = ctx.auditService.record({
    context: req.auth,
    action: "phase1.business-action.denied",
    objectType,
    objectId,
    result: "denied",
    reason: isSupplierObject ? `${req.auth.roleId} cannot maintain supplier governance data` : `${req.auth.roleId} cannot maintain Phase 1 business data`
  });
  return res.status(403).json({
    error: {
      code: "PHASE1_BUSINESS_ACTION_DENIED",
      message: isSupplierObject ? "Only group procurement management can maintain supplier governance data." : "Only procurement business roles can maintain Phase 1 business data.",
      auditLogId: auditLog.id
    }
  });
}

function ensureBusinessMaintainer(ctx: AppContext, req: Request, res: Response, objectType: string, objectId: string) {
  if (objectType === "supplier") {
    if (isSupplierGovernanceRole(req.auth.roleId)) return true;
  } else if (isProcurementMaintainerRole(req.auth.roleId)) {
    return true;
  }
  denyBusinessAction(ctx, req, res, objectType, objectId);
  return false;
}

function canMaintainSupplierSelf(req: Request, supplierId: string) {
  return isSupplierRole(req.auth.roleId) && supplierIdMatches(req.auth.user, supplierId);
}

function ensureSupplierMutationAllowed(ctx: AppContext, req: Request, res: Response, supplierId: string) {
  if (isSupplierRole(req.auth.roleId)) {
    if (canMaintainSupplierSelf(req, supplierId)) return true;
    denyBusinessAction(ctx, req, res, "supplier", supplierId);
    return false;
  }
  return ensureBusinessMaintainer(ctx, req, res, "supplier", supplierId);
}

function assertSupplierReadable(ctx: AppContext, req: Request, res: Response, supplierId: string) {
  if (req.auth.roleId === "expert") {
    const auditLog = ctx.auditService.record({
      context: req.auth,
      action: "supplier.read.denied",
      objectType: "supplier",
      objectId: supplierId,
      result: "denied",
      reason: "expert cannot access supplier onboarding business data"
    });
    res.status(403).json({ error: { code: "SUPPLIER_BUSINESS_READ_DENIED", message: "Experts cannot access supplier onboarding business data.", auditLogId: auditLog.id } });
    return false;
  }
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

function stringValue(value: unknown, fallback = "") {
  return value === undefined || value === null ? fallback : String(value).trim();
}

function plainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeAttachments(raw: unknown, fallbackPrefix: string): ProcurementDocumentAttachment[] {
  if (!Array.isArray(raw)) return [];
  const now = new Date().toISOString();
  return raw.map((item, index) => {
    const value = plainObject(item);
    const size = Number(value.sizeBytes ?? 0);
    return {
      id: stringValue(value.id, `${fallbackPrefix}-att-${index + 1}`),
      fileName: stringValue(value.fileName, `attachment-${index + 1}.pdf`),
      contentType: stringValue(value.contentType, "application/pdf"),
      sizeBytes: Number.isFinite(size) ? size : 0,
      uploadedAt: stringValue(value.uploadedAt, now)
    };
  });
}

function normalizeContacts(raw: unknown, fallbackMobile: string): SupplierOnboardingContact[] {
  const rows = Array.isArray(raw) ? raw : [];
  const contacts: SupplierOnboardingContact[] = [];
  rows.forEach((item, index) => {
    const value = plainObject(item);
    const name = stringValue(value.name);
    const mobile = stringValue(value.mobile, fallbackMobile);
    if (!name && !mobile) return;
    contacts.push({
      id: stringValue(value.id, `contact-${index + 1}`),
      name,
      position: stringValue(value.position) || undefined,
      email: stringValue(value.email) || undefined,
      mobile,
      phone: stringValue(value.phone) || undefined,
      fax: stringValue(value.fax) || undefined,
      primary: index === 0 || Boolean(value.primary)
    });
  });
  return contacts;
}

function normalizeProducts(raw: unknown, defaultCategory: string): SupplierOnboardingProduct[] {
  const rows = Array.isArray(raw) ? raw : [];
  const products: SupplierOnboardingProduct[] = [];
  rows.forEach((item, index) => {
    const value = plainObject(item);
    const name = stringValue(value.name);
    const category = stringValue(value.category, defaultCategory);
    if (!name && !category) return;
    products.push({
      id: stringValue(value.id, `product-${index + 1}`),
      category,
      name: name || category,
      specification: stringValue(value.specification) || undefined,
      monthlyCapacity: stringValue(value.monthlyCapacity) || undefined,
      description: stringValue(value.description) || undefined,
      attachments: normalizeAttachments(value.attachments, `product-${index + 1}`)
    });
  });
  return products;
}

function normalizeSites(raw: unknown): SupplierOnboardingSite[] {
  const allowedTypes = new Set(["office", "factory", "showroom", "warehouse", "other"]);
  const rows = Array.isArray(raw) ? raw : [];
  const sites: SupplierOnboardingSite[] = [];
  rows.forEach((item, index) => {
    const value = plainObject(item);
    const siteType = stringValue(value.siteType, "office");
    const name = stringValue(value.name);
    if (!name && !stringValue(value.address)) return;
    sites.push({
      id: stringValue(value.id, `site-${index + 1}`),
      siteType: (allowedTypes.has(siteType) ? siteType : "other") as SupplierOnboardingSite["siteType"],
      name: name || "供应商场所",
      address: stringValue(value.address) || undefined,
      description: stringValue(value.description) || undefined,
      attachments: normalizeAttachments(value.attachments, `site-${index + 1}`)
    });
  });
  return sites;
}

function normalizeCompanyMaterials(raw: unknown): SupplierOnboardingCompanyMaterials {
  const value = plainObject(raw);
  return {
    enterpriseNature: stringValue(value.enterpriseNature) || undefined,
    taxpayerType: stringValue(value.taxpayerType) || undefined,
    registeredCapital: stringValue(value.registeredCapital) || undefined,
    employeeScale: stringValue(value.employeeScale) || undefined,
    annualRevenue: stringValue(value.annualRevenue) || undefined,
    qualitySystem: stringValue(value.qualitySystem) || undefined,
    qualityDescription: stringValue(value.qualityDescription) || undefined,
    cooperationCases: stringValue(value.cooperationCases) || undefined,
    developmentPlan: stringValue(value.developmentPlan) || undefined,
    sunshineCommitmentAccepted: Boolean(value.sunshineCommitmentAccepted),
    attachments: normalizeAttachments(value.attachments, "company-material")
  };
}

function normalizeQuestionnaire(raw: unknown): SupplierOnboardingQuestionnaire {
  const value = plainObject(raw);
  return {
    cooperationScope: stringValue(value.cooperationScope) || undefined,
    serviceCapability: stringValue(value.serviceCapability) || undefined,
    deliveryCoverage: stringValue(value.deliveryCoverage) || undefined,
    afterSalesCommitment: stringValue(value.afterSalesCommitment) || undefined,
    complianceCommitment: stringValue(value.complianceCommitment) || undefined,
    remark: stringValue(value.remark) || undefined
  };
}

function flattenOnboardingAttachments(profile: SupplierOnboardingProfile): ProcurementDocumentAttachment[] {
  const attachments: ProcurementDocumentAttachment[] = [];
  for (const product of profile.products) attachments.push(...(product.attachments ?? []));
  for (const site of profile.sites) attachments.push(...(site.attachments ?? []));
  attachments.push(...(profile.companyMaterials.attachments ?? []));
  return attachments;
}

function supplierOnboardingAttachmentCount(supplier: Supplier) {
  const profile = supplier.onboardingProfile;
  const profileAttachmentCount = profile ? flattenOnboardingAttachments(profile).length : 0;
  return (supplier.qualificationAttachments?.length ?? 0) + profileAttachmentCount;
}

function hasPassedQualificationReview(supplier: Supplier) {
  return (
    supplier.qualification === "initial_review_passed" ||
    (supplier.admissionReviews ?? []).some((review) => review.reviewType === "qualification_initial_review" && review.status === "passed")
  );
}

function supplierReviewPreconditionError(supplier: Supplier, reviewType: string, status: string) {
  if (status !== "passed") return null;
  if (reviewType === "qualification_initial_review" && supplierOnboardingAttachmentCount(supplier) === 0) {
    return {
      code: "SUPPLIER_REVIEW_MATERIALS_INCOMPLETE",
      message: "供应商尚未上传资质附件，请先让供应商补充营业执照、企业资料或资质证明后再通过资质初审。"
    };
  }
  if (reviewType === "admission_assessment") {
    if (!hasPassedQualificationReview(supplier)) {
      return {
        code: "SUPPLIER_ADMISSION_REVIEW_BLOCKED",
        message: "请先完成资质初审通过，再提交准入评审。"
      };
    }
    if (supplierOnboardingAttachmentCount(supplier) === 0) {
      return {
        code: "SUPPLIER_REVIEW_MATERIALS_INCOMPLETE",
        message: "供应商尚未上传资质附件，请先让供应商补充营业执照、企业资料或资质证明后再通过准入评审。"
      };
    }
  }
  return null;
}

function syncOnboardingProfileFromSupplier(supplier: Supplier) {
  if (!supplier.onboardingProfile) return;
  const primaryContact = supplier.onboardingProfile.contacts?.[0];
  supplier.onboardingProfile = {
    ...supplier.onboardingProfile,
    basic: {
      ...supplier.onboardingProfile.basic,
      companyName: supplier.name,
      socialCreditCode: supplier.socialCreditCode ?? supplier.onboardingProfile.basic?.socialCreditCode ?? "",
      businessLicenseNo: supplier.businessLicenseNo ?? supplier.onboardingProfile.basic?.businessLicenseNo,
      legalRepresentative: supplier.legalRepresentative ?? supplier.onboardingProfile.basic?.legalRepresentative ?? "",
      registeredAddress: supplier.registeredAddress ?? supplier.onboardingProfile.basic?.registeredAddress,
      businessScope: supplier.businessScope ?? supplier.onboardingProfile.basic?.businessScope
    },
    contacts: primaryContact
      ? [
          {
            ...primaryContact,
            name: supplier.contactName ?? primaryContact.name,
            email: supplier.contactEmail ?? primaryContact.email,
            mobile: supplier.contactPhone ?? primaryContact.mobile
          },
          ...(supplier.onboardingProfile.contacts ?? []).slice(1)
        ]
      : supplier.contactName || supplier.contactPhone || supplier.contactEmail
        ? [
            {
              id: "contact-1",
              name: supplier.contactName ?? "",
              email: supplier.contactEmail,
              mobile: supplier.contactPhone ?? "",
              primary: true
            }
          ]
        : [],
    products:
      supplier.categoryAuth.length && (supplier.onboardingProfile.products?.length ?? 0) === 0
        ? supplier.categoryAuth.map((category, index) => ({ id: `product-${index + 1}`, category, name: category }))
        : supplier.onboardingProfile.products
  };
}

function storeOnboardingProfileAttachments(ctx: AppContext, rawBody: unknown, profile: SupplierOnboardingProfile, supplierId: string): SupplierOnboardingProfile {
  const body = plainObject(rawBody);
  const rawProducts = Array.isArray(body.products) ? body.products : [];
  const rawSites = Array.isArray(body.sites) ? body.sites : [];
  const rawCompanyMaterials = plainObject(body.companyMaterials);
  return {
    ...profile,
    products: profile.products.map((product, index) => ({
      ...product,
      attachments: resolveAttachments(ctx, plainObject(rawProducts[index])?.attachments ?? product.attachments, {
        fallbackPrefix: `${supplierId}-product-${index + 1}`,
        objectType: "supplier",
        objectId: supplierId,
        attachmentKind: "supplier_product_material",
        supplierId,
        uploadedBy: "system"
      })
    })),
    sites: profile.sites.map((site, index) => ({
      ...site,
      attachments: resolveAttachments(ctx, plainObject(rawSites[index])?.attachments ?? site.attachments, {
        fallbackPrefix: `${supplierId}-site-${index + 1}`,
        objectType: "supplier",
        objectId: supplierId,
        attachmentKind: "supplier_site_material",
        supplierId,
        uploadedBy: "system"
      })
    })),
    companyMaterials: {
      ...profile.companyMaterials,
      attachments: resolveAttachments(ctx, rawCompanyMaterials.attachments ?? profile.companyMaterials.attachments, {
        fallbackPrefix: `${supplierId}-company-material`,
        objectType: "supplier",
        objectId: supplierId,
        attachmentKind: "supplier_qualification",
        supplierId,
        uploadedBy: "system"
      })
    }
  };
}

function buildOnboardingProfile(reqBody: unknown, now: string): SupplierOnboardingProfile {
  const body = plainObject(reqBody);
  const account = plainObject(body.account);
  const basic = plainObject(body.basic);
  const fallbackCategory = stringValue(body.category);
  const contactName = stringValue(body.contactName);
  const contactMobile = stringValue(body.contactPhone);
  const contacts = normalizeContacts(body.contacts, contactMobile);
  if (contacts.length === 0 && (contactName || contactMobile)) {
    contacts.push({ id: "contact-1", name: contactName, mobile: contactMobile, primary: true });
  }
  const category = stringValue(basic.category, fallbackCategory);
  const products = normalizeProducts(body.products, category);
  if (products.length === 0 && category) {
    products.push({ id: "product-1", category, name: category, specification: stringValue(body.productSpecification) || undefined, monthlyCapacity: stringValue(body.monthlyCapacity) || undefined });
  }
  return {
    account: {
      mobile: stringValue(account.mobile, contactMobile),
      agreementAccepted: Boolean(body.agreementAccepted ?? account.agreementAccepted),
      agreementVersion: stringValue(account.agreementVersion, "local-supplier-entry-agreement-v1"),
      submittedFrom: stringValue(account.submittedFrom, "supplier_self_registration")
    },
    basic: {
      companyName: stringValue(basic.companyName, stringValue(body.name)),
      socialCreditCode: stringValue(basic.socialCreditCode, stringValue(body.socialCreditCode)),
      businessLicenseNo: stringValue(basic.businessLicenseNo, stringValue(body.businessLicenseNo)) || undefined,
      legalRepresentative: stringValue(basic.legalRepresentative, stringValue(body.legalRepresentative)),
      registeredAddress: stringValue(basic.registeredAddress, stringValue(body.registeredAddress)) || undefined,
      detailAddress: stringValue(basic.detailAddress) || undefined,
      website: stringValue(basic.website) || undefined,
      businessScope: stringValue(basic.businessScope, stringValue(body.businessScope)) || undefined,
      supplierType: stringValue(basic.supplierType, stringValue(body.supplierType, "registered_supplier")) || undefined,
      supplierSource: stringValue(basic.supplierSource, stringValue(body.supplierSource, "supplier_self_registration")) || undefined
    },
    contacts,
    products,
    sites: normalizeSites(body.sites),
    companyMaterials: normalizeCompanyMaterials(body.companyMaterials),
    questionnaire: normalizeQuestionnaire(body.questionnaire),
    submittedAt: now
  };
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

function supplierAccountIds(supplierId: string) {
  return {
    adminUserId: `u-supplier-admin-${supplierId}`,
    quotationUserId: `u-supplier-quotation-${supplierId}`
  };
}

function supplierAccountPayload(userId: string, includePassword: boolean) {
  return {
    userId,
    username: userId,
    initialPassword: includePassword ? `pass-${userId}` : undefined
  };
}

function temporaryPasswordFor(userId: string) {
  const token = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `Reset@${new Date().getUTCFullYear()}-${userId.slice(-6)}-${token}`;
}

function ensureSupplierAccessAccounts(ctx: AppContext, supplier: Supplier, options: { includeInitialPassword: boolean }) {
  const { adminUserId, quotationUserId } = supplierAccountIds(supplier.id);
  const accountIds = [adminUserId, quotationUserId];
  const existingAccountIds = new Set(ctx.authStore.getAccountsByUserIds(accountIds).map((account) => account.userId));
  const accountUsers: User[] = [
    { id: adminUserId, name: `${supplier.name} 管理员`, roleId: "supplier_admin", orgId: "org-supplier", supplierId: supplier.id, status: "active" },
    { id: quotationUserId, name: `${supplier.name} 报价员`, roleId: "supplier_quotation", orgId: "org-supplier", supplierId: supplier.id, status: "active" }
  ];
  for (const accountUser of accountUsers) {
    const existing = ctx.state.users.find((item) => item.id === accountUser.id);
    if (existing) {
      existing.name = accountUser.name;
      existing.roleId = accountUser.roleId;
      existing.orgId = accountUser.orgId;
      existing.supplierId = accountUser.supplierId;
      existing.status = "active";
    } else {
      ctx.state.users.push(accountUser);
    }
  }
  supplier.registrationTrace = {
    submittedAt: supplier.registrationTrace?.submittedAt ?? new Date().toISOString(),
    agreementAcceptedAt: supplier.registrationTrace?.agreementAcceptedAt ?? new Date().toISOString(),
    captchaProvider: supplier.registrationTrace?.captchaProvider ?? "local_mock",
    captchaVerified: supplier.registrationTrace?.captchaVerified ?? true,
    realNameProvider: supplier.registrationTrace?.realNameProvider ?? "local_mock",
    realNameVerified: supplier.registrationTrace?.realNameVerified ?? true,
    adapterBoundary: supplier.registrationTrace?.adapterBoundary ?? "集团采购新增供应商时开通本地供应商账号；生产环境应对接统一身份/邀请流程。",
    adminUserId,
    quotationUserId
  };
  ctx.authStore.seedAccounts(ctx.state.users, ctx.config.allowLocalPasswordLogin);
  if (ctx.config.allowLocalPasswordLogin) {
    for (const accountId of accountIds.filter((id) => !existingAccountIds.has(id))) {
      ctx.authStore.requirePasswordChange(accountId);
    }
  }
  return {
    admin: supplierAccountPayload(adminUserId, options.includeInitialPassword && ctx.config.allowLocalPasswordLogin),
    quotation: supplierAccountPayload(quotationUserId, options.includeInitialPassword && ctx.config.allowLocalPasswordLogin)
  };
}

function supplierAccountDirectory(ctx: AppContext, supplier: Supplier) {
  const { adminUserId, quotationUserId } = supplierAccountIds(supplier.id);
  const accountRows = new Map(ctx.authStore.getAccountsByUserIds([adminUserId, quotationUserId]).map((account) => [account.userId, account]));
  const users = new Map(ctx.state.users.map((user) => [user.id, user]));
  return [
    {
      type: "admin",
      label: "供应商管理员",
      userId: adminUserId,
      username: accountRows.get(adminUserId)?.username ?? adminUserId,
      status: accountRows.get(adminUserId)?.status ?? users.get(adminUserId)?.status ?? "inactive",
      credentialSetupRequired: accountRows.get(adminUserId)?.passwordChangeRequired ?? false,
      lastLoginAt: accountRows.get(adminUserId)?.lastLoginAt ?? null
    },
    {
      type: "quotation",
      label: "供应商报价人员",
      userId: quotationUserId,
      username: accountRows.get(quotationUserId)?.username ?? quotationUserId,
      status: accountRows.get(quotationUserId)?.status ?? users.get(quotationUserId)?.status ?? "inactive",
      credentialSetupRequired: accountRows.get(quotationUserId)?.passwordChangeRequired ?? false,
      lastLoginAt: accountRows.get(quotationUserId)?.lastLoginAt ?? null
    }
  ];
}

export function supplierRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/suppliers/registration-boundary", (_req, res) => {
    return res.json({
      captchaProvider: "local_mock",
      realNameProvider: "local_mock",
      adapterBoundary: registrationAdapterBoundary,
      requiredFields: [
        "account.mobile",
        "basic.companyName",
        "basic.socialCreditCode",
        "basic.legalRepresentative",
        "contacts[0].name",
        "contacts[0].mobile",
        "products[0].category",
        "agreementAccepted",
        "captchaCode"
      ],
      steps: ["账号注册", "基础信息", "联系人信息", "主营产品", "办公室、工厂及展厅", "企业资料", "入驻问卷"],
      agreementVersion: "local-supplier-entry-agreement-v1"
    });
  });

  router.post("/suppliers/register", (req, res) => {
    const now = new Date().toISOString();
    const draftProfile = buildOnboardingProfile(req.body, now);
    const primaryContact = draftProfile.contacts[0];
    const primaryProduct = draftProfile.products[0];
    const name = draftProfile.basic.companyName;
    const category = primaryProduct?.category ?? "";
    const socialCreditCode = draftProfile.basic.socialCreditCode;
    const legalRepresentative = draftProfile.basic.legalRepresentative;
    const contactName = primaryContact?.name ?? "";
    const contactPhone = primaryContact?.mobile || draftProfile.account.mobile;
    const captchaCode = stringValue((req.body as Record<string, unknown>)?.captchaCode, stringValue(plainObject((req.body as Record<string, unknown>)?.account).captchaCode));
    if (!name || !category || !socialCreditCode || !legalRepresentative || !contactName || !contactPhone) {
      return res.status(400).json({ error: { code: "SUPPLIER_REGISTER_REQUIRED_FIELDS", message: "Supplier name, category, credit code, legal representative and contact are required." } });
    }
    if (!draftProfile.account.agreementAccepted) {
      return res.status(400).json({ error: { code: "SUPPLIER_AGREEMENT_REQUIRED", message: "Supplier entry agreement must be accepted before registration." } });
    }
    if (captchaCode !== "123456") {
      return res.status(400).json({ error: { code: "SUPPLIER_CAPTCHA_INVALID", message: "验证码不正确。" } });
    }
    if (!/^[0-9A-Z]{15,18}$/.test(socialCreditCode) || legalRepresentative.length < 2 || name.length < 2) {
      return res.status(400).json({
        error: {
          code: "SUPPLIER_REAL_NAME_MOCK_FAILED",
          message: "企业实名校验未通过：公司全称和法定代表人至少 2 个字，统一社会信用代码需为 15-18 位大写字母或数字。"
        }
      });
    }
    if (ctx.state.suppliers.some((item) => item.socialCreditCode === socialCreditCode)) {
      return res.status(409).json({ error: { code: "SUPPLIER_REGISTER_DUPLICATE", message: "Supplier social credit code already exists." } });
    }

    const supplierId = `sup-${ctx.state.suppliers.length + 1}`;
    const { adminUserId, quotationUserId } = supplierAccountIds(supplierId);
    const onboardingProfile = storeOnboardingProfileAttachments(ctx, req.body, draftProfile, supplierId);
    const explicitQualificationAttachments = resolveAttachments(ctx, req.body?.qualificationAttachments, {
      fallbackPrefix: `${supplierId}-register`,
      objectType: "supplier",
      objectId: supplierId,
      attachmentKind: "supplier_qualification",
      supplierId,
      uploadedBy: "system"
    });
    const onboardingAttachments = flattenOnboardingAttachments(onboardingProfile);
    const categoryAuth = Array.from(new Set(onboardingProfile.products.map((item) => item.category).filter(Boolean)));
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
      onboardingProfile,
      supplierType: onboardingProfile.basic.supplierType ?? "registered_supplier",
      supplierSource: onboardingProfile.basic.supplierSource ?? "supplier_self_registration",
      socialCreditCode,
      businessLicenseNo: onboardingProfile.basic.businessLicenseNo,
      legalRepresentative,
      registeredAddress: onboardingProfile.basic.detailAddress
        ? [onboardingProfile.basic.registeredAddress, onboardingProfile.basic.detailAddress].filter(Boolean).join(" ")
        : onboardingProfile.basic.registeredAddress,
      businessScope: onboardingProfile.basic.businessScope,
      contactName,
      contactPhone,
      contactEmail: primaryContact?.email,
      serviceRegions: onboardingProfile.sites.map((site, index) => ({
        id: `sr-${supplierId}-${index + 1}`,
        region: site.address ?? "",
        storeName: site.name,
        category,
        status: "active"
      })),
      categoryAuth,
      categoryAuthorizations: categoryAuth.map((item) => ({ category: item, status: "suspended", authorizedAt: now })),
      qualification: "pending_initial_review",
      qualificationAttachments: [...explicitQualificationAttachments, ...onboardingAttachments].map((item, index) => ({
        id: item.id,
        fileName: item.fileName,
        qualificationType: String(req.body?.qualificationType ?? (index < explicitQualificationAttachments.length ? "营业执照/资质证明" : "入驻资料附件")),
        validUntil: req.body?.validUntil === undefined ? undefined : String(req.body.validUntil),
        uploadedAt: item.uploadedAt
      })),
      admissionReviews: [],
      sealSamples: [],
      risk: "pending_admission",
      evaluationScore: null
    };
    ctx.state.suppliers.push(supplier);
    const accounts = ensureSupplierAccessAccounts(ctx, supplier, { includeInitialPassword: true });
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.auditService.record({
      context: req.auth,
      action: "supplier.register.self_service",
      objectType: "supplier",
      objectId: supplier.id,
      result: "allowed",
      reason: "self-service supplier registration submitted for group admission review"
    });
    ctx.processService.startSupplierOnboarding({ supplier: phase1Supplier(supplier), actor: req.auth.user, supplierAdminUserId: adminUserId });
    return res.status(201).json({
      supplier: phase1Supplier(supplier),
      accounts: { adminUserId, quotationUserId, admin: accounts.admin, quotation: accounts.quotation },
      adapterBoundary: registrationAdapterBoundary,
      auditLogId: auditLog.id
    });
  });

  router.post("/suppliers/register-legacy", (req, res) => {
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
      return res.status(400).json({ error: { code: "SUPPLIER_CAPTCHA_INVALID", message: "验证码不正确。" } });
    }
    if (!/^[0-9A-Z]{15,18}$/.test(socialCreditCode) || legalRepresentative.length < 2 || name.length < 2) {
      return res.status(400).json({ error: { code: "SUPPLIER_REAL_NAME_MOCK_FAILED", message: "企业实名校验未通过。" } });
    }
    if (ctx.state.suppliers.some((item) => item.socialCreditCode === socialCreditCode)) {
      return res.status(409).json({ error: { code: "SUPPLIER_REGISTER_DUPLICATE", message: "Supplier social credit code already exists." } });
    }
    const now = new Date().toISOString();
    const supplierId = `sup-${ctx.state.suppliers.length + 1}`;
    const { adminUserId, quotationUserId } = supplierAccountIds(supplierId);
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
    const accounts = ensureSupplierAccessAccounts(ctx, supplier, { includeInitialPassword: true });
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.auditService.record({
      context: req.auth,
      action: "supplier.register.local_mock",
      objectType: "supplier",
      objectId: supplier.id,
      result: "allowed",
      reason: "local mock captcha and real-name boundary passed"
    });
    ctx.processService.startSupplierOnboarding({ supplier: phase1Supplier(supplier), actor: req.auth.user, supplierAdminUserId: adminUserId });
    return res.status(201).json({
      supplier: phase1Supplier(supplier),
      accounts: { adminUserId, quotationUserId, admin: accounts.admin, quotation: accounts.quotation },
      adapterBoundary: registrationAdapterBoundary,
      auditLogId: auditLog.id
    });
  });

  router.get("/suppliers", (req, res) => {
    syncSuppliersFromR3(ctx);
    if (req.auth.roleId === "expert") {
      const auditLog = ctx.auditService.record({
        context: req.auth,
        action: "supplier.list.denied",
        objectType: "supplier",
        objectId: "list",
        result: "denied",
        reason: "expert cannot access supplier onboarding business data"
      });
      return res.status(403).json({ error: { code: "SUPPLIER_BUSINESS_READ_DENIED", message: "Experts cannot access supplier onboarding business data.", auditLogId: auditLog.id } });
    }
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
    const supplierId = `sup-${ctx.state.suppliers.length + 1}`;
    const admissionStatus: NonNullable<Supplier["admissionStatus"]> = "pending";
    const qualification = "pending_initial_review";
    const onboardingProfile = buildOnboardingProfile(req.body, now);
    const supplier: Supplier = {
      id: supplierId,
      name,
      status: admissionStatus,
      admissionStatus,
      admissionLevel: "trial",
      admissionRuleCode: defaultAdmissionRule.scoreTemplateCode,
      admissionRuleSnapshot: defaultAdmissionRule,
      periodicAssessment: {
        cycle: "quarterly",
        nextDueAt: nextAssessmentAt(now, defaultAdmissionRule.cycleDays),
        latestResult: "pending"
      },
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
      categoryAuthorizations: [{ category, status: "suspended", authorizedAt: now }],
      registrationTrace: {
        submittedAt: now,
        agreementAcceptedAt: now,
        captchaProvider: "local_mock",
        captchaVerified: true,
        realNameProvider: "local_mock",
        realNameVerified: true,
        adapterBoundary: "集团采购新增供应商时开通本地供应商账号；生产环境应对接统一身份/邀请流程。",
        ...supplierAccountIds(supplierId)
      },
      onboardingProfile: onboardingProfile.basic.companyName ? onboardingProfile : undefined,
      qualification,
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
      risk: "pending_admission",
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
    const accounts = ensureSupplierAccessAccounts(ctx, supplier, { includeInitialPassword: true });
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.admission.create", "supplier", supplier.id);
    ctx.processService.startSupplierOnboarding({ supplier: phase1Supplier(supplier), actor: req.auth.user, supplierAdminUserId: accounts.admin.userId });
    ctx.processService.recordSupplierOnboardingAction({
      supplier: phase1Supplier(supplier),
      actor: req.auth.user,
      action: "profile_submitted",
      detail: { route: "suppliers.admissions" }
    });
    return res.status(201).json({ supplier: phase1Supplier(supplier), accounts, auditLogId: auditLog.id });
  });

  router.patch("/suppliers/:supplierId/profile", (req, res) => {
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    if (!ensureSupplierMutationAllowed(ctx, req, res, req.params.supplierId)) return;
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
      const existingAttachments = supplier.qualificationAttachments ?? [];
      const newAttachments = resolveAttachments(ctx, req.body.qualificationAttachments, {
        fallbackPrefix: `${supplier.id}-profile`,
        objectType: "supplier",
        objectId: supplier.id,
        attachmentKind: "supplier_qualification",
        supplierId: supplier.id,
        uploadedBy: req.auth.user.id
      }).map((item) => ({
        id: item.id,
        fileName: item.fileName,
        contentType: item.contentType,
        sizeBytes: item.sizeBytes,
        qualificationType: String(req.body?.qualificationType ?? "certificate"),
        validUntil: req.body?.validUntil === undefined ? undefined : String(req.body.validUntil),
        uploadedAt: item.uploadedAt
      }));
      supplier.qualificationAttachments = [...existingAttachments, ...newAttachments];
      if (supplier.onboardingProfile) {
        supplier.onboardingProfile.companyMaterials = {
          ...supplier.onboardingProfile.companyMaterials,
          attachments: [...(supplier.onboardingProfile.companyMaterials?.attachments ?? []), ...newAttachments]
        };
      }
      ctx.r3SupplierProductRepository.replaceSupplierQualifications(supplier.id, supplier.qualificationAttachments, supplier.qualification);
    }
    syncOnboardingProfileFromSupplier(supplier);
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.profile.update", "supplier", supplier.id);
    ctx.processService.recordSupplierOnboardingAction({
      supplier: phase1Supplier(supplier),
      actor: req.auth.user,
      action: "profile_submitted",
      detail: { route: "suppliers.profile", qualificationAttachmentCount: supplier.qualificationAttachments?.length ?? 0 }
    });
    return res.json({ supplier: phase1Supplier(supplier), auditLogId: auditLog.id });
  });

  router.get("/suppliers/:supplierId", (req, res) => {
    syncSuppliersFromR3(ctx);
    if (!assertSupplierReadable(ctx, req, res, req.params.supplierId)) return;
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    return res.json({ supplier: phase1Supplier(supplier) });
  });

  router.get("/suppliers/:supplierId/accounts", (req, res) => {
    syncSuppliersFromR3(ctx);
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    if (!ensureBusinessMaintainer(ctx, req, res, "supplier", req.params.supplierId)) return;
    ensureSupplierAccessAccounts(ctx, supplier, { includeInitialPassword: false });
    const accounts = supplierAccountDirectory(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.account.list", "supplier", supplier.id, undefined, "passwords are not exposed");
    return res.json({ supplierId: supplier.id, accounts, auditLogId: auditLog.id });
  });

  router.post("/suppliers/:supplierId/accounts/:userId/reset-password", (req, res) => {
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    if (!ensureBusinessMaintainer(ctx, req, res, "supplier", req.params.supplierId)) return;
    ensureSupplierAccessAccounts(ctx, supplier, { includeInitialPassword: false });
    const allowedIds = Object.values(supplierAccountIds(supplier.id));
    if (!allowedIds.includes(req.params.userId)) {
      return res.status(404).json({ error: { code: "SUPPLIER_ACCOUNT_NOT_FOUND", message: "Supplier account does not exist for this supplier." } });
    }
    const temporaryPassword = temporaryPasswordFor(req.params.userId);
    const account = ctx.authStore.resetPassword(req.params.userId, temporaryPassword);
    if (!account) {
      return res.status(404).json({ error: { code: "SUPPLIER_ACCOUNT_NOT_FOUND", message: "Supplier account does not exist." } });
    }
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.account.password.reset", "auth_account", req.params.userId, undefined, `supplier=${supplier.id}`);
    return res.json({
      account: {
        ...supplierAccountDirectory(ctx, supplier).find((item) => item.userId === account.userId),
        temporaryPassword
      },
      auditLogId: auditLog.id
    });
  });

  router.get("/suppliers/:supplierId/qualifications", (req, res) => {
    syncSuppliersFromR3(ctx);
    if (!assertSupplierReadable(ctx, req, res, req.params.supplierId)) return;
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    const normalized = phase1Supplier(supplier);
    return res.json({
      supplierId: supplier.id,
      qualification: normalized.qualification,
      attachments: normalized.qualificationAttachments ?? []
    });
  });

  router.delete("/suppliers/:supplierId/qualifications/:attachmentId", (req, res) => {
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    if (!ensureSupplierMutationAllowed(ctx, req, res, req.params.supplierId)) return;
    const before = supplier.qualificationAttachments ?? [];
    const removed = before.find((item) => item.id === req.params.attachmentId);
    if (!removed) {
      return res.status(404).json({ error: { code: "SUPPLIER_QUALIFICATION_NOT_FOUND", message: "Qualification attachment does not exist." } });
    }
    supplier.qualificationAttachments = before.filter((item) => item.id !== req.params.attachmentId);
    ctx.r3SupplierProductRepository.replaceSupplierQualifications(supplier.id, supplier.qualificationAttachments, supplier.qualification);
    ctx.fileStore.softDelete(req.params.attachmentId, req.auth.user.id, "supplier qualification removed");
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.qualification.delete", "supplier_qualification", req.params.attachmentId, undefined, `supplier=${supplier.id}`);
    return res.json({ deleted: true, supplier: phase1Supplier(supplier), attachmentId: req.params.attachmentId, auditLogId: auditLog.id });
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
    const authorizationStatus = supplier.admissionStatus === "admitted" ? "active" : "suspended";
    if (existing) {
      existing.status = authorizationStatus;
      existing.expiresAt = req.body?.expiresAt ? String(req.body.expiresAt) : existing.expiresAt;
    } else {
      supplier.categoryAuthorizations.push({
        category,
        status: authorizationStatus,
        authorizedAt: new Date().toISOString(),
        expiresAt: req.body?.expiresAt ? String(req.body.expiresAt) : undefined
      });
    }
    if (!supplier.categoryAuth.includes(category)) supplier.categoryAuth.push(category);
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.category-authorize", "supplier", supplier.id);
    ctx.processService.recordSupplierOnboardingAction({
      supplier: phase1Supplier(supplier),
      actor: req.auth.user,
      action: supplier.admissionStatus === "admitted" ? "activated" : "category_authorized",
      detail: { route: "suppliers.category-authorizations", category, expiresAt: req.body?.expiresAt ? String(req.body.expiresAt) : undefined }
    });
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
    ctx.processService.recordSupplierOnboardingAction({
      supplier: phase1Supplier(supplier),
      actor: req.auth.user,
      action: "restricted",
      detail: { route: "suppliers.restrictions" }
    });
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
    const reason = String(req.body?.reason ?? "").trim();
    if (status === "inactive" && !reason) {
      return res.status(400).json({ error: { code: "SUPPLIER_INACTIVE_REASON_REQUIRED", message: "Supplier inactive reason is required." } });
    }
    supplier.admissionStatus = status as Supplier["admissionStatus"];
    supplier.status = status;
    if (status === "admitted") {
      supplier.admissionLevel = supplier.evaluationScore !== null && supplier.evaluationScore !== undefined ? levelFromScore(supplier.evaluationScore, "passed") : "regular";
      supplier.regularizedAt = supplier.regularizedAt ?? new Date().toISOString();
      supplier.restrictionReason = undefined;
      supplier.restrictedAt = undefined;
      supplier.risk = "正常";
      supplier.categoryAuthorizations = phase1Supplier(supplier).categoryAuthorizations?.map((item) => ({ ...item, status: "active" })) ?? [];
      supplier.periodicAssessment = { cycle: "quarterly", lastAssessedAt: supplier.regularizedAt, nextDueAt: nextAssessmentAt(supplier.regularizedAt, defaultAdmissionRule.cycleDays), latestScore: supplier.evaluationScore ?? undefined, latestResult: "passed" };
    }
    if (status === "restricted") {
      supplier.admissionLevel = "blacklisted";
      supplier.periodicAssessment = { ...(phase1Supplier(supplier).periodicAssessment ?? { cycle: "quarterly", nextDueAt: nextAssessmentAt(new Date().toISOString(), defaultAdmissionRule.cycleDays) }), latestResult: "blacklisted", latestScore: supplier.evaluationScore ?? undefined };
    }
    if (status === "inactive") {
      const now = new Date().toISOString();
      supplier.restrictionReason = reason;
      supplier.restrictedAt = now;
      supplier.risk = reason;
      supplier.categoryAuthorizations = phase1Supplier(supplier).categoryAuthorizations?.map((item) => ({ ...item, status: "suspended" })) ?? [];
      supplier.periodicAssessment = {
        ...(phase1Supplier(supplier).periodicAssessment ?? { cycle: "quarterly", nextDueAt: nextAssessmentAt(now, defaultAdmissionRule.cycleDays) }),
        latestResult: "warning"
      };
    }
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.status.update", "supplier", supplier.id, undefined, reason ? `status=${status};reason=${reason}` : `status=${status}`);
    if (status === "admitted") {
      ctx.processService.recordSupplierOnboardingAction({
        supplier: phase1Supplier(supplier),
        actor: req.auth.user,
        action: "activated",
        detail: { route: "suppliers.status", status }
      });
    } else if (status === "rejected") {
      ctx.processService.recordSupplierOnboardingAction({
        supplier: phase1Supplier(supplier),
        actor: req.auth.user,
        action: "admission_rejected",
        detail: { route: "suppliers.status", status }
      });
    } else if (status === "restricted") {
      ctx.processService.recordSupplierOnboardingAction({
        supplier: phase1Supplier(supplier),
        actor: req.auth.user,
        action: "restricted",
        detail: { route: "suppliers.status", status }
      });
    }
    return res.json({ supplier: phase1Supplier(supplier), auditLogId: auditLog.id });
  });

  router.get("/suppliers/:supplierId/project-participations", (req, res) => {
    syncSuppliersFromR3(ctx);
    if (!assertSupplierReadable(ctx, req, res, req.params.supplierId)) return;
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
    const preconditionError = supplierReviewPreconditionError(supplier, reviewType, status);
    if (preconditionError) {
      return res.status(400).json({ error: preconditionError });
    }
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
    if (review.reviewType === "qualification_initial_review") {
      ctx.processService.recordSupplierOnboardingAction({
        supplier: phase1Supplier(supplier),
        actor: req.auth.user,
        action: review.status === "passed" ? "qualification_passed" : review.status === "rejected" ? "qualification_rejected" : "profile_submitted",
        detail: { route: "suppliers.reviews", reviewType: review.reviewType, status: review.status, score: review.score }
      });
    }
    if (review.reviewType === "admission_assessment" || review.reviewType === "regularization_review") {
      ctx.processService.recordSupplierOnboardingAction({
        supplier: phase1Supplier(supplier),
        actor: req.auth.user,
        action: supplier.admissionStatus === "admitted" ? "admission_approved" : supplier.admissionStatus === "rejected" ? "admission_rejected" : supplier.admissionStatus === "restricted" ? "restricted" : "profile_submitted",
        detail: { route: "suppliers.reviews", reviewType: review.reviewType, status: review.status, score: review.score, regularizationDecision: review.regularizationDecision }
      });
      if (supplier.admissionStatus === "admitted") {
        ctx.processService.recordSupplierOnboardingAction({
          supplier: phase1Supplier(supplier),
          actor: req.auth.user,
          action: "activated",
          detail: { route: "suppliers.reviews", reviewType: review.reviewType, status: review.status }
        });
      }
    }
    if (review.reviewType === "periodic_assessment" && supplier.admissionStatus === "restricted") {
      ctx.processService.recordSupplierOnboardingAction({
        supplier: phase1Supplier(supplier),
        actor: req.auth.user,
        action: "restricted",
        detail: { route: "suppliers.reviews", reviewType: review.reviewType, status: review.status, score: review.score }
      });
    }
    return res.status(201).json({ supplier: phase1Supplier(supplier), review, auditLogId: auditLog.id });
  });

  router.post("/suppliers/:supplierId/seal-samples", (req, res) => {
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    if (!ensureSupplierMutationAllowed(ctx, req, res, req.params.supplierId)) return;
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
    });
    supplier.sealSamples = supplier.sealSamples ?? [];
    const confirmedAt = new Date().toISOString();
    const uploads = uploaded.length ? uploaded : [undefined];
    const samples = uploads.map((item, index) => {
      const suffix = uploads.length > 1 ? `-${index + 1}` : "";
      return {
        id: `ss-${supplier.id}-${supplier.sealSamples!.length + index + 1}`,
        sampleName: `${sampleName}${suffix}`,
        specification: String(req.body?.specification ?? ""),
        confirmedBy: req.auth.user.name,
        confirmedAt,
        fileId: item?.id,
        fileName: item?.fileName,
        contentType: item?.contentType,
        uploadedAt: item?.uploadedAt,
        imageFileName: item?.fileName
      };
    });
    supplier.sealSamples.push(...samples);
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.seal-sample.record", "supplier", supplier.id);
    return res.status(201).json({ supplier: phase1Supplier(supplier), sealSample: samples[0], sealSamples: samples, auditLogId: auditLog.id });
  });

  router.delete("/suppliers/:supplierId/seal-samples/:sampleId", (req, res) => {
    const supplier = ensureSupplier(ctx, req.params.supplierId, res);
    if (!supplier) return;
    if (!ensureSupplierMutationAllowed(ctx, req, res, req.params.supplierId)) return;
    const before = supplier.sealSamples ?? [];
    const removed = before.find((item) => item.id === req.params.sampleId);
    if (!removed) {
      return res.status(404).json({ error: { code: "SUPPLIER_SAMPLE_NOT_FOUND", message: "Seal sample does not exist." } });
    }
    supplier.sealSamples = before.filter((item) => item.id !== req.params.sampleId);
    if (removed.fileId) ctx.fileStore.softDelete(removed.fileId, req.auth.user.id, "supplier seal sample removed");
    persistSupplierToR3(ctx, supplier);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.seal-sample.delete", "supplier_seal_sample", req.params.sampleId, undefined, `supplier=${supplier.id}`);
    return res.json({ deleted: true, supplier: phase1Supplier(supplier), sampleId: req.params.sampleId, auditLogId: auditLog.id });
  });

  return router;
}
