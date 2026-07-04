import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiGet, apiPost } from "../../api/http";
import { approveWorkflowInstance, loadApprovalInstances, rejectWorkflowInstance, type R8ApprovalInstanceDto } from "../../api/workflow";
import { useSessionStore } from "../../stores/session";
import {
  approvalLabel as formatApprovalLabel,
  awardPreparationRoles,
  awardSummaryItems as buildAwardSummaryItems,
  createAwardApprovalDisabledText as getCreateAwardApprovalDisabledText,
  internalPublicityButtonText as getInternalPublicityButtonText,
  nextActionNotice as getNextActionNotice,
  notificationLabel,
  notificationSelected as isNotificationSelected,
  pendingGroupAwardInstances as selectPendingGroupAwardInstances,
  pickAwardApprovalId,
  pickAwardProjectId,
  pricingReportButtonText as getPricingReportButtonText,
  projectDetailPath,
  publicityLabel,
  resultNotificationButtonText as getResultNotificationButtonText,
  submitAwardApprovalDisabledText as getSubmitAwardApprovalDisabledText,
  supplierName as formatSupplierName,
  supplierResultRoles,
  supplierSummaryItems as buildSupplierSummaryItems
} from "./display";
import {
  createAwardOperationForm,
  createAwardRecommendation,
  defaultApprovalOpinion,
  defaultNonLowestPriceReason,
  defaultRejectionOpinion,
  defaultSelectedSupplierId
} from "./state";
import type {
  AwardApproval,
  AwardProjectOption,
  AwardRecommendation,
  ContractLedger,
  MallProduct,
  PricingReport,
  PublicityRecord,
  ResultNotification
} from "./types";

export function useAwardResultPage() {
  const selectedProjectId = ref("");
  const selectedSupplierId = ref(defaultSelectedSupplierId);
  const projects = ref<AwardProjectOption[]>([]);
  const suppliers = ref<Array<{ id: string; name: string }>>([]);
  const nonLowestPriceReason = ref(defaultNonLowestPriceReason);
  const approvals = ref<AwardApproval[]>([]);
  const selectedApprovalId = ref("");
  const recommendation = ref<AwardRecommendation>(createAwardRecommendation());
  const notifications = ref<ResultNotification[]>([]);
  const publicityRecords = ref<PublicityRecord[]>([]);
  const supplierResults = ref<ResultNotification[]>([]);
  const pricingReports = ref<PricingReport[]>([]);
  const contracts = ref<ContractLedger[]>([]);
  const awardProducts = ref<MallProduct[]>([]);
  const approvalInstances = ref<R8ApprovalInstanceDto[]>([]);
  const auditLogId = ref("");
  const error = ref("");
  const success = ref("");
  const session = useSessionStore();
  const route = useRoute();
  const router = useRouter();
  const processRefreshKey = ref(0);

  const canPrepareAward = computed(() => awardPreparationRoles.has(session.roleId));
  const canApproveAward = computed(() => session.roleId === "group_manager");
  const isSupplierResultView = computed(() => supplierResultRoles.has(session.roleId));
  const pendingGroupAwardInstances = computed(() => selectPendingGroupAwardInstances(approvalInstances.value));
  const groupAwardProjects = computed(() => projects.value.filter((project) => pendingGroupAwardInstances.value.some((instance) => instance.projectId === project.id)));
  const approvedAwardApproval = computed(() => [...approvals.value].reverse().find((item) => item.approvalStatus === "approved") ?? null);
  const selectedApproval = computed(() => approvals.value.find((item) => item.id === selectedApprovalId.value) ?? null);
  const projectHasApprovedAward = computed(() => Boolean(approvedAwardApproval.value));
  const existingPricingReport = computed(() => pricingReports.value.find((item) => item.awardApprovalId === approvedAwardApproval.value?.id && item.status !== "voided") ?? null);
  const currentContract = computed(() => [...contracts.value].reverse().find((item) => item.projectId === selectedProjectId.value && item.status !== "cancelled") ?? null);
  const currentContractRows = computed(() => (currentContract.value ? [currentContract.value] : []));
  const contractConfirmed = computed(() => Boolean(currentContract.value && ["registered", "performing", "completed"].includes(currentContract.value.status)));
  const canStartContractSigning = computed(() => canPrepareAward.value && projectHasApprovedAward.value && !currentContract.value);
  const canConfirmContract = computed(() => isSupplierResultView.value && Boolean(currentContract.value) && currentContract.value?.status === "pending_supplier_confirmation");
  const hasListedAwardProducts = computed(() => awardProducts.value.some((item) => item.status === "listed"));
  const canAutoListAwardProducts = computed(() => canPrepareAward.value && projectHasApprovedAward.value && contractConfirmed.value && !hasListedAwardProducts.value);
  const selectedApprovalIsDraft = computed(() => selectedApproval.value?.approvalStatus === "draft");
  const canCreateAwardApproval = computed(() => canPrepareAward.value && Boolean(selectedProjectId.value && selectedSupplierId.value) && !projectHasApprovedAward.value);
  const canSubmitAwardApproval = computed(() => canPrepareAward.value && Boolean(selectedApprovalId.value) && selectedApprovalIsDraft.value && !projectHasApprovedAward.value);
  const canGeneratePricingReport = computed(() => canPrepareAward.value && projectHasApprovedAward.value && !existingPricingReport.value);
  const supplierSelfNotificationsSent = computed(
    () => notifications.value.filter((item) => item.awardApprovalId === approvedAwardApproval.value?.id && item.scope === "supplier_self" && item.status === "sent").length
  );
  const internalPublicityNotificationsSent = computed(
    () => notifications.value.filter((item) => item.awardApprovalId === approvedAwardApproval.value?.id && item.scope === "internal_publicity" && item.status === "sent").length
  );
  const latestInternalPublicityRecord = computed(() => [...publicityRecords.value].reverse().find((item) => item.awardApprovalId === approvedAwardApproval.value?.id && item.status === "published") ?? null);
  const awardOperationForm = ref(createAwardOperationForm());
  const selectedNotificationScopeSent = computed(() =>
    awardOperationForm.value.notificationScope === "internal_publicity" ? internalPublicityNotificationsSent.value > 0 : supplierSelfNotificationsSent.value > 0
  );
  const canSendResultNotification = computed(() => canPrepareAward.value && projectHasApprovedAward.value && !selectedNotificationScopeSent.value);
  const canPublishInternalPublicity = computed(() => canPrepareAward.value && projectHasApprovedAward.value && !latestInternalPublicityRecord.value);
  const groupApprovalOptions = computed(() =>
    approvals.value.filter((approval) => pendingGroupAwardInstances.value.some((instance) => instance.businessId === approval.id && instance.projectId === selectedProjectId.value))
  );
  const selectedApprovalDisplay = computed(() => {
    if (!selectedApproval.value) return "当前无待审批定标单";
    const index = approvals.value.findIndex((item) => item.id === selectedApproval.value?.id);
    return approvalLabel(selectedApproval.value, index);
  });
  const selectedApprovalInstance = computed(
    () =>
      approvalInstances.value.find((item) => item.businessId === selectedApprovalId.value && item.id.startsWith("wf:")) ??
      approvalInstances.value.find((item) => item.businessId === selectedApprovalId.value) ??
      null
  );
  const canProcessSelectedAwardApproval = computed(
    () =>
      canApproveAward.value &&
      selectedApproval.value?.approvalStatus === "submitted" &&
      selectedApprovalInstance.value?.approvalStatus === "submitted" &&
      selectedApprovalInstance.value?.currentRoleId === "group_manager"
  );
  const approvalOpinion = ref(defaultApprovalOpinion);
  const rejectionOpinion = ref(defaultRejectionOpinion);
  const recommendationRows = computed(() => (!isSupplierResultView.value && selectedProjectId.value ? [recommendation.value] : []));
  const selectedProjectLabel = computed(() => projects.value.find((project) => project.id === selectedProjectId.value)?.name ?? "未选择项目");
  const awardSummaryItems = computed(() =>
    buildAwardSummaryItems({
      selectedProjectLabel: selectedProjectLabel.value,
      selectedProjectId: selectedProjectId.value,
      approvals: approvals.value,
      projectHasApprovedAward: projectHasApprovedAward.value,
      pricingReports: pricingReports.value,
      existingPricingReport: existingPricingReport.value,
      notifications: notifications.value,
      awardProducts: awardProducts.value,
      hasListedAwardProducts: hasListedAwardProducts.value
    })
  );
  const supplierSummaryItems = computed(() =>
    buildSupplierSummaryItems({
      projects: projects.value,
      supplierResults: supplierResults.value,
      currentContract: currentContract.value,
      pricingReports: pricingReports.value,
      notificationSelected
    })
  );

  function supplierName(supplierId?: string) {
    return formatSupplierName(suppliers.value, recommendation.value, supplierId);
  }

  function approvalLabel(approval: AwardApproval, index: number) {
    return formatApprovalLabel(approval, index, suppliers.value, recommendation.value);
  }

  function createAwardApprovalDisabledText() {
    return getCreateAwardApprovalDisabledText(projectHasApprovedAward.value, selectedSupplierId.value);
  }

  function submitAwardApprovalDisabledText() {
    return getSubmitAwardApprovalDisabledText(projectHasApprovedAward.value, selectedApprovalId.value, selectedApprovalIsDraft.value);
  }

  function pricingReportButtonText() {
    return getPricingReportButtonText(projectHasApprovedAward.value, existingPricingReport.value);
  }

  function resultNotificationButtonText() {
    return getResultNotificationButtonText(projectHasApprovedAward.value, selectedNotificationScopeSent.value);
  }

  function internalPublicityButtonText() {
    return getInternalPublicityButtonText(projectHasApprovedAward.value, Boolean(latestInternalPublicityRecord.value));
  }

  function nextActionNotice() {
    return getNextActionNotice({
      projectHasApprovedAward: projectHasApprovedAward.value,
      existingPricingReport: existingPricingReport.value,
      supplierSelfNotificationsSent: supplierSelfNotificationsSent.value,
      hasPublishedPublicity: Boolean(latestInternalPublicityRecord.value)
    });
  }

  function notificationSelected(result: ResultNotification) {
    return isNotificationSelected(result, recommendation.value);
  }

  function routeProjectId() {
    const paramValue = route.params.projectId;
    const queryValue = route.query.projectId;
    const routeValue = Array.isArray(paramValue) ? paramValue[0] : paramValue;
    if (routeValue) return String(routeValue);
    return Array.isArray(queryValue) ? String(queryValue[0] ?? "") : String(queryValue ?? "");
  }

  function reloadProject() {
    if (selectedProjectId.value && route.path !== projectDetailPath(selectedProjectId.value)) {
      void router.replace(projectDetailPath(selectedProjectId.value));
      return;
    }
    void load();
  }

  function pendingGroupAwardInstance() {
    return pendingGroupAwardInstances.value[0];
  }

  function pickProjectFromRouteOrFallback(preferRoute: boolean) {
    const queryProjectId = routeProjectId();
    const pendingProjectId = canApproveAward.value ? pendingGroupAwardInstance()?.projectId : "";
    const selectableProjects = canApproveAward.value && groupAwardProjects.value.length > 0 ? groupAwardProjects.value : projects.value;
    selectedProjectId.value = pickAwardProjectId({
      preferRoute,
      queryProjectId,
      pendingProjectId,
      selectedProjectId: selectedProjectId.value,
      projects: projects.value,
      selectableProjects
    });
  }

  async function load(options: { preferRoute?: boolean } = {}) {
    const [projectData, supplierData, instanceData] = await Promise.all([
      apiGet<{ projects: AwardProjectOption[] }>("/api/projects").catch(() => ({ projects: [] })),
      apiGet<{ suppliers: Array<{ id: string; name: string }> }>("/api/suppliers").catch(() => ({ suppliers: [] })),
      loadApprovalInstances("award_approval").catch(() => [])
    ]);
    projects.value = projectData.projects.filter((project) => !project.externalTradeFlag);
    suppliers.value = supplierData.suppliers;
    approvalInstances.value = instanceData;
    if (isSupplierResultView.value) {
      const directProjectId = routeProjectId();
      if (directProjectId) {
        projects.value = projects.value.filter((project) => project.id === directProjectId);
      }
      const notifiedProjects: AwardProjectOption[] = [];
      for (const project of projects.value) {
        const result = await apiGet<{ notifications: ResultNotification[] }>(`/api/projects/${project.id}/result-notifications`).catch(() => ({ notifications: [] }));
        if (result.notifications.length > 0) notifiedProjects.push(project);
      }
      projects.value = notifiedProjects;
    }
    pickProjectFromRouteOrFallback(Boolean(options.preferRoute));
    if (!selectedProjectId.value) {
      recommendation.value = createAwardRecommendation();
      approvals.value = [];
      selectedApprovalId.value = "";
      notifications.value = [];
      publicityRecords.value = [];
      pricingReports.value = [];
      contracts.value = [];
      awardProducts.value = [];
      supplierResults.value = [];
      return;
    }
    recommendation.value = isSupplierResultView.value
      ? createAwardRecommendation()
      : (await apiGet<{ recommendation: AwardRecommendation }>(`/api/projects/${selectedProjectId.value}/award-recommendation`)).recommendation;
    selectedSupplierId.value =
      (recommendation.value.recommendedSupplierId && suppliers.value.some((item) => item.id === recommendation.value.recommendedSupplierId)
        ? recommendation.value.recommendedSupplierId
        : undefined) ??
      (suppliers.value.some((item) => item.id === selectedSupplierId.value) ? selectedSupplierId.value : suppliers.value[0]?.id ?? "");
    approvals.value = isSupplierResultView.value ? [] : (await apiGet<{ approvals: AwardApproval[] }>(`/api/projects/${selectedProjectId.value}/award-approvals`)).approvals;
    const selectableApprovals = canApproveAward.value ? groupApprovalOptions.value : approvals.value;
    selectedApprovalId.value = pickAwardApprovalId({
      queryBusinessId: route.query.businessType === "award_approval" ? String(route.query.businessId ?? "") : "",
      pendingBusinessId: canApproveAward.value ? pendingGroupAwardInstance()?.businessId : "",
      selectedApprovalId: selectedApprovalId.value,
      selectableApprovals
    });
    notifications.value = (await apiGet<{ notifications: ResultNotification[] }>(`/api/projects/${selectedProjectId.value}/result-notifications`)).notifications;
    publicityRecords.value = isSupplierResultView.value
      ? []
      : (await apiGet<{ publicityRecords: PublicityRecord[] }>(`/api/projects/${selectedProjectId.value}/internal-publicity`)).publicityRecords;
    pricingReports.value = (
      await apiGet<{ pricingReports: PricingReport[] }>(`/api/projects/${selectedProjectId.value}/pricing-reports`).catch(() => ({ pricingReports: [] }))
    ).pricingReports;
    contracts.value = (await apiGet<{ contracts: ContractLedger[] }>(`/api/projects/${selectedProjectId.value}/contracts`).catch(() => ({ contracts: [] }))).contracts;
    const productData = await apiGet<{ products: MallProduct[] }>("/api/mall/products").catch(() => ({ products: [] }));
    awardProducts.value = productData.products.filter((product) => product.sourceProjectId === selectedProjectId.value);
    supplierResults.value = isSupplierResultView.value ? notifications.value : [];
  }

  async function run(action: () => Promise<{ auditLogId?: string; approval?: AwardApproval }>) {
    error.value = "";
    success.value = "";
    try {
      const result = await action();
      auditLogId.value = result.auditLogId ?? "";
      selectedApprovalId.value = result.approval?.id ?? selectedApprovalId.value;
      await load();
      processRefreshKey.value += 1;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "操作失败";
    }
  }

  async function performAction(message: string, action: () => Promise<{ auditLogId?: string; approval?: AwardApproval }>) {
    await run(action);
    if (!error.value) success.value = message;
  }

  function createAwardApproval() {
    if (!canCreateAwardApproval.value) {
      success.value = "";
      error.value = createAwardApprovalDisabledText();
      return Promise.resolve();
    }
    return performAction("定标审批已创建，请提交审批。", () =>
      apiPost(`/api/projects/${selectedProjectId.value}/award-approvals`, { selectedSupplierId: selectedSupplierId.value, nonLowestPriceReason: nonLowestPriceReason.value })
    );
  }

  function submitAwardApproval() {
    if (!canSubmitAwardApproval.value) {
      success.value = "";
      error.value = submitAwardApprovalDisabledText();
      return Promise.resolve();
    }
    return performAction("定标审批已提交，请等待集团审批。", () => apiPost(`/api/award-approvals/${selectedApprovalId.value}/submit`));
  }

  function sendResultNotification() {
    if (!canSendResultNotification.value) {
      success.value = projectHasApprovedAward.value ? "当前通知范围已经发送，无需重复发送。" : "";
      error.value = projectHasApprovedAward.value ? "" : "定标审批通过后才能发送结果通知。";
      return Promise.resolve();
    }
    const message = awardOperationForm.value.notificationScope === "internal_publicity" ? "内部公示通知已发送。" : "供应商结果通知已发送。";
    return performAction(message, () =>
      apiPost(`/api/projects/${selectedProjectId.value}/result-notifications`, {
        scope: awardOperationForm.value.notificationScope,
        visibilityConfig: awardOperationForm.value.visibilityConfig
      })
    );
  }

  function publishInternalPublicity() {
    if (!canPublishInternalPublicity.value) {
      success.value = projectHasApprovedAward.value ? "内部公示已经发布，无需重复发布。" : "";
      error.value = projectHasApprovedAward.value ? "" : "定标审批通过后才能发布内部公示。";
      return Promise.resolve();
    }
    return performAction("内部公示已发布。", () =>
      apiPost(`/api/projects/${selectedProjectId.value}/internal-publicity`, {
        contentSummary: awardOperationForm.value.publicitySummary
      })
    );
  }

  function generatePricingReport() {
    if (existingPricingReport.value) {
      success.value = "价格报告已经生成，无需重复生成。";
      error.value = "";
      return Promise.resolve();
    }
    if (!approvedAwardApproval.value) {
      success.value = "";
      error.value = "定标审批通过后才能生成价格报告。";
      return Promise.resolve();
    }
    return performAction("价格报告已生成。", () =>
      apiPost(`/api/projects/${selectedProjectId.value}/pricing-reports`, {
        awardApprovalId: approvedAwardApproval.value?.id
      })
    );
  }

  function startContractSigning() {
    if (!canStartContractSigning.value) {
      success.value = "";
      error.value = currentContract.value ? "当前项目已经有合同记录，无需重复发起。" : "请先完成中标审批，再发起合同签订。";
      return Promise.resolve();
    }
    return performAction("合同签订已发起，请供应商确认合同。", () => apiPost(`/api/projects/${selectedProjectId.value}/contracts/signing`, {}));
  }

  function confirmContract() {
    if (!currentContract.value || !canConfirmContract.value) {
      success.value = "";
      error.value = "当前没有需要本供应商确认的合同。";
      return Promise.resolve();
    }
    return performAction("合同已确认，采购方可以继续办理商品上架和后续订单。", () => apiPost(`/api/contracts/${currentContract.value?.id}/confirm`, {}));
  }

  function autoListAwardProducts() {
    if (!canAutoListAwardProducts.value) {
      success.value = "";
      error.value = !contractConfirmed.value ? "请先完成合同确认，再一键上架中标商品。" : "当前项目的中标商品已经上架或暂不满足上架条件。";
      return Promise.resolve();
    }
    return performAction("中标商品已自动上架到商品维护和采购目录。", () => apiPost(`/api/projects/${selectedProjectId.value}/award-products/auto-list`, {}));
  }

  async function processAwardApproval(approved: boolean) {
    const instanceId = selectedApprovalInstance.value?.id;
    if (!instanceId) {
      error.value = "未找到当前定标审批的正式业务实例，请先由采购经办提交审批。";
      success.value = "";
      return;
    }
    error.value = "";
    success.value = "";
    try {
      const result = approved ? await approveWorkflowInstance(instanceId, approvalOpinion.value) : await rejectWorkflowInstance(instanceId, rejectionOpinion.value);
      auditLogId.value = result.auditLogId ?? "";
      await load();
      processRefreshKey.value += 1;
      success.value = approved ? "定标审批已通过，可以回到采购经办视角发送结果通知并生成价格报告。" : "定标审批已驳回，请采购经办补充后重新提交。";
    } catch (err) {
      error.value = err instanceof Error ? err.message : "定标审批处理失败";
    }
  }

  onMounted(() => load({ preferRoute: true }));
  watch(
    () => [route.params.projectId, route.query.projectId],
    () => {
      void load({ preferRoute: true });
    }
  );

  return {
    selectedProjectId,
    selectedSupplierId,
    projects,
    suppliers,
    nonLowestPriceReason,
    approvals,
    selectedApprovalId,
    notifications,
    publicityRecords,
    supplierResults,
    pricingReports,
    currentContract,
    currentContractRows,
    awardProducts,
    auditLogId,
    error,
    success,
    processRefreshKey,
    canPrepareAward,
    canApproveAward,
    isSupplierResultView,
    groupAwardProjects,
    projectHasApprovedAward,
    canStartContractSigning,
    canConfirmContract,
    hasListedAwardProducts,
    canAutoListAwardProducts,
    canCreateAwardApproval,
    canSubmitAwardApproval,
    canGeneratePricingReport,
    canSendResultNotification,
    canPublishInternalPublicity,
    groupApprovalOptions,
    selectedApprovalDisplay,
    canProcessSelectedAwardApproval,
    awardOperationForm,
    approvalOpinion,
    rejectionOpinion,
    recommendationRows,
    awardSummaryItems,
    supplierSummaryItems,
    supplierName,
    approvalLabel,
    createAwardApprovalDisabledText,
    submitAwardApprovalDisabledText,
    pricingReportButtonText,
    resultNotificationButtonText,
    internalPublicityButtonText,
    nextActionNotice,
    notificationSelected,
    notificationLabel,
    publicityLabel,
    reloadProject,
    createAwardApproval,
    submitAwardApproval,
    sendResultNotification,
    publishInternalPublicity,
    generatePricingReport,
    startContractSigning,
    confirmContract,
    autoListAwardProducts,
    processAwardApproval
  };
}
