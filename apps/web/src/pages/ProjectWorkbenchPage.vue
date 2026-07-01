<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import type { RouteLocationRaw } from "vue-router";
import { apiGet, apiPost, uploadFile } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import WorkflowSurfaceSummary from "../components/WorkflowSurfaceSummary.vue";
import { useSessionStore } from "../stores/session";
import { formatDateTime, labelAuditAction, labelStatus, statusLabelMap } from "../utils/status-labels";

type RoleId =
  | "group_manager"
  | "buyer"
  | "hotel_buyer"
  | "hotel_finance"
  | "platform_operator"
  | "supplier"
  | "supplier_admin"
  | "supplier_quotation"
  | "expert"
  | "finance_reviewer"
  | "auditor"
  | "admin";

interface Attachment {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt: string;
}

interface ProjectOption {
  id: string;
  code?: string;
  name: string;
  type?: string;
  status?: string;
  displayStatus: string;
  displayName?: string;
  sourceRequestTitle?: string;
  requestDepartment?: string;
  budgetAmount?: number;
  category: string;
  externalTradeFlag?: boolean;
}

interface WorkbenchResponse {
  project: {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    displayStatus: string;
    beforeDeadline?: boolean;
    category: string;
    buyer: string;
    quoteDeadlineAt: string | null;
    qualificationRequirements?: string[];
    quoteRequirements?: string[];
    clarificationRecords?: Array<{ id: string; question: string; answer: string }>;
    externalTradeFlag?: boolean;
  };
  procurementDocuments?: Array<{ id: string; status: string }>;
  announcements?: Array<{ id: string; title?: string; status: string; publishedAt?: string | null }>;
  invitations?: Array<{ id: string; supplierId?: string; status: string; notifiedAt?: string | null }>;
  registrations?: Array<{
    id: string;
    supplierId: string;
    announcementId: string;
    status: string;
    submittedAt?: string;
    qualifiedAt?: string;
    qualificationReason?: string;
    materialMetadata?: Attachment[];
    supplementMaterialMetadata?: Attachment[];
  }>;
  procurementRequest: {
    title: string;
    requestDepartment?: string;
    requesterName?: string;
    budgetLabel: string;
    budgetAmount?: number;
    expectedArrivalAt?: string;
    receivingLocation?: string;
    attachments?: Attachment[];
    lineItems?: Array<{ id: string; itemName: string; specification: string; quantity: number; unit: string; estimatedUnitPrice?: number }>;
  } | null;
  suppliers: Array<{
    id: string;
    name: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    admissionStatus?: string;
    qualification: string;
    risk: string;
    evaluationScore: number | null;
    serviceRegions: Array<{ id: string; region: string; storeName: string; category: string; status: string }>;
    admissionReviews: Array<{ id: string; reviewType: string; status: string; score?: number; opinion: string }>;
    sealSamples: Array<{ id: string; sampleName: string; specification: string }>;
  }>;
  bids: Array<{
    id: string;
    supplierId: string;
    supplierName?: string;
    status: string;
    amount?: number;
    taxRate?: number | null;
    taxInclusive?: boolean;
    submittedAt?: string | null;
    lockedAt?: string | null;
    deliveryDays?: number;
    responseSummary?: string;
    serviceCommitment?: string;
    fileName?: string;
    lineItems?: Array<{ id: string; itemName: string; quantity: number; unit: string; unitPrice: number; taxRate: number; totalPrice: number; deliveryDays: number }>;
    responseFileMetadata?: Attachment[];
  }>;
  comparisonReport: null | {
    id?: string;
    reportNo: string;
    status?: string;
    recommendedSupplierId: string;
    awardReason: string;
    nonLowestPriceReason?: string;
    generatedAt?: string;
    frozenAt?: string | null;
    comparisonRows?: Array<{
      supplierId: string;
      supplierName: string;
      amount: number;
      deliveryDays: number;
      serviceCommitment?: string;
      technicalScore?: number;
      serviceScore?: number;
      priceScore?: number;
      expertTotalScore?: number;
      finalScore?: number;
      submittedScoreCount?: number;
      rank: number;
      isLowestPrice: boolean;
    }>;
  };
  scoringSheets?: Array<{
    id: string;
    expertId: string;
    expertName?: string;
    supplierId: string;
    supplierName?: string;
    technical: number;
    service: number;
    price: number;
    total: number;
    status: string;
    opinion: string;
    versionNo: number;
    submittedAt: string | null;
    lockedAt: string | null;
  }>;
  reviewReports?: Array<{
    id: string;
    reportNo: string;
    status: string;
    generatedAt: string;
    frozenAt: string | null;
    summaryJson?: Record<string, unknown>;
  }>;
  awardApprovals: Array<{
    id: string;
    recommendedSupplierId?: string;
    selectedSupplierId: string;
    approvalStatus: string;
    isLowestPrice?: boolean;
    nonLowestPriceReason?: string;
    createdAt?: string;
    submittedAt?: string | null;
    approvedAt?: string | null;
  }>;
  pricingReports?: Array<{
    id: string;
    reportNo: string;
    selectedSupplierId: string;
    status: string;
    items: Array<{ id: string; itemName: string; specification?: string; purchasePrice: number; salePrice: number; unit: string; effectiveFrom: string; effectiveTo?: string }>;
    createdAt: string;
    approvedAt?: string | null;
  }>;
  resultNotifications?: Array<{ id: string; supplierId?: string; status: string; contentSummary: string; sentAt: string | null }>;
  purchaseOrders: Array<{
    id: string;
    orderNo: string;
    supplierId: string;
    status: string;
    totalAmount: number;
    expectedDeliveryAt: string;
    receivingLocation: string;
    statusRemark?: string;
    lineItems: Array<{ id: string; itemName: string; quantity: number; unit: string; receivedQuantity: number }>;
  }>;
  receiptRecords: Array<{
    id: string;
    receiptType: string;
    exceptionType?: string;
    summary: string;
    handlingStatus?: string;
    createdAt: string;
  }>;
  supplierEvaluations: Array<{
    id: string;
    supplierId: string;
    score: number;
    description: string;
    status: string;
    versionNo: number;
    dimensions: Record<string, number>;
  }>;
  settlementMaterials: Array<{
    id: string;
    materialType: string;
    status: string;
    fileId?: string;
    fileName?: string;
    uploadedAt?: string;
    contentType?: string;
    verificationOpinion?: string;
  }>;
  archiveItems: Array<{ id: string; itemName: string; requiredFlag: boolean; collectedFlag: boolean; status: string; sealed?: boolean }>;
  archiveSupplementRequests: Array<{ id: string; archiveItemId: string; approvalStatus: string; reason: string }>;
  auditLogs: Array<{ id: string; action: string; actorId: string; result: string; createdAt: string }>;
}

type WorkbenchStage = "current" | "done" | "upcoming";

interface ProjectOperationLink {
  label: string;
  to: RouteLocationRaw;
  meta: string;
  count: string;
  state: WorkbenchStage;
}

interface NextAction {
  title: string;
  detail: string;
  to?: RouteLocationRaw;
  action?: "generateOrder";
  anchor?: string;
}

const session = useSessionStore();
const route = useRoute();
const projectOptions = ref<ProjectOption[]>([]);
const selectedProjectId = ref("");
const workbench = ref<WorkbenchResponse | null>(null);
const loading = ref(false);
const actionBusy = ref("");
const auditLogId = ref("");
const errorMessage = ref("");

const settlementMaterialType = ref("invoice");
const settlementOrderId = ref("");
const settlementFile = ref<File | null>(null);
const settlementFileName = ref("");
const evaluationOrderId = ref("");
const evaluationScore = ref(92);
const evaluationDescription = ref("收货、服务和结算资料配合情况良好。");

const roleId = computed(() => session.roleId as RoleId);
const procurementRoles: RoleId[] = ["buyer", "platform_operator"];
const supplierRoles: RoleId[] = ["supplier", "supplier_admin", "supplier_quotation"];
const supplierAdminRoles: RoleId[] = ["supplier", "supplier_admin"];
const financeReviewRoles: RoleId[] = ["buyer", "group_manager", "finance_reviewer"];
const canGenerateOrder = computed(() => procurementRoles.includes(roleId.value) && workbench.value?.project.status === "awarded_pending_order");
const canConfirmOrder = computed(() => supplierAdminRoles.includes(roleId.value));
const canRecordReceipt = computed(() => procurementRoles.includes(roleId.value));
const canUploadSettlement = computed(() => supplierAdminRoles.includes(roleId.value) || procurementRoles.includes(roleId.value));
const canVerifySettlement = computed(() => financeReviewRoles.includes(roleId.value));
const canEvaluateSupplier = computed(() => procurementRoles.includes(roleId.value));
const isExternalTradeProject = computed(() => Boolean(workbench.value?.project.externalTradeFlag));
const selectedProjectOption = computed(() => projectOptions.value.find((item) => item.id === selectedProjectId.value) ?? null);

const projectStatusText = computed(() => {
  const project = workbench.value?.project;
  if (!project) return "-";
  return label(project.status) || label(project.displayStatus);
});

const projectTitle = computed(() => {
  const project = workbench.value?.project;
  if (!project) return "采购项目";
  const request = workbench.value?.procurementRequest;
  const itemTitle = request?.lineItems?.[0]?.itemName ? `${request.lineItems[0].itemName}采购项目` : "";
  const requestTitle = isGenericTitle(request?.title) ? itemTitle : request?.title || selectedProjectOption.value?.sourceRequestTitle;
  if (project.name && !isGenericTitle(project.name)) return project.name;
  return requestTitle || project.name || project.code;
});

const currentProjectLabel = computed(() => {
  const project = workbench.value?.project;
  if (!project) return selectedProjectOption.value?.displayName ?? "请选择项目";
  return `${project.code} / ${projectTitle.value}`;
});

const selectedProjectOptionLabel = computed(() => (selectedProjectOption.value ? projectOptionLabel(selectedProjectOption.value) : currentProjectLabel.value));

function projectOptionLabel(project: ProjectOption) {
  const name = project.displayName || [project.code, !isGenericTitle(project.name) ? project.name : project.sourceRequestTitle].filter(Boolean).join(" / ");
  const status = project.status ? label(project.status) : label(project.displayStatus);
  const parts = [name || project.name || project.id, project.requestDepartment, project.budgetAmount === undefined ? "" : currency(project.budgetAmount), status].filter(Boolean);
  return parts.join(" / ");
}

function isGenericTitle(value: string | undefined | null) {
  const text = String(value ?? "").trim();
  return !text || ["采购项目", "采购申请", "项目", "申请"].includes(text) || /^\d+$/.test(text);
}

const internalStatusOrder = [
  "project_created",
  "document_preparing",
  "document_published",
  "registration_open",
  "bidding_open",
  "bidding_locked",
  "expert_reviewing",
  "review_report_frozen",
  "award_approving",
  "awarded_pending_order",
  "result_notified",
  "contract_registered",
  "performing",
  "evaluated",
  "archived",
  "closed"
];
const externalStatusOrder = [
  "external_project_recorded",
  "external_announcement_uploaded",
  "external_result_uploaded",
  "external_result_recorded",
  "external_contract_registered",
  "external_performing",
  "external_evaluated",
  "external_archived",
  "external_closed"
];

function statusProgress(status: string | undefined, order: string[]) {
  const index = order.indexOf(status ?? "");
  return index < 0 ? 0 : index;
}

function stageState(targetStatuses: string[], order = internalStatusOrder): WorkbenchStage {
  const status = workbench.value?.project.status;
  if (!status) return "upcoming";
  if (targetStatuses.includes(status)) return "current";
  const currentIndex = statusProgress(status, order);
  const targetIndex = Math.min(...targetStatuses.map((item) => statusProgress(item, order)).filter((item) => item >= 0));
  return currentIndex > targetIndex ? "done" : "upcoming";
}

const registrationRows = computed(() => workbench.value?.registrations ?? []);
const announcementRows = computed(() => workbench.value?.announcements ?? []);
const invitationRows = computed(() => workbench.value?.invitations ?? []);
const publishedAnnouncementCount = computed(() => announcementRows.value.filter((item) => item.status === "published" || item.status === "closed").length);
const sentInvitationCount = computed(() => invitationRows.value.filter((item) => item.status === "sent" || item.status === "viewed" || item.status === "registered").length);
const pendingRegistrationCount = computed(() => registrationRows.value.filter((item) => item.status === "submitted").length);
const qualifiedRegistrationCount = computed(() => registrationRows.value.filter((item) => item.status === "qualified").length);
const rejectedRegistrationCount = computed(() => registrationRows.value.filter((item) => item.status === "rejected").length);
const registrationCountText = computed(() => {
  if (registrationRows.value.length === 0) return "0 家";
  return `${pendingRegistrationCount.value} 待审 / ${qualifiedRegistrationCount.value} 通过`;
});
const announcementCountText = computed(() => {
  const publishedText = `${publishedAnnouncementCount.value}/${announcementRows.value.length} 已发布`;
  if (invitationRows.value.length === 0) return publishedText;
  return `${publishedText}，${sentInvitationCount.value}/${invitationRows.value.length} 已邀请`;
});

function announcementStageState(): WorkbenchStage {
  const status = workbench.value?.project.status ?? "";
  const hasPublishedAnnouncement = publishedAnnouncementCount.value > 0 || statusProgress(status, internalStatusOrder) >= statusProgress("registration_open", internalStatusOrder);
  const invitationReady = invitationRows.value.length === 0 || sentInvitationCount.value > 0;
  if (hasPublishedAnnouncement && invitationReady) return "done";
  if (hasPublishedAnnouncement) return "current";
  return stageState(["document_published"]);
}

function registrationStageState(): WorkbenchStage {
  const status = workbench.value?.project.status ?? "";
  if (pendingRegistrationCount.value > 0) return "current";
  if (qualifiedRegistrationCount.value > 0) return "done";
  if (statusProgress(status, internalStatusOrder) > statusProgress("registration_open", internalStatusOrder)) return "done";
  if (status === "registration_open") return "current";
  return "upcoming";
}

function bidControlStageState(): WorkbenchStage {
  const status = workbench.value?.project.status ?? "";
  if (statusProgress(status, internalStatusOrder) >= statusProgress("bidding_locked", internalStatusOrder)) return "done";
  if (status === "bidding_open") return "current";
  if (status === "registration_open" && qualifiedRegistrationCount.value > 0 && pendingRegistrationCount.value === 0) return "current";
  return "upcoming";
}

function expertReviewStageState(): WorkbenchStage {
  const status = workbench.value?.project.status ?? "";
  if (["bidding_locked", "expert_reviewing"].includes(status)) return "current";
  if (statusProgress(status, internalStatusOrder) > statusProgress("expert_reviewing", internalStatusOrder)) return "done";
  return "upcoming";
}

function awardStageState(): WorkbenchStage {
  const status = workbench.value?.project.status ?? "";
  if (status === "review_report_frozen") return "current";
  return stageState(["award_approving", "awarded_pending_order", "result_notified"]);
}

const projectOperationLinks = computed<ProjectOperationLink[]>(() => {
  const projectId = selectedProjectId.value;
  if (!projectId) return [];
  if (isExternalTradeProject.value) {
    return [
      {
        label: "外部采购备案",
        to: { path: "/external-trade", query: { projectId } },
        meta: "登记外部平台编号、公告材料和结果备案",
        count: projectStatusText.value,
        state: stageState(["external_project_recorded", "external_announcement_uploaded", "external_result_uploaded", "external_result_recorded"], externalStatusOrder)
      }
    ];
  }
  return [
    {
      label: "采购文件",
      to: { path: "/procurement-documents", query: { projectId } },
      meta: "编制并发布锁定采购文件",
      count: `${workbench.value?.procurementDocuments?.length ?? 0} 份`,
      state: stageState(["project_created", "document_preparing"])
    },
    {
      label: "公告与邀请",
      to: { path: "/announcements-invitations", query: { projectId } },
      meta: "起草公告、发布公告、邀请供应商",
      count: announcementCountText.value,
      state: announcementStageState()
    },
    {
      label: "报名资料",
      to: { path: "/supplier-registration", query: { projectId } },
      meta: "审核供应商报名资料，通过后才可报价",
      count: registrationCountText.value,
      state: registrationStageState()
    },
    {
      label: "报价控制",
      to: { path: "/bid-control", query: { projectId } },
      meta: "报价截止、保密和解密控制",
      count: `${workbench.value?.bids.length ?? 0} 份`,
      state: bidControlStageState()
    },
    {
      label: "专家评审",
      to: { path: "/expert-review", query: { projectId } },
      meta: "组织专家评审并查看评审进度",
      count: workbench.value?.comparisonReport ? "已形成报告" : "待评审",
      state: expertReviewStageState()
    },
    {
      label: "定标结果",
      to: { path: "/award-result", query: { projectId } },
      meta: "汇总评审结果并发起定标",
      count: `${workbench.value?.awardApprovals.length ?? 0} 次`,
      state: awardStageState()
    }
  ];
});

const currentOperation = computed(() => projectOperationLinks.value.find((item) => item.state === "current") ?? null);
const completedOperationCount = computed(() => projectOperationLinks.value.filter((item) => item.state === "done").length);
const totalOperationCount = computed(() => projectOperationLinks.value.length);
const progressOverview = computed(() => {
  if (!totalOperationCount.value) return "暂无执行步骤";
  if (!currentOperation.value) return "当前暂无可处理步骤";
  return `当前阶段：${currentOperation.value.label}`;
});

function operationStateLabel(state: WorkbenchStage) {
  if (state === "done") return "已完成";
  if (state === "current") return "当前阶段";
  return "未开始";
}

const nextAction = computed<NextAction | null>(() => {
  const projectId = selectedProjectId.value;
  const status = workbench.value?.project.status ?? "";
  if (!projectId) return null;
  if (isExternalTradeProject.value) {
    if (["external_project_recorded", "external_announcement_uploaded", "external_result_uploaded", "external_result_recorded"].includes(status)) {
      return { title: "继续完善外部采购备案", detail: "补齐外部平台编号、公告材料、结果材料和备案记录。", to: { path: "/external-trade", query: { projectId } } };
    }
    return { title: "查看外部采购归档状态", detail: "核对外部采购材料是否已完整归集。", to: { path: "/external-trade", query: { projectId } } };
  }
  if (["project_created", "document_preparing"].includes(status)) {
    return { title: "编制并锁定采购文件", detail: "先完成采购文件，后续才能发布公告和邀请供应商。", to: { path: "/procurement-documents", query: { projectId } } };
  }
  if (status === "document_published") {
    return { title: "发布公告并邀请供应商", detail: "采购文件只是内部准备资料；供应商报名页只显示已发布公告。请先发布公告，并设置公开范围或邀请供应商。", to: { path: "/announcements-invitations", query: { projectId } } };
  }
  if (status === "registration_open") {
    if (pendingRegistrationCount.value > 0) {
      return {
        title: "审核报名资料",
        detail: `已有 ${pendingRegistrationCount.value} 家供应商待审核。资格通过后，供应商才可以进入报价响应。`,
        to: { path: "/supplier-registration", query: { projectId } }
      };
    }
    if (qualifiedRegistrationCount.value > 0) {
      return {
        title: "等待供应商报价",
        detail: `已有 ${qualifiedRegistrationCount.value} 家供应商资格通过，可通知供应商进入报价响应。`,
        to: { path: "/bid-control", query: { projectId } }
      };
    }
    return {
      title: "等待供应商报名",
      detail: "公告已发布，当前还没有供应商提交报名资料。可继续查看公告范围或邀请供应商。",
      to: { path: "/announcements-invitations", query: { projectId } }
    };
  }
  if (status === "bidding_open") {
    return { title: "关注报价截止和保密控制", detail: "报价未截止前只看进度，不提前查看报价内容。", to: { path: "/bid-control", query: { projectId } } };
  }
  if (status === "bidding_locked") {
    return { title: "组织专家评审", detail: "报价已锁定，可以进入专家评审和评审报告环节。", to: { path: "/expert-review", query: { projectId } } };
  }
  if (["expert_reviewing", "review_report_frozen", "award_approving"].includes(status)) {
    return { title: "推进定标结果", detail: "汇总评审结论，完成定标审批和结果通知。", to: { path: "/award-result", query: { projectId } } };
  }
  if (["awarded_pending_order", "result_notified"].includes(status)) {
    return { title: "生成采购订单", detail: "定标完成后进入订单履约，供应商确认后再收货。", action: "generateOrder" };
  }
  if (["contract_registered", "performing"].includes(status)) {
    return { title: "跟进订单履约与收货", detail: "查看订单确认、到货、异常收货和结算资料。", anchor: "fulfillment" };
  }
  return { title: "查看项目归档", detail: "核对档案清单、审计记录和项目归集状态。", anchor: "archive" };
});

const demandSummary = computed(() => {
  const request = workbench.value?.procurementRequest;
  if (!request) return [];
  return [
    { label: "申请部门", value: request.requestDepartment || "-" },
    { label: "申请人", value: request.requesterName || "-" },
    { label: "预算", value: currency(request.budgetAmount) },
    { label: "收货地点", value: request.receivingLocation || "-" }
  ];
});

const lineItemSummary = computed(() => {
  const items = workbench.value?.procurementRequest?.lineItems ?? [];
  if (items.length === 0) return "无明细";
  const first = items[0];
  return `${first.itemName}${items.length > 1 ? `等 ${items.length} 项` : ""}`;
});

const showSourcingDetails = computed(() => !isExternalTradeProject.value && Boolean(workbench.value));
const showBidDetails = computed(() => showSourcingDetails.value && (workbench.value?.bids.length || workbench.value?.comparisonReport || ["bidding_open", "bidding_locked", "expert_reviewing", "review_report_frozen", "award_approving", "awarded_pending_order", "result_notified"].includes(workbench.value?.project.status ?? "")));
const showFulfillmentDetails = computed(() => Boolean(workbench.value?.purchaseOrders.length || ["awarded_pending_order", "result_notified", "contract_registered", "performing", "evaluated", "archived", "closed"].includes(workbench.value?.project.status ?? "")));

const canReadBidBody = computed(() => {
  const status = workbench.value?.project.status ?? "";
  return (
    showSourcingDetails.value &&
    (statusProgress(status, internalStatusOrder) >= statusProgress("bidding_locked", internalStatusOrder) ||
      (workbench.value?.bids ?? []).some((bid) => typeof bid.amount === "number"))
  );
});

const evaluationWorkbenchVisible = computed(() => showSourcingDetails.value);

const supplierEngagementRows = computed(() => {
  const ids = new Set<string>();
  for (const supplier of workbench.value?.suppliers ?? []) ids.add(supplier.id);
  for (const registration of registrationRows.value) ids.add(registration.supplierId);
  for (const invitation of invitationRows.value) {
    if (invitation.supplierId) ids.add(invitation.supplierId);
  }
  for (const bid of workbench.value?.bids ?? []) ids.add(bid.supplierId);

  return [...ids].map((supplierId) => {
    const supplier = workbench.value?.suppliers.find((item) => item.id === supplierId);
    const registration = registrationRows.value.find((item) => item.supplierId === supplierId);
    const invitation = invitationRows.value.find((item) => item.supplierId === supplierId);
    const bid = [...(workbench.value?.bids ?? [])]
      .filter((item) => item.supplierId === supplierId)
      .sort((a, b) => String(b.submittedAt ?? b.lockedAt ?? "").localeCompare(String(a.submittedAt ?? a.lockedAt ?? "")))[0];
    const scores = (workbench.value?.scoringSheets ?? []).filter((item) => item.supplierId === supplierId && ["submitted_locked", "resubmitted_locked"].includes(item.status));
    const scoreAverage = scores.length ? scores.reduce((sum, item) => sum + item.total, 0) / scores.length : null;
    return {
      supplierId,
      supplierName: supplier?.name ?? bid?.supplierName ?? supplierId,
      contact: [supplier?.contactName, supplier?.contactPhone].filter(Boolean).join(" / ") || supplier?.contactEmail || "-",
      invitationStatus: invitation?.status ?? (invitationRows.value.length ? "未邀请" : "不适用"),
      registrationStatus: registration?.status ?? "未报名",
      registrationSubmittedAt: registration?.submittedAt,
      registrationQualifiedAt: registration?.qualifiedAt,
      bidStatus: bid?.status ?? "未报价",
      bidSubmittedAt: bid?.submittedAt,
      bidAmount: bid?.amount,
      scoreAverage,
      scoreCount: scores.length
    };
  });
});

const bidSummaryText = computed(() => {
  const total = workbench.value?.bids.length ?? 0;
  const submitted = (workbench.value?.bids ?? []).filter((bid) => ["submitted", "locked"].includes(bid.status)).length;
  const locked = (workbench.value?.bids ?? []).filter((bid) => bid.status === "locked").length;
  return `${submitted} 份已提交 / ${locked} 份已锁定 / ${total} 份记录`;
});

const quoteRows = computed(() => {
  if (!canReadBidBody.value) return [];
  return (workbench.value?.bids ?? [])
    .filter((bid) => ["submitted", "locked", "resubmitted"].includes(bid.status) && typeof bid.amount === "number")
    .flatMap((bid) => {
      const supplier = bid.supplierName || supplierName(bid.supplierId);
      const lines = bid.lineItems?.length
        ? bid.lineItems
        : [
            {
              id: `${bid.id}-summary`,
              itemName: "报价总额",
              quantity: 1,
              unit: "项",
              unitPrice: bid.amount ?? 0,
              taxRate: bid.taxRate ?? 0,
              totalPrice: bid.amount ?? 0,
              deliveryDays: bid.deliveryDays ?? 0
            }
          ];
      return lines.map((line) => ({
        ...line,
        bidId: bid.id,
        supplier,
        bidStatus: bid.status,
        serviceCommitment: bid.serviceCommitment || bid.responseSummary || "-"
      }));
    });
});

const comparisonRows = computed(() => workbench.value?.comparisonReport?.comparisonRows ?? []);

const scoringSummary = computed(() => {
  const sheets = workbench.value?.scoringSheets ?? [];
  const submitted = sheets.filter((item) => ["submitted_locked", "resubmitted_locked"].includes(item.status));
  const average = submitted.length ? submitted.reduce((sum, item) => sum + item.total, 0) / submitted.length : null;
  return {
    assigned: sheets.length,
    submitted: submitted.length,
    average
  };
});

const latestReviewReport = computed(() => {
  const reports = workbench.value?.reviewReports ?? [];
  return [...reports].sort((a, b) => String(b.frozenAt ?? b.generatedAt ?? "").localeCompare(String(a.frozenAt ?? a.generatedAt ?? "")))[0] ?? null;
});

const sortedAwardApprovals = computed(() =>
  [...(workbench.value?.awardApprovals ?? [])].sort((a, b) => String(b.approvedAt ?? b.submittedAt ?? b.createdAt ?? b.id).localeCompare(String(a.approvedAt ?? a.submittedAt ?? a.createdAt ?? a.id)))
);

const latestAwardApproval = computed(() => sortedAwardApprovals.value[0] ?? null);
const latestPricingReport = computed(() => [...(workbench.value?.pricingReports ?? [])].sort((a, b) => String(b.approvedAt ?? b.createdAt ?? "").localeCompare(String(a.approvedAt ?? a.createdAt ?? "")))[0] ?? null);

const statusText: Record<string, string> = {
  ...statusLabelMap,
  awarded_pending_order: "待生成订单",
  pending_confirmation: "待供应商确认",
  supplier_confirmed: "供应商已确认",
  performing: "履约中",
  partially_received: "部分收货",
  received: "已收货",
  exception: "异常处理中",
  closed: "已关闭",
  pending_verification: "待核验",
  verified: "已通过",
  rejected: "已驳回",
  submitted_locked: "已锁定",
  superseded: "已更正",
  complete: "完整",
  incomplete: "缺项",
  collecting: "归集中",
  sealed: "已封存",
  supplemented: "已补档",
  supplement_requested: "待补档审批",
  supplement_approved: "补档已批准",
  supplement_rejected: "补档已驳回",
  invoice: "发票",
  delivery_note: "送货单",
  acceptance_record: "验收单",
  other: "其他资料",
  partial: "部分收货",
  full: "全部收货",
  quantity_mismatch: "数量不符",
  quality_issue: "质量问题",
  delivery_delay: "延期交付",
  missing_documents: "资料缺失",
  pending_resolution: "待处理",
  none: "无",
  cooperation: "配合度",
  priceReasonableness: "价格合理性",
  quality: "质量",
  delivery: "交付",
  service: "服务"
};

function label(value: string | undefined | null) {
  return value ? statusText[value] ?? labelStatus(value) : "-";
}

function currency(value: number | undefined) {
  if (value === undefined) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}


function supplierNameMap() {
  const map = new Map<string, string>();
  for (const supplier of workbench.value?.suppliers ?? []) {
    map.set(supplier.id, supplier.name);
  }
  return map;
}

function supplierName(supplierId: string) {
  return supplierNameMap().get(supplierId) ?? supplierId;
}

function onSettlementFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  settlementFile.value = target.files?.[0] ?? null;
  settlementFileName.value = settlementFile.value?.name ?? "";
}

function routeProjectId() {
  const value = route.query.projectId;
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function pickProjectFromRouteOrFallback(preferRoute: boolean) {
  const queryProjectId = routeProjectId();
  if (preferRoute && queryProjectId && projectOptions.value.some((item) => item.id === queryProjectId)) {
    selectedProjectId.value = queryProjectId;
    return;
  }
  if (!projectOptions.value.some((item) => item.id === selectedProjectId.value)) {
    selectedProjectId.value = (queryProjectId && projectOptions.value.some((item) => item.id === queryProjectId) ? queryProjectId : projectOptions.value[0]?.id) ?? "";
  }
}

async function loadProjects(options: { preferRoute?: boolean } = {}) {
  const data = await apiGet<{ projects: ProjectOption[] }>("/api/projects");
  projectOptions.value = data.projects;
  pickProjectFromRouteOrFallback(Boolean(options.preferRoute));
}

async function loadWorkbench() {
  if (!selectedProjectId.value) {
    workbench.value = null;
    errorMessage.value = projectOptions.value.length === 0 ? "当前角色暂无可见项目。" : "";
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  auditLogId.value = "";
  try {
    workbench.value = await apiGet<WorkbenchResponse>(`/api/project-workbench/projects/${selectedProjectId.value}`);
    if (!workbench.value.purchaseOrders.some((item) => item.id === settlementOrderId.value)) {
      settlementOrderId.value = workbench.value.purchaseOrders[0]?.id ?? "";
    }
    if (!workbench.value.purchaseOrders.some((item) => item.id === evaluationOrderId.value)) {
      evaluationOrderId.value = workbench.value.purchaseOrders.find((item) => ["received", "closed"].includes(item.status))?.id ?? "";
    }
  } catch (error) {
    const err = error as Error & { auditLogId?: string };
    workbench.value = null;
    errorMessage.value = err.message;
    auditLogId.value = err.auditLogId ?? "";
  } finally {
    loading.value = false;
  }
}

async function runGenerateOrder() {
  if (!workbench.value) return;
  actionBusy.value = "generate";
  errorMessage.value = "";
  auditLogId.value = "";
  try {
    const result = await apiPost<{ auditLogId?: string }>(`/api/project-workbench/projects/${workbench.value.project.id}/purchase-orders/generate`, {
      expectedDeliveryAt: workbench.value.procurementRequest?.expectedArrivalAt,
      receivingLocation: workbench.value.procurementRequest?.receivingLocation
    });
    auditLogId.value = result.auditLogId ?? "";
    await loadWorkbench();
  } catch (error) {
    const err = error as Error & { auditLogId?: string };
    errorMessage.value = err.message;
    auditLogId.value = err.auditLogId ?? "";
  } finally {
    actionBusy.value = "";
  }
}

async function runConfirmOrder(orderId: string) {
  actionBusy.value = `confirm:${orderId}`;
  errorMessage.value = "";
  auditLogId.value = "";
  try {
    const result = await apiPost<{ auditLogId?: string }>(`/api/project-workbench/purchase-orders/${orderId}/confirm`);
    auditLogId.value = result.auditLogId ?? "";
    await loadWorkbench();
  } catch (error) {
    const err = error as Error & { auditLogId?: string };
    errorMessage.value = err.message;
    auditLogId.value = err.auditLogId ?? "";
  } finally {
    actionBusy.value = "";
  }
}

async function runRecordException(orderId: string) {
  const order = workbench.value?.purchaseOrders.find((item) => item.id === orderId);
  if (!order) return;
  actionBusy.value = `receipt:${orderId}`;
  errorMessage.value = "";
  auditLogId.value = "";
  try {
    const firstLine = order.lineItems[0];
    const result = await apiPost<{ auditLogId?: string }>(`/api/project-workbench/purchase-orders/${orderId}/receipts`, {
      receiptType: "exception",
      exceptionType: "quantity_mismatch",
      summary: "登记异常收货并进入后续处理。",
      receivedItems: firstLine
        ? [
            {
              itemName: firstLine.itemName,
              receivedQuantity: Math.max(1, Math.min(firstLine.quantity, firstLine.receivedQuantity + 1)),
              unit: firstLine.unit,
              accepted: false
            }
          ]
        : []
    });
    auditLogId.value = result.auditLogId ?? "";
    await loadWorkbench();
  } catch (error) {
    const err = error as Error & { auditLogId?: string };
    errorMessage.value = err.message;
    auditLogId.value = err.auditLogId ?? "";
  } finally {
    actionBusy.value = "";
  }
}

async function runRecordFullReceipt(orderId: string) {
  const order = workbench.value?.purchaseOrders.find((item) => item.id === orderId);
  if (!order) return;
  actionBusy.value = `receipt-full:${orderId}`;
  errorMessage.value = "";
  auditLogId.value = "";
  try {
    const result = await apiPost<{ auditLogId?: string }>(`/api/project-workbench/purchase-orders/${orderId}/receipts`, {
      receiptType: "full",
      summary: "全部到货并验收通过。",
      receivedItems: order.lineItems.map((line) => ({
        itemName: line.itemName,
        receivedQuantity: line.quantity,
        unit: line.unit,
        accepted: true
      }))
    });
    auditLogId.value = result.auditLogId ?? "";
    await loadWorkbench();
  } catch (error) {
    const err = error as Error & { auditLogId?: string };
    errorMessage.value = err.message;
    auditLogId.value = err.auditLogId ?? "";
  } finally {
    actionBusy.value = "";
  }
}

async function runChangeOrder(orderId: string) {
  const order = workbench.value?.purchaseOrders.find((item) => item.id === orderId);
  if (!order) return;
  actionBusy.value = `change:${orderId}`;
  errorMessage.value = "";
  auditLogId.value = "";
  try {
    const result = await apiPost<{ auditLogId?: string }>(`/api/project-workbench/purchase-orders/${orderId}/change`, {
      expectedDeliveryAt: order.expectedDeliveryAt,
      receivingLocation: order.receivingLocation,
      statusRemark: "页面登记订单变更，计划与收货信息已复核。"
    });
    auditLogId.value = result.auditLogId ?? "";
    await loadWorkbench();
  } catch (error) {
    const err = error as Error & { auditLogId?: string };
    errorMessage.value = err.message;
    auditLogId.value = err.auditLogId ?? "";
  } finally {
    actionBusy.value = "";
  }
}

async function runCloseOrder(orderId: string) {
  actionBusy.value = `close:${orderId}`;
  errorMessage.value = "";
  auditLogId.value = "";
  try {
    const result = await apiPost<{ auditLogId?: string }>(`/api/project-workbench/purchase-orders/${orderId}/close`, {
      reason: "页面关闭采购订单。"
    });
    auditLogId.value = result.auditLogId ?? "";
    await loadWorkbench();
  } catch (error) {
    const err = error as Error & { auditLogId?: string };
    errorMessage.value = err.message;
    auditLogId.value = err.auditLogId ?? "";
  } finally {
    actionBusy.value = "";
  }
}

async function uploadSettlementMaterial() {
  if (!workbench.value || !settlementOrderId.value || !settlementFile.value) return;
  actionBusy.value = "settlement";
  errorMessage.value = "";
  auditLogId.value = "";
  try {
    const fileResult = await uploadFile(settlementFile.value, {
      attachmentKind: "settlement_material",
      objectType: "settlement_material",
      objectId: `${settlementOrderId.value}-${settlementMaterialType.value}`,
      projectId: workbench.value.project.id,
      supplierId: session.user?.supplierId
    });
    const result = await apiPost<{ auditLogId?: string }>(`/api/project-workbench/purchase-orders/${settlementOrderId.value}/settlement-materials`, {
      materialType: settlementMaterialType.value,
      storedFileId: fileResult.file.id
    });
    auditLogId.value = result.auditLogId ?? fileResult.auditLogId ?? "";
    settlementFile.value = null;
    settlementFileName.value = "";
    await loadWorkbench();
  } catch (error) {
    const err = error as Error & { auditLogId?: string };
    errorMessage.value = err.message;
    auditLogId.value = err.auditLogId ?? "";
  } finally {
    actionBusy.value = "";
  }
}

async function verifySettlementMaterial(materialId: string, approved: boolean) {
  actionBusy.value = `settlement:${materialId}`;
  errorMessage.value = "";
  auditLogId.value = "";
  try {
    const result = await apiPost<{ auditLogId?: string }>(`/api/project-workbench/settlement-materials/${materialId}/verify`, {
      approved,
      verificationOpinion: approved ? "资料齐全，核验通过。" : "资料不完整，请补充后重传。"
    });
    auditLogId.value = result.auditLogId ?? "";
    await loadWorkbench();
  } catch (error) {
    const err = error as Error & { auditLogId?: string };
    errorMessage.value = err.message;
    auditLogId.value = err.auditLogId ?? "";
  } finally {
    actionBusy.value = "";
  }
}

async function submitSupplierEvaluation() {
  if (!evaluationOrderId.value) return;
  actionBusy.value = "evaluation";
  errorMessage.value = "";
  auditLogId.value = "";
  try {
    const result = await apiPost<{ auditLogId?: string }>(`/api/project-workbench/purchase-orders/${evaluationOrderId.value}/evaluations`, {
      dimensions: {
        quality: evaluationScore.value,
        delivery: evaluationScore.value,
        service: evaluationScore.value,
        cooperation: evaluationScore.value,
        priceReasonableness: evaluationScore.value
      },
      description: evaluationDescription.value
    });
    auditLogId.value = result.auditLogId ?? "";
    await loadWorkbench();
  } catch (error) {
    const err = error as Error & { auditLogId?: string };
    errorMessage.value = err.message;
    auditLogId.value = err.auditLogId ?? "";
  } finally {
    actionBusy.value = "";
  }
}

onMounted(async () => {
  await session.loadMe(session.user?.id);
  await loadProjects({ preferRoute: true });
  await loadWorkbench();
});

watch(selectedProjectId, () => {
  void loadWorkbench();
});

watch(() => route.query.projectId, async () => {
  await loadProjects({ preferRoute: true });
  await loadWorkbench();
});
</script>

<template>
  <section class="panel workbench project-workbench">
    <div class="workbench-hero">
      <div class="workbench-hero-main">
        <p class="eyebrow">采购项目执行</p>
        <h2>{{ currentProjectLabel }}</h2>
        <div class="project-switch-bar">
          <div>
            <span>当前操作项目</span>
            <strong>{{ currentProjectLabel }}</strong>
          </div>
          <label class="project-picker">
            切换项目
            <select v-model="selectedProjectId" :title="selectedProjectOptionLabel">
              <option v-for="project in projectOptions" :key="project.id" :value="project.id">
                {{ projectOptionLabel(project) }}
              </option>
            </select>
          </label>
        </div>
        <div class="hero-meta">
          <span>
            <small>当前阶段</small>
            <strong>{{ projectStatusText }}</strong>
          </span>
          <span>
            <small>采购方式</small>
            <strong>{{ label(workbench?.project.type) }}</strong>
          </span>
          <span>
            <small>报价截止</small>
            <strong>{{ formatDateTime(workbench?.project.quoteDeadlineAt) }}</strong>
          </span>
          <span>
            <small>项目类型</small>
            <strong>{{ isExternalTradeProject ? "外部采购项目" : "内部采购项目" }}</strong>
          </span>
        </div>
      </div>
    </div>

    <ErrorAlert v-if="errorMessage" :message="errorMessage" />
    <AuditLogRef :audit-log-id="auditLogId" />

    <div v-if="loading" class="notice">正在加载项目执行信息...</div>
    <div v-else-if="!workbench" class="empty">当前角色没有可访问的项目执行数据。</div>

    <template v-else>
      <div class="workbench-focus-grid">
        <WorkflowSurfaceSummary
          title="项目相关待办与消息"
          :business-types="['procurement_request', 'award_approval', 'settlement_bill', 'invoice', 'payment_request']"
          :project-id="workbench.project.id"
          compact
        />
        <section v-if="nextAction" class="next-action-card">
          <p class="eyebrow">下一步</p>
          <h3>{{ nextAction.title }}</h3>
          <p>{{ nextAction.detail }}</p>
          <RouterLink v-if="nextAction.to" class="link-button workbench-action-link" :to="nextAction.to">去处理</RouterLink>
          <button
            v-else-if="nextAction.action === 'generateOrder'"
            type="button"
            :disabled="!canGenerateOrder || Boolean(actionBusy)"
            @click="runGenerateOrder"
          >
            生成采购订单
          </button>
          <a v-else-if="nextAction.anchor" class="link-button workbench-action-link" :href="`#${nextAction.anchor}`">查看详情</a>
        </section>
      </div>

      <section class="section-block wide project-operations execution-map">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">项目进度</p>
            <h3>{{ isExternalTradeProject ? "外部采购备案链路" : "采购执行步骤" }}</h3>
          </div>
          <span class="tag">{{ projectStatusText }}</span>
        </div>
        <div class="progress-summary">
          <strong>{{ progressOverview }}</strong>
          <span>已完成 {{ completedOperationCount }} / {{ totalOperationCount }} 步</span>
        </div>
        <div class="project-operation-grid progress-steps">
          <RouterLink
            v-for="(item, index) in projectOperationLinks"
            :key="item.label"
            :class="['project-operation-card', `is-${item.state}`]"
            :to="item.to"
            :aria-label="`${operationStateLabel(item.state)}：${item.label}`"
          >
            <div class="operation-step-head">
              <span class="step-index">{{ index + 1 }}</span>
              <span class="step-state">{{ operationStateLabel(item.state) }}</span>
            </div>
            <strong>{{ item.label }}</strong>
            <small>{{ item.meta }}</small>
            <div class="operation-step-foot">
              <span class="operation-count">{{ item.count }}</span>
              <em v-if="item.state === 'current'">正在处理</em>
            </div>
          </RouterLink>
        </div>
      </section>

      <details v-if="workbench.procurementRequest" class="section-block wide demand-summary">
        <summary>
          <div>
            <p class="eyebrow">需求依据</p>
            <strong>{{ workbench.procurementRequest.title }}</strong>
          </div>
          <span class="tag">{{ lineItemSummary }}</span>
        </summary>
        <div class="info-grid demand-info-grid">
          <span v-for="item in demandSummary" :key="item.label">{{ item.label }}：{{ item.value }}</span>
        </div>
        <table v-if="workbench.procurementRequest.lineItems?.length" class="compact-table">
          <thead>
            <tr>
              <th>物品</th>
              <th>规格</th>
              <th>数量</th>
              <th>预估单价</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in workbench.procurementRequest.lineItems" :key="line.id">
              <td>{{ line.itemName }}</td>
              <td>{{ line.specification }}</td>
              <td>{{ line.quantity }} {{ line.unit }}</td>
              <td>{{ currency(line.estimatedUnitPrice) }}</td>
            </tr>
          </tbody>
        </table>
      </details>

      <div class="workbench-grid">
        <section v-if="evaluationWorkbenchVisible" class="section-block wide evaluation-workbench">
          <div class="section-title-row">
            <div>
              <p class="eyebrow">招标/评标工作台</p>
              <h3>应标信息</h3>
            </div>
            <RouterLink class="link-button workbench-action-link" :to="{ path: '/supplier-registration', query: { projectId: workbench.project.id } }">审核报名</RouterLink>
          </div>
          <div class="metric-strip">
            <span><strong>{{ supplierEngagementRows.length }}</strong> 参与供应商</span>
            <span><strong>{{ qualifiedRegistrationCount }}</strong> 资格通过</span>
            <span><strong>{{ workbench.bids.length }}</strong> 报价记录</span>
            <span><strong>{{ scoringSummary.submitted }}</strong> 已提交评分</span>
          </div>
          <div v-if="supplierEngagementRows.length === 0" class="notice">公告发布后，这里会汇总报名、应标、报价和评分状态。</div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>供应商</th>
                  <th>联系人</th>
                  <th>邀请</th>
                  <th>报名状态</th>
                  <th>报价状态</th>
                  <th>报价金额</th>
                  <th>评标</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in supplierEngagementRows" :key="row.supplierId">
                  <td>
                    <strong>{{ row.supplierName }}</strong>
                    <small v-if="row.registrationSubmittedAt">报名 {{ formatDateTime(row.registrationSubmittedAt) }}</small>
                  </td>
                  <td>{{ row.contact }}</td>
                  <td>{{ label(row.invitationStatus) }}</td>
                  <td>
                    <span class="tag">{{ label(row.registrationStatus) }}</span>
                    <small v-if="row.registrationQualifiedAt">通过 {{ formatDateTime(row.registrationQualifiedAt) }}</small>
                  </td>
                  <td>
                    <span class="tag">{{ label(row.bidStatus) }}</span>
                    <small v-if="row.bidSubmittedAt">提交 {{ formatDateTime(row.bidSubmittedAt) }}</small>
                  </td>
                  <td>{{ canReadBidBody ? currency(row.bidAmount) : "截标前保密" }}</td>
                  <td>{{ row.scoreCount ? `${row.scoreCount} 份 / ${row.scoreAverage?.toFixed(1)} 分` : "待评分" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="evaluationWorkbenchVisible" class="section-block wide quote-workbench">
          <div class="section-title-row">
            <div>
              <p class="eyebrow">报价情况</p>
              <h3>供应商报价清单</h3>
            </div>
            <RouterLink class="link-button workbench-action-link" :to="{ path: '/bid-control', query: { projectId: workbench.project.id } }">报价监督</RouterLink>
          </div>
          <div class="notice" v-if="!canReadBidBody">
            报价截止和锁定前只显示提交进度，不提前展示金额、明细和响应文件，避免破坏保密边界。
          </div>
          <div v-else-if="quoteRows.length === 0" class="notice">当前还没有可查看的报价明细。</div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>供应商</th>
                  <th>物品/服务</th>
                  <th>数量</th>
                  <th>单价</th>
                  <th>税率</th>
                  <th>总价</th>
                  <th>交期</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in quoteRows" :key="`${row.bidId}-${row.id}`">
                  <td>
                    <strong>{{ row.supplier }}</strong>
                    <small>{{ label(row.bidStatus) }}</small>
                  </td>
                  <td>
                    {{ row.itemName }}
                    <small>{{ row.serviceCommitment }}</small>
                  </td>
                  <td>{{ row.quantity }} {{ row.unit }}</td>
                  <td>{{ currency(row.unitPrice) }}</td>
                  <td>{{ row.taxRate }}%</td>
                  <td>{{ currency(row.totalPrice) }}</td>
                  <td>{{ row.deliveryDays ? `${row.deliveryDays} 天` : "-" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="metric-strip compact">
            <span>{{ bidSummaryText }}</span>
            <span>{{ workbench.project.beforeDeadline ? "仍在报价期" : "已到可锁定/已锁定阶段" }}</span>
          </div>
        </section>

        <section v-if="evaluationWorkbenchVisible" class="section-block wide scoring-workbench">
          <div class="section-title-row">
            <div>
              <p class="eyebrow">评标打分</p>
              <h3>专家评分记录</h3>
            </div>
            <RouterLink class="link-button workbench-action-link" :to="{ path: '/expert-review', query: { projectId: workbench.project.id } }">组织评审</RouterLink>
          </div>
          <div class="metric-strip">
            <span><strong>{{ scoringSummary.assigned }}</strong> 评分任务</span>
            <span><strong>{{ scoringSummary.submitted }}</strong> 已提交</span>
            <span><strong>{{ scoringSummary.average === null ? "-" : scoringSummary.average.toFixed(1) }}</strong> 平均分</span>
            <span><strong>{{ latestReviewReport ? label(latestReviewReport.status) : "未生成" }}</strong> 评审报告</span>
          </div>
          <div v-if="!workbench.scoringSheets?.length" class="notice">报价锁定后，可在这里查看专家抽取、评分提交和评审报告状态。</div>
          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>专家</th>
                  <th>供应商</th>
                  <th>技术</th>
                  <th>服务</th>
                  <th>价格</th>
                  <th>总分</th>
                  <th>状态</th>
                  <th>提交时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sheet in workbench.scoringSheets" :key="sheet.id">
                  <td>{{ sheet.expertName || sheet.expertId }}</td>
                  <td>{{ sheet.supplierName || supplierName(sheet.supplierId) }}</td>
                  <td>{{ sheet.technical }}</td>
                  <td>{{ sheet.service }}</td>
                  <td>{{ sheet.price }}</td>
                  <td><strong>{{ sheet.total }}</strong></td>
                  <td><span class="tag">{{ label(sheet.status) }}</span></td>
                  <td>{{ formatDateTime(sheet.submittedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="latestReviewReport" class="decision-box">
            <strong>最新评审报告：{{ latestReviewReport.reportNo }} / {{ label(latestReviewReport.status) }}</strong>
            <span>生成时间：{{ formatDateTime(latestReviewReport.generatedAt) }}；冻结时间：{{ formatDateTime(latestReviewReport.frozenAt) }}</span>
          </div>
        </section>

        <section v-if="showBidDetails" class="section-block wide award-workbench">
          <div class="section-title-row">
            <div>
              <p class="eyebrow">定标与价格结果</p>
              <h3>比价、推荐和定标报告</h3>
            </div>
            <RouterLink class="link-button workbench-action-link" :to="{ path: '/award-result', query: { projectId: workbench.project.id } }">办理定标</RouterLink>
          </div>
          <div v-if="comparisonRows.length" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>供应商</th>
                  <th>报价</th>
                  <th>交期</th>
                  <th>专家总分</th>
                  <th>最终评分</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in comparisonRows" :key="row.supplierId">
                  <td>{{ row.rank }}</td>
                  <td>{{ row.supplierName }}</td>
                  <td>{{ currency(row.amount) }}</td>
                  <td>{{ row.deliveryDays ? `${row.deliveryDays} 天` : "-" }}</td>
                  <td>{{ row.expertTotalScore ?? "-" }}</td>
                  <td>{{ row.finalScore ?? "-" }}</td>
                  <td>{{ row.isLowestPrice ? "最低价" : row.serviceCommitment || "-" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="notice">报价锁定并生成比价报告后，这里会展示供应商报价排序和推荐结果。</div>
          <div v-if="workbench.comparisonReport" class="decision-box">
            <strong>推荐供应商：{{ supplierName(workbench.comparisonReport.recommendedSupplierId) }}</strong>
            <span>{{ workbench.comparisonReport.awardReason }}</span>
            <span v-if="workbench.comparisonReport.nonLowestPriceReason">非最低价说明：{{ workbench.comparisonReport.nonLowestPriceReason }}</span>
          </div>
          <div class="award-result-grid">
            <div class="stack-item">
              <strong>定标审批</strong>
              <span v-if="latestAwardApproval">
                {{ supplierName(latestAwardApproval.selectedSupplierId) }} / {{ label(latestAwardApproval.approvalStatus) }}
              </span>
              <span v-else>尚未发起定标审批</span>
            </div>
            <div class="stack-item">
              <strong>价格报告</strong>
              <span v-if="latestPricingReport">
                {{ latestPricingReport.reportNo }} / {{ label(latestPricingReport.status) }} / {{ latestPricingReport.items.length }} 项
              </span>
              <span v-else>定标审批通过后生成价格报告</span>
            </div>
            <div class="stack-item">
              <strong>结果通知</strong>
              <span>{{ workbench.resultNotifications?.filter((item) => item.status === "sent").length ?? 0 }} 条已发送</span>
            </div>
          </div>
          <button v-if="['buyer', 'platform_operator'].includes(roleId)" :disabled="!canGenerateOrder || Boolean(actionBusy)" @click="runGenerateOrder">生成采购订单</button>
        </section>

        <section v-if="showSourcingDetails" class="section-block">
          <h3>报价要求与答疑</h3>
          <div
            v-if="
              !workbench.project.qualificationRequirements?.length &&
              !workbench.project.quoteRequirements?.length &&
              !workbench.project.clarificationRecords?.length
            "
            class="notice"
          >
            当前项目尚未配置额外报价要求或供应商答疑。
          </div>
          <div class="list">
            <span v-for="item in workbench.project.qualificationRequirements" :key="item">{{ item }}</span>
          </div>
          <div class="list">
            <span v-for="item in workbench.project.quoteRequirements" :key="item">{{ item }}</span>
          </div>
          <div v-for="qa in workbench.project.clarificationRecords" :key="qa.id" class="stack-item">
            <strong>{{ qa.question }}</strong>
            <span>{{ qa.answer }}</span>
          </div>
        </section>

        <section v-if="showSourcingDetails" class="section-block">
          <h3>样品与供应商资料</h3>
          <div v-if="workbench.suppliers.length === 0" class="notice">当前项目尚未产生报名或邀请供应商。</div>
          <div v-for="supplier in workbench.suppliers" :key="supplier.id" class="stack-item">
            <strong>{{ supplier.name }}</strong>
            <span>{{ label(supplier.admissionStatus) }} / {{ supplier.qualification }} / 评分 {{ supplier.evaluationScore ?? "-" }}</span>
            <small>{{ supplier.serviceRegions.map((item) => `${item.region}/${item.category}`).join("、") || "-" }}</small>
            <small>{{ supplier.sealSamples.map((item) => item.sampleName).join("、") || "暂无封样" }}</small>
          </div>
        </section>

        <section v-if="showBidDetails" class="section-block wide legacy-bid-summary">
          <h3>响应文件与报价附件</h3>
          <div v-if="workbench.bids.length === 0" class="notice">当前阶段还没有可查看的报价记录。</div>
          <table v-else>
            <thead>
              <tr>
                <th>供应商</th>
                <th>状态</th>
                <th>总价</th>
                <th>交期</th>
                <th>响应文件</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bid in workbench.bids" :key="bid.id">
                <td>{{ bid.supplierName || supplierName(bid.supplierId) }}</td>
                <td><span class="tag">{{ label(bid.status) }}</span></td>
                <td>{{ currency(bid.amount) }}</td>
                <td>{{ bid.deliveryDays ? `${bid.deliveryDays} 天` : "-" }}</td>
                <td>
                  <AttachmentList v-if="bid.responseFileMetadata?.length" :attachments="bid.responseFileMetadata" compact />
                  <span v-else>{{ bid.fileName || "-" }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section v-if="showFulfillmentDetails" id="fulfillment" class="section-block wide">
          <h3>采购订单与收货</h3>
          <div v-if="workbench.purchaseOrders.length === 0" class="notice">尚未生成采购订单；定标完成后从“下一步”生成订单。</div>
          <table>
            <thead>
              <tr>
                <th>订单号</th>
                <th>供应商</th>
                <th>状态</th>
                <th>金额</th>
                <th>计划到货</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in workbench.purchaseOrders" :key="order.id">
                <td>{{ order.orderNo }}</td>
                <td>{{ supplierName(order.supplierId) }}</td>
                <td>
                  <span class="tag">{{ label(order.status) }}</span>
                  <small v-if="order.statusRemark">{{ order.statusRemark }}</small>
                </td>
                <td>{{ currency(order.totalAmount) }}</td>
                <td>{{ order.expectedDeliveryAt }}</td>
                <td class="actions">
                  <button v-if="canConfirmOrder" :disabled="order.status !== 'pending_confirmation' || Boolean(actionBusy)" @click="runConfirmOrder(order.id)">
                    供应商确认
                  </button>
                  <button v-if="canRecordReceipt" :disabled="!['supplier_confirmed', 'performing', 'partially_received', 'exception'].includes(order.status) || Boolean(actionBusy)" @click="runRecordFullReceipt(order.id)">
                    全部收货
                  </button>
                  <button v-if="canRecordReceipt" :disabled="Boolean(actionBusy)" @click="runRecordException(order.id)">
                    登记异常收货
                  </button>
                  <button v-if="canRecordReceipt" :disabled="['received', 'closed'].includes(order.status) || Boolean(actionBusy)" @click="runChangeOrder(order.id)">
                    变更
                  </button>
                  <button v-if="canRecordReceipt" :disabled="order.status === 'closed' || Boolean(actionBusy)" @click="runCloseOrder(order.id)">
                    关闭
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-for="receipt in workbench.receiptRecords" :key="receipt.id" class="stack-item">
            <strong>{{ label(receipt.receiptType) }} / {{ label(receipt.exceptionType) }}</strong>
            <span>{{ receipt.summary }}</span>
            <small>{{ label(receipt.handlingStatus) }} / {{ formatDateTime(receipt.createdAt) }}</small>
          </div>
        </section>

        <section v-if="showFulfillmentDetails" class="section-block">
          <h3>结算资料</h3>
          <div v-if="canUploadSettlement" class="form-grid">
            <label>
              订单
              <select v-model="settlementOrderId">
                <option v-for="order in workbench.purchaseOrders" :key="order.id" :value="order.id">
                  {{ order.orderNo }}
                </option>
              </select>
            </label>
            <label>
              资料类型
              <select v-model="settlementMaterialType">
                <option value="invoice">发票</option>
                <option value="delivery_note">送货单</option>
                <option value="acceptance_record">验收单</option>
                <option value="other">其他资料</option>
              </select>
            </label>
            <label>
              文件
              <input type="file" @change="onSettlementFileChange" />
            </label>
            <div class="notice">{{ settlementFileName || "未选择文件" }}</div>
            <button type="button" :disabled="!settlementOrderId || !settlementFile || Boolean(actionBusy)" @click="uploadSettlementMaterial">上传资料</button>
          </div>
          <div v-for="material in workbench.settlementMaterials" :key="material.id" class="stack-item">
            <strong>{{ label(material.materialType) }} / {{ label(material.status) }}</strong>
            <AttachmentList
              :attachments="material.fileId ? [{ id: material.fileId, fileName: material.fileName, contentType: material.contentType, uploadedAt: material.uploadedAt }] : []"
              compact
              empty-text="未关联文件"
            />
            <div v-if="canVerifySettlement" class="actions">
              <button type="button" class="secondary-button" :disabled="material.status !== 'pending_verification' || Boolean(actionBusy)" @click="verifySettlementMaterial(material.id, true)">
                核验通过
              </button>
              <button type="button" class="secondary-button" :disabled="material.status !== 'pending_verification' || Boolean(actionBusy)" @click="verifySettlementMaterial(material.id, false)">
                驳回重传
              </button>
            </div>
            <small v-if="material.verificationOpinion">{{ material.verificationOpinion }}</small>
          </div>
        </section>

        <section v-if="showFulfillmentDetails" class="section-block">
          <h3>供应商评价</h3>
          <div v-if="canEvaluateSupplier" class="form-grid">
            <label>
              订单
              <select v-model="evaluationOrderId">
                <option v-for="order in workbench.purchaseOrders.filter((item) => ['received', 'closed'].includes(item.status))" :key="order.id" :value="order.id">
                  {{ order.orderNo }}
                </option>
              </select>
            </label>
            <label>
              评分
              <input v-model.number="evaluationScore" type="number" min="0" max="100" />
            </label>
            <label>
              评价说明
              <input v-model="evaluationDescription" />
            </label>
            <button type="button" :disabled="!evaluationOrderId || Boolean(actionBusy)" @click="submitSupplierEvaluation">提交评价</button>
          </div>
          <div v-if="workbench.supplierEvaluations.length === 0" class="notice">当前项目还没有履约评价。</div>
          <div v-for="evaluation in workbench.supplierEvaluations" :key="evaluation.id" class="stack-item">
            <strong>{{ supplierName(evaluation.supplierId) }} / {{ evaluation.score }} 分 / {{ label(evaluation.status) }}</strong>
            <span>{{ evaluation.description }}</span>
            <small>版本 {{ evaluation.versionNo }} · {{ Object.entries(evaluation.dimensions).map(([key, value]) => `${label(key)} ${value}`).join(" / ") }}</small>
          </div>
        </section>

        <section id="archive" class="section-block">
          <h3>档案归集</h3>
          <div class="list">
            <span v-for="item in workbench.archiveItems" :key="item.id">
              {{ item.itemName }} / {{ label(item.status) }}
            </span>
          </div>
          <div v-if="workbench.archiveSupplementRequests.length" class="stack-item">
            <strong>补档申请</strong>
            <span v-for="request in workbench.archiveSupplementRequests" :key="request.id">
              {{ request.reason }} / {{ label(request.approvalStatus) }}
            </span>
          </div>
        </section>

        <section class="section-block wide">
          <h3>审计日志</h3>
          <div v-if="workbench.auditLogs.length === 0" class="notice">当前角色没有审计日志视图。</div>
          <div v-for="log in workbench.auditLogs.slice(0, 12)" :key="log.id" class="audit-line">
            <strong>{{ labelAuditAction(log.action) }}</strong>
            <span>{{ label(log.result) }} / {{ formatDateTime(log.createdAt) }}</span>
          </div>
        </section>
      </div>
    </template>
  </section>
</template>
