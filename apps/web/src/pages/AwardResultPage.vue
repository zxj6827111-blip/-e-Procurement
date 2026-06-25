<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiGet, apiPost } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";

interface AwardApproval {
  id: string;
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
  supplierId?: string;
  status: string;
  selected?: boolean;
  visibilityConfig: string;
  contentSummary: string;
  sentAt: string | null;
}

interface PublicityRecord {
  id: string;
  status: string;
  contentSummary: string;
  publishedAt: string | null;
}

const selectedProjectId = ref("p-award");
const selectedSupplierId = ref("sup-1");
const nonLowestPriceReason = ref("服务方案与技术评分综合领先");
const approvals = ref<AwardApproval[]>([]);
const selectedApprovalId = ref("");
const recommendation = ref<AwardRecommendation>({});
const notifications = ref<ResultNotification[]>([]);
const publicityRecords = ref<PublicityRecord[]>([]);
const supplierResults = ref<ResultNotification[]>([]);
const auditLogId = ref("");
const error = ref("");
const session = useSessionStore();

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

function formatDateTime(value: string | null) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

async function load() {
  recommendation.value = (await apiGet<{ recommendation: AwardRecommendation }>(`/api/projects/${selectedProjectId.value}/award-recommendation`)).recommendation;
  approvals.value = (await apiGet<{ approvals: AwardApproval[] }>(`/api/projects/${selectedProjectId.value}/award-approvals`)).approvals;
  selectedApprovalId.value ||= approvals.value[0]?.id ?? "";
  notifications.value = (await apiGet<{ notifications: ResultNotification[] }>(`/api/projects/${selectedProjectId.value}/result-notifications`)).notifications;
  publicityRecords.value = (await apiGet<{ publicityRecords: PublicityRecord[] }>(`/api/projects/${selectedProjectId.value}/internal-publicity`)).publicityRecords;
  supplierResults.value = session.roleId === "supplier" ? (await apiGet<{ notifications: ResultNotification[] }>(`/api/projects/${selectedProjectId.value}/result-notifications`)).notifications : [];
}

async function run(action: () => Promise<{ auditLogId?: string; approval?: AwardApproval }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    selectedApprovalId.value = result.approval?.id ?? selectedApprovalId.value;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

onMounted(load);
</script>

<template>
  <section class="panel">
    <h2>定标审批与结果通知</h2>

    <table>
      <thead>
        <tr>
          <th>推荐供应商</th>
          <th>推荐供应商编号</th>
          <th>是否最低价</th>
          <th>来源评审报告</th>
          <th>候选供应商</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ recommendation.recommendedSupplierName || "-" }}</td>
          <td>{{ recommendation.recommendedSupplierId || "-" }}</td>
          <td>{{ recommendation.isLowestPrice ? "是" : "否" }}</td>
          <td>{{ recommendation.sourceReportId || "待冻结评审报告" }}</td>
          <td>{{ recommendation.candidateSupplierIds?.join("、") || "-" }}</td>
        </tr>
      </tbody>
    </table>

    <div class="form-grid">
      <label>
        项目
        <input v-model="selectedProjectId" />
      </label>
      <label>
        拟定标供应商
        <input v-model="selectedSupplierId" />
      </label>
      <label>
        非最低价理由
        <input v-model="nonLowestPriceReason" />
      </label>
      <button
        type="button"
        @click="run(() => apiPost(`/api/projects/${selectedProjectId}/award-approvals`, { selectedSupplierId, nonLowestPriceReason }))"
      >
        创建定标审批
      </button>
    </div>

    <div class="form-grid">
      <label>
        审批单
        <select v-model="selectedApprovalId">
          <option v-for="approval in approvals" :key="approval.id" :value="approval.id">{{ approval.id }} / {{ approvalStatusLabels[approval.approvalStatus] ?? approval.approvalStatus }}</option>
        </select>
      </label>
      <button type="button" :disabled="!selectedApprovalId" @click="run(() => apiPost(`/api/award-approvals/${selectedApprovalId}/submit`))">提交审批</button>
      <button type="button" :disabled="!selectedApprovalId" @click="run(() => apiPost(`/api/award-approvals/${selectedApprovalId}/mock-approve`, { approved: true }))">
        审批通过
      </button>
      <button type="button" @click="run(() => apiPost(`/api/projects/${selectedProjectId}/result-notifications`, { visibilityConfig: 'supplier_self_only' }))">发送结果通知</button>
      <button type="button" @click="run(() => apiPost(`/api/projects/${selectedProjectId}/internal-publicity`, { contentSummary: '内部公示记录' }))">发布内部公示</button>
    </div>

    <h3>审批记录</h3>
    <table>
      <thead>
        <tr>
          <th>审批单</th>
          <th>定标供应商</th>
          <th>最低价</th>
          <th>状态</th>
          <th>非最低价理由</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="approval in approvals" :key="approval.id">
          <td>{{ approval.id }}</td>
          <td>{{ approval.selectedSupplierId }}</td>
          <td>{{ approval.isLowestPrice ? "是" : "否" }}</td>
          <td>{{ approvalStatusLabels[approval.approvalStatus] ?? approval.approvalStatus }}</td>
          <td>{{ approval.nonLowestPriceReason || "-" }}</td>
        </tr>
      </tbody>
    </table>

    <h3>结果通知</h3>
    <table>
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
        <tr v-for="notification in notifications" :key="notification.id">
          <td>{{ notification.id }}</td>
          <td>{{ notification.supplierId || "-" }}</td>
          <td>{{ notificationStatusLabels[notification.status] ?? notification.status }}</td>
          <td>{{ visibilityLabels[notification.visibilityConfig] ?? notification.visibilityConfig }}</td>
          <td>{{ formatDateTime(notification.sentAt) }}</td>
        </tr>
      </tbody>
    </table>

    <h3>供应商可见结果</h3>
    <table>
      <thead>
        <tr>
          <th>通知编号</th>
          <th>是否中选</th>
          <th>内容摘要</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="result in supplierResults" :key="result.id">
          <td>{{ result.id }}</td>
          <td>{{ result.selected ? "中选" : "未中选" }}</td>
          <td>{{ result.contentSummary }}</td>
        </tr>
      </tbody>
    </table>

    <h3>内部公示</h3>
    <table>
      <thead>
        <tr>
          <th>公示编号</th>
          <th>状态</th>
          <th>内容摘要</th>
          <th>发布时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="record in publicityRecords" :key="record.id">
          <td>{{ record.id }}</td>
          <td>{{ record.status === "published" ? "已发布" : record.status }}</td>
          <td>{{ record.contentSummary }}</td>
          <td>{{ formatDateTime(record.publishedAt) }}</td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
