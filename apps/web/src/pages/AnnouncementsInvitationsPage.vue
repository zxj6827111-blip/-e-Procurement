<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { labelStatus } from "../utils/status-labels";

interface Project {
  id: string;
  code: string;
  name: string;
  type: string;
  externalTradeFlag: boolean;
}

interface ProcurementDocument {
  id: string;
  projectId: string;
  title: string;
  versionNo: number;
  status: string;
}

interface Announcement {
  id: string;
  projectId: string;
  documentId: string;
  title: string;
  procurementMethod: string;
  scope: string;
  status: string;
  registrationDeadlineAt: string;
  quoteDeadlineAt: string;
}

interface SupplierInvitation {
  id: string;
  projectId: string;
  announcementId: string;
  supplierId: string;
  status: string;
  notificationStatus: string;
}

interface SupplierRow {
  id: string;
  name: string;
}

const projects = ref<Project[]>([]);
const documents = ref<ProcurementDocument[]>([]);
const announcements = ref<Announcement[]>([]);
const invitations = ref<SupplierInvitation[]>([]);
const suppliers = ref<SupplierRow[]>([]);
const selectedProjectId = ref("");
const selectedDocumentId = ref("");
const selectedAnnouncementId = ref("");
const title = ref("内部采购公告");
const procurementMethod = ref("internal_open");
const scope = ref("public_internal");
const registrationDeadlineAt = ref("2099-12-20T17:00:00.000Z");
const quoteDeadlineAt = ref("2099-12-31T17:00:00.000Z");
const deliveryWindow = ref("7天");
const openingLocation = ref("华东区域集采中心");
const selectedSupplierIds = ref<string[]>([]);
const auditLogId = ref("");
const error = ref("");

const internalProjects = computed(() => projects.value.filter((item) => !item.externalTradeFlag));
const lockedDocuments = computed(() => documents.value.filter((item) => item.status === "locked" && item.projectId === selectedProjectId.value));

function projectLabel(projectId: string) {
  const project = projects.value.find((item) => item.id === projectId);
  return project ? `${project.code} / ${project.name}` : projectId;
}

function announcementLabel(announcementId: string) {
  return announcements.value.find((item) => item.id === announcementId)?.title ?? announcementId;
}

function supplierName(supplierId: string) {
  return suppliers.value.find((item) => item.id === supplierId)?.name ?? "供应商";
}

function formatDateTime(value: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function invitationSupplierIds() {
  return selectedSupplierIds.value.length ? selectedSupplierIds.value : suppliers.value.slice(0, 2).map((item) => item.id);
}

async function load() {
  const [projectData, documentData, announcementData, invitationData, supplierData] = await Promise.all([
    apiGet<{ projects: Project[] }>("/api/projects"),
    apiGet<{ procurementDocuments: ProcurementDocument[] }>("/api/procurement-documents"),
    apiGet<{ announcements: Announcement[] }>("/api/announcements"),
    apiGet<{ supplierInvitations: SupplierInvitation[] }>("/api/supplier-invitations"),
    apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] }))
  ]);
  projects.value = projectData.projects;
  documents.value = documentData.procurementDocuments;
  announcements.value = announcementData.announcements;
  invitations.value = invitationData.supplierInvitations;
  suppliers.value = supplierData.suppliers;
  selectedProjectId.value ||= internalProjects.value[0]?.id ?? "";
  selectedDocumentId.value = lockedDocuments.value[0]?.id ?? selectedDocumentId.value;
  selectedAnnouncementId.value ||= announcements.value[0]?.id ?? "";
  if (!selectedSupplierIds.value.length) selectedSupplierIds.value = suppliers.value.slice(0, 2).map((item) => item.id);
  const currentProject = internalProjects.value.find((item) => item.id === selectedProjectId.value);
  procurementMethod.value = currentProject?.type === "comparison" ? "comparison" : "internal_open";
}

async function run(action: () => Promise<{ auditLogId?: string; announcement?: Announcement }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    selectedAnnouncementId.value = result.announcement?.id ?? selectedAnnouncementId.value;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

async function createAnnouncement() {
  await run(async () => {
    let documentId = selectedDocumentId.value;
    if (!documentId) {
      const created = await apiPost<{ procurementDocument: ProcurementDocument }>(`/api/projects/${selectedProjectId.value}/procurement-documents`, {
        title: `${title.value} 文件`,
        contentSummary: "自动生成的采购文件。",
        attachmentMetadata: [{ fileName: "procurement-document.pdf", sizeBytes: 128 }]
      });
      const published = await apiPost<{ procurementDocument: ProcurementDocument }>(`/api/procurement-documents/${created.procurementDocument.id}/publish`);
      documentId = published.procurementDocument.id;
    }
    return apiPost(`/api/projects/${selectedProjectId.value}/announcements`, {
      documentId,
      title: title.value,
      procurementMethod: procurementMethod.value,
      methodFields:
        procurementMethod.value === "comparison"
          ? { priceRounds: 1, deliveryWindow: deliveryWindow.value }
          : { bidBondRequired: false, openingLocation: openingLocation.value },
      scope: scope.value,
      registrationDeadlineAt: registrationDeadlineAt.value,
      quoteDeadlineAt: quoteDeadlineAt.value
    });
  });
}

onMounted(load);
</script>

<template>
  <section class="panel">
    <h2>公告与邀请</h2>

    <div class="form-grid">
      <label>
        项目
        <select v-model="selectedProjectId" @change="selectedDocumentId = lockedDocuments[0]?.id || ''">
          <option v-for="project in internalProjects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <label>
        已锁定采购文件
        <select v-model="selectedDocumentId">
          <option v-for="document in lockedDocuments" :key="document.id" :value="document.id">{{ document.title }} / v{{ document.versionNo }}</option>
        </select>
      </label>
      <label>
        公告标题
        <input v-model="title" />
      </label>
      <label>
        采购方式
        <select v-model="procurementMethod">
          <option value="internal_open">内部公开</option>
          <option value="comparison">询价/比价</option>
          <option value="selection">比选</option>
        </select>
      </label>
      <label>
        公告范围
        <select v-model="scope">
          <option value="public_internal">内部公开</option>
          <option value="invited_suppliers">定向邀请</option>
        </select>
      </label>
      <label>
        报名截止
        <input v-model="registrationDeadlineAt" />
      </label>
      <label>
        报价截止
        <input v-model="quoteDeadlineAt" />
      </label>
      <label v-if="procurementMethod === 'comparison'">
        交付窗口
        <input v-model="deliveryWindow" />
      </label>
      <label v-else>
        开标地点
        <input v-model="openingLocation" />
      </label>
      <button type="button" :disabled="!selectedProjectId" @click="createAnnouncement">
        {{ selectedDocumentId ? "创建公告" : "生成文件并创建公告" }}
      </button>
    </div>

    <table>
      <thead>
        <tr>
          <th>项目</th>
          <th>标题</th>
          <th>方式</th>
          <th>范围</th>
          <th>状态</th>
          <th>报名截止</th>
          <th>报价截止</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="announcement in announcements" :key="announcement.id">
          <td>{{ projectLabel(announcement.projectId) }}</td>
          <td>{{ announcement.title }}</td>
          <td>{{ labelStatus(announcement.procurementMethod) }}</td>
          <td>{{ labelStatus(announcement.scope) }}</td>
          <td>{{ labelStatus(announcement.status) }}</td>
          <td>{{ formatDateTime(announcement.registrationDeadlineAt) }}</td>
          <td>{{ formatDateTime(announcement.quoteDeadlineAt) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="form-grid">
      <label>
        选择公告
        <select v-model="selectedAnnouncementId">
          <option v-for="announcement in announcements" :key="announcement.id" :value="announcement.id">{{ announcement.title }}</option>
        </select>
      </label>
      <label>
        邀请供应商
        <select v-model="selectedSupplierIds" multiple>
          <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option>
        </select>
      </label>
      <button type="button" :disabled="!selectedAnnouncementId" @click="run(() => apiPost(`/api/announcements/${selectedAnnouncementId}/publish`, { supplierIds: invitationSupplierIds() }))">
        发布公告
      </button>
      <button type="button" :disabled="!selectedAnnouncementId" @click="run(() => apiPost(`/api/announcements/${selectedAnnouncementId}/invitations`, { supplierIds: invitationSupplierIds() }))">
        发送邀请
      </button>
    </div>

    <table>
      <thead>
        <tr>
          <th>公告</th>
          <th>供应商</th>
          <th>邀请状态</th>
          <th>通知状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invitation in invitations" :key="invitation.id">
          <td>{{ announcementLabel(invitation.announcementId) }}</td>
          <td>{{ supplierName(invitation.supplierId) }}</td>
          <td>{{ labelStatus(invitation.status) }}</td>
          <td>{{ labelStatus(invitation.notificationStatus) }}</td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
