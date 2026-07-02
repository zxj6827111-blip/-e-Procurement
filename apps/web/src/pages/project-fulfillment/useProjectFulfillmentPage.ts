import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPost, uploadFile } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { formatDateTime, labelAuditAction, labelStatus, statusLabelMap } from "../../utils/status-labels";
import { FINANCE_REVIEW_ROLES, PROCUREMENT_ROLES, STATUS_TEXT, SUPPLIER_ADMIN_ROLES } from "./constants";
import type { Attachment, ProjectWorkbenchFulfillment, PurchaseOrder, SettlementMaterial, StatusTone } from "./types";

export function useProjectFulfillmentPage() {
  const route = useRoute();
  const session = useSessionStore();
  const workbench = ref<ProjectWorkbenchFulfillment | null>(null);
  const loading = ref(false);
  const actionBusy = ref("");
  const errorMessage = ref("");
  const auditLogId = ref("");

  const settlementMaterialType = ref("invoice");
  const settlementOrderId = ref("");
  const settlementFile = ref<File | null>(null);
  const settlementFileName = ref("");
  const evaluationOrderId = ref("");
  const evaluationScore = ref(92);
  const evaluationDescription = ref("收货、服务和结算资料配合情况良好。");
  const receiptType = ref("full");
  const receiptExceptionType = ref("quantity_mismatch");
  const receiptSummary = ref("本次到货已完成收货验收。");
  const receiptAt = ref("");
  const receiptItems = ref("");
  const receiptHandlingStatus = ref("supplemented");
  const receiptHandlingNote = ref("异常事项已补充核实并完成处理。");
  const changeExpectedDeliveryAt = ref("");
  const changeReceivingLocation = ref("");
  const changeRemark = ref("页面登记订单变更，计划与收货信息已复核。");

  const projectId = computed(() => String(route.params.projectId ?? ""));
  const roleId = computed(() => session.roleId);
  const canGenerateOrder = computed(() => PROCUREMENT_ROLES.includes(roleId.value) && workbench.value?.project.status === "awarded_pending_order");
  const canConfirmOrder = computed(() => SUPPLIER_ADMIN_ROLES.includes(roleId.value));
  const canRecordReceipt = computed(() => PROCUREMENT_ROLES.includes(roleId.value));
  const canUploadSettlement = computed(() => SUPPLIER_ADMIN_ROLES.includes(roleId.value) || PROCUREMENT_ROLES.includes(roleId.value));
  const canVerifySettlement = computed(() => FINANCE_REVIEW_ROLES.includes(roleId.value));
  const canEvaluateSupplier = computed(() => PROCUREMENT_ROLES.includes(roleId.value));

  const statusText: Record<string, string> = { ...statusLabelMap, ...STATUS_TEXT };
  const pageDescription = computed(() => (workbench.value ? `${workbench.value.project.code} / ${workbench.value.project.name}` : projectId.value));
  const projectStatusLabel = computed(() => label(workbench.value?.project.status || workbench.value?.project.displayStatus));
  const projectStatusTone = computed(() => statusTone(workbench.value?.project.status));
  const settlementFileSelected = computed(() => Boolean(settlementFile.value));

  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "采购订单", value: workbench.value?.purchaseOrders.length ?? 0 },
    { label: "收货记录", value: workbench.value?.receiptRecords.length ?? 0 },
    { label: "结算材料", value: workbench.value?.settlementMaterials.length ?? 0 },
    { label: "归档完成", value: `${workbench.value?.archiveItems.filter((item) => item.collectedFlag).length ?? 0}/${workbench.value?.archiveItems.length ?? 0}` }
  ]);

  function label(value: string | undefined | null) {
    return value ? statusText[value] ?? labelStatus(value) : "-";
  }

  function statusTone(value: string | undefined | null): StatusTone {
    const status = String(value ?? "");
    if (["closed", "received", "verified", "complete", "sealed"].includes(status)) return "success";
    if (["rejected", "exception", "incomplete", "supplement_rejected"].includes(status)) return "error";
    if (["pending_confirmation", "pending_verification", "collecting", "pending_resolution"].includes(status)) return "warning";
    return "default";
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

  function materialAttachments(material: SettlementMaterial): Attachment[] {
    if (!material.fileId) return [];
    return [
      {
        id: material.fileId,
        fileName: material.fileName ?? "结算资料",
        contentType: material.contentType,
        uploadedAt: material.uploadedAt
      }
    ];
  }

  function parseReceiptItems(value: string) {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [itemName, receivedQuantity, unit, accepted] = item.split("|").map((part) => part.trim());
        return {
          itemName,
          receivedQuantity: Number(receivedQuantity),
          unit: unit || "项",
          accepted: accepted === undefined ? true : !["false", "否", "不合格", "0"].includes(accepted)
        };
      })
      .filter((item) => item.itemName && Number.isFinite(item.receivedQuantity) && item.receivedQuantity >= 0);
  }

  function defaultReceiptItems(order: PurchaseOrder, mode = receiptType.value) {
    return order.lineItems
      .map((line) => {
        const remaining = Math.max(0, line.quantity - line.receivedQuantity);
        const quantity = mode === "full" ? line.quantity : Math.max(0, remaining);
        return `${line.itemName}|${quantity}|${line.unit}|${mode === "exception" ? "否" : "是"}`;
      })
      .join("\n");
  }

  function primeReceiptForm(orderId: string, mode = "partial") {
    const order = workbench.value?.purchaseOrders.find((item) => item.id === orderId);
    if (!order) return;
    receiptType.value = mode;
    receiptSummary.value = mode === "exception" ? "登记异常收货并进入后续处理。" : mode === "partial" ? "本次到货已完成部分收货验收。" : "全部到货并验收通过。";
    receiptItems.value = defaultReceiptItems(order, mode);
  }

  function primeChangeForm(orderId: string) {
    const order = workbench.value?.purchaseOrders.find((item) => item.id === orderId);
    if (!order) return;
    changeExpectedDeliveryAt.value = order.expectedDeliveryAt;
    changeReceivingLocation.value = order.receivingLocation;
    changeRemark.value = order.statusRemark || "页面登记订单变更，计划与收货信息已复核。";
  }

  function onSettlementFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    settlementFile.value = target.files?.[0] ?? null;
    settlementFileName.value = settlementFile.value?.name ?? "";
  }

  async function loadWorkbench() {
    if (!projectId.value) return;
    loading.value = true;
    errorMessage.value = "";
    auditLogId.value = "";
    try {
      workbench.value = await apiGet<ProjectWorkbenchFulfillment>(`/api/project-workbench/projects/${encodeURIComponent(projectId.value)}`);
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

  async function runProjectAction(action: () => Promise<{ auditLogId?: string }>, busyKey: string) {
    actionBusy.value = busyKey;
    errorMessage.value = "";
    auditLogId.value = "";
    try {
      const result = await action();
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

  async function runGenerateOrder() {
    if (!workbench.value) return;
    await runProjectAction(
      () =>
        apiPost(`/api/project-workbench/projects/${workbench.value?.project.id}/purchase-orders/generate`, {
          expectedDeliveryAt: workbench.value?.procurementRequest?.expectedArrivalAt,
          receivingLocation: workbench.value?.procurementRequest?.receivingLocation
        }),
      "generate"
    );
  }

  async function runConfirmOrder(orderId: string) {
    await runProjectAction(() => apiPost(`/api/project-workbench/purchase-orders/${orderId}/confirm`), `confirm:${orderId}`);
  }

  async function runRecordReceipt(orderId: string, forcedType?: string) {
    const order = workbench.value?.purchaseOrders.find((item) => item.id === orderId);
    if (!order) return;
    const nextType = forcedType ?? receiptType.value;
    if (!receiptItems.value.trim() || forcedType) {
      receiptItems.value = defaultReceiptItems(order, nextType);
    }
    const receivedItems = parseReceiptItems(receiptItems.value);
    await runProjectAction(
      () =>
        apiPost(`/api/project-workbench/purchase-orders/${orderId}/receipts`, {
          receiptType: nextType,
          exceptionType: nextType === "exception" ? receiptExceptionType.value : undefined,
          summary: receiptSummary.value,
          receiptAt: receiptAt.value || undefined,
          receivedItems: receivedItems.length ? receivedItems : undefined
        }),
      `receipt:${orderId}`
    );
  }

  async function runHandleReceiptException(receiptId: string) {
    await runProjectAction(
      () =>
        apiPost(`/api/project-workbench/receipts/${receiptId}/handle`, {
          handlingStatus: receiptHandlingStatus.value,
          handlingNote: receiptHandlingNote.value
        }),
      `receipt-handle:${receiptId}`
    );
  }

  async function runChangeOrder(orderId: string) {
    const order = workbench.value?.purchaseOrders.find((item) => item.id === orderId);
    if (!order) return;
    await runProjectAction(
      () =>
        apiPost(`/api/project-workbench/purchase-orders/${orderId}/change`, {
          expectedDeliveryAt: changeExpectedDeliveryAt.value || order.expectedDeliveryAt,
          receivingLocation: changeReceivingLocation.value || order.receivingLocation,
          statusRemark: changeRemark.value || "页面登记订单变更，计划与收货信息已复核。"
        }),
      `change:${orderId}`
    );
  }

  async function runCloseOrder(orderId: string) {
    await runProjectAction(() => apiPost(`/api/project-workbench/purchase-orders/${orderId}/close`, { reason: "页面关闭采购订单。" }), `close:${orderId}`);
  }

  async function uploadSettlementMaterial() {
    if (!workbench.value || !settlementOrderId.value || !settlementFile.value) return;
    await runProjectAction(async () => {
      const fileResult = await uploadFile(settlementFile.value as File, {
        attachmentKind: "settlement_material",
        objectType: "settlement_material",
        objectId: `${settlementOrderId.value}-${settlementMaterialType.value}`,
        projectId: workbench.value?.project.id,
        supplierId: session.user?.supplierId
      });
      const result = await apiPost<{ auditLogId?: string }>(`/api/project-workbench/purchase-orders/${settlementOrderId.value}/settlement-materials`, {
        materialType: settlementMaterialType.value,
        storedFileId: fileResult.file.id
      });
      settlementFile.value = null;
      settlementFileName.value = "";
      return { auditLogId: result.auditLogId ?? fileResult.auditLogId };
    }, "settlement");
  }

  async function verifySettlementMaterial(materialId: string, approved: boolean) {
    await runProjectAction(
      () =>
        apiPost(`/api/project-workbench/settlement-materials/${materialId}/verify`, {
          approved,
          verificationOpinion: approved ? "资料齐全，核验通过。" : "资料不完整，请补充后重传。"
        }),
      `settlement:${materialId}`
    );
  }

  async function submitSupplierEvaluation() {
    if (!evaluationOrderId.value) return;
    await runProjectAction(
      () =>
        apiPost(`/api/project-workbench/purchase-orders/${evaluationOrderId.value}/evaluations`, {
          dimensions: {
            quality: evaluationScore.value,
            delivery: evaluationScore.value,
            service: evaluationScore.value,
            cooperation: evaluationScore.value,
            priceReasonableness: evaluationScore.value
          },
          description: evaluationDescription.value
        }),
      "evaluation"
    );
  }

  onMounted(async () => {
    if (!session.user) await session.loadMe();
    await loadWorkbench();
  });

  return {
    actionBusy,
    auditLogId,
    canConfirmOrder,
    canEvaluateSupplier,
    canGenerateOrder,
    canRecordReceipt,
    canUploadSettlement,
    canVerifySettlement,
    changeExpectedDeliveryAt,
    changeReceivingLocation,
    changeRemark,
    currency,
    errorMessage,
    evaluationDescription,
    evaluationOrderId,
    evaluationScore,
    formatDateTime,
    label,
    labelAuditAction,
    loading,
    materialAttachments,
    onSettlementFileChange,
    pageDescription,
    primeChangeForm,
    primeReceiptForm,
    projectId,
    projectStatusLabel,
    projectStatusTone,
    receiptAt,
    receiptExceptionType,
    receiptHandlingNote,
    receiptHandlingStatus,
    receiptItems,
    receiptSummary,
    receiptType,
    runChangeOrder,
    runCloseOrder,
    runConfirmOrder,
    runGenerateOrder,
    runHandleReceiptException,
    runRecordReceipt,
    settlementFileName,
    settlementFileSelected,
    settlementMaterialType,
    settlementOrderId,
    statusTone,
    submitSupplierEvaluation,
    summaryItems,
    supplierName,
    uploadSettlementMaterial,
    verifySettlementMaterial,
    workbench
  };
}
