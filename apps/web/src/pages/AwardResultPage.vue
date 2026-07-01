<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPost } from "../api/http";
import { approveWorkflowInstance, loadApprovalInstances, rejectWorkflowInstance, type R8ApprovalInstanceDto } from "../api/workflow";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import ProcessTimeline from "../components/ProcessTimeline.vue";
import { useSessionStore } from "../stores/session";

interface AwardApproval {
  id: string;
  recommendedSupplierId?: string;
  selectedSupplierId: string;
  approvalStatus: string;
  isLowestPrice: boolean;
  nonLowestPriceReason?: string;
}

interface AwardRecommendation {
  recommendedSupplierId?: string;
  recommendedSupplierName?: string;
  isLowestPrice?: boolean;
  sourceReportId?: string | null;
  candidateSupplierIds?: string[];
  note?: string;
}

interface ResultNotification {
  id: string;
  awardApprovalId?: string;
  supplierId?: string;
  scope?: "supplier_self" | "internal_publicity";
  status: string;
  visibilityConfig: string;
  contentSummary: string;
  sentAt: string | null;
  selected?: boolean;
  winnerName?: string;
}

interface PublicityRecord {
  id: string;
  awardApprovalId?: string;
  status: string;
  contentSummary: string;
  publishedAt: string | null;
}

interface PricingReport {
  id: string;
  reportNo: string;
  awardApprovalId?: string;
  selectedSupplierId: string;
  status: string;
  items: Array<{ id: string; itemName: string; specification?: string; purchasePrice: number; salePrice: number; unit: string; effectiveFrom: string; effectiveTo?: string }>;
  createdAt: string;
  approvedAt?: string | null;
}

interface ContractLedger {
  id: string;
  projectId: string;
  supplierId: string;
  contractNo: string;
  amount: number;
  status: string;
  updatedAt: string;
}

interface MallProduct {
  id: string;
  name: string;
  supplierId: string;
  supplierName?: string;
  status: string;
  sourceProjectId?: string;
  sourcePricingReportId?: string;
  sourcePricingReportItemId?: string;
  activePrice?: { price?: number; salePrice?: number };
}

const selectedProjectId = ref("");
const selectedSupplierId = ref("sup-1");
const projects = ref<Array<{ id: string; code: string; name: string; externalTradeFlag?: boolean }>>([]);
const suppliers = ref<Array<{ id: string; name: string }>>([]);
const nonLowestPriceReason = ref("服务方案与技术评分综合领先");
const approvals = ref<AwardApproval[]>([]);
const selectedApprovalId = ref("");
const recommendation = ref<AwardRecommendation>({});
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
const processRefreshKey = ref(0);
const supplierRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
const canPrepareAward = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
const canApproveAward = computed(() => session.roleId === "group_manager");
const isSupplierResultView = computed(() => supplierRoles.has(session.roleId));
const pendingGroupAwardInstances = computed(() =>
  approvalInstances.value.filter(
    (item) => item.businessType === "award_approval" && item.approvalStatus === "submitted" && item.currentRoleId === "group_manager" && item.projectId
  )
);
const groupAwardProjects = computed(() => projects.value.filter((project) => pendingGroupAwardInstances.value.some((instance) => instance.projectId === project.id)));
const approvedAwardApproval = computed(() => [...approvals.value].reverse().find((item) => item.approvalStatus === "approved") ?? null);
const selectedApproval = computed(() => approvals.value.find((item) => item.id === selectedApprovalId.value) ?? null);
const projectHasApprovedAward = computed(() => Boolean(approvedAwardApproval.value));
const existingPricingReport = computed(() => pricingReports.value.find((item) => item.awardApprovalId === approvedAwardApproval.value?.id && item.status !== "voided") ?? null);
const currentContract = computed(() => [...contracts.value].reverse().find((item) => item.projectId === selectedProjectId.value && item.status !== "cancelled") ?? null);
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
const awardOperationForm = ref({
  notificationScope: "supplier_self",
  visibilityConfig: "supplier_self_only",
  publicitySummary: "内部公示记录"
});
const approvalOpinion = ref("同意按评审结果定标。");
const rejectionOpinion = ref("定标依据不充分，请补充后重新提交。");

const approvalStatusLabels: Record<string, string> = {
  draft: "草稿",
  submitted: "审批中",
  approved: "已通过",
  rejected: "已驳回"
};

const notificationStatusLabels: Record<string, string> = {
  draft: "草稿",
  sent: "已发送"
};

const visibilityLabels: Record<string, string> = {
  supplier_self_only: "仅供应商本人可见",
  show_winner_name: "展示中标供应商名称",
  internal_only: "内部可见"
};

const contractStatusLabels: Record<string, string> = {
  pending_supplier_confirmation: "待供应商确认",
  registered: "合同已确认",
  performing: "履约中",
  completed: "已完成",
  cancelled: "已取消"
};

const productStatusLabels: Record<string, string> = {
  draft: "草稿",
  listed: "已上架",
  delisted: "已下架"
};

function supplierName(supplierId?: string) {
  if (!supplierId) return "-";
  return suppliers.value.find((item) => item.id === supplierId)?.name ?? recommendation.value.recommendedSupplierName ?? "供应商";
}

function approvalLabel(approval: AwardApproval, index: number) {
  return `定标审批 ${index + 1} / ${supplierName(approval.selectedSupplierId)} / ${approvalStatusLabels[approval.approvalStatus] ?? approval.approvalStatus}`;
}

function notificationLabel(index: number) {
  return `结果通知 ${index + 1}`;
}

function publicityLabel(index: number) {
  return `内部公示 ${index + 1}`;
}

function createAwardApprovalDisabledText() {
  if (projectHasApprovedAward.value) return "当前项目已有通过的定标审批，不能重复创建定标审批。";
  if (!selectedSupplierId.value) return "请先选择拟定标供应商。";
  return "创建定标审批";
}

function submitAwardApprovalDisabledText() {
  if (projectHasApprovedAward.value) return "定标审批已通过，不能重复提交审批。";
  if (!selectedApprovalId.value) return "请先选择定标审批单。";
  if (!selectedApprovalIsDraft.value) return "只有草稿状态的定标审批单可以提交。";
  return "提交审批";
}

function pricingReportButtonText() {
  if (!projectHasApprovedAward.value) return "审批通过后生成报告";
  if (existingPricingReport.value) return "价格报告已生成";
  return "生成价格报告";
}

function resultNotificationButtonText() {
  if (!projectHasApprovedAward.value) return "审批通过后发送通知";
  if (selectedNotificationScopeSent.value) return "结果通知已发送";
  return "发送结果通知";
}

function internalPublicityButtonText() {
  if (!projectHasApprovedAward.value) return "审批通过后发布公示";
  if (latestInternalPublicityRecord.value) return "内部公示已发布";
  return "发布内部公示";
}

function nextActionNotice() {
  if (!projectHasApprovedAward.value) return "请先创建并提交定标审批，集团审批通过后再发送结果通知、生成价格报告。";
  const items = [];
  items.push(existingPricingReport.value ? "价格报告已生成" : "可生成价格报告");
  items.push(supplierSelfNotificationsSent.value > 0 ? "供应商结果通知已发送" : "可发送供应商结果通知");
  items.push(latestInternalPublicityRecord.value ? "内部公示已发布" : "可发布内部公示");
  return `定标审批已通过。${items.join("，")}。`;
}

function notificationSelected(result: ResultNotification) {
  return Boolean(result.selected ?? (result.supplierId && result.supplierId === recommendation.value.recommendedSupplierId));
}

function formatDateTime(value: string | null) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function currency(value: number | undefined) {
  if (value === undefined) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function routeProjectId() {
  const value = route.query.projectId;
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function pendingGroupAwardInstance() {
  return pendingGroupAwardInstances.value[0];
}

function pickProjectFromRouteOrFallback(preferRoute: boolean) {
  const queryProjectId = routeProjectId();
  const pendingProjectId = canApproveAward.value ? pendingGroupAwardInstance()?.projectId : "";
  const selectableProjects = canApproveAward.value && groupAwardProjects.value.length > 0 ? groupAwardProjects.value : projects.value;
  const candidates = [preferRoute ? queryProjectId : "", pendingProjectId, selectedProjectId.value, queryProjectId, projects.value[0]?.id ?? ""];
  selectedProjectId.value = candidates.find((id) => id && selectableProjects.some((project) => project.id === id)) ?? "";
}

async function load(options: { preferRoute?: boolean } = {}) {
  const [projectData, supplierData, instanceData] = await Promise.all([
    apiGet<{ projects: Array<{ id: string; code: string; name: string; externalTradeFlag?: boolean }> }>("/api/projects").catch(() => ({ projects: [] })),
    apiGet<{ suppliers: Array<{ id: string; name: string }> }>("/api/suppliers").catch(() => ({ suppliers: [] })),
    loadApprovalInstances("award_approval").catch(() => [])
  ]);
  projects.value = projectData.projects.filter((project) => !project.externalTradeFlag);
  suppliers.value = supplierData.suppliers;
  approvalInstances.value = instanceData;
  if (isSupplierResultView.value) {
    const notifiedProjects: Array<{ id: string; code: string; name: string; externalTradeFlag?: boolean }> = [];
    for (const project of projects.value) {
      const result = await apiGet<{ notifications: ResultNotification[] }>(`/api/projects/${project.id}/result-notifications`).catch(() => ({ notifications: [] }));
      if (result.notifications.length > 0) notifiedProjects.push(project);
    }
    projects.value = notifiedProjects;
  }
  pickProjectFromRouteOrFallback(Boolean(options.preferRoute));
  if (!selectedProjectId.value) {
    recommendation.value = {};
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
    ? {}
    : (await apiGet<{ recommendation: AwardRecommendation }>(`/api/projects/${selectedProjectId.value}/award-recommendation`)).recommendation;
  selectedSupplierId.value =
    (recommendation.value.recommendedSupplierId && suppliers.value.some((item) => item.id === recommendation.value.recommendedSupplierId)
      ? recommendation.value.recommendedSupplierId
      : undefined) ??
    (suppliers.value.some((item) => item.id === selectedSupplierId.value) ? selectedSupplierId.value : suppliers.value[0]?.id ?? "");
  approvals.value = isSupplierResultView.value ? [] : (await apiGet<{ approvals: AwardApproval[] }>(`/api/projects/${selectedProjectId.value}/award-approvals`)).approvals;
  const selectableApprovals = canApproveAward.value ? groupApprovalOptions.value : approvals.value;
  if (!selectableApprovals.some((item) => item.id === selectedApprovalId.value)) {
    const queryBusinessId = route.query.businessType === "award_approval" ? String(route.query.businessId ?? "") : "";
    const pendingBusinessId = canApproveAward.value ? pendingGroupAwardInstance()?.businessId : "";
    const candidates = [
      queryBusinessId,
      pendingBusinessId,
      selectableApprovals.find((item) => item.approvalStatus === "submitted")?.id,
      selectableApprovals.at(-1)?.id ?? ""
    ];
    selectedApprovalId.value = candidates.find((id) => id && selectableApprovals.some((approval) => approval.id === id)) ?? "";
  }
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
  return performAction("定标审批已创建，请提交审批。", () => apiPost(`/api/projects/${selectedProjectId.value}/award-approvals`, { selectedSupplierId: selectedSupplierId.value, nonLowestPriceReason: nonLowestPriceReason.value }));
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
    error.value = "未找到当前定标审批的正式流程实例，请先由采购经办提交审批。";
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
  () => route.query.projectId,
  () => {
    void load({ preferRoute: true });
  }
);
</script>

<template>
  <section class="panel">
    <h2>{{ isSupplierResultView ? "中标结果与后续工作" : "定标审批与结果通知" }}</h2>
    <p v-if="isSupplierResultView" class="notice">
      这里查看采购经办发送给本供应商的结果通知。中选后请先确认价格报告和后续订单；没有生成订单前，继续等待采购经办生成采购订单或在商品维护中准备中标商品资料。
    </p>

    <div v-if="isSupplierResultView" class="form-grid">
      <label>
        项目
        <select v-model="selectedProjectId" @change="() => load()">
          <option value="">请选择已通知项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
    </div>

    <section v-if="isSupplierResultView" class="business-panel">
      <div class="panel-head">
        <h3>我的结果通知</h3>
        <span class="tag">{{ supplierResults.length }} 条</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>通知编号</th>
            <th>结果</th>
            <th>内容摘要</th>
            <th>发送时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="supplierResults.length === 0">
            <td colspan="4">当前账号暂无可见的中标结果通知。</td>
          </tr>
          <tr v-for="(result, index) in supplierResults" :key="result.id">
            <td>{{ notificationLabel(index) }}</td>
            <td>{{ notificationSelected(result) ? "中选" : "未中选" }}</td>
            <td>{{ result.contentSummary }}</td>
            <td>{{ formatDateTime(result.sentAt) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="supplierResults.some(notificationSelected)" class="notice">
        后续工作：等待采购经办生成采购订单；收到订单后到“订单履约”确认订单、发货、上传结算材料。需要上架到酒店采购目录的商品，请到“商品维护”补齐图片、规格和基础资料。
      </div>
      <div v-else-if="supplierResults.length" class="notice">当前项目未中选，可保留报价记录，等待后续采购公告或邀请。</div>
    </section>

    <section v-if="isSupplierResultView && supplierResults.some(notificationSelected)" class="business-panel">
      <div class="panel-head">
        <h3>合同签订</h3>
        <span class="tag">{{ currentContract ? contractStatusLabels[currentContract.status] ?? currentContract.status : "等待采购发起" }}</span>
      </div>
      <table v-if="currentContract">
        <thead>
          <tr>
            <th>合同编号</th>
            <th>合同金额</th>
            <th>状态</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ currentContract.contractNo }}</td>
            <td>{{ currency(currentContract.amount) }}</td>
            <td>{{ contractStatusLabels[currentContract.status] ?? currentContract.status }}</td>
            <td>{{ formatDateTime(currentContract.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="notice">采购经办人发起合同签订后，这里会显示合同确认入口。</p>
      <button v-if="canConfirmContract" type="button" @click="confirmContract">确认合同</button>
      <p v-else-if="currentContract" class="notice">合同状态为“{{ contractStatusLabels[currentContract.status] ?? currentContract.status }}”，当前无需重复确认。</p>
    </section>

    <section v-if="isSupplierResultView && pricingReports.length" class="business-panel">
      <div class="panel-head">
        <h3>相关价格报告</h3>
        <span class="tag">{{ pricingReports.length }} 份</span>
      </div>
      <div v-for="report in pricingReports" :key="`${report.id}-supplier-items`" class="table-wrap">
        <strong>{{ report.reportNo }}</strong>
        <table>
          <thead>
            <tr>
              <th>物品/服务</th>
              <th>规格</th>
              <th>采购价</th>
              <th>建议销售价</th>
              <th>有效期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in report.items" :key="item.id">
              <td>{{ item.itemName }}</td>
              <td>{{ item.specification || "-" }}</td>
              <td>{{ currency(item.purchasePrice) }}</td>
              <td>{{ currency(item.salePrice) }}</td>
              <td>{{ item.effectiveFrom }} 至 {{ item.effectiveTo || "长期" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <table v-if="!isSupplierResultView">
      <thead>
        <tr>
          <th>推荐供应商</th>
          <th>定标供应商</th>
          <th>是否最低价</th>
          <th>来源评审报告</th>
          <th>候选供应商</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ recommendation.recommendedSupplierName || "-" }}</td>
          <td>{{ supplierName(recommendation.recommendedSupplierId) }}</td>
          <td>{{ recommendation.isLowestPrice ? "是" : "否" }}</td>
          <td>{{ recommendation.sourceReportId || "待冻结评审报告" }}</td>
          <td>{{ recommendation.candidateSupplierIds?.map((id) => supplierName(id)).join("、") || "-" }}</td>
        </tr>
      </tbody>
    </table>

    <div v-if="canPrepareAward" class="form-grid">
      <label>
        项目
        <select v-model="selectedProjectId" @change="() => load()">
          <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <label>
        拟定标供应商
        <select v-model="selectedSupplierId">
          <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option>
        </select>
      </label>
      <label>
        非最低价理由
        <input v-model="nonLowestPriceReason" />
      </label>
      <button
        type="button"
        :disabled="!canCreateAwardApproval"
        :title="!canCreateAwardApproval ? createAwardApprovalDisabledText() : ''"
        @click="createAwardApproval"
      >
        {{ projectHasApprovedAward ? "定标审批已通过" : "创建定标审批" }}
      </button>
    </div>

    <div v-if="canPrepareAward" class="form-grid">
      <label>
        项目
        <select v-model="selectedProjectId" @change="() => load()">
          <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <label>
        审批单
        <select v-model="selectedApprovalId">
          <option v-for="(approval, index) in approvals" :key="approval.id" :value="approval.id">{{ approvalLabel(approval, index) }}</option>
        </select>
      </label>
      <label>
        通知范围
        <select v-model="awardOperationForm.notificationScope">
          <option value="supplier_self">供应商各自可见</option>
          <option value="internal_publicity">内部公示通知</option>
        </select>
      </label>
      <label>
        可见配置
        <select v-model="awardOperationForm.visibilityConfig">
          <option value="supplier_self_only">仅供应商本人可见</option>
          <option value="show_winner_name">展示中标供应商名称</option>
        </select>
      </label>
      <label>
        内部公示摘要
        <input v-model="awardOperationForm.publicitySummary" />
      </label>
      <button type="button" :disabled="!canSubmitAwardApproval" :title="!canSubmitAwardApproval ? submitAwardApprovalDisabledText() : ''" @click="submitAwardApproval">
        {{ projectHasApprovedAward ? "审批已通过" : "提交审批" }}
      </button>
      <button
        type="button"
        :disabled="!canGeneratePricingReport"
        :title="existingPricingReport ? '当前定标审批已经生成价格报告。' : !projectHasApprovedAward ? '定标审批通过后才能生成价格报告。' : ''"
        @click="generatePricingReport"
      >
        {{ pricingReportButtonText() }}
      </button>
      <button
        type="button"
        :disabled="!canSendResultNotification"
        :title="selectedNotificationScopeSent ? '当前通知范围已经发送。' : !projectHasApprovedAward ? '定标审批通过后才能发送结果通知。' : ''"
        @click="sendResultNotification"
      >
        {{ resultNotificationButtonText() }}
      </button>
      <button
        type="button"
        :disabled="!canPublishInternalPublicity"
        :title="latestInternalPublicityRecord ? '当前项目已经发布内部公示。' : !projectHasApprovedAward ? '定标审批通过后才能发布内部公示。' : ''"
        @click="publishInternalPublicity"
      >
        {{ internalPublicityButtonText() }}
      </button>
    </div>
    <p v-if="canPrepareAward" class="notice">{{ nextActionNotice() }}</p>
    <section v-if="canPrepareAward && projectHasApprovedAward" class="business-panel">
      <div class="panel-head">
        <h3>中标后续执行</h3>
        <span class="tag">{{ contractConfirmed ? "合同已确认" : currentContract ? "合同待确认" : "待发起合同" }}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>环节</th>
            <th>当前状态</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>合同签订</td>
            <td>{{ currentContract ? contractStatusLabels[currentContract.status] ?? currentContract.status : "未发起" }}</td>
            <td>{{ currentContract ? `${currentContract.contractNo} / ${currency(currentContract.amount)}` : "先由采购发起合同，再由中标供应商确认。" }}</td>
          </tr>
          <tr>
            <td>商品上架</td>
            <td>{{ hasListedAwardProducts ? "已上架" : "未上架" }}</td>
            <td>合同确认后，可按中标定价报告明细一键生成商品并上架到商品维护。</td>
          </tr>
        </tbody>
      </table>
      <div class="form-grid">
        <button type="button" :disabled="!canStartContractSigning" @click="startContractSigning">
          {{ currentContract ? "合同已发起" : "发起合同签订" }}
        </button>
        <button type="button" :disabled="!canAutoListAwardProducts" @click="autoListAwardProducts">
          {{ hasListedAwardProducts ? "中标商品已上架" : "一键上架中标商品" }}
        </button>
      </div>
    </section>
    <p v-else-if="canApproveAward" class="notice">当前是集团审批视角：可对“审批中”的定标单进行同意或驳回，采购执行操作仍由采购经办处理。</p>
    <p v-else class="notice">当前角色仅可只读查看定标记录和流程轨迹。</p>
    <div v-if="success" class="success-alert">{{ success }}</div>

    <section v-if="canApproveAward" class="approval-action-panel">
      <div>
        <p class="eyebrow">集团审批</p>
        <h3>定标确认</h3>
        <p class="notice">
          {{ canProcessSelectedAwardApproval ? "当前审批单待集团确认，可在本页直接处理。" : "请选择状态为“审批中”的定标审批单；已通过或未提交的审批单不能重复处理。" }}
        </p>
      </div>
      <label>
        项目
        <select v-model="selectedProjectId" @change="() => load()">
          <option v-for="project in groupAwardProjects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <label>
        审批单
        <input :value="selectedApprovalDisplay" readonly />
      </label>
      <label>
        通过意见
        <input v-model="approvalOpinion" />
      </label>
      <label>
        驳回意见
        <input v-model="rejectionOpinion" />
      </label>
      <button type="button" :disabled="!canProcessSelectedAwardApproval" @click="processAwardApproval(true)">审批通过</button>
      <button type="button" class="secondary-button" :disabled="!canProcessSelectedAwardApproval" @click="processAwardApproval(false)">审批驳回</button>
      <p v-if="groupApprovalOptions.length === 0" class="notice full-row">当前没有待集团确认的定标审批单。</p>
    </section>

    <h3 v-if="!isSupplierResultView">审批记录</h3>
    <table v-if="!isSupplierResultView">
      <thead>
        <tr>
          <th>审批</th>
          <th>定标供应商</th>
          <th>最低价</th>
          <th>状态</th>
          <th>非最低价理由</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(approval, index) in approvals" :key="approval.id">
          <td>{{ approvalLabel(approval, index) }}</td>
          <td>{{ supplierName(approval.selectedSupplierId) }}</td>
          <td>{{ approval.isLowestPrice ? "是" : "否" }}</td>
          <td>{{ approvalStatusLabels[approval.approvalStatus] ?? approval.approvalStatus }}</td>
          <td>{{ approval.nonLowestPriceReason || "-" }}</td>
        </tr>
      </tbody>
    </table>

    <h3 v-if="!isSupplierResultView">价格报告</h3>
    <p v-if="!isSupplierResultView" class="notice">定标审批通过后生成价格报告；商品上架和集团目录维护应交给平台运营或目录管理角色处理。</p>
    <table v-if="!isSupplierResultView">
      <thead>
        <tr>
          <th>报告编号</th>
          <th>中选供应商</th>
          <th>状态</th>
          <th>项目数</th>
          <th>生成时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="pricingReports.length === 0">
          <td colspan="5">暂无价格报告。</td>
        </tr>
        <tr v-for="report in pricingReports" :key="report.id">
          <td>{{ report.reportNo }}</td>
          <td>{{ supplierName(report.selectedSupplierId) }}</td>
          <td>{{ report.status }}</td>
          <td>{{ report.items.length }}</td>
          <td>{{ formatDateTime(report.createdAt) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="!isSupplierResultView" v-for="report in pricingReports" :key="`${report.id}-items`" class="table-wrap">
      <strong>{{ report.reportNo }} 明细</strong>
      <table>
        <thead>
          <tr>
            <th>物品/服务</th>
            <th>规格</th>
            <th>采购价</th>
            <th>建议销售价</th>
            <th>有效期</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in report.items" :key="item.id">
            <td>{{ item.itemName }}</td>
            <td>{{ item.specification || "-" }}</td>
            <td>{{ currency(item.purchasePrice) }}</td>
            <td>{{ currency(item.salePrice) }}</td>
            <td>{{ item.effectiveFrom }} 至 {{ item.effectiveTo || "长期" }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <section v-if="awardProducts.length" class="business-panel">
      <div class="panel-head">
        <h3>已上架中标商品</h3>
        <span class="tag">{{ awardProducts.length }} 件</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>商品</th>
            <th>供应商</th>
            <th>状态</th>
            <th>销售价</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in awardProducts" :key="product.id">
            <td>{{ product.name }}</td>
            <td>{{ product.supplierName || supplierName(product.supplierId) }}</td>
            <td>{{ productStatusLabels[product.status] ?? product.status }}</td>
            <td>{{ currency(product.activePrice?.salePrice ?? product.activePrice?.price) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <h3 v-if="!isSupplierResultView">结果通知</h3>
    <table v-if="!isSupplierResultView">
      <thead>
        <tr>
          <th>通知编号</th>
          <th>供应商</th>
          <th>状态</th>
          <th>可见范围</th>
          <th>发送时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(notification, index) in notifications" :key="notification.id">
          <td>{{ notificationLabel(index) }}</td>
          <td>{{ supplierName(notification.supplierId) }}</td>
          <td>{{ notificationStatusLabels[notification.status] ?? notification.status }}</td>
          <td>{{ visibilityLabels[notification.visibilityConfig] ?? notification.visibilityConfig }}</td>
          <td>{{ formatDateTime(notification.sentAt) }}</td>
        </tr>
      </tbody>
    </table>

    <h3 v-if="!isSupplierResultView">供应商可见结果</h3>
    <table v-if="!isSupplierResultView">
      <thead>
        <tr>
          <th>通知编号</th>
          <th>是否中选</th>
          <th>内容摘要</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(result, index) in supplierResults" :key="result.id">
          <td>{{ notificationLabel(index) }}</td>
          <td>{{ notificationSelected(result) ? "中选" : "未中选" }}</td>
          <td>{{ result.contentSummary }}</td>
        </tr>
      </tbody>
    </table>

    <h3 v-if="!isSupplierResultView">内部公示</h3>
    <table v-if="!isSupplierResultView">
      <thead>
        <tr>
          <th>公示编号</th>
          <th>状态</th>
          <th>内容摘要</th>
          <th>发布时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(record, index) in publicityRecords" :key="record.id">
          <td>{{ publicityLabel(index) }}</td>
          <td>{{ record.status === "published" ? "已发布" : record.status }}</td>
          <td>{{ record.contentSummary }}</td>
          <td>{{ formatDateTime(record.publishedAt) }}</td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>

  <ProcessTimeline
    v-if="isSupplierResultView && selectedProjectId"
    business-type="review_award"
    :business-id="selectedProjectId"
    title="结果通知流程轨迹"
    :refresh-key="processRefreshKey"
  />
  <ProcessTimeline
    v-if="!isSupplierResultView && selectedApprovalId"
    business-type="award_approval"
    :business-id="selectedApprovalId"
    title="定标审批流程进度"
    :refresh-key="processRefreshKey"
  />
  <ProcessTimeline
    v-if="!isSupplierResultView && selectedProjectId"
    business-type="review_award"
    :business-id="selectedProjectId"
    title="评审定标流程轨迹"
    :refresh-key="processRefreshKey"
  />
  <ProcessTimeline
    v-if="!isSupplierResultView && selectedProjectId"
    business-type="contract_preparation"
    :business-id="selectedProjectId"
    title="合同准备流程轨迹"
    :refresh-key="processRefreshKey"
  />
</template>
