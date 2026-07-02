import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { apiGet } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import { formatDateTime, labelStatus, statusLabelMap } from "../../utils/status-labels";
import { INTERNAL_STATUS_ORDER } from "./constants";
import type { SourcingStep, SourcingWorkbench, StatusTone, StepState } from "./types";

export function useProjectSourcingPage() {
  const route = useRoute();
  const workbench = ref<SourcingWorkbench | null>(null);
  const loading = ref(false);
  const errorMessage = ref("");

  const projectId = computed(() => String(route.params.projectId ?? ""));
  const statusText: Record<string, string> = {
    ...statusLabelMap,
    submitted_locked: "已提交并锁定",
    superseded: "已更正"
  };

  const projectStatusText = computed(() => label(workbench.value?.project.status || workbench.value?.project.displayStatus));
  const registrationRows = computed(() => workbench.value?.registrations ?? []);
  const announcementRows = computed(() => workbench.value?.announcements ?? []);
  const invitationRows = computed(() => workbench.value?.invitations ?? []);
  const publishedAnnouncementCount = computed(() => announcementRows.value.filter((item) => ["published", "closed"].includes(item.status)).length);
  const sentInvitationCount = computed(() => invitationRows.value.filter((item) => ["sent", "viewed", "registered"].includes(item.status)).length);
  const pendingRegistrationCount = computed(() => registrationRows.value.filter((item) => item.status === "submitted").length);
  const qualifiedRegistrationCount = computed(() => registrationRows.value.filter((item) => item.status === "qualified").length);
  const comparisonRows = computed(() => workbench.value?.comparisonReport?.comparisonRows ?? []);

  const canReadBidBody = computed(() => {
    const status = workbench.value?.project.status ?? "";
    return statusProgress(status) >= statusProgress("bidding_locked") || (workbench.value?.bids ?? []).some((bid) => typeof bid.amount === "number");
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

  const latestReviewReport = computed(() => {
    const reports = workbench.value?.reviewReports ?? [];
    return [...reports].sort((a, b) => String(b.frozenAt ?? b.generatedAt ?? "").localeCompare(String(a.frozenAt ?? a.generatedAt ?? "")))[0] ?? null;
  });

  const latestAwardApproval = computed(() =>
    [...(workbench.value?.awardApprovals ?? [])].sort((a, b) => String(b.approvedAt ?? b.submittedAt ?? b.createdAt ?? "").localeCompare(String(a.approvedAt ?? a.submittedAt ?? a.createdAt ?? "")))[0] ?? null
  );

  const latestPricingReport = computed(() =>
    [...(workbench.value?.pricingReports ?? [])].sort((a, b) => String(b.approvedAt ?? b.createdAt ?? "").localeCompare(String(a.approvedAt ?? a.createdAt ?? "")))[0] ?? null
  );
  const pageDescription = computed(() => (workbench.value ? `${workbench.value.project.code} / ${workbench.value.project.name}` : "按项目查看采购文件、公告报名、报价评审和定标结果。"));
  const sentNotificationCount = computed(() => workbench.value?.resultNotifications?.filter((item) => item.status === "sent").length ?? 0);

  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "当前阶段", value: projectStatusText.value || "-" },
    { label: "供应商参与", value: supplierEngagementRows.value.length, meta: `${qualifiedRegistrationCount.value} 家资格通过` },
    { label: "报价记录", value: workbench.value?.bids.length ?? 0, meta: canReadBidBody.value ? "报价可查看" : "截标前保密" },
    { label: "评审进度", value: `${scoringSummary.value.submitted}/${scoringSummary.value.assigned}`, meta: "已提交评分 / 评分任务" }
  ]);

  const demandSummary = computed<SummaryCardItem[]>(() => [
    { label: "申请部门", value: workbench.value?.procurementRequest?.requestDepartment || "-" },
    { label: "申请人", value: workbench.value?.procurementRequest?.requesterName || "-" },
    { label: "预算", value: currency(workbench.value?.procurementRequest?.budgetAmount) },
    { label: "期望到货", value: formatDateTime(workbench.value?.procurementRequest?.expectedArrivalAt) }
  ]);

  const sourcingSteps = computed<SourcingStep[]>(() => {
    const id = projectId.value;
    const encodedProjectId = encodeURIComponent(id);
    const documentCount = workbench.value?.procurementDocuments?.length ?? 0;
    return [
      {
        label: "采购文件",
        description: "编制、锁定并作为公告和邀请的业务依据。",
        count: `${documentCount} 份`,
        state: stageState(["project_created", "document_preparing"]),
        to: { path: "/procurement-documents", query: { projectId: id } }
      },
      {
        label: "公告与邀请",
        description: "发布公告范围，向供应商发出参与邀请。",
        count: `${publishedAnnouncementCount.value}/${announcementRows.value.length} 已发布 · ${sentInvitationCount.value}/${invitationRows.value.length} 已邀请`,
        state: announcementStageState(),
        to: { path: "/announcements-invitations", query: { projectId: id } }
      },
      {
        label: "报名资料",
        description: "审核供应商报名资料，控制后续报价资格。",
        count: `${pendingRegistrationCount.value} 待审 / ${qualifiedRegistrationCount.value} 通过`,
        state: registrationStageState(),
        to: { path: "/supplier-registration", query: { projectId: id } }
      },
      {
        label: "报价控制",
        description: "跟踪报价提交、截止和锁定，保持截标前保密。",
        count: `${workbench.value?.bids.length ?? 0} 份`,
        state: bidControlStageState(),
        to: { path: "/bid-control", query: { projectId: id } }
      },
      {
        label: "专家评审",
        description: "组织专家评分，形成可追溯的评审报告。",
        count: latestReviewReport.value ? label(latestReviewReport.value.status) : "待评审",
        state: expertReviewStageState(),
        to: { path: "/expert-review", query: { projectId: id } }
      },
      {
        label: "定标结果",
        description: "汇总推荐供应商，完成定标审批和结果通知。",
        count: `${workbench.value?.awardApprovals.length ?? 0} 次`,
        state: awardStageState(),
        to: { path: `/award-result/${encodedProjectId}` }
      }
    ];
  });

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

  const bidAttachmentRows = computed(() =>
    (workbench.value?.bids ?? []).map((bid) => ({
      id: bid.id,
      supplier: bid.supplierName || supplierName(bid.supplierId),
      status: bid.status,
      amount: bid.amount,
      deliveryDays: bid.deliveryDays,
      responseFileMetadata: bid.responseFileMetadata,
      fileName: bid.fileName
    }))
  );

  function statusProgress(status: string | undefined) {
    const index = INTERNAL_STATUS_ORDER.indexOf(status ?? "");
    return index < 0 ? 0 : index;
  }

  function stageState(targetStatuses: string[]): StepState {
    const status = workbench.value?.project.status;
    if (!status) return "upcoming";
    if (targetStatuses.includes(status)) return "current";
    const currentIndex = statusProgress(status);
    const targetIndex = Math.min(...targetStatuses.map((item) => statusProgress(item)).filter((item) => item >= 0));
    return currentIndex > targetIndex ? "done" : "upcoming";
  }

  function announcementStageState(): StepState {
    const status = workbench.value?.project.status ?? "";
    const hasPublishedAnnouncement = publishedAnnouncementCount.value > 0 || statusProgress(status) >= statusProgress("registration_open");
    const invitationReady = invitationRows.value.length === 0 || sentInvitationCount.value > 0;
    if (hasPublishedAnnouncement && invitationReady) return "done";
    if (hasPublishedAnnouncement) return "current";
    return stageState(["document_published"]);
  }

  function registrationStageState(): StepState {
    const status = workbench.value?.project.status ?? "";
    if (pendingRegistrationCount.value > 0) return "current";
    if (qualifiedRegistrationCount.value > 0) return "done";
    if (statusProgress(status) > statusProgress("registration_open")) return "done";
    if (status === "registration_open") return "current";
    return "upcoming";
  }

  function bidControlStageState(): StepState {
    const status = workbench.value?.project.status ?? "";
    if (statusProgress(status) >= statusProgress("bidding_locked")) return "done";
    if (status === "bidding_open") return "current";
    if (status === "registration_open" && qualifiedRegistrationCount.value > 0 && pendingRegistrationCount.value === 0) return "current";
    return "upcoming";
  }

  function expertReviewStageState(): StepState {
    const status = workbench.value?.project.status ?? "";
    if (["bidding_locked", "expert_reviewing"].includes(status)) return "current";
    if (statusProgress(status) > statusProgress("expert_reviewing")) return "done";
    return "upcoming";
  }

  function awardStageState(): StepState {
    const status = workbench.value?.project.status ?? "";
    if (status === "review_report_frozen") return "current";
    return stageState(["award_approving", "awarded_pending_order", "result_notified"]);
  }

  function stepTone(state: StepState) {
    if (state === "done") return "success";
    if (state === "current") return "primary";
    return "default";
  }

  function statusTone(value: string | undefined | null): StatusTone {
    const status = String(value ?? "");
    if (["approved", "qualified", "locked", "submitted_locked", "published", "sent"].includes(status)) return "success";
    if (["rejected", "denied"].includes(status)) return "error";
    if (["submitted", "award_approving", "expert_reviewing", "bidding_open", "registration_open"].includes(status)) return "warning";
    return "default";
  }

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

  function supplierName(supplierId: string) {
    return workbench.value?.suppliers.find((item) => item.id === supplierId)?.name ?? supplierId;
  }

  async function loadWorkbench() {
    if (!projectId.value) return;
    loading.value = true;
    errorMessage.value = "";
    try {
      workbench.value = await apiGet<SourcingWorkbench>(`/api/project-workbench/projects/${projectId.value}`);
    } catch (error) {
      workbench.value = null;
      errorMessage.value = error instanceof Error ? error.message : "招采执行详情加载失败";
    } finally {
      loading.value = false;
    }
  }

  onMounted(loadWorkbench);

  return {
    bidAttachmentRows,
    canReadBidBody,
    comparisonRows,
    currency,
    demandSummary,
    errorMessage,
    formatDateTime,
    label,
    latestAwardApproval,
    latestPricingReport,
    latestReviewReport,
    loading,
    pageDescription,
    projectId,
    projectStatusText,
    quoteRows,
    scoringSummary,
    sentNotificationCount,
    sourcingSteps,
    statusTone,
    stepTone,
    summaryItems,
    supplierEngagementRows,
    supplierName,
    workbench
  };
}
