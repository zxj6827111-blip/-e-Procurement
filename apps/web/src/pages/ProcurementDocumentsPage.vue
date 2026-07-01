<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { apiGet, apiPatch, apiPost, uploadFile, type UploadedFileMetadata } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";
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
  contentSummary: string;
  lockedAt: string | null;
  attachmentMetadata?: Attachment[];
}

type ActionResult = { auditLogId?: string; procurementDocument?: ProcurementDocument };

const route = useRoute();
const session = useSessionStore();
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
const canMaintainDocuments = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
const pendingPublicationDocuments = computed(() =>
  documents.value.filter((item) => !["locked", "voided"].includes(item.status))
);

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
  const queryProjectId = String(route.query.projectId ?? "");
  if (queryProjectId && internalProjects.value.some((project) => project.id === queryProjectId)) selectedProjectId.value = queryProjectId;
  selectedProjectId.value ||= internalProjects.value[0]?.id ?? "";
  const queryDocumentId = route.query.businessType === "procurement_document" ? String(route.query.businessId ?? "") : "";
  selectedDocumentId.value = documents.value.some((document) => document.id === queryDocumentId)
    ? queryDocumentId
    : selectedDocumentId.value || documents.value[0]?.id || "";
}

async function buildAttachments(objectId?: string) {
  if (!selectedFile.value) return [];
  const uploaded = await uploadFile(selectedFile.value, {
    attachmentKind: "procurement_document_attachment",
    objectType: "procurement_document",
    objectId: objectId || selectedDocumentId.value || `pending-document-${Date.now()}`,
    projectId: selectedProjectId.value
  });
  return [uploaded.file] satisfies UploadedFileMetadata[];
}

async function run(action: () => Promise<ActionResult>) {
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

function canPublishDocument(document: ProcurementDocument) {
  return canMaintainDocuments.value && document.status !== "locked" && document.status !== "voided";
}

function canVoidDocument(document: ProcurementDocument) {
  return canMaintainDocuments.value && document.status !== "locked" && document.status !== "voided";
}

function canReviseDocument(document: ProcurementDocument) {
  return canMaintainDocuments.value && document.status === "locked";
}

function hasAvailableAction(document: ProcurementDocument) {
  return Boolean(
    canPublishDocument(document) ||
      canVoidDocument(document) ||
      canReviseDocument(document) ||
      document.status === "locked"
  );
}

function nextStepLabel(document: ProcurementDocument) {
  if (document.status === "voided") return "已停用";
  if (document.status === "locked") return "可创建公告";
  return canMaintainDocuments.value ? "发布并锁定" : "等待采购经办发布";
}

function nextStepDetail(document: ProcurementDocument) {
  if (document.status === "voided") return "该版本已停用，不能继续用于公告。";
  if (document.status === "locked") return "公告与邀请页可以选择这份已锁定文件。";
  if (canMaintainDocuments.value) return "采购经办确认文件内容后，直接发布并锁定，随后即可创建公告。";
  return "当前账号只查看文件状态；采购文件发布锁定由采购经办处理。";
}

function nextStepTone(document: ProcurementDocument) {
  if (document.status === "locked") return "done";
  if (document.status === "voided") return "blocked";
  return canMaintainDocuments.value ? "ready" : "pending";
}

async function publishDocument(document: ProcurementDocument) {
  selectedDocumentId.value = document.id;
  selectedProjectId.value = document.projectId;
  return apiPost<ActionResult>(`/api/procurement-documents/${document.id}/publish`);
}

async function voidDocument(document: ProcurementDocument) {
  selectedDocumentId.value = document.id;
  selectedProjectId.value = document.projectId;
  return apiPost<ActionResult>(`/api/procurement-documents/${document.id}/void`, { reason: "页面停用采购文件" });
}

async function reviseDocument(document: ProcurementDocument) {
  selectedDocumentId.value = document.id;
  selectedProjectId.value = document.projectId;
  return apiPatch<ActionResult>(`/api/procurement-documents/${document.id}`, {
    title: `${document.title}（修订版）`,
    contentSummary: document.contentSummary,
    attachmentMetadata: await buildAttachments(document.id)
  });
}

onMounted(async () => {
  if (!session.user) await session.loadMe();
  await load();
});
</script>

<template>
  <section class="panel">
    <h2>采购文件管理</h2>
    <div class="flow-guide">
      <div class="flow-guide-head">
        <strong>采购文件由采购经办编制并发布锁定，公告页只允许选择已锁定文件。</strong>
        <span>集团采购管理在需求阶段完成审批；采购文件不再单独走集团审核。</span>
      </div>
      <div class="step-strip" aria-label="采购文件前置流程">
        <span class="step-chip done">1 酒店提交需求</span>
        <span class="step-chip done">2 集团审批需求</span>
        <span class="step-chip done">3 采购经办转项目</span>
        <span class="step-chip ready">4 发布锁定文件</span>
        <span class="step-chip">5 创建公告</span>
      </div>
      <div v-if="pendingPublicationDocuments.length" class="inline-link-group">
        <span class="tag">待发布锁定 {{ pendingPublicationDocuments.length }} 份</span>
      </div>
    </div>

    <p v-if="!canMaintainDocuments" class="notice">当前账号仅查看采购文件状态；创建、修订、发布锁定由采购经办操作。</p>

    <div v-if="canMaintainDocuments" class="form-grid">
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
          <th>下一步</th>
          <th>附件</th>
          <th>锁定时间</th>
          <th>操作</th>
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
            <div class="next-step">
              <span class="step-chip" :class="nextStepTone(document)">{{ nextStepLabel(document) }}</span>
              <small>{{ nextStepDetail(document) }}</small>
            </div>
          </td>
          <td>
            <AttachmentList :attachments="document.attachmentMetadata" compact />
          </td>
          <td>{{ formatDateTime(document.lockedAt) }}</td>
          <td>
            <div class="row-actions">
              <button v-if="canPublishDocument(document)" type="button" @click="run(() => publishDocument(document))">发布并锁定</button>
              <RouterLink
                v-if="document.status === 'locked'"
                class="secondary-button link-button"
                :to="{ path: '/announcements-invitations', query: { projectId: document.projectId } }"
              >
                去创建公告
              </RouterLink>
              <button v-if="canVoidDocument(document)" type="button" class="secondary-button" @click="run(() => voidDocument(document))">作废/停用</button>
              <button v-if="canReviseDocument(document)" type="button" class="secondary-button" @click="run(() => reviseDocument(document))">修订文件</button>
              <span v-if="!hasAvailableAction(document)" class="muted">无可用操作</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
