<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPatch, apiPost, uploadFile, type UploadedFileMetadata } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { formatDateTime, labelStatus } from "../utils/status-labels";

interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
  externalTradeFlag: boolean;
}

interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface ProcurementDocument {
  id: string;
  projectId: string;
  title: string;
  versionNo: number;
  status: string;
  reviewStatus: string;
  lockedAt: string | null;
  attachmentMetadata?: Attachment[];
}

const projects = ref<Project[]>([]);
const documents = ref<ProcurementDocument[]>([]);
const selectedProjectId = ref("");
const selectedDocumentId = ref("");
const title = ref("客房一次性用品采购文件");
const contentSummary = ref("供应商资格要求、报价要求、交付周期及评审规则。");
const selectedFile = ref<File | null>(null);
const selectedFileName = ref("");
const auditLogId = ref("");
const error = ref("");

const internalProjects = computed(() => projects.value.filter((item) => !item.externalTradeFlag));

function projectLabel(projectId: string) {
  const project = projects.value.find((item) => item.id === projectId);
  return project ? `${project.code} / ${project.name}` : projectId;
}


function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.[0] ?? null;
  selectedFileName.value = selectedFile.value?.name ?? "";
}

async function load() {
  const [projectData, documentData] = await Promise.all([
    apiGet<{ projects: Project[] }>("/api/projects"),
    apiGet<{ procurementDocuments: ProcurementDocument[] }>("/api/procurement-documents")
  ]);
  projects.value = projectData.projects;
  documents.value = documentData.procurementDocuments;
  selectedProjectId.value ||= internalProjects.value[0]?.id ?? "";
  selectedDocumentId.value ||= documents.value[0]?.id ?? "";
}

async function buildAttachments() {
  if (!selectedFile.value) return [];
  const uploaded = await uploadFile(selectedFile.value, {
    attachmentKind: "procurement_document_attachment",
    objectType: "procurement_document",
    objectId: selectedDocumentId.value || `pending-document-${Date.now()}`,
    projectId: selectedProjectId.value
  });
  return [uploaded.file] satisfies UploadedFileMetadata[];
}

async function run(action: () => Promise<{ auditLogId?: string; procurementDocument?: ProcurementDocument }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    selectedDocumentId.value = result.procurementDocument?.id ?? selectedDocumentId.value;
    selectedFile.value = null;
    selectedFileName.value = "";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

onMounted(load);
</script>

<template>
  <section class="panel">
    <h2>采购文件管理</h2>
    <div class="form-grid">
      <label>
        采购项目
        <select v-model="selectedProjectId">
          <option v-for="project in internalProjects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <label>
        文件名称
        <input v-model="title" />
      </label>
      <label>
        文件摘要
        <input v-model="contentSummary" />
      </label>
      <label>
        文件附件
        <input type="file" @change="onFileChange" />
      </label>
      <div class="notice">{{ selectedFileName || "未选择文件" }}</div>
      <button
        type="button"
        :disabled="!selectedProjectId"
        @click="
          run(async () =>
            apiPost(`/api/projects/${selectedProjectId}/procurement-documents`, {
              title,
              contentSummary,
              attachmentMetadata: await buildAttachments()
            })
          )
        "
      >
        创建采购文件
      </button>
    </div>

    <table>
      <thead>
        <tr>
          <th>采购项目</th>
          <th>文件名称</th>
          <th>版本</th>
          <th>文件状态</th>
          <th>审核状态</th>
          <th>附件</th>
          <th>锁定时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="document in documents" :key="document.id">
          <td>{{ projectLabel(document.projectId) }}</td>
          <td>{{ document.title }}</td>
          <td>v{{ document.versionNo }}</td>
          <td>{{ labelStatus(document.status) }}</td>
          <td>{{ labelStatus(document.reviewStatus) }}</td>
          <td>
            <AttachmentList :attachments="document.attachmentMetadata" compact />
          </td>
          <td>{{ formatDateTime(document.lockedAt) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="form-grid">
      <label>
        选择文件
        <select v-model="selectedDocumentId">
          <option v-for="document in documents" :key="document.id" :value="document.id">
            {{ document.title }} / v{{ document.versionNo }}
          </option>
        </select>
      </label>
      <button type="button" :disabled="!selectedDocumentId" @click="run(() => apiPost(`/api/procurement-documents/${selectedDocumentId}/submit-review`))">
        提交审核
      </button>
      <button type="button" :disabled="!selectedDocumentId" @click="run(() => apiPost(`/api/procurement-documents/${selectedDocumentId}/publish`))">
        发布并锁定
      </button>
      <button type="button" :disabled="!selectedDocumentId" @click="run(() => apiPost(`/api/procurement-documents/${selectedDocumentId}/void`, { reason: '页面停用采购文件' }))">
        作废/停用
      </button>
      <button
        type="button"
        :disabled="!selectedDocumentId"
        @click="
          run(async () =>
            apiPatch(`/api/procurement-documents/${selectedDocumentId}`, {
              title: `${title}（修订版）`,
              contentSummary,
              attachmentMetadata: await buildAttachments()
            })
          )
        "
      >
        修订文件
      </button>
    </div>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
