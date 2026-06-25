<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiGet, apiPost, uploadFile } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import WorkflowSurfaceSummary from "../components/WorkflowSurfaceSummary.vue";
import { formatDateTime, labelAuditAction, labelObjectType, labelStatus } from "../utils/status-labels";

interface ArchiveItem {
  id: string;
  projectId: string;
  itemName: string;
  requiredFlag: boolean;
  collectedFlag: boolean;
  sealed: boolean;
  status: string;
}

interface SupplementRequest {
  id: string;
  projectId: string;
  archiveItemId: string;
  reason: string;
  approvalStatus: string;
}

interface AuditLog {
  id: string;
  action: string;
  objectType: string;
  result: string;
  createdAt: string;
}

const selectedProjectId = ref("p-food");
const selectedArchiveItemId = ref("ai-ext-result");
const selectedSupplementRequestId = ref("asr-1");
const supplementFile = ref<File | null>(null);
const supplementFileName = ref("");
const archiveItems = ref<ArchiveItem[]>([]);
const supplementRequests = ref<SupplementRequest[]>([]);
const projectAuditLogs = ref<AuditLog[]>([]);
const sensitiveLogs = ref<AuditLog[]>([]);
const auditLogId = ref("");
const error = ref("");

async function load() {
  archiveItems.value = (await apiGet<{ archiveItems: ArchiveItem[] }>(`/api/projects/${selectedProjectId.value}/archive-items`)).archiveItems;
  selectedArchiveItemId.value = archiveItems.value[0]?.id ?? selectedArchiveItemId.value;
  supplementRequests.value = (await apiGet<{ archiveSupplementRequests: SupplementRequest[] }>("/api/archive-supplement-requests")).archiveSupplementRequests;
  selectedSupplementRequestId.value = supplementRequests.value[0]?.id ?? selectedSupplementRequestId.value;
  projectAuditLogs.value = (await apiGet<{ auditLogs: AuditLog[] }>(`/api/projects/${selectedProjectId.value}/audit-trail`)).auditLogs;
  sensitiveLogs.value = (await apiGet<{ auditLogs: AuditLog[] }>("/api/sensitive-action-logs")).auditLogs;
}

function onSupplementFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  supplementFile.value = target.files?.[0] ?? null;
  supplementFileName.value = supplementFile.value?.name ?? "";
}

async function run(action: () => Promise<{ auditLogId?: string; supplementRequest?: { id: string } }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    selectedSupplementRequestId.value = result.supplementRequest?.id ?? selectedSupplementRequestId.value;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

async function applySupplement() {
  if (!selectedSupplementRequestId.value || !supplementFile.value) {
    error.value = "请选择补档申请和补档材料文件。";
    return;
  }
  await run(async () => {
    const fileResult = await uploadFile(supplementFile.value as File, {
      attachmentKind: "archive_supplement_material",
      objectType: "archive_supplement_request",
      objectId: selectedSupplementRequestId.value,
      projectId: selectedProjectId.value
    });
    const result = await apiPost<{ auditLogId?: string; supplementRequest?: { id: string } }>(`/api/archive-supplement-requests/${selectedSupplementRequestId.value}/apply`, {
      fileId: fileResult.file.id,
      fileName: fileResult.file.fileName,
      contentType: fileResult.file.contentType,
      sizeBytes: fileResult.file.sizeBytes,
      uploadedAt: fileResult.file.uploadedAt
    });
    supplementFile.value = null;
    supplementFileName.value = "";
    return { ...result, auditLogId: result.auditLogId ?? fileResult.auditLogId };
  });
}

onMounted(load);
</script>

<template>
  <section class="panel">
    <h2>项目档案与审计</h2>

    <WorkflowSurfaceSummary title="档案补档审批与消息" :business-types="['archive_supplement']" compact />

    <div class="form-grid">
      <label>
        项目编号
        <input v-model="selectedProjectId" />
      </label>
      <button type="button" @click="run(() => apiPost(`/api/projects/${selectedProjectId}/archive-snapshot`))">生成档案快照</button>
      <button type="button" @click="run(() => apiPost(`/api/projects/${selectedProjectId}/archive-check`))">完整性检查</button>
      <button type="button" @click="run(() => apiPost(`/api/projects/${selectedProjectId}/archive-seal`))">封存档案</button>
    </div>

    <div class="form-grid">
      <label>
        档案项
        <select v-model="selectedArchiveItemId">
          <option v-for="item in archiveItems" :key="item.id" :value="item.id">{{ item.itemName }}</option>
        </select>
      </label>
      <button type="button" :disabled="!selectedArchiveItemId" @click="run(() => apiPost(`/api/archive-items/${selectedArchiveItemId}/supplement-requests`, { reason: '档案材料需补充' }))">
        发起补档
      </button>
      <label>
        补档申请
        <select v-model="selectedSupplementRequestId">
          <option v-for="request in supplementRequests" :key="request.id" :value="request.id">{{ request.id }} / {{ labelStatus(request.approvalStatus) }}</option>
        </select>
      </label>
      <button type="button" :disabled="!selectedSupplementRequestId" @click="run(() => apiPost(`/api/archive-supplement-requests/${selectedSupplementRequestId}/approve`, { approved: true }))">
        批准补档
      </button>
      <label>
        补档材料
        <input type="file" @change="onSupplementFileChange" />
      </label>
      <div class="notice">{{ supplementFileName || "未选择文件" }}</div>
      <button type="button" :disabled="!selectedSupplementRequestId || !supplementFile" @click="applySupplement">
        提交补档材料
      </button>
    </div>

    <h3>档案项</h3>
    <table>
      <thead>
        <tr>
          <th>材料名称</th>
          <th>必需</th>
          <th>已收集</th>
          <th>封存</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in archiveItems" :key="item.id">
          <td>{{ item.itemName }}</td>
          <td>{{ item.requiredFlag ? "是" : "否" }}</td>
          <td>{{ item.collectedFlag ? "是" : "否" }}</td>
          <td>{{ item.sealed ? "是" : "否" }}</td>
          <td>{{ labelStatus(item.status) }}</td>
        </tr>
      </tbody>
    </table>

    <h3>补档申请</h3>
    <table>
      <thead>
        <tr>
          <th>申请编号</th>
          <th>档案项</th>
          <th>原因</th>
          <th>审批状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="request in supplementRequests" :key="request.id">
          <td>{{ request.id }}</td>
          <td>{{ request.archiveItemId }}</td>
          <td>{{ request.reason }}</td>
          <td>{{ labelStatus(request.approvalStatus) }}</td>
        </tr>
      </tbody>
    </table>

    <h3>项目审计轨迹</h3>
    <table>
      <thead>
        <tr>
          <th>动作</th>
          <th>对象</th>
          <th>结果</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in projectAuditLogs" :key="log.id">
          <td>{{ labelAuditAction(log.action) }}</td>
          <td>{{ labelObjectType(log.objectType) }}</td>
          <td>{{ labelStatus(log.result) }}</td>
          <td>{{ formatDateTime(log.createdAt) }}</td>
        </tr>
      </tbody>
    </table>

    <h3>敏感操作日志</h3>
    <table>
      <thead>
        <tr>
          <th>动作</th>
          <th>对象</th>
          <th>结果</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in sensitiveLogs" :key="log.id">
          <td>{{ labelAuditAction(log.action) }}</td>
          <td>{{ labelObjectType(log.objectType) }}</td>
          <td>{{ labelStatus(log.result) }}</td>
          <td>{{ formatDateTime(log.createdAt) }}</td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
