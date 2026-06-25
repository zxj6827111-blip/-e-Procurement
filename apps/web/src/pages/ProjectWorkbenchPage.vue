<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
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
  name: string;
  displayStatus: string;
  category: string;
}

interface WorkbenchResponse {
  project: {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    displayStatus: string;
    category: string;
    buyer: string;
    quoteDeadlineAt: string | null;
    qualificationRequirements?: string[];
    quoteRequirements?: string[];
    clarificationRecords?: Array<{ id: string; question: string; answer: string }>;
  };
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
    deliveryDays?: number;
    serviceCommitment?: string;
    fileName?: string;
    responseFileMetadata?: Attachment[];
  }>;
  comparisonReport: null | {
    reportNo: string;
    recommendedSupplierId: string;
    awardReason: string;
    nonLowestPriceReason?: string;
  };
  awardApprovals: Array<{ id: string; selectedSupplierId: string; approvalStatus: string }>;
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

const session = useSessionStore();
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
const procurementRoles: RoleId[] = ["buyer", "group_manager", "hotel_buyer", "platform_operator"];
const supplierRoles: RoleId[] = ["supplier", "supplier_admin", "supplier_quotation"];
const supplierAdminRoles: RoleId[] = ["supplier", "supplier_admin"];
const financeReviewRoles: RoleId[] = ["buyer", "group_manager", "finance_reviewer"];
const canGenerateOrder = computed(() => procurementRoles.includes(roleId.value) && workbench.value?.project.status === "awarded_pending_order");
const canConfirmOrder = computed(() => supplierAdminRoles.includes(roleId.value));
const canRecordReceipt = computed(() => procurementRoles.includes(roleId.value));
const canUploadSettlement = computed(() => supplierAdminRoles.includes(roleId.value) || procurementRoles.includes(roleId.value));
const canVerifySettlement = computed(() => financeReviewRoles.includes(roleId.value));
const canEvaluateSupplier = computed(() => procurementRoles.includes(roleId.value));

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

async function loadProjects() {
  const data = await apiGet<{ projects: ProjectOption[] }>("/api/projects");
  projectOptions.value = data.projects;
  if (!projectOptions.value.some((item) => item.id === selectedProjectId.value)) {
    selectedProjectId.value = projectOptions.value[0]?.id ?? "";
  }
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
  await loadProjects();
  await loadWorkbench();
});

watch(selectedProjectId, () => {
  void loadWorkbench();
});
</script>

<template>
  <section class="panel workbench">
    <div class="page-head">
      <div>
        <p class="eyebrow">履约与归档工作台</p>
        <h2>项目履约主链</h2>
      </div>
      <label>
        项目
        <select v-model="selectedProjectId">
          <option v-for="project in projectOptions" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </label>
    </div>

    <ErrorAlert v-if="errorMessage" :message="errorMessage" />
    <AuditLogRef :audit-log-id="auditLogId" />

    <div v-if="loading" class="notice">正在加载项目工作台...</div>
    <div v-else-if="!workbench" class="empty">当前角色没有可访问的履约工作台数据。</div>

    <template v-else>
      <WorkflowSurfaceSummary
        title="项目相关待办与消息"
        :business-types="['procurement_request', 'award_approval', 'settlement_bill', 'invoice', 'payment_request']"
        :project-id="workbench.project.id"
        compact
      />

      <div class="summary-grid">
        <div>
          <span>项目编号</span>
          <strong>{{ workbench.project.code }}</strong>
        </div>
        <div>
          <span>当前状态</span>
          <strong>{{ workbench.project.displayStatus }}</strong>
        </div>
        <div>
          <span>采购方式</span>
          <strong>{{ label(workbench.project.type) }}</strong>
        </div>
        <div>
          <span>报价截止</span>
          <strong>{{ formatDateTime(workbench.project.quoteDeadlineAt) }}</strong>
        </div>
      </div>

      <div class="workbench-grid">
        <section class="section-block wide">
          <h3>采购申请</h3>
          <div v-if="workbench.procurementRequest" class="info-grid">
            <span>申请部门：{{ workbench.procurementRequest.requestDepartment || "-" }}</span>
            <span>申请人：{{ workbench.procurementRequest.requesterName || "-" }}</span>
            <span>预算：{{ currency(workbench.procurementRequest.budgetAmount) }}</span>
            <span>收货地点：{{ workbench.procurementRequest.receivingLocation || "-" }}</span>
          </div>
          <table v-if="workbench.procurementRequest?.lineItems?.length">
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
        </section>

        <section class="section-block">
          <h3>供应商范围</h3>
          <div v-for="supplier in workbench.suppliers" :key="supplier.id" class="stack-item">
            <strong>{{ supplier.name }}</strong>
            <span>{{ label(supplier.admissionStatus) }} / {{ supplier.qualification }} / 评分 {{ supplier.evaluationScore ?? "-" }}</span>
            <small>{{ supplier.serviceRegions.map((item) => `${item.region}/${item.category}`).join("、") || "-" }}</small>
            <small>{{ supplier.sealSamples.map((item) => item.sampleName).join("、") || "暂无封样" }}</small>
          </div>
        </section>

        <section class="section-block">
          <h3>报价要求与答疑</h3>
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

        <section class="section-block wide">
          <h3>报价与定标</h3>
          <table>
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
          <div v-if="workbench.comparisonReport" class="decision-box">
            <strong>推荐供应商：{{ supplierName(workbench.comparisonReport.recommendedSupplierId) }}</strong>
            <span>{{ workbench.comparisonReport.awardReason }}</span>
            <span v-if="workbench.comparisonReport.nonLowestPriceReason">非最低价说明：{{ workbench.comparisonReport.nonLowestPriceReason }}</span>
          </div>
          <button v-if="['buyer', 'group_manager'].includes(roleId)" :disabled="!canGenerateOrder || Boolean(actionBusy)" @click="runGenerateOrder">生成采购订单</button>
        </section>

        <section class="section-block wide">
          <h3>采购订单与收货</h3>
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

        <section class="section-block">
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

        <section class="section-block">
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

        <section class="section-block">
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
