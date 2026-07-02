<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiDelete, apiGet, apiPatch, apiPost, uploadFile, type UploadedFileMetadata } from "../../api/http";
import ErrorAlert from "../../components/ErrorAlert.vue";
import {
  EnterpriseButton,
  EnterpriseSurface,
  EnterpriseTabs,
  FeedbackMessage,
  PageHeader,
  StatusTag,
  SummaryCards,
  type DataTableColumn
} from "../../components/base";
import {
  createProfileForm,
  normalizeTab,
  profilePayload,
  sealSampleAttachments,
  selectedFileSummary,
  statusLabel,
  statusTone as resolveStatusTone,
  supplierPortalTabs,
  supplierSummaryItems
} from "./display";
import SupplierPortalProfilePanel from "./SupplierPortalProfilePanel.vue";
import SupplierPortalQualificationsPanel from "./SupplierPortalQualificationsPanel.vue";
import SupplierPortalReviewsPanel from "./SupplierPortalReviewsPanel.vue";
import SupplierPortalSamplesPanel from "./SupplierPortalSamplesPanel.vue";
import type { Attachment, SealSample, Supplier, SupplierPortalProfileForm, SupplierPortalTab } from "./types";
import { useSessionStore } from "../../stores/session";

const session = useSessionStore();
const route = useRoute();
const router = useRouter();
const supplier = ref<Supplier | null>(null);
const activeTab = ref<SupplierPortalTab>("profile");
const auditLogId = ref("");
const error = ref("");
const message = ref("");
const profileSaving = ref(false);
const sampleSaving = ref(false);

const profileForm = ref<SupplierPortalProfileForm>({
  name: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  socialCreditCode: "",
  businessLicenseNo: "",
  legalRepresentative: "",
  registeredAddress: "",
  businessScope: "",
  category: "",
  region: "",
  storeName: ""
});

const qualificationFiles = ref<File[]>([]);
const qualificationFileName = ref("");
const sealSampleName = ref("封样图片");
const sealSampleSpec = ref("标准样");
const sealSampleFiles = ref<File[]>([]);
const sealSampleFileName = ref("");

function switchTab(key: string) {
  const next = normalizeTab(key);
  activeTab.value = next;
  void router.replace(next === "profile" ? "/supplier-portal" : `/supplier-portal/${next}`);
}

const summaryItems = computed(() => supplierSummaryItems(supplier.value));

const supplierStatus = computed(() => statusLabel(supplier.value?.admissionStatus || supplier.value?.status));
const statusTone = computed(() => resolveStatusTone(supplier.value?.admissionStatus || supplier.value?.status));

const serviceRows = computed(() => supplier.value?.serviceRegions ?? []);
const serviceColumns: DataTableColumn[] = [
  { key: "region", label: "区域" },
  { key: "storeName", label: "门店 / 服务点" },
  { key: "category", label: "品类" },
  { key: "status", label: "状态" }
];

const reviewRows = computed(() => supplier.value?.admissionReviews ?? []);
const reviewColumns: DataTableColumn[] = [
  { key: "reviewType", label: "评审类型" },
  { key: "status", label: "结果" },
  { key: "score", label: "评分" },
  { key: "opinion", label: "意见" },
  { key: "reviewedAt", label: "时间" }
];

function syncProfileForm() {
  profileForm.value = createProfileForm(supplier.value);
}

async function uploadList(files: File[], objectId: string, attachmentKind: string) {
  if (files.length === 0) return undefined;
  const uploaded = await Promise.all(
    files.map((file) =>
      uploadFile(file, {
        attachmentKind,
        objectType: "supplier",
        objectId
      })
    )
  );
  return uploaded.map((item) => item.file) satisfies UploadedFileMetadata[];
}

async function load() {
  error.value = "";
  message.value = "";
  try {
    if (!session.user) await session.loadMe();
    const supplierId = session.user?.supplierId;
    if (!supplierId) {
      error.value = "当前账号缺少供应商归属，请联系集团采购管理员绑定供应商档案。";
      supplier.value = null;
      return;
    }
    const data = await apiGet<{ supplier: Supplier }>(`/api/suppliers/${encodeURIComponent(supplierId)}`);
    supplier.value = data.supplier;
    syncProfileForm();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "供应商档案加载失败";
  }
}

async function saveProfile() {
  const currentSupplier = supplier.value;
  const supplierId = currentSupplier?.id;
  if (!currentSupplier || !supplierId) return;
  profileSaving.value = true;
  error.value = "";
  message.value = "";
  try {
    const result = await apiPatch<{ supplier: Supplier; auditLogId?: string }>(`/api/suppliers/${encodeURIComponent(supplierId)}/profile`, {
      ...profilePayload(profileForm.value, currentSupplier),
      qualificationAttachments: qualificationFiles.value.length ? await uploadList(qualificationFiles.value, supplierId, "supplier_qualification") : undefined
    });
    supplier.value = result.supplier;
    auditLogId.value = result.auditLogId ?? "";
    qualificationFiles.value = [];
    qualificationFileName.value = "";
    message.value = "档案资料已提交，集团采购侧会按准入流程继续审核。";
    syncProfileForm();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "档案资料保存失败";
  } finally {
    profileSaving.value = false;
  }
}

async function submitSealSample() {
  const supplierId = supplier.value?.id;
  if (!supplierId || !sealSampleName.value.trim()) return;
  sampleSaving.value = true;
  error.value = "";
  message.value = "";
  try {
    const result = await apiPost<{ supplier: Supplier; auditLogId?: string }>(`/api/suppliers/${encodeURIComponent(supplierId)}/seal-samples`, {
      sampleName: sealSampleName.value.trim(),
      specification: sealSampleSpec.value.trim(),
      attachments: await uploadList(sealSampleFiles.value, supplierId, "supplier_seal_sample")
    });
    supplier.value = result.supplier;
    auditLogId.value = result.auditLogId ?? "";
    sealSampleFiles.value = [];
    sealSampleFileName.value = "";
    message.value = "封样样品已上传。";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "封样上传失败";
  } finally {
    sampleSaving.value = false;
  }
}

async function deleteQualification(attachment: { id?: string }) {
  const supplierId = supplier.value?.id;
  if (!supplierId || !attachment.id) return;
  if (!window.confirm("确认删除这份资质证照吗？")) return;
  error.value = "";
  message.value = "";
  try {
    const result = await apiDelete<{ supplier: Supplier; auditLogId?: string }>(`/api/suppliers/${encodeURIComponent(supplierId)}/qualifications/${encodeURIComponent(attachment.id)}`);
    supplier.value = result.supplier;
    auditLogId.value = result.auditLogId ?? "";
    message.value = "资质证照已删除。";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "资质证照删除失败";
  }
}

async function deleteSealSample(sample: SealSample) {
  const supplierId = supplier.value?.id;
  if (!supplierId) return;
  if (!window.confirm("确认删除这个封样样品吗？")) return;
  error.value = "";
  message.value = "";
  try {
    const result = await apiDelete<{ supplier: Supplier; auditLogId?: string }>(`/api/suppliers/${encodeURIComponent(supplierId)}/seal-samples/${encodeURIComponent(sample.id)}`);
    supplier.value = result.supplier;
    auditLogId.value = result.auditLogId ?? "";
    message.value = "封样样品已删除。";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "封样样品删除失败";
  }
}

function onQualificationChange(event: Event) {
  const target = event.target as HTMLInputElement;
  qualificationFiles.value = Array.from(target.files ?? []);
  qualificationFileName.value = selectedFileSummary(qualificationFiles.value);
}

function onSealSampleChange(event: Event) {
  const target = event.target as HTMLInputElement;
  sealSampleFiles.value = Array.from(target.files ?? []);
  sealSampleFileName.value = selectedFileSummary(sealSampleFiles.value);
}

watch(
  () => route.params.section,
  (section) => {
    activeTab.value = normalizeTab(section);
  },
  { immediate: true }
);

onMounted(load);
</script>

<template>
  <section class="eds-section">
    <PageHeader
      title="我的供应商档案"
      eyebrow="供应商门户"
      description="维护本企业基础资料、资质证照和封样样品；集团侧准入评审、账号管理和停用启用不在供应商门户展示。"
    >
      <template #actions>
        <StatusTag :tone="statusTone">{{ supplierStatus }}</StatusTag>
        <EnterpriseButton type="text" @click="load">刷新</EnterpriseButton>
      </template>
    </PageHeader>

    <FeedbackMessage v-if="message" tone="success">{{ message }}</FeedbackMessage>

    <EnterpriseSurface v-if="supplier" title="档案概览">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <EnterpriseSurface v-if="supplier" title="供应商资料">
      <EnterpriseTabs :tabs="supplierPortalTabs" :active-key="activeTab" @change="switchTab" />

      <SupplierPortalProfilePanel
        v-if="activeTab === 'profile'"
        :profile-form="profileForm"
        :service-rows="serviceRows"
        :service-columns="serviceColumns"
        :qualification-file-name="qualificationFileName"
        :profile-saving="profileSaving"
        @file-change="onQualificationChange"
        @save-profile="saveProfile"
      />

      <SupplierPortalQualificationsPanel
        v-else-if="activeTab === 'qualifications'"
        :attachments="supplier.qualificationAttachments"
        @delete="deleteQualification"
      />

      <SupplierPortalSamplesPanel
        v-else-if="activeTab === 'samples'"
        :seal-sample-name="sealSampleName"
        :seal-sample-spec="sealSampleSpec"
        :seal-sample-file-name="sealSampleFileName"
        :sample-saving="sampleSaving"
        :samples="supplier.sealSamples"
        :seal-sample-attachments="sealSampleAttachments"
        @update-seal-sample-name="sealSampleName = $event"
        @update-seal-sample-spec="sealSampleSpec = $event"
        @file-change="onSealSampleChange"
        @submit-seal-sample="submitSealSample"
        @delete-seal-sample="deleteSealSample"
      />

      <SupplierPortalReviewsPanel
        v-else
        :review-rows="reviewRows"
        :review-columns="reviewColumns"
      />
    </EnterpriseSurface>

    <EnterpriseSurface v-else-if="!error" title="正在加载供应商档案">
      <p class="eds-meta">请稍候。</p>
    </EnterpriseSurface>

    <p v-if="auditLogId" class="eds-meta">审计日志：{{ auditLogId }}</p>
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>

