import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPost } from "../../api/http";
import type { ProcessBusinessType } from "../../api/process";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { labelStatus } from "../../utils/status-labels";
import { APPROVAL_STATUS_LABELS } from "./constants";
import type { Approval, BidSummary, BidViewLog, Project, StatusTone, SupplierRow } from "./types";

export function useBidControlPage() {
  const projects = ref<Project[]>([]);
  const suppliers = ref<SupplierRow[]>([]);
  const summary = ref<BidSummary>({});
  const approvals = ref<Approval[]>([]);
  const logs = ref<BidViewLog[]>([]);
  const route = useRoute();
  const selectedProjectId = ref("");
  const targetSupplierId = ref("");
  const viewContent = ref("response_file_metadata");
  const allowDownload = ref(false);
  const selectedApprovalId = ref("");
  const auditLogId = ref("");
  const error = ref("");
  const processRefreshKey = ref(0);
  const session = useSessionStore();

  const canMaintainBidControl = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
  const bidProgressRows = computed(() => summary.value.bidProgress ?? summary.value.bids ?? []);
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "监督项目", value: projectLabel(summary.value.projectId), meta: summary.value.beforeDeadline ? "报价期内" : "已截标或待锁定" },
    { label: "供应商草稿", value: summary.value.draftCount ?? 0, meta: "尚未提交" },
    { label: "有效报价", value: summary.value.submittedCount ?? 0, meta: "已提交" },
    { label: "已封存报价", value: summary.value.lockedCount ?? 0, meta: "进入评审保密边界" },
    { label: "参与供应商", value: summary.value.totalInvitedSuppliers ?? "-", meta: "受邀或参与" }
  ]);

  function projectLabel(projectId?: unknown) {
    if (!projectId) return "-";
    const project = projects.value.find((item) => item.id === String(projectId));
    return project ? `${project.code} / ${project.name}` : "采购项目";
  }

  function supplierName(supplierId?: unknown) {
    if (!supplierId) return "-";
    return suppliers.value.find((item) => item.id === String(supplierId))?.name ?? "供应商";
  }

  function projectProcessType(projectId: string): ProcessBusinessType {
    const project = projects.value.find((item) => item.id === projectId);
    const method = `${project?.type ?? ""}`.toLowerCase();
    if (method.includes("direct") || method.includes("直接")) return "direct_purchase";
    if (method.includes("comparison") || method.includes("rfq") || method.includes("询价") || method.includes("比选")) return "rfq";
    return "tender";
  }

  function approvalLabel(approval: Approval, index: number) {
    return `查看审批 ${index + 1} / ${supplierName(approval.targetSupplierId)} / ${APPROVAL_STATUS_LABELS[approval.approvalStatus] ?? approval.approvalStatus}`;
  }

  function statusTone(status?: string): StatusTone {
    if (status === "approved" || status === "active" || status === "locked" || status === "submitted") return "success";
    if (status === "draft" || status === "pending") return "warning";
    if (status === "rejected" || status === "revoked" || status === "expired" || status === "withdrawn") return "error";
    return "default";
  }

  function routeProjectId() {
    const value = route.query.projectId;
    return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
  }

  function pickProjectFromRouteOrFallback(preferRoute: boolean) {
    const queryProjectId = routeProjectId();
    if (preferRoute && queryProjectId && projects.value.some((item) => item.id === queryProjectId)) {
      selectedProjectId.value = queryProjectId;
      return;
    }
    if (!projects.value.some((item) => item.id === selectedProjectId.value)) {
      selectedProjectId.value = (queryProjectId && projects.value.some((item) => item.id === queryProjectId) ? queryProjectId : projects.value[0]?.id) ?? "";
    }
  }

  async function load(options: { preferRoute?: boolean } = {}) {
    error.value = "";
    const [projectData, supplierData] = await Promise.all([
      apiGet<{ projects: Project[] }>("/api/projects"),
      apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] }))
    ]);
    projects.value = projectData.projects.filter((item) => !item.externalTradeFlag);
    suppliers.value = supplierData.suppliers;
    pickProjectFromRouteOrFallback(Boolean(options.preferRoute));
    targetSupplierId.value ||= suppliers.value[0]?.id ?? "";
    if (selectedProjectId.value) {
      summary.value = await apiGet<BidSummary>(`/api/projects/${selectedProjectId.value}/bids/summary`);
    } else {
      summary.value = {};
    }
    approvals.value = (await apiGet<{ approvals: Approval[] }>("/api/bid-view-approvals/active")).approvals;
    logs.value = (await apiGet<{ bidViewLogs: BidViewLog[] }>("/api/bid-view-logs", "u5")).bidViewLogs;
  }

  function onProjectChange() {
    void load();
  }

  async function run(action: () => Promise<{ auditLogId?: string; approval?: Approval }>) {
    error.value = "";
    try {
      const result = await action();
      auditLogId.value = result.auditLogId ?? "";
      selectedApprovalId.value = result.approval?.id ?? selectedApprovalId.value;
      processRefreshKey.value += 1;
      await load();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "操作失败";
    }
  }

  async function earlyCutoff() {
    await run(() => apiPost(`/api/projects/${selectedProjectId.value}/bids/cutoff`, { action: "early_cutoff", reason: "UAT flow early cutoff" }));
  }

  async function lockBids() {
    await run(() => apiPost(`/api/projects/${selectedProjectId.value}/bids/lock`));
  }

  async function createApproval() {
    await run(() => apiPost("/api/bid-view-approvals", { projectId: selectedProjectId.value, targetSupplierId, viewContent, allowDownload }));
  }

  async function submitApproval() {
    await run(() => apiPost(`/api/bid-view-approvals/${selectedApprovalId.value}/submit`));
  }

  async function approveSelectedApproval() {
    await run(() => apiPost(`/api/bid-view-approvals/${selectedApprovalId.value}/approve`, { approved: true }, "u1"));
  }

  async function validateApproval() {
    await run(() => apiPost(`/api/bid-view-approvals/${selectedApprovalId.value}/validate`, { supplierId: targetSupplierId.value, content: viewContent.value, download: allowDownload.value }));
  }

  onMounted(() => {
    void load({ preferRoute: true });
  });

  watch(
    () => route.query.projectId,
    () => {
      void load({ preferRoute: true });
    }
  );

  return {
    allowDownload,
    approvalLabel,
    approvals,
    auditLogId,
    bidProgressRows,
    canMaintainBidControl,
    createApproval,
    approveSelectedApproval,
    earlyCutoff,
    error,
    labelStatus,
    lockBids,
    logs,
    onProjectChange,
    processRefreshKey,
    projectProcessType,
    projects,
    selectedApprovalId,
    selectedProjectId,
    statusTone,
    submitApproval,
    summary,
    summaryItems,
    supplierName,
    suppliers,
    targetSupplierId,
    validateApproval,
    viewContent
  };
}
