<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiDelete, apiGet, apiPost, uploadFile, type UploadedFileMetadata } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";
import { labelStatus } from "../utils/status-labels";

interface Attachment {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt: string;
}

interface ProcurementRequestLineItem {
  id: string;
  itemName: string;
  category?: string;
  specification: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice?: number;
  budgetAmount?: number;
  requiredByDate?: string;
  remark?: string;
}

interface ProcurementRequest {
  id: string;
  code?: string;
  title: string;
  orgId: string;
  category?: string;
  status?: string;
  approvalStatus: string;
  methodSuggestion: string;
  externalTradeFlag: boolean;
  projectId: string | null;
  requestDepartment?: string;
  requesterName?: string;
  budgetAmount?: number;
  purpose?: string;
  expectedArrivalAt?: string;
  receivingLocation?: string;
  lineItems?: ProcurementRequestLineItem[];
  attachments?: Attachment[];
}

interface MethodRule {
  id: string;
  ruleName: string;
  resultMethod: string;
}

const session = useSessionStore();
const requests = ref<ProcurementRequest[]>([]);
const rules = ref<MethodRule[]>([]);
const selectedRequestId = ref("");
const selectedRuleId = ref("");
const attachmentFile = ref<File | null>(null);
const attachmentFileName = ref("");
const auditLogId = ref("");
const error = ref("");

const title = ref("采购申请");
const category = ref("客房一次性用品");
const requestDepartment = ref("客房部");
const requesterName = ref("刘明");
const budgetAmount = ref<number | null>(200000);
const purpose = ref("用于门店运营物资采购");
const expectedArrivalAt = ref("2026-07-10");
const receivingLocation = ref("上海滨江华丽酒店后勤仓");
const externalTradeFlag = ref(false);

const lineItemName = ref("环保牙具套装");
const lineItemCategory = ref("客房一次性用品");
const lineItemSpec = ref("竹柄");
const lineItemQuantity = ref(500);
const lineItemUnit = ref("套");
const lineItemEstimatedUnitPrice = ref<number | null>(7.2);
const lineItemBudgetAmount = ref<number | null>(3600);
const lineItemRequiredByDate = ref("2026-07-10");
const lineItemRemark = ref("首批采购");

const canMaintain = computed(() => ["buyer", "group_manager"].includes(session.roleId));
const activeRequests = computed(() => requests.value.filter((item) => item.status !== "cancelled"));


function onAttachmentChange(event: Event) {
  const target = event.target as HTMLInputElement;
  attachmentFile.value = target.files?.[0] ?? null;
  attachmentFileName.value = attachmentFile.value?.name ?? "";
}

async function buildAttachments() {
  if (!attachmentFile.value) return [];
  const suffix = `${Date.now()}`;
  const uploaded = await uploadFile(attachmentFile.value, {
    attachmentKind: "procurement_request_attachment",
    objectType: "procurement_request",
    objectId: `pending-request-${suffix}`
  });
  return [uploaded.file] satisfies UploadedFileMetadata[];
}

function buildLineItems() {
  return [
    {
      itemName: lineItemName.value,
      category: lineItemCategory.value,
      specification: lineItemSpec.value,
      quantity: lineItemQuantity.value,
      unit: lineItemUnit.value,
      estimatedUnitPrice: lineItemEstimatedUnitPrice.value ?? undefined,
      budgetAmount: lineItemBudgetAmount.value ?? undefined,
      requiredByDate: lineItemRequiredByDate.value,
      remark: lineItemRemark.value
    }
  ];
}

async function load() {
  const [requestData, ruleData] = await Promise.all([
    apiGet<{ procurementRequests: ProcurementRequest[] }>("/api/procurement-requests"),
    apiGet<{ procurementMethodRules: MethodRule[] }>("/api/procurement-method-rules")
  ]);
  requests.value = requestData.procurementRequests;
  rules.value = ruleData.procurementMethodRules;
  if (!activeRequests.value.some((item) => item.id === selectedRequestId.value)) {
    selectedRequestId.value = activeRequests.value[0]?.id ?? "";
  }
  selectedRuleId.value ||= rules.value[0]?.id ?? "";
}

async function run(action: () => Promise<{ auditLogId?: string }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

async function createRequest() {
  await run(async () =>
    apiPost("/api/procurement-requests", {
      title: title.value,
      orgId: "org-hotel",
      category: category.value,
      requestDepartment: requestDepartment.value,
      requesterName: requesterName.value,
      budgetLabel: "按酒店制度执行",
      budgetAmount: budgetAmount.value ?? undefined,
      purpose: purpose.value,
      expectedArrivalAt: expectedArrivalAt.value,
      receivingLocation: receivingLocation.value,
      externalTradeFlag: externalTradeFlag.value,
      lineItems: buildLineItems(),
      attachments: await buildAttachments()
    })
  );
  attachmentFile.value = null;
  attachmentFileName.value = "";
}

onMounted(async () => {
  await session.loadMe(session.user?.id);
  await load();
});
</script>

<template>
  <section class="panel">
    <h2>采购申请</h2>

    <div v-if="canMaintain" class="form-grid">
      <label>
        申请标题
        <input v-model="title" />
      </label>
      <label>
        使用部门
        <input v-model="requestDepartment" />
      </label>
      <label>
        申请人
        <input v-model="requesterName" />
      </label>
      <label>
        采购品类
        <input v-model="category" />
      </label>
      <label>
        预算金额
        <input v-model.number="budgetAmount" type="number" />
      </label>
      <label>
        需求用途
        <input v-model="purpose" />
      </label>
      <label>
        需求日期
        <input v-model="expectedArrivalAt" type="date" />
      </label>
      <label>
        收货地点
        <input v-model="receivingLocation" />
      </label>
      <label class="check-row">
        <input v-model="externalTradeFlag" type="checkbox" />
        外部交易备案路径
      </label>
    </div>

    <div v-if="canMaintain" class="form-grid">
      <label>
        明细名称
        <input v-model="lineItemName" />
      </label>
      <label>
        明细品类
        <input v-model="lineItemCategory" />
      </label>
      <label>
        规格
        <input v-model="lineItemSpec" />
      </label>
      <label>
        数量
        <input v-model.number="lineItemQuantity" type="number" />
      </label>
      <label>
        单位
        <input v-model="lineItemUnit" />
      </label>
      <label>
        预估单价
        <input v-model.number="lineItemEstimatedUnitPrice" type="number" step="0.01" />
      </label>
      <label>
        行预算
        <input v-model.number="lineItemBudgetAmount" type="number" />
      </label>
      <label>
        行需求日期
        <input v-model="lineItemRequiredByDate" type="date" />
      </label>
      <label>
        备注
        <input v-model="lineItemRemark" />
      </label>
    </div>

    <div v-if="canMaintain" class="form-grid">
      <label>
        申请附件
        <input type="file" @change="onAttachmentChange" />
      </label>
      <div class="notice">{{ attachmentFileName || "未选择文件" }}</div>
      <button type="button" @click="createRequest">创建采购申请</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>编号</th>
          <th>标题</th>
          <th>部门 / 申请人</th>
          <th>状态</th>
          <th>审批</th>
          <th>方式</th>
          <th>预算</th>
          <th>附件</th>
          <th>项目</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in requests" :key="item.id">
          <td>{{ item.code || item.id }}</td>
          <td>{{ item.title }}</td>
          <td>{{ item.requestDepartment || "-" }} / {{ item.requesterName || "-" }}</td>
          <td>{{ labelStatus(item.status || "draft") }}</td>
          <td>{{ labelStatus(item.approvalStatus) }}</td>
          <td>{{ item.methodSuggestion }}</td>
          <td>{{ item.budgetAmount ?? "-" }}</td>
          <td>
            <AttachmentList :attachments="item.attachments" compact />
          </td>
          <td>{{ item.projectId || "-" }}</td>
          <td>
            <button v-if="item.status === 'draft' && canMaintain" type="button" @click="run(() => apiDelete(`/api/procurement-requests/${item.id}`))">删除</button>
            <button
              v-else-if="item.status !== 'project_created' && item.status !== 'cancelled' && canMaintain"
              type="button"
              @click="run(() => apiPost(`/api/procurement-requests/${item.id}/cancel`, { reason: '页面撤销采购申请' }))"
            >
              取消
            </button>
            <span v-else class="notice">已锁定</span>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="canMaintain" class="form-grid">
      <label>
        当前申请
        <select v-model="selectedRequestId">
          <option v-for="item in activeRequests" :key="item.id" :value="item.id">{{ item.title }} / {{ labelStatus(item.approvalStatus) }}</option>
        </select>
      </label>
      <button type="button" :disabled="!selectedRequestId" @click="run(() => apiPost(`/api/procurement-requests/${selectedRequestId}/submit`))">提交审批</button>
      <button type="button" :disabled="!selectedRequestId" @click="run(() => apiPost(`/api/procurement-requests/${selectedRequestId}/approve`, { approved: true, opinion: '页面审批通过' }))">
        审批通过
      </button>
      <button type="button" :disabled="!selectedRequestId" @click="run(() => apiPost(`/api/procurement-requests/${selectedRequestId}/approve`, { approved: false, opinion: '页面审批驳回' }))">
        审批驳回
      </button>
      <label>
        采购方式规则
        <select v-model="selectedRuleId">
          <option v-for="rule in rules" :key="rule.id" :value="rule.id">{{ rule.ruleName || rule.resultMethod }}</option>
        </select>
      </label>
      <button
        type="button"
        :disabled="!selectedRequestId || !selectedRuleId"
        @click="run(() => apiPost(`/api/procurement-requests/${selectedRequestId}/method-decision`, { ruleId: selectedRuleId, externalTradeFlag }))"
      >
        方式判定
      </button>
    </div>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
