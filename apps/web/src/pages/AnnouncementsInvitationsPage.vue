<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { apiDelete, apiGet, apiPost } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import ProcessTimeline from "../components/ProcessTimeline.vue";
import type { ProcessBusinessType } from "../api/process";
import { useSessionStore } from "../stores/session";
import { labelStatus } from "../utils/status-labels";

interface Project {
  id: string;
  code: string;
  name: string;
  type: string;
  category?: string;
  status?: string;
  externalTradeFlag: boolean;
}

interface ProcurementDocument {
  id: string;
  projectId: string;
  title: string;
  versionNo: number;
  status: string;
  reviewStatus: string;
  lockedAt?: string | null;
}

interface Announcement {
  id: string;
  projectId: string;
  documentId: string;
  title: string;
  procurementMethod: string;
  scope: string;
  status: "draft" | "published" | "closed" | string;
  registrationDeadlineAt: string;
  quoteDeadlineAt: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

interface SupplierInvitation {
  id: string;
  projectId: string;
  announcementId: string;
  supplierId: string;
  status: string;
  notificationStatus: string;
  notifiedAt?: string | null;
  createdAt?: string;
}

interface SupplierRow {
  id: string;
  name: string;
  status?: string;
  admissionStatus?: string;
  categoryAuth?: string[];
  categoryAuthorizations?: Array<{
    category: string;
    status: string;
    expiresAt?: string;
  }>;
}

interface ActionResult {
  auditLogId?: string;
  announcement?: Announcement;
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
const registrationDeadlineAt = ref("2099-12-20T17:00");
const quoteDeadlineAt = ref("2099-12-31T17:00");
const deliveryWindow = ref("7天");
const openingLocation = ref("华东区域集采中心");
const selectedSupplierIds = ref<string[]>([]);
const closeReason = ref("公告内容有误，需要重新发布");
const auditLogId = ref("");
const error = ref("");
const busyAction = ref("");
const processRefreshKey = ref(0);
const session = useSessionStore();
const route = useRoute();

const internalProjects = computed(() => projects.value.filter((item) => !item.externalTradeFlag));
const selectedProject = computed(() => projects.value.find((item) => item.id === selectedProjectId.value));
const projectDocuments = computed(() => documents.value.filter((item) => item.projectId === selectedProjectId.value && item.status !== "voided"));
const lockedDocuments = computed(() => projectDocuments.value.filter((item) => item.status === "locked"));
const projectAnnouncements = computed(() =>
  announcements.value
    .filter((item) => item.projectId === selectedProjectId.value)
    .sort((a, b) => (b.createdAt ?? b.publishedAt ?? b.id).localeCompare(a.createdAt ?? a.publishedAt ?? a.id))
);
const selectedAnnouncement = computed(() => projectAnnouncements.value.find((item) => item.id === selectedAnnouncementId.value) ?? null);
const selectedDocument = computed(() => lockedDocuments.value.find((item) => item.id === selectedDocumentId.value) ?? null);
const projectInvitations = computed(() => invitations.value.filter((item) => item.projectId === selectedProjectId.value));
const selectedAnnouncementInvitations = computed(() =>
  selectedAnnouncementId.value ? projectInvitations.value.filter((item) => item.announcementId === selectedAnnouncementId.value) : []
);
const displayedInvitations = computed(() => (selectedAnnouncementId.value ? selectedAnnouncementInvitations.value : projectInvitations.value));
const reviewPendingDocuments = computed(() => projectDocuments.value.filter((item) => item.status === "reviewing" || item.reviewStatus === "submitted"));
const approvedUnpublishedDocuments = computed(() => projectDocuments.value.filter((item) => item.reviewStatus === "approved" && item.status !== "locked"));
const draftAnnouncements = computed(() => projectAnnouncements.value.filter((item) => item.status === "draft"));
const publishedAnnouncements = computed(() => projectAnnouncements.value.filter((item) => item.status === "published"));
const closedAnnouncements = computed(() => projectAnnouncements.value.filter((item) => item.status === "closed"));
const canMaintainSourcing = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
const canCreateAnnouncement = computed(() => Boolean(selectedProjectId.value && selectedDocumentId.value && selectedDocument.value));
const selectedSupplierCount = computed(() => selectedSupplierIds.value.length);
const selectedAnnouncementRequiresSupplier = computed(() => (selectedAnnouncement.value?.scope ?? scope.value) === "invited_suppliers");
const canPublishSelectedAnnouncement = computed(() => {
  if (!selectedAnnouncement.value || selectedAnnouncement.value.status !== "draft") return false;
  return !selectedAnnouncementRequiresSupplier.value || selectedSupplierIds.value.length > 0;
});
const canSendSelectedInvitations = computed(() => Boolean(selectedAnnouncement.value?.status === "published" && selectedSupplierIds.value.length > 0));
const canDeleteSelectedAnnouncement = computed(() => selectedAnnouncement.value?.status === "draft");
const canCloseSelectedAnnouncement = computed(() => selectedAnnouncement.value?.status === "published");
const shouldShowCloseReason = computed(() => selectedAnnouncement.value?.status === "published");
const announcementPrerequisiteMessage = computed(() => {
  if (!selectedProjectId.value) return "请先选择采购项目。";
  if (lockedDocuments.value.length) return "";
  if (!projectDocuments.value.length) return "该项目还没有采购文件。请先创建采购文件并发布锁定。";
  if (approvedUnpublishedDocuments.value.length || reviewPendingDocuments.value.length) return "采购文件尚未发布锁定。请到采购文件页点击“发布并锁定”。";
  return "采购文件尚未满足公告前置条件。请先发布并锁定采购文件。";
});
const nextActionHint = computed(() => {
  if (!selectedAnnouncement.value) return "先起草公告，公告创建后会出现在这里。";
  if (!eligibleSuppliers.value.length) return "当前项目暂无已准入且品类匹配的供应商。请先到供应商治理完成准入评审和品类授权。";
  if (selectedAnnouncement.value.status === "draft") {
    if (selectedAnnouncementRequiresSupplier.value && selectedSupplierIds.value.length === 0) return "这是一条定向邀请公告。请先选择供应商，再发布。";
    return "这条公告还是草稿。确认标题、截止时间和供应商后，点击“发布公告”。";
  }
  if (selectedAnnouncement.value.status === "published") return "公告已发布。可以补发供应商邀请；如公告内容有误且尚无供应商参与，可以关闭后重新起草。";
  if (selectedAnnouncement.value.status === "closed") return "公告已关闭，供应商端不再显示，也不能继续报名。";
  return "请根据公告状态处理下一步。";
});

const eligibleSuppliers = computed(() =>
  suppliers.value.filter((supplier) => supplierEligibleForProject(supplier, selectedProject.value))
);

function projectLabel(projectId: string) {
  const project = projects.value.find((item) => item.id === projectId);
  return project ? `${project.code} / ${project.name}` : projectId;
}

function documentLabel(documentId: string) {
  const document = documents.value.find((item) => item.id === documentId);
  return document ? `${document.title} / v${document.versionNo}` : documentId;
}

function announcementLabel(announcementId: string) {
  return announcements.value.find((item) => item.id === announcementId)?.title ?? `关联公告不可见（${announcementId}）`;
}

function announcementStatus(announcementId: string) {
  return announcements.value.find((item) => item.id === announcementId)?.status ?? "missing";
}

function supplierName(supplierId: string) {
  return suppliers.value.find((item) => item.id === supplierId)?.name ?? "供应商";
}

function supplierEligibleForProject(supplier: SupplierRow, project: Project | undefined) {
  const status = supplier.admissionStatus ?? supplier.status;
  if (status !== "admitted") return false;
  const category = project?.category;
  if (!category) return true;
  const now = Date.now();
  if (supplier.categoryAuthorizations?.length) {
    return supplier.categoryAuthorizations.some(
      (item) => item.category === category && item.status === "active" && (!item.expiresAt || new Date(item.expiresAt).getTime() >= now)
    );
  }
  return supplier.categoryAuth?.includes(category) ?? false;
}

function formatDateTime(value?: string | null) {
  return value ? value.replace("T", " ").replace(".000Z", "").slice(0, 16) : "-";
}

function statusTone(status: string) {
  if (status === "published" || status === "sent" || status === "registered") return "done";
  if (status === "draft" || status === "pending") return "pending";
  if (status === "closed" || status === "voided") return "blocked";
  return "ready";
}

function projectProcessType(projectId: string): ProcessBusinessType {
  const project = projects.value.find((item) => item.id === projectId);
  const method = `${project?.type ?? ""}`.toLowerCase();
  if (method.includes("direct") || method.includes("直接")) return "direct_purchase";
  if (method.includes("comparison") || method.includes("rfq") || method.includes("询价") || method.includes("比选")) return "rfq";
  return "tender";
}

function syncSelectedProjectDefaults() {
  const currentProject = internalProjects.value.find((item) => item.id === selectedProjectId.value);
  procurementMethod.value = currentProject?.type === "comparison" ? "comparison" : "internal_open";
  if (currentProject?.name && title.value === "内部采购公告") title.value = `${currentProject.name}采购公告`;
  selectedDocumentId.value = lockedDocuments.value.some((document) => document.id === selectedDocumentId.value) ? selectedDocumentId.value : lockedDocuments.value[0]?.id ?? "";
  selectedAnnouncementId.value = projectAnnouncements.value.some((item) => item.id === selectedAnnouncementId.value)
    ? selectedAnnouncementId.value
    : projectAnnouncements.value[0]?.id ?? "";
  selectedSupplierIds.value = [];
}

function onProjectChange() {
  syncSelectedProjectDefaults();
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
  const queryProjectId = String(route.query.projectId ?? route.query.businessId ?? "");
  if (queryProjectId && internalProjects.value.some((project) => project.id === queryProjectId)) selectedProjectId.value = queryProjectId;
  selectedProjectId.value ||= internalProjects.value[0]?.id ?? "";
  syncSelectedProjectDefaults();
}

async function run(actionName: string, action: () => Promise<ActionResult>) {
  error.value = "";
  busyAction.value = actionName;
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    selectedAnnouncementId.value = result.announcement?.id ?? selectedAnnouncementId.value;
    processRefreshKey.value += 1;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  } finally {
    busyAction.value = "";
  }
}

async function createAnnouncement() {
  if (!canCreateAnnouncement.value) {
    error.value = announcementPrerequisiteMessage.value;
    return;
  }
  await run("create", () =>
    apiPost(`/api/projects/${selectedProjectId.value}/announcements`, {
      documentId: selectedDocumentId.value,
      title: title.value,
      procurementMethod: procurementMethod.value,
      methodFields:
        procurementMethod.value === "comparison"
          ? { priceRounds: 1, deliveryWindow: deliveryWindow.value }
          : { bidBondRequired: false, openingLocation: openingLocation.value },
      scope: scope.value,
      registrationDeadlineAt: registrationDeadlineAt.value,
      quoteDeadlineAt: quoteDeadlineAt.value
    })
  );
}

async function publishAnnouncement() {
  if (!selectedAnnouncement.value) return;
  await run("publish", () =>
    apiPost(`/api/announcements/${selectedAnnouncement.value?.id}/publish`, {
      supplierIds: selectedSupplierIds.value
    })
  );
}

async function sendInvitations() {
  if (!selectedAnnouncement.value) return;
  await run("invite", () =>
    apiPost(`/api/announcements/${selectedAnnouncement.value?.id}/invitations`, {
      supplierIds: selectedSupplierIds.value
    })
  );
}

async function deleteAnnouncement() {
  if (!selectedAnnouncement.value) return;
  if (!window.confirm("确认删除这条公告草稿吗？删除后不会展示给供应商，也不会保留为已发布公告。")) return;
  const announcementId = selectedAnnouncement.value.id;
  await run("delete", () => apiDelete(`/api/announcements/${announcementId}`));
}

async function closeAnnouncement() {
  if (!selectedAnnouncement.value) return;
  const reason = closeReason.value.trim() || "采购经办关闭公告";
  await run("close", () => apiPost(`/api/announcements/${selectedAnnouncement.value?.id}/close`, { reason }));
}

onMounted(async () => {
  if (!session.user) await session.loadMe();
  await load();
});

watch(eligibleSuppliers, () => {
  const allowed = new Set(eligibleSuppliers.value.map((supplier) => supplier.id));
  selectedSupplierIds.value = selectedSupplierIds.value.filter((supplierId) => allowed.has(supplierId));
});
</script>

<template>
  <section class="panel">
    <h2>公告与邀请</h2>

    <div class="flow-guide announcement-flow-guide">
      <div class="flow-guide-head">
        <strong>操作顺序：选择项目和已锁定采购文件 → 起草公告 → 发布公告 → 发送邀请 / 供应商报名</strong>
        <span>草稿公告可以删除；已发布公告如内容有误，可在尚无供应商参与前关闭后重新起草。</span>
      </div>
      <div class="step-strip" aria-label="公告发布流程">
        <span class="step-chip done">1 采购申请已审批</span>
        <span class="step-chip done">2 项目已立项</span>
        <span :class="['step-chip', lockedDocuments.length ? 'done' : 'blocked']">3 采购文件已发布锁定</span>
        <span :class="['step-chip', projectAnnouncements.length ? 'done' : 'pending']">4 起草公告</span>
        <span :class="['step-chip', publishedAnnouncements.length ? 'done' : 'pending']">5 发布公告</span>
        <span :class="['step-chip', projectInvitations.length ? 'done' : 'pending']">6 发送邀请</span>
      </div>
    </div>

    <p v-if="!canMaintainSourcing" class="notice">当前账号仅查看公告与邀请状态；创建、发布、关闭公告和发送邀请由采购经办操作。</p>

    <div class="announcement-summary-grid">
      <div>
        <span>当前项目</span>
        <strong>{{ selectedProject ? `${selectedProject.code} / ${selectedProject.name}` : "未选择" }}</strong>
      </div>
      <div>
        <span>公告草稿</span>
        <strong>{{ draftAnnouncements.length }}</strong>
      </div>
      <div>
        <span>已发布公告</span>
        <strong>{{ publishedAnnouncements.length }}</strong>
      </div>
      <div>
        <span>已关闭公告</span>
        <strong>{{ closedAnnouncements.length }}</strong>
      </div>
    </div>

    <div class="announcement-control-grid">
      <label>
        采购项目
        <select v-model="selectedProjectId" @change="onProjectChange">
          <option v-for="project in internalProjects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <label>
        可用于公告的采购文件
        <select v-model="selectedDocumentId" :disabled="!lockedDocuments.length">
          <option v-if="!lockedDocuments.length" value="">暂无已发布并锁定的采购文件</option>
          <option v-for="document in lockedDocuments" :key="document.id" :value="document.id">{{ document.title }} / v{{ document.versionNo }}</option>
        </select>
      </label>
      <RouterLink class="secondary-button link-button" :to="{ path: '/procurement-documents', query: { projectId: selectedProjectId } }">处理采购文件</RouterLink>
    </div>

    <div v-if="canMaintainSourcing && !canCreateAnnouncement" class="warning-alert">
      <strong>暂不能创建公告：</strong>{{ announcementPrerequisiteMessage }}
      <div v-if="projectDocuments.length" class="document-status-list">
        <span v-for="document in projectDocuments" :key="document.id">
          {{ document.title }} / v{{ document.versionNo }} / {{ labelStatus(document.status) }} / {{ labelStatus(document.reviewStatus) }}
        </span>
      </div>
    </div>

    <div v-if="canMaintainSourcing" class="announcement-workbench">
      <section class="announcement-draft-section">
        <div class="section-title">
          <div>
            <p class="eyebrow">起草公告</p>
            <h3>先创建草稿，再发布</h3>
          </div>
          <span class="tag">{{ selectedDocument ? "已满足前置条件" : "等待采购文件" }}</span>
        </div>
        <div class="form-grid announcement-draft-form">
          <label>
            公告标题
            <input v-model="title" placeholder="例如：客房一次性用品采购公告" />
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
            <input v-model="registrationDeadlineAt" type="datetime-local" />
          </label>
          <label>
            报价截止
            <input v-model="quoteDeadlineAt" type="datetime-local" />
          </label>
          <label v-if="procurementMethod === 'comparison'">
            交付窗口
            <input v-model="deliveryWindow" />
          </label>
          <label v-else>
            开标地点
            <input v-model="openingLocation" />
          </label>
          <button type="button" :disabled="!canCreateAnnouncement || busyAction === 'create'" @click="createAnnouncement">
            创建公告草稿
          </button>
        </div>
      </section>

      <section class="announcement-action-section">
        <div class="section-title">
          <div>
            <p class="eyebrow">当前公告下一步</p>
            <h3>{{ selectedAnnouncement ? selectedAnnouncement.title : "未选择公告" }}</h3>
          </div>
          <span v-if="selectedAnnouncement" :class="['step-chip', statusTone(selectedAnnouncement.status)]">{{ labelStatus(selectedAnnouncement.status) }}</span>
        </div>

        <div class="announcement-current-grid">
          <label>
            选择要处理的公告
            <select v-model="selectedAnnouncementId">
              <option v-if="!projectAnnouncements.length" value="">当前项目暂无公告</option>
              <option v-for="announcement in projectAnnouncements" :key="announcement.id" :value="announcement.id">
                {{ announcement.title }} / {{ labelStatus(announcement.status) }}
              </option>
            </select>
          </label>
          <label>
            选择供应商
            <select v-model="selectedSupplierIds" multiple>
              <option v-if="!eligibleSuppliers.length" disabled value="">暂无可邀请供应商</option>
              <option v-for="supplier in eligibleSuppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option>
            </select>
          </label>
        </div>

        <div class="notice supplier-eligibility-hint">
          供应商列表只显示已通过集团准入评审、未停用受限，并且授权品类匹配当前项目的供应商。
        </div>

        <div class="notice action-hint">{{ nextActionHint }}</div>

        <div v-if="selectedAnnouncement" class="announcement-meta-grid">
          <div>
            <span>采购文件</span>
            <strong>{{ documentLabel(selectedAnnouncement.documentId) }}</strong>
          </div>
          <div>
            <span>公告范围</span>
            <strong>{{ labelStatus(selectedAnnouncement.scope) }}</strong>
          </div>
          <div>
            <span>报名截止</span>
            <strong>{{ formatDateTime(selectedAnnouncement.registrationDeadlineAt) }}</strong>
          </div>
          <div>
            <span>报价截止</span>
            <strong>{{ formatDateTime(selectedAnnouncement.quoteDeadlineAt) }}</strong>
          </div>
          <div>
            <span>已邀请供应商</span>
            <strong>{{ selectedAnnouncementInvitations.length }}</strong>
          </div>
          <div>
            <span>本次选择</span>
            <strong>{{ selectedSupplierCount }} 家</strong>
          </div>
        </div>

        <label v-if="shouldShowCloseReason" class="announcement-close-reason">
          关闭原因
          <input v-model="closeReason" placeholder="例如：公告内容有误，需要重新发布" />
        </label>

        <div v-if="selectedAnnouncement" class="announcement-action-buttons">
          <button type="button" :disabled="!canPublishSelectedAnnouncement || busyAction === 'publish'" @click="publishAnnouncement">
            发布公告<span v-if="selectedSupplierCount">并发送 {{ selectedSupplierCount }} 家邀请</span>
          </button>
          <button type="button" class="secondary-button" :disabled="!canSendSelectedInvitations || busyAction === 'invite'" @click="sendInvitations">
            补发邀请
          </button>
          <button type="button" class="secondary-button" :disabled="!canDeleteSelectedAnnouncement || busyAction === 'delete'" @click="deleteAnnouncement">
            删除草稿
          </button>
          <button type="button" class="danger-button" :disabled="!canCloseSelectedAnnouncement || busyAction === 'close'" @click="closeAnnouncement">
            关闭公告
          </button>
        </div>
      </section>
    </div>

    <section class="announcement-list-section">
      <div class="section-title">
        <div>
          <p class="eyebrow">公告状态</p>
          <h3>当前项目公告列表</h3>
        </div>
        <span class="tag">共 {{ projectAnnouncements.length }} 条</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>标题</th>
              <th>采购文件</th>
              <th>方式 / 范围</th>
              <th>状态</th>
              <th>报名截止</th>
              <th>报价截止</th>
              <th>发布状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!projectAnnouncements.length">
              <td colspan="7" class="compact-empty">当前项目还没有公告。请先在上方创建公告草稿。</td>
            </tr>
            <tr
              v-for="announcement in projectAnnouncements"
              :key="announcement.id"
              :class="{ 'selected-row': announcement.id === selectedAnnouncementId }"
              @click="selectedAnnouncementId = announcement.id"
            >
              <td>{{ announcement.title }}</td>
              <td>{{ documentLabel(announcement.documentId) }}</td>
              <td>{{ labelStatus(announcement.procurementMethod) }} / {{ labelStatus(announcement.scope) }}</td>
              <td><span :class="['step-chip', statusTone(announcement.status)]">{{ labelStatus(announcement.status) }}</span></td>
              <td>{{ formatDateTime(announcement.registrationDeadlineAt) }}</td>
              <td>{{ formatDateTime(announcement.quoteDeadlineAt) }}</td>
              <td>{{ announcement.status === "published" ? `已发布：${formatDateTime(announcement.publishedAt)}` : announcement.status === "closed" ? "已关闭" : "未发布草稿" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="process-disclosure announcement-process-section">
      <div class="process-disclosure-head">
        <div>
          <strong>采购流程轨迹</strong>
          <span>这里展示项目级招采主流程；创建、发布、邀请、关闭公告后，会在轨迹中追加对应事件。</span>
        </div>
        <span class="tag">项目级</span>
      </div>
      <ProcessTimeline
        v-if="selectedProjectId"
        :business-type="projectProcessType(selectedProjectId)"
        :business-id="selectedProjectId"
        title="项目招采流程轨迹"
        :refresh-key="processRefreshKey"
      />
    </section>

    <section class="announcement-list-section">
      <div class="section-title">
        <div>
          <p class="eyebrow">邀请明细</p>
          <h3>{{ selectedAnnouncement ? "当前公告邀请记录" : "当前项目邀请记录" }}</h3>
        </div>
        <span class="tag">共 {{ displayedInvitations.length }} 条</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>公告</th>
              <th>公告状态</th>
              <th>供应商</th>
              <th>邀请状态</th>
              <th>通知状态</th>
              <th>发送时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!displayedInvitations.length">
              <td colspan="6" class="compact-empty">暂无邀请记录。发布公告时选择供应商，或在已发布公告上补发邀请。</td>
            </tr>
            <tr v-for="invitation in displayedInvitations" :key="invitation.id">
              <td>{{ announcementLabel(invitation.announcementId) }}</td>
              <td><span :class="['step-chip', statusTone(announcementStatus(invitation.announcementId))]">{{ announcementStatus(invitation.announcementId) === "missing" ? "公告不可见" : labelStatus(announcementStatus(invitation.announcementId)) }}</span></td>
              <td>{{ supplierName(invitation.supplierId) }}</td>
              <td><span :class="['step-chip', statusTone(invitation.status)]">{{ labelStatus(invitation.status) }}</span></td>
              <td>{{ labelStatus(invitation.notificationStatus) }}</td>
              <td>{{ formatDateTime(invitation.notifiedAt ?? invitation.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
