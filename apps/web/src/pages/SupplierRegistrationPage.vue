<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost, uploadFile } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import WorkflowSurfaceSummary from "../components/WorkflowSurfaceSummary.vue";
import { useSessionStore } from "../stores/session";
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
  materialMetadata?: Attachment[];
  supplementMaterialMetadata?: Attachment[];
}

interface SupplierProfile {
  id: string;
  admissionStatus?: string;
  status: string;
  restrictionReason?: string;
}

const announcements = ref<Announcement[]>([]);
const registrations = ref<Registration[]>([]);
const currentSupplier = ref<SupplierProfile | null>(null);
const selectedAnnouncementId = ref("");
const materialFile = ref<File | null>(null);
const materialName = ref("");
const supplementFile = ref<File | null>(null);
const supplementName = ref("");
const auditLogId = ref("");
const error = ref("");
const busy = ref(false);
const session = useSessionStore();
const supplierRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
const supplierQuotationRoles = new Set(["supplier", "supplier_quotation"]);
const canSubmitRegistration = computed(() => supplierQuotationRoles.has(session.roleId));
const restrictedMessage = computed(() => {
  if (!currentSupplier.value || currentSupplier.value.admissionStatus !== "restricted") return "";
  return `当前供应商已列入限制名单，不能继续参与报名。${currentSupplier.value.restrictionReason ? `原因：${currentSupplier.value.restrictionReason}` : ""}`;
});

const registrationStatusLabels: Record<string, string> = {
  submitted: "已提交",
  qualified: "资格通过",
  rejected: "资格未通过"
};

function announcementTitle(announcementId: string) {
  return announcements.value.find((item) => item.id === announcementId)?.title ?? announcementId;
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
  const [announcementData, registrationData] = await Promise.all([
    apiGet<{ announcements: Announcement[] }>("/api/announcements"),
    apiGet<{ registrations: Registration[] }>("/api/registrations")
  ]);
  announcements.value = announcementData.announcements;
  registrations.value = registrationData.registrations;
  selectedAnnouncementId.value ||= announcements.value[0]?.id ?? "";
  if (supplierRoles.has(session.roleId) && session.user?.supplierId) {
    const supplierData = await apiGet<{ supplier: SupplierProfile }>(`/api/suppliers/${session.user.supplierId}`);
    currentSupplier.value = supplierData.supplier;
  } else {
    currentSupplier.value = null;
  }
}

async function submitRegistration() {
  if (restrictedMessage.value) {
    error.value = restrictedMessage.value;
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

onMounted(load);
</script>

<template>
  <section class="panel">
    <h2>供应商报名</h2>

    <WorkflowSurfaceSummary
      v-if="supplierRoles.has(session.roleId)"
      title="供应商补充材料、退货与结算消息"
      :business-types="['return_request', 'settlement_bill', 'invoice', 'payment_request']"
      compact
    />

    <div class="form-grid">
      <label>
        可报名公告
        <select v-model="selectedAnnouncementId">
          <option v-for="announcement in announcements" :key="announcement.id" :value="announcement.id">
            {{ announcement.title }} / {{ announcement.projectId }}
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

      <button type="button" :disabled="!selectedAnnouncementId || !canSubmitRegistration || !materialFile || Boolean(restrictedMessage) || busy" @click="submitRegistration">
        提交报名
      </button>
    </div>

    <p v-if="restrictedMessage" class="inline-error">{{ restrictedMessage }}</p>
    <p v-if="!canSubmitRegistration" class="muted">当前角色仅可查看报名记录，请切换为供应商后提交报名。</p>

    <table>
      <thead>
        <tr>
          <th>公告</th>
          <th>项目编号</th>
          <th>供应商编号</th>
          <th>报名状态</th>
          <th>资料</th>
          <th>提交时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="registration in registrations" :key="registration.id">
          <td>{{ announcementTitle(registration.announcementId) }}</td>
          <td>{{ registration.projectId }}</td>
          <td>{{ registration.supplierId }}</td>
          <td>{{ registrationStatusLabels[registration.status] ?? registration.status }}</td>
          <td>
            <AttachmentList :attachments="registration.materialMetadata" compact />
            <AttachmentList v-if="registration.supplementMaterialMetadata?.length" :attachments="registration.supplementMaterialMetadata" prefix="补充" compact />
            <span v-if="!registration.materialMetadata?.length && !registration.supplementMaterialMetadata?.length">-</span>
          </td>
          <td>{{ formatDateTime(registration.submittedAt) }}</td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
