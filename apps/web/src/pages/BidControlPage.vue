<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiGet, apiPost } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";

interface Project {
  id: string;
  code: string;
  name: string;
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

const projects = ref<Project[]>([]);
const summary = ref<Record<string, unknown>>({});
const approvals = ref<Approval[]>([]);
const logs = ref<unknown[]>([]);
const selectedProjectId = ref("p-pre");
const targetSupplierId = ref("sup-1");
const viewContent = ref("response_file_metadata");
const allowDownload = ref(false);
const selectedApprovalId = ref("");
const auditLogId = ref("");
const error = ref("");

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

async function load() {
  const projectData = await apiGet<{ projects: Project[] }>("/api/projects");
  projects.value = projectData.projects.filter((item) => !item.externalTradeFlag);
  selectedProjectId.value ||= projects.value[0]?.id ?? "";
  if (selectedProjectId.value) {
    summary.value = await apiGet<Record<string, unknown>>(`/api/projects/${selectedProjectId.value}/bids/summary`);
  }
  approvals.value = (await apiGet<{ approvals: Approval[] }>("/api/bid-view-approvals/active")).approvals;
  logs.value = (await apiGet<{ bidViewLogs: unknown[] }>("/api/bid-view-logs", "u5")).bidViewLogs;
}

async function run(action: () => Promise<{ auditLogId?: string; approval?: Approval }>) {
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
    <h2>报价锁定与保密查看</h2>
    <div class="form-grid">
      <label>
        采购项目
        <select v-model="selectedProjectId" @change="load">
          <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <button type="button" :disabled="!selectedProjectId" @click="run(() => apiPost(`/api/projects/${selectedProjectId}/bids/lock`))">锁定报价</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>项目编号</th>
          <th>是否截止前</th>
          <th>已提交数量</th>
          <th>受邀供应商数</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ summary.projectId || "-" }}</td>
          <td>{{ summary.beforeDeadline ? "是" : "否" }}</td>
          <td>{{ summary.submittedCount ?? (Array.isArray(summary.bids) ? summary.bids.length : 0) }}</td>
          <td>{{ summary.totalInvitedSuppliers ?? "-" }}</td>
        </tr>
      </tbody>
    </table>

    <div class="form-grid">
      <label>
        目标供应商
        <input v-model="targetSupplierId" />
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

    <div class="form-grid">
      <label>
        查看审批
        <select v-model="selectedApprovalId">
          <option v-for="approval in approvals" :key="approval.id" :value="approval.id">
            {{ approval.id }} / {{ viewContentLabels[approval.viewContent] ?? approval.viewContent }} / {{ approvalStatusLabels[approval.approvalStatus] ?? approval.approvalStatus }}
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
          <th>审批单</th>
          <th>查看人</th>
          <th>供应商</th>
          <th>查看内容</th>
          <th>结果</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(log, index) in logs" :key="index">
          <td>{{ (log as Record<string, unknown>).approvalId || "-" }}</td>
          <td>{{ (log as Record<string, unknown>).actorId }}</td>
          <td>{{ (log as Record<string, unknown>).supplierId }}</td>
          <td>{{ viewContentLabels[String((log as Record<string, unknown>).content)] ?? (log as Record<string, unknown>).content }}</td>
          <td>{{ bidResultLabels[String((log as Record<string, unknown>).result)] ?? (log as Record<string, unknown>).result }}</td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
