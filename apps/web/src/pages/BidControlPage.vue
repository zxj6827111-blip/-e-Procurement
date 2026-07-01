<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPost } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import ProcessTimeline from "../components/ProcessTimeline.vue";
import type { ProcessBusinessType } from "../api/process";
import { useSessionStore } from "../stores/session";
import { formatDateTime, labelStatus } from "../utils/status-labels";

interface Project {
  id: string;
  code: string;
  name: string;
  type: string;
  beforeDeadline: boolean;
  status: string;
  externalTradeFlag: boolean;
}

interface Approval {
  id: string;
  projectId: string;
  targetSupplierId: string;
  viewContent: string;
  allowDownload: boolean;
  approvalStatus: string;
}

interface SupplierRow {
  id: string;
  name: string;
}

interface BidProgress {
  id: string;
  projectId: string;
  supplierId: string;
  supplierName?: string;
  status: string;
  submittedAt: string | null;
  lockedAt: string | null;
  withdrawnAt?: string | null;
  versionNo?: number;
}

interface BidSummary {
  projectId?: string;
  beforeDeadline?: boolean;
  draftCount?: number;
  submittedCount?: number;
  lockedCount?: number;
  withdrawnCount?: number;
  effectiveSubmittedCount?: number;
  totalBidCount?: number;
  totalInvitedSuppliers?: number;
  bidProgress?: BidProgress[];
  bids?: BidProgress[];
}

const projects = ref<Project[]>([]);
const suppliers = ref<SupplierRow[]>([]);
const summary = ref<BidSummary>({});
const approvals = ref<Approval[]>([]);
const logs = ref<unknown[]>([]);
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

const viewContentLabels: Record<string, string> = {
  response_file_metadata: "响应文件元数据",
  amount: "报价金额",
  response_file_download: "响应文件下载"
};

const approvalStatusLabels: Record<string, string> = {
  draft: "草稿",
  submitted: "已提交",
  approved: "已审批",
  rejected: "已驳回",
  active: "生效中",
  expired: "已过期",
  revoked: "已撤销",
  archived: "已归档"
};

const bidResultLabels: Record<string, string> = {
  allowed: "允许查看",
  denied: "拒绝查看"
};

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
  return `查看审批 ${index + 1} / ${supplierName(approval.targetSupplierId)} / ${approvalStatusLabels[approval.approvalStatus] ?? approval.approvalStatus}`;
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
  logs.value = (await apiGet<{ bidViewLogs: unknown[] }>("/api/bid-view-logs", "u5")).bidViewLogs;
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

onMounted(() => {
  void load({ preferRoute: true });
});
watch(() => route.query.projectId, () => {
  void load({ preferRoute: true });
});
</script>

<template>
  <section class="panel">
    <h2>报价锁定与保密查看</h2>
    <div v-if="canMaintainBidControl" class="form-grid">
      <label>
        采购项目
        <select v-model="selectedProjectId" @change="onProjectChange">
          <option v-if="!projects.length" value="">暂无可监督项目</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <button type="button" :disabled="!selectedProjectId" @click="run(() => apiPost(`/api/projects/${selectedProjectId}/bids/cutoff`, { action: 'early_cutoff', reason: 'UAT flow early cutoff' }))">提前截标</button>
      <button type="button" :disabled="!selectedProjectId" @click="run(() => apiPost(`/api/projects/${selectedProjectId}/bids/lock`))">锁定报价</button>
      <span class="notice">{{ summary.beforeDeadline ? "报价期内：先提前截标，再锁定报价" : "已截标：可锁定报价、生成比价和评审" }}</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>项目</th>
          <th>是否截止前</th>
          <th>草稿数量</th>
          <th>已提交数量</th>
          <th>已锁定数量</th>
          <th>受邀/参与供应商数</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ projectLabel(summary.projectId) }}</td>
          <td>{{ summary.beforeDeadline ? "是" : "否" }}</td>
          <td>{{ summary.draftCount ?? 0 }}</td>
          <td>{{ summary.submittedCount ?? 0 }}</td>
          <td>{{ summary.lockedCount ?? 0 }}</td>
          <td>{{ summary.totalInvitedSuppliers ?? "-" }}</td>
        </tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr>
          <th>供应商</th>
          <th>报价状态</th>
          <th>提交时间</th>
          <th>锁定时间</th>
          <th>版本</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="bidProgressRows.length === 0">
          <td colspan="5">暂无报价进度记录。</td>
        </tr>
        <tr v-for="bid in bidProgressRows" :key="bid.id">
          <td>{{ bid.supplierName ?? supplierName(bid.supplierId) }}</td>
          <td>{{ labelStatus(bid.status) }}</td>
          <td>{{ formatDateTime(bid.submittedAt) }}</td>
          <td>{{ formatDateTime(bid.lockedAt) }}</td>
          <td>{{ bid.versionNo ?? "-" }}</td>
        </tr>
      </tbody>
    </table>

    <ProcessTimeline
      v-if="selectedProjectId"
      :business-type="projectProcessType(selectedProjectId)"
      :business-id="selectedProjectId"
      title="截标 / 比价流程轨迹"
      :refresh-key="processRefreshKey"
    />

    <div v-if="canMaintainBidControl" class="form-grid">
      <label>
        目标供应商
        <select v-model="targetSupplierId">
          <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option>
        </select>
      </label>
      <label>
        查看内容
        <select v-model="viewContent">
          <option value="response_file_metadata">响应文件元数据</option>
          <option value="amount">报价金额</option>
          <option value="response_file_download">响应文件下载</option>
        </select>
      </label>
      <label class="check-row">
        <input v-model="allowDownload" type="checkbox" />
        允许下载
      </label>
      <button
        type="button"
        :disabled="!selectedProjectId"
        @click="run(() => apiPost('/api/bid-view-approvals', { projectId: selectedProjectId, targetSupplierId, viewContent, allowDownload }))"
      >
        创建查看审批
      </button>
    </div>

    <div v-if="canMaintainBidControl" class="form-grid">
      <label>
        查看审批
        <select v-model="selectedApprovalId">
          <option v-for="(approval, index) in approvals" :key="approval.id" :value="approval.id">
            {{ approvalLabel(approval, index) }} / {{ viewContentLabels[approval.viewContent] ?? approval.viewContent }}
          </option>
        </select>
      </label>
      <button type="button" :disabled="!selectedApprovalId" @click="run(() => apiPost(`/api/bid-view-approvals/${selectedApprovalId}/submit`))">提交审批</button>
      <button type="button" :disabled="!selectedApprovalId" @click="run(() => apiPost(`/api/bid-view-approvals/${selectedApprovalId}/approve`, { approved: true }, 'u1'))">
        审批通过
      </button>
      <button
        type="button"
        :disabled="!selectedApprovalId"
        @click="run(() => apiPost(`/api/bid-view-approvals/${selectedApprovalId}/validate`, { supplierId: targetSupplierId, content: viewContent, download: allowDownload }))"
      >
        校验查看权限
      </button>
    </div>

    <table>
      <thead>
        <tr>
          <th>审批</th>
          <th>查看人</th>
          <th>供应商</th>
          <th>查看内容</th>
          <th>结果</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(log, index) in logs" :key="index">
          <td>{{ (log as Record<string, unknown>).approvalId ? "查看审批记录" : "-" }}</td>
          <td>{{ (log as Record<string, unknown>).actorId ? "已授权人员" : "-" }}</td>
          <td>{{ supplierName((log as Record<string, unknown>).supplierId) }}</td>
          <td>{{ viewContentLabels[String((log as Record<string, unknown>).content)] ?? (log as Record<string, unknown>).content }}</td>
          <td>{{ bidResultLabels[String((log as Record<string, unknown>).result)] ?? (log as Record<string, unknown>).result }}</td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
