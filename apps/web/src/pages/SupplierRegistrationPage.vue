<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPost, uploadFile } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import WorkflowSurfaceSummary from "../components/WorkflowSurfaceSummary.vue";
import { useSessionStore } from "../stores/session";
import { businessRecordLabel, isTestLikeText } from "../utils/business-display";
import { formatDateTime } from "../utils/status-labels";

interface Announcement {
  id: string;
  projectId: string;
  title: string;
  status: string;
  registrationDeadlineAt: string;
}

interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface Registration {
  id: string;
  projectId: string;
  announcementId: string;
  supplierId: string;
  status: string;
  submittedAt: string;
  qualifiedAt?: string;
  qualificationReason?: string;
  materialMetadata?: Attachment[];
  supplementMaterialMetadata?: Attachment[];
}

interface SupplierProfile {
  id: string;
  name?: string;
  admissionStatus?: string;
  status: string;
  restrictionReason?: string;
  categoryAuth?: string[];
  categoryAuthorizations?: SupplierCategoryAuthorization[];
}

interface SupplierCategoryAuthorization {
  category: string;
  status: string;
  expiresAt?: string;
}

interface ProjectRow {
  id: string;
  code?: string;
  name?: string;
  category?: string;
}

interface SupplierRow {
  id: string;
  name: string;
}

const announcements = ref<Announcement[]>([]);
const registrations = ref<Registration[]>([]);
const currentSupplier = ref<SupplierProfile | null>(null);
const projects = ref<ProjectRow[]>([]);
const suppliers = ref<SupplierRow[]>([]);
const selectedAnnouncementId = ref("");
const materialFile = ref<File | null>(null);
const materialName = ref("");
const supplementFile = ref<File | null>(null);
const supplementName = ref("");
const auditLogId = ref("");
const error = ref("");
const busy = ref(false);
const session = useSessionStore();
const route = useRoute();
const supplierRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
const supplierQuotationRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
const procurementReviewRoles = new Set(["buyer", "platform_operator"]);
const registrationEntryHint = "报名资料是供应商参与采购的第一步：先选择已发布公告并提交报名材料，资格通过后再到“报价响应”提交报价或响应文件。";
const reviewEntryHint = "这里是采购经办人的报名资格审核页。供应商提交报名材料后，经办人在此核验资料；只有资格通过的供应商才能进入报价响应。";
const isSupplierView = computed(() => supplierRoles.has(session.roleId));
const canReviewRegistration = computed(() => procurementReviewRoles.has(session.roleId));
const canSubmitRegistration = computed(() => supplierQuotationRoles.has(session.roleId));
const selectedProjectId = computed(() => String(route.query.projectId ?? ""));
const pageTitle = computed(() => (canReviewRegistration.value ? "报名资格审核" : "供应商报名"));
const pageHint = computed(() => (canReviewRegistration.value ? reviewEntryHint : registrationEntryHint));
const visibleAnnouncements = computed(() => announcements.value.filter((announcement) => !isTestAnnouncement(announcement)));
const visibleRegistrations = computed(() =>
  registrations.value.filter((registration) => {
    const announcement = announcements.value.find((item) => item.id === registration.announcementId);
    const project = projects.value.find((item) => item.id === registration.projectId);
    return !isTestLikeText(announcement?.title) && !isTestLikeText(project?.name) && !isTestLikeText(project?.code);
  })
);
const projectFilteredAnnouncements = computed(() =>
  visibleAnnouncements.value.filter((announcement) => !selectedProjectId.value || announcement.projectId === selectedProjectId.value)
);
const projectFilteredRegistrations = computed(() =>
  visibleRegistrations.value.filter((registration) => !selectedProjectId.value || registration.projectId === selectedProjectId.value)
);
const pendingReviewCount = computed(() => projectFilteredRegistrations.value.filter((item) => item.status === "submitted").length);
const qualifiedCount = computed(() => projectFilteredRegistrations.value.filter((item) => item.status === "qualified").length);
const rejectedCount = computed(() => projectFilteredRegistrations.value.filter((item) => item.status === "rejected").length);
const restrictedMessage = computed(() => {
  if (!currentSupplier.value || currentSupplier.value.admissionStatus !== "restricted") return "";
  return `当前供应商已列入限制名单，不能继续参与报名。${currentSupplier.value.restrictionReason ? `原因：${currentSupplier.value.restrictionReason}` : ""}`;
});
const emptyAnnouncementHint = computed(() => {
  if (projectFilteredAnnouncements.value.length > 0) return "";
  if (selectedProjectId.value) return "当前项目暂无可报名公告。采购方需要先在“公告与邀请”发布公告，并将范围设为公开或邀请当前供应商。";
  return "暂无可报名公告。采购文件不会直接显示在供应商报名页；采购方需要先在“公告与邀请”发布公告，并将范围设为公开或邀请当前供应商，公告才会出现在这里。";
});
const selectedAnnouncement = computed(() => announcements.value.find((item) => item.id === selectedAnnouncementId.value) ?? null);
const selectedProject = computed(() => projects.value.find((item) => item.id === selectedAnnouncement.value?.projectId) ?? null);
const supplierAuthorizedCategories = computed(() => {
  const supplier = currentSupplier.value;
  if (!supplier) return [];
  if (!supplier.categoryAuthorizations) return supplier.categoryAuth ?? [];

  const now = Date.now();
  return supplier.categoryAuthorizations
    .filter((item) => {
      const expiresAt = item.expiresAt ? new Date(item.expiresAt).getTime() : undefined;
      return item.status === "active" && (expiresAt === undefined || (Number.isFinite(expiresAt) && expiresAt >= now));
    })
    .map((item) => item.category)
    .filter(Boolean);
});
const categoryMismatchMessage = computed(() => {
  const category = selectedProject.value?.category?.trim();
  if (!supplierRoles.has(session.roleId) || !currentSupplier.value || !category) return "";
  if (supplierAuthorizedCategories.value.includes(category)) return "";
  const authorizedText = supplierAuthorizedCategories.value.length ? supplierAuthorizedCategories.value.join("、") : "暂无有效品类授权";
  return `当前项目采购品类为“${category}”，当前供应商有效授权品类为“${authorizedText}”，暂不能报名。请联系采购方在供应商档案中补充该品类授权。`;
});

const registrationStatusLabels: Record<string, string> = {
  submitted: "已提交",
  qualified: "资格通过",
  rejected: "资格未通过"
};

function announcementTitle(announcementId: string) {
  return businessRecordLabel(announcements.value.find((item) => item.id === announcementId)?.title ?? announcementId, "采购公告");
}

function projectLabel(projectId: string) {
  const project = projects.value.find((item) => item.id === projectId);
  if (!project || isTestLikeText(project.name) || isTestLikeText(project.code)) return "采购项目";
  return [project.code, project.name].filter(Boolean).join(" / ") || "采购项目";
}

function supplierName(supplierId: string) {
  return suppliers.value.find((item) => item.id === supplierId)?.name ?? currentSupplier.value?.name ?? "供应商";
}

function isTestAnnouncement(announcement: Announcement) {
  const project = projects.value.find((item) => item.id === announcement.projectId);
  return isTestLikeText(announcement.title) || isTestLikeText(project?.name) || isTestLikeText(project?.code);
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  materialFile.value = target.files?.[0] ?? null;
  materialName.value = materialFile.value?.name ?? "";
}

function onSupplementFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  supplementFile.value = target.files?.[0] ?? null;
  supplementName.value = supplementFile.value?.name ?? "";
}

async function load() {
  const [announcementData, registrationData, projectData, supplierData] = await Promise.all([
    apiGet<{ announcements: Announcement[] }>("/api/announcements"),
    apiGet<{ registrations: Registration[] }>("/api/registrations"),
    apiGet<{ projects: ProjectRow[] }>("/api/projects").catch(() => ({ projects: [] })),
    apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] }))
  ]);
  announcements.value = announcementData.announcements;
  registrations.value = registrationData.registrations;
  projects.value = projectData.projects;
  suppliers.value = supplierData.suppliers;
  selectedAnnouncementId.value = projectFilteredAnnouncements.value.some((item) => item.id === selectedAnnouncementId.value)
    ? selectedAnnouncementId.value
    : projectFilteredAnnouncements.value[0]?.id ?? "";
  if (supplierRoles.has(session.roleId) && session.user?.supplierId) {
    const supplierData = await apiGet<{ supplier: SupplierProfile }>(`/api/suppliers/${session.user.supplierId}`);
    currentSupplier.value = supplierData.supplier;
  } else {
    currentSupplier.value = null;
  }
}

async function reviewRegistration(registrationId: string, status: "qualified" | "rejected") {
  error.value = "";
  busy.value = true;
  try {
    const result = await apiPost<{ registration: Registration; auditLogId: string }>(`/api/registrations/${registrationId}/qualify`, {
      status,
      reason: status === "qualified" ? "报名材料符合当前项目要求。" : "报名材料不符合当前项目要求，请供应商补正后再参与。"
    });
    auditLogId.value = result.auditLogId;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "审核失败";
  } finally {
    busy.value = false;
  }
}

async function submitRegistration() {
  if (restrictedMessage.value) {
    error.value = restrictedMessage.value;
    return;
  }
  if (categoryMismatchMessage.value) {
    error.value = categoryMismatchMessage.value;
    return;
  }
  if (!selectedAnnouncementId.value || !materialFile.value) {
    error.value = "请选择公告并上传报名资料。";
    return;
  }

  error.value = "";
  busy.value = true;
  try {
    const filePayload = await uploadFile(materialFile.value, {
      attachmentKind: "registration_material",
      objectType: "supplier_registration",
      objectId: selectedAnnouncementId.value,
      projectId: announcements.value.find((item) => item.id === selectedAnnouncementId.value)?.projectId,
      supplierId: session.user?.supplierId
    });
    const supplementPayload = supplementFile.value
      ? await uploadFile(supplementFile.value, {
          attachmentKind: "registration_supplement_material",
          objectType: "supplier_registration",
          objectId: selectedAnnouncementId.value,
          projectId: announcements.value.find((item) => item.id === selectedAnnouncementId.value)?.projectId,
          supplierId: session.user?.supplierId
        })
      : null;
    const result = await apiPost<{ registration: Registration; auditLogId: string }>(`/api/announcements/${selectedAnnouncementId.value}/registrations`, {
      materialMetadata: [filePayload.file],
      supplementMaterialMetadata: supplementPayload ? [supplementPayload.file] : []
    });
    auditLogId.value = result.auditLogId;
    materialFile.value = null;
    materialName.value = "";
    supplementFile.value = null;
    supplementName.value = "";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (!session.user) await session.loadMe();
  await load();
});
</script>

<template>
  <section class="panel">
    <h2>{{ pageTitle }}</h2>
    <p class="notice">{{ pageHint }}</p>

    <WorkflowSurfaceSummary
      v-if="isSupplierView"
      title="供应商补充材料、退货与结算消息"
      :business-types="['return_request', 'settlement_bill', 'invoice', 'payment_request']"
      compact
    />

    <div v-if="canReviewRegistration" class="summary-grid registration-review-summary">
      <span>待审核：{{ pendingReviewCount }} 家</span>
      <span>资格通过：{{ qualifiedCount }} 家</span>
      <span>未通过：{{ rejectedCount }} 家</span>
    </div>

    <div v-if="isSupplierView" class="form-grid">
      <label>
        可报名公告
        <select v-model="selectedAnnouncementId">
          <option v-if="!projectFilteredAnnouncements.length" value="">暂无可报名公告</option>
          <option v-for="announcement in projectFilteredAnnouncements" :key="announcement.id" :value="announcement.id">
            {{ announcement.title }} / {{ projectLabel(announcement.projectId) }}
          </option>
        </select>
      </label>

      <label>
        报名资料文件
        <input type="file" @change="onFileChange" />
      </label>

      <label>
        资格补充材料
        <input type="file" @change="onSupplementFileChange" />
      </label>

      <div class="notice">{{ materialName || "未选择报名资料" }}</div>
      <div class="notice">{{ supplementName || "未选择补充材料" }}</div>

      <button type="button" :disabled="!selectedAnnouncementId || !canSubmitRegistration || !materialFile || Boolean(restrictedMessage) || Boolean(categoryMismatchMessage) || busy" @click="submitRegistration">
        提交报名
      </button>
    </div>

    <p v-if="emptyAnnouncementHint" class="notice">{{ emptyAnnouncementHint }}</p>
    <p v-if="restrictedMessage" class="inline-error">{{ restrictedMessage }}</p>
    <p v-if="categoryMismatchMessage" class="inline-error">{{ categoryMismatchMessage }}</p>
    <p v-if="!isSupplierView && !canReviewRegistration" class="muted">当前角色仅可查看报名记录。</p>

    <table>
      <thead>
        <tr>
          <th>公告</th>
          <th>项目</th>
          <th>供应商</th>
          <th>报名状态</th>
          <th>资料</th>
          <th>提交时间</th>
          <th v-if="canReviewRegistration">审核</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="registration in projectFilteredRegistrations" :key="registration.id">
          <td>{{ announcementTitle(registration.announcementId) }}</td>
          <td>{{ projectLabel(registration.projectId) }}</td>
          <td>{{ supplierName(registration.supplierId) }}</td>
          <td>{{ registrationStatusLabels[registration.status] ?? registration.status }}</td>
          <td>
            <AttachmentList :attachments="registration.materialMetadata" compact />
            <AttachmentList v-if="registration.supplementMaterialMetadata?.length" :attachments="registration.supplementMaterialMetadata" prefix="补充" compact />
            <span v-if="!registration.materialMetadata?.length && !registration.supplementMaterialMetadata?.length">-</span>
          </td>
          <td>{{ formatDateTime(registration.submittedAt) }}</td>
          <td v-if="canReviewRegistration">
            <div v-if="registration.status === 'submitted'" class="actions">
              <button type="button" :disabled="busy" @click="reviewRegistration(registration.id, 'qualified')">资格通过</button>
              <button type="button" class="secondary-button" :disabled="busy" @click="reviewRegistration(registration.id, 'rejected')">不通过</button>
            </div>
            <span v-else class="muted">
              {{ registration.qualificationReason || "已处理" }}
            </span>
          </td>
        </tr>
        <tr v-if="projectFilteredRegistrations.length === 0">
          <td :colspan="canReviewRegistration ? 7 : 6" class="muted">暂无报名记录。</td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
