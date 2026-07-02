import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiGet, apiPatch, apiPost, uploadFile } from "../../api/http";
import type { ProcessBusinessType } from "../../api/process";
import type { SummaryCardItem } from "../../components/base";
import { isTestLikeText } from "../../utils/business-display";
import { labelStatus } from "../../utils/status-labels";
import type { Bid, Project, Registration, StatusTone, SupplierRow } from "./types";

export function useBiddingPage() {
  const projects = ref<Project[]>([]);
  const bids = ref<Bid[]>([]);
  const suppliers = ref<SupplierRow[]>([]);
  const registrations = ref<Registration[]>([]);
  const selectedProjectId = ref("");
  const selectedBidId = ref("");
  const amount = ref(188800);
  const taxRate = ref(0.13);
  const taxInclusive = ref(true);
  const taxNote = ref("含税总价");
  const deliveryDays = ref(7);
  const responseSummary = ref("按采购要求提供完整响应文件与交付计划。");
  const serviceCommitment = ref("支持分批交付与异常补货。");
  const responseFile = ref<File | null>(null);
  const responseFileName = ref("");
  const auditLogId = ref("");
  const error = ref("");
  const businessDialog = ref("");
  const processRefreshKey = ref(0);
  const route = useRoute();
  const router = useRouter();

  const selectedProject = computed(() => projects.value.find((item) => item.id === selectedProjectId.value));
  const selectedBid = computed(() => bids.value.find((item) => item.id === selectedBidId.value) ?? null);
  const submittedBidCount = computed(() => bids.value.filter((item) => item.status === "submitted").length);
  const lockedBidCount = computed(() => bids.value.filter((item) => item.status === "locked").length);
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "可报价项目", value: projects.value.length, meta: "已通过报名资格" },
    { label: "当前报价单", value: bids.value.length, meta: selectedProject.value ? `${selectedProject.value.code}` : "未选择项目" },
    { label: "已提交", value: submittedBidCount.value, meta: "等待截标或锁定" },
    { label: "已锁定", value: lockedBidCount.value, meta: "进入评审后不可改" }
  ]);
  const emptyProjectHint = computed(() => {
    if (projects.value.length > 0) return "";
    return "暂无可报价项目。请先确认已在“报名资料”提交报名材料，并等待采购经办审核通过。";
  });

  function projectLabel(projectId: string) {
    const project = projects.value.find((item) => item.id === projectId);
    return project ? `${project.code} / ${project.name}` : "采购项目";
  }

  function supplierName(supplierId: string, fallback?: string) {
    return fallback ?? suppliers.value.find((item) => item.id === supplierId)?.name ?? "供应商";
  }

  function bidLabel(bid: Bid, index?: number) {
    return `报价单${index === undefined ? "" : ` ${index + 1}`} / ${supplierName(bid.supplierId, bid.supplierName)} / ${labelStatus(bid.status)}`;
  }

  function bidStatusTone(status: string): StatusTone {
    if (status === "submitted") return "primary";
    if (status === "locked") return "success";
    if (status === "withdrawn" || status === "rejected") return "error";
    if (status === "draft") return "warning";
    return "default";
  }

  function projectProcessType(projectId: string): ProcessBusinessType {
    const project = projects.value.find((item) => item.id === projectId);
    const method = `${project?.type ?? ""}`.toLowerCase();
    if (method.includes("direct") || method.includes("直接")) return "direct_purchase";
    if (method.includes("comparison") || method.includes("rfq") || method.includes("询价") || method.includes("比选")) return "rfq";
    return "tender";
  }

  function onFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    responseFile.value = target.files?.[0] ?? null;
    responseFileName.value = responseFile.value?.name ?? "";
  }

  async function bidPayload() {
    const payload: Record<string, unknown> = {
      amount: amount.value,
      taxRate: taxRate.value,
      taxInclusive: taxInclusive.value,
      taxNote: taxNote.value,
      deliveryDays: deliveryDays.value,
      responseSummary: responseSummary.value,
      serviceCommitment: serviceCommitment.value
    };
    if (responseFile.value) {
      const uploaded = await uploadFile(responseFile.value, {
        attachmentKind: "bid_response_file",
        objectType: "bid",
        objectId: selectedBidId.value || `${selectedProjectId.value}-draft-bid`,
        projectId: selectedProjectId.value
      });
      payload.responseFileMetadata = [uploaded.file];
    }
    return payload;
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
    const [projectData, supplierData, registrationData] = await Promise.all([
      apiGet<{ projects: Project[] }>("/api/projects"),
      apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] })),
      apiGet<{ registrations: Registration[] }>("/api/registrations").catch(() => ({ registrations: [] }))
    ]);
    registrations.value = registrationData.registrations;
    const qualifiedProjectIds = new Set(registrations.value.filter((item) => item.status === "qualified").map((item) => item.projectId));
    projects.value = projectData.projects.filter((item) => !item.externalTradeFlag && !isTestLikeText(item.name) && qualifiedProjectIds.has(item.id));
    suppliers.value = supplierData.suppliers;
    pickProjectFromRouteOrFallback(Boolean(options.preferRoute));
    if (selectedProjectId.value) {
      const summary = await apiGet<{ bids?: Bid[] }>(`/api/projects/${selectedProjectId.value}/bids/summary`);
      bids.value = summary.bids ?? [];
      if (!bids.value.some((item) => item.id === selectedBidId.value)) {
        selectedBidId.value = bids.value[0]?.id ?? "";
      }
    } else {
      bids.value = [];
      selectedBidId.value = "";
    }
  }

  async function run(action: () => Promise<{ auditLogId?: string; bid?: Bid }>) {
    error.value = "";
    businessDialog.value = "";
    try {
      const result = await action();
      auditLogId.value = result.auditLogId ?? "";
      selectedBidId.value = result.bid?.id ?? selectedBidId.value;
      processRefreshKey.value += 1;
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "操作失败";
      if (message.includes("当前项目还不能报价") || message.includes("报名")) {
        businessDialog.value = message;
      } else {
        error.value = message;
      }
    }
  }

  function onProjectChange() {
    void load();
  }

  function closeBusinessDialog() {
    businessDialog.value = "";
  }

  async function goRegistration() {
    businessDialog.value = "";
    await router.push("/supplier-registration");
  }

  async function saveDraft() {
    await run(async () => apiPost(`/api/projects/${selectedProjectId.value}/bids`, await bidPayload()));
  }

  async function updateDraft() {
    await run(async () => apiPatch(`/api/bids/${selectedBidId.value}`, await bidPayload()));
  }

  async function submitBid() {
    await run(() => apiPost(`/api/bids/${selectedBidId.value}/submit`, {}));
  }

  async function withdrawBid() {
    await run(() => apiPost(`/api/bids/${selectedBidId.value}/withdraw`, {}));
  }

  async function resubmitBid() {
    await run(async () => apiPost(`/api/bids/${selectedBidId.value}/resubmit`, await bidPayload()));
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
    amount,
    auditLogId,
    bidLabel,
    bids,
    bidStatusTone,
    businessDialog,
    closeBusinessDialog,
    deliveryDays,
    emptyProjectHint,
    error,
    goRegistration,
    labelStatus,
    onFileChange,
    onProjectChange,
    processRefreshKey,
    projectLabel,
    projectProcessType,
    projects,
    responseFileName,
    responseSummary,
    resubmitBid,
    saveDraft,
    selectedBid,
    selectedBidId,
    selectedProject,
    selectedProjectId,
    serviceCommitment,
    submitBid,
    summaryItems,
    supplierName,
    taxInclusive,
    taxNote,
    taxRate,
    updateDraft,
    withdrawBid
  };
}
