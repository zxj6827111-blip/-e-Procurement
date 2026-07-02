import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiGet } from "../../api/http";
import type { SummaryCardItem } from "../../components/base/SummaryCards.vue";
import { useSessionStore } from "../../stores/session";
import { EXTERNAL_STATUS_ORDER, INTERNAL_STATUS_ORDER } from "./constants";
import {
  currency,
  operationStateLabel,
  pickProjectFromRouteOrFallback as pickWorkbenchProjectFromRouteOrFallback,
  projectOptionLabel,
  projectStatusText as getProjectStatusText,
  projectSummaryItems as buildProjectSummaryItems,
  projectTitle as resolveProjectTitle,
  routeProjectId as resolveRouteProjectId,
  stageState as resolveStageState,
  statusProgress
} from "./display";
import type { NextAction, ProjectOperationLink, ProjectOption, WorkbenchResponse, WorkbenchStage } from "./types";

export function useProjectWorkbenchPage() {
  const session = useSessionStore();
  const route = useRoute();
  const router = useRouter();
  const projectOptions = ref<ProjectOption[]>([]);
  const selectedProjectId = ref("");
  const workbench = ref<WorkbenchResponse | null>(null);
  const loading = ref(false);
  const auditLogId = ref("");
  const errorMessage = ref("");

  const isExternalTradeProject = computed(() => Boolean(workbench.value?.project.externalTradeFlag));
  const selectedProjectOption = computed(() => projectOptions.value.find((item) => item.id === selectedProjectId.value) ?? null);
  const projectStatusText = computed(() => getProjectStatusText(workbench.value));
  const projectTitle = computed(() => resolveProjectTitle(workbench.value, selectedProjectOption.value));

  const currentProjectLabel = computed(() => {
    const project = workbench.value?.project;
    if (!project) return selectedProjectOption.value?.displayName ?? "请选择项目";
    return `${project.code} / ${projectTitle.value}`;
  });

  const selectedProjectOptionLabel = computed(() => (selectedProjectOption.value ? projectOptionLabel(selectedProjectOption.value) : currentProjectLabel.value));
  const projectSummaryItems = computed<SummaryCardItem[]>(() => buildProjectSummaryItems(workbench.value, isExternalTradeProject.value));

  function stageState(targetStatuses: string[], order = INTERNAL_STATUS_ORDER): WorkbenchStage {
    return resolveStageState(workbench.value?.project.status, targetStatuses, order);
  }

  const registrationRows = computed(() => workbench.value?.registrations ?? []);
  const announcementRows = computed(() => workbench.value?.announcements ?? []);
  const invitationRows = computed(() => workbench.value?.invitations ?? []);
  const publishedAnnouncementCount = computed(() => announcementRows.value.filter((item) => item.status === "published" || item.status === "closed").length);
  const sentInvitationCount = computed(() => invitationRows.value.filter((item) => item.status === "sent" || item.status === "viewed" || item.status === "registered").length);
  const pendingRegistrationCount = computed(() => registrationRows.value.filter((item) => item.status === "submitted").length);
  const qualifiedRegistrationCount = computed(() => registrationRows.value.filter((item) => item.status === "qualified").length);

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
    const hasPublishedAnnouncement = publishedAnnouncementCount.value > 0 || statusProgress(status, INTERNAL_STATUS_ORDER) >= statusProgress("registration_open", INTERNAL_STATUS_ORDER);
    const invitationReady = invitationRows.value.length === 0 || sentInvitationCount.value > 0;
    if (hasPublishedAnnouncement && invitationReady) return "done";
    if (hasPublishedAnnouncement) return "current";
    return stageState(["document_published"]);
  }

  function registrationStageState(): WorkbenchStage {
    const status = workbench.value?.project.status ?? "";
    if (pendingRegistrationCount.value > 0) return "current";
    if (qualifiedRegistrationCount.value > 0) return "done";
    if (statusProgress(status, INTERNAL_STATUS_ORDER) > statusProgress("registration_open", INTERNAL_STATUS_ORDER)) return "done";
    if (status === "registration_open") return "current";
    return "upcoming";
  }

  function bidControlStageState(): WorkbenchStage {
    const status = workbench.value?.project.status ?? "";
    if (statusProgress(status, INTERNAL_STATUS_ORDER) >= statusProgress("bidding_locked", INTERNAL_STATUS_ORDER)) return "done";
    if (status === "bidding_open") return "current";
    if (status === "registration_open" && qualifiedRegistrationCount.value > 0 && pendingRegistrationCount.value === 0) return "current";
    return "upcoming";
  }

  function expertReviewStageState(): WorkbenchStage {
    const status = workbench.value?.project.status ?? "";
    if (["bidding_locked", "expert_reviewing"].includes(status)) return "current";
    if (statusProgress(status, INTERNAL_STATUS_ORDER) > statusProgress("expert_reviewing", INTERNAL_STATUS_ORDER)) return "done";
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
          state: stageState(["external_project_recorded", "external_announcement_uploaded", "external_result_uploaded", "external_result_recorded"], EXTERNAL_STATUS_ORDER)
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
        to: { path: `/award-result/${encodeURIComponent(projectId)}` },
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
      return { title: "推进定标结果", detail: "汇总评审结论，完成定标审批和结果通知。", to: { path: `/award-result/${encodeURIComponent(projectId)}` } };
    }
    if (["awarded_pending_order", "result_notified"].includes(status)) {
      return { title: "进入履约结算", detail: "定标完成后在履约子页生成采购订单，并继续处理供应商确认、收货和结算。", to: { path: `/project-workbench/${projectId}/fulfillment` } };
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

  const sourcingMetrics = computed(() => ({
    supplierCount: supplierEngagementRows.value.length,
    qualifiedRegistrationCount: qualifiedRegistrationCount.value,
    bidCount: workbench.value?.bids.length ?? 0,
    submittedScoreCount: scoringSummary.value.submitted
  }));

  const fulfillmentMetrics = computed(() => ({
    orderCount: workbench.value?.purchaseOrders.length ?? 0,
    receiptCount: workbench.value?.receiptRecords.length ?? 0,
    settlementMaterialCount: workbench.value?.settlementMaterials.length ?? 0,
    collectedArchiveCount: workbench.value?.archiveItems.filter((item) => item.collectedFlag).length ?? 0,
    totalArchiveCount: workbench.value?.archiveItems.length ?? 0
  }));

  function routeProjectId() {
    return resolveRouteProjectId(route.params.projectId, route.query.projectId);
  }

  function pickProjectFromRouteOrFallback(preferRoute: boolean) {
    selectedProjectId.value = pickWorkbenchProjectFromRouteOrFallback({
      preferRoute,
      queryProjectId: routeProjectId(),
      selectedProjectId: selectedProjectId.value,
      projectOptions: projectOptions.value
    });
  }

  async function loadProjects(options: { preferRoute?: boolean } = {}) {
    const data = await apiGet<{ projects: ProjectOption[] }>("/api/projects");
    projectOptions.value = data.projects;
    pickProjectFromRouteOrFallback(Boolean(options.preferRoute));
  }

  async function loadWorkbench() {
    if (!selectedProjectId.value) {
      workbench.value = null;
      errorMessage.value = projectOptions.value.length === 0 ? "当前角色暂无经办项目。" : "";
      return;
    }
    loading.value = true;
    errorMessage.value = "";
    auditLogId.value = "";
    try {
      workbench.value = await apiGet<WorkbenchResponse>(`/api/project-workbench/projects/${selectedProjectId.value}`);
    } catch (error) {
      const err = error as Error & { auditLogId?: string };
      workbench.value = null;
      errorMessage.value = err.message;
      auditLogId.value = err.auditLogId ?? "";
    } finally {
      loading.value = false;
    }
  }

  onMounted(async () => {
    await session.loadMe(session.user?.id);
    await loadProjects({ preferRoute: true });
    await loadWorkbench();
  });

  watch(selectedProjectId, () => {
    if (selectedProjectId.value && route.params.projectId !== selectedProjectId.value) {
      void router.replace(`/project-workbench/${encodeURIComponent(selectedProjectId.value)}`);
      return;
    }
    void loadWorkbench();
  });

  watch(
    () => [route.params.projectId, route.query.projectId],
    async () => {
      await loadProjects({ preferRoute: true });
      await loadWorkbench();
    }
  );

  return {
    auditLogId,
    completedOperationCount,
    currency,
    currentProjectLabel,
    demandSummary,
    errorMessage,
    fulfillmentMetrics,
    isExternalTradeProject,
    lineItemSummary,
    loading,
    nextAction,
    operationStateLabel,
    progressOverview,
    projectOperationLinks,
    projectOptionLabel,
    projectOptions,
    projectStatusText,
    projectSummaryItems,
    selectedProjectId,
    selectedProjectOptionLabel,
    showSourcingDetails,
    sourcingMetrics,
    totalOperationCount,
    workbench
  };
}
