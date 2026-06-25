<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPatch, apiPost, uploadFile, type UploadedFileMetadata } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";
import { formatDateTime, labelStatus } from "../utils/status-labels";

interface Attachment {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt: string;
}

interface ServiceRegion {
  id: string;
  region: string;
  storeName: string;
  category: string;
  status: string;
}

interface AdmissionReview {
  id: string;
  reviewType: string;
  status: string;
  score?: number;
  opinion: string;
  reviewedAt: string;
}

interface SealSample {
  id: string;
  sampleName: string;
  specification: string;
  confirmedBy: string;
  uploadedAt?: string;
  fileId?: string;
  fileName?: string;
}

interface Supplier {
  id: string;
  name: string;
  status: string;
  admissionStatus?: string;
  categoryAuth: string[];
  qualification: string;
  risk: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  serviceRegions?: ServiceRegion[];
  qualificationAttachments?: Attachment[];
  admissionReviews?: AdmissionReview[];
  sealSamples?: SealSample[];
}

const session = useSessionStore();
const suppliers = ref<Supplier[]>([]);
const selectedSupplierId = ref("");
const auditLogId = ref("");
const error = ref("");

const newSupplierName = ref("新增供应商");
const newSupplierCategory = ref("客房一次性用品");
const newSupplierContactName = ref("张三");
const newSupplierContactPhone = ref("13900000001");
const newSupplierContactEmail = ref("supplier@example.com");
const newSupplierRegion = ref("上海");
const newSupplierStore = ref("滨江店");
const qualificationFile = ref<File | null>(null);
const qualificationFileName = ref("");

const profileName = ref("");
const profileContactName = ref("");
const profileContactPhone = ref("");
const profileContactEmail = ref("");
const profileCategory = ref("");
const profileRegion = ref("");
const profileStore = ref("");
const profileQualificationFile = ref<File | null>(null);
const profileQualificationFileName = ref("");

const reviewType = ref("qualification_initial_review");
const reviewStatus = ref("passed");
const reviewScore = ref<number | null>(90);
const reviewOpinion = ref("资料完整，允许进入下一环节");

const sealSampleName = ref("封样图片");
const sealSampleSpec = ref("标准样");
const sealSampleFile = ref<File | null>(null);
const sealSampleFileName = ref("");

const supplierMaintainerRoles = new Set(["buyer", "group_manager", "platform_operator"]);
const supplierAdminRoles = new Set(["supplier", "supplier_admin"]);
const canMaintainSupplier = computed(() => supplierMaintainerRoles.has(session.roleId));
const canEditOwnSupplier = computed(() => supplierAdminRoles.has(session.roleId) || canMaintainSupplier.value);
const visibleSuppliers = computed(() => suppliers.value);
const selectedSupplier = computed(() => visibleSuppliers.value.find((item) => item.id === selectedSupplierId.value) ?? null);

const reviewTypeLabels: Record<string, string> = {
  qualification_initial_review: "资质初审",
  admission_assessment: "准入评审",
  regularization_review: "转正评审",
  periodic_assessment: "周期考核"
};

function resetProfileForm(supplier: Supplier | null) {
  profileName.value = supplier?.name ?? "";
  profileContactName.value = supplier?.contactName ?? "";
  profileContactPhone.value = supplier?.contactPhone ?? "";
  profileContactEmail.value = supplier?.contactEmail ?? "";
  profileCategory.value = supplier?.categoryAuth?.[0] ?? "";
  profileRegion.value = supplier?.serviceRegions?.[0]?.region ?? "";
  profileStore.value = supplier?.serviceRegions?.[0]?.storeName ?? "";
  profileQualificationFile.value = null;
  profileQualificationFileName.value = "";
}

function syncSelectedSupplier() {
  if (!visibleSuppliers.value.some((item) => item.id === selectedSupplierId.value)) {
    selectedSupplierId.value = visibleSuppliers.value[0]?.id ?? "";
  }
  resetProfileForm(selectedSupplier.value);
}

function onQualificationChange(event: Event, mode: "create" | "profile" | "seal") {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;
  if (mode === "create") {
    qualificationFile.value = file;
    qualificationFileName.value = file?.name ?? "";
  } else if (mode === "profile") {
    profileQualificationFile.value = file;
    profileQualificationFileName.value = file?.name ?? "";
  } else {
    sealSampleFile.value = file;
    sealSampleFileName.value = file?.name ?? "";
  }
}

async function uploadList(file: File | null, objectId: string, attachmentKind: string) {
  if (!file) return undefined;
  const uploaded = await uploadFile(file, {
    attachmentKind,
    objectType: "supplier",
    objectId
  });
  return [uploaded.file] satisfies UploadedFileMetadata[];
}

async function load() {
  const data = await apiGet<{ suppliers: Supplier[] }>("/api/suppliers");
  suppliers.value = data.suppliers;
  syncSelectedSupplier();
}

async function run(action: () => Promise<{ auditLogId?: string }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

async function createSupplier() {
  await run(async () =>
    apiPost("/api/suppliers/admissions", {
      name: newSupplierName.value,
      category: newSupplierCategory.value,
      contactName: newSupplierContactName.value,
      contactPhone: newSupplierContactPhone.value,
      contactEmail: newSupplierContactEmail.value,
      serviceRegions: [
        {
          region: newSupplierRegion.value,
          storeName: newSupplierStore.value,
          category: newSupplierCategory.value
        }
      ],
      qualificationAttachments: await uploadList(qualificationFile.value, `pending-supplier-${Date.now()}`, "supplier_qualification")
    })
  );
  qualificationFile.value = null;
  qualificationFileName.value = "";
}

async function saveProfile() {
  if (!selectedSupplierId.value) return;
  await run(async () =>
    apiPatch(`/api/suppliers/${selectedSupplierId.value}/profile`, {
      name: profileName.value,
      contactName: profileContactName.value,
      contactPhone: profileContactPhone.value,
      contactEmail: profileContactEmail.value,
      categoryAuth: profileCategory.value ? [profileCategory.value] : [],
      serviceRegions: [
        {
          region: profileRegion.value,
          storeName: profileStore.value,
          category: profileCategory.value || selectedSupplier.value?.categoryAuth?.[0] || "",
          status: "active"
        }
      ],
      qualificationAttachments: profileQualificationFile.value ? await uploadList(profileQualificationFile.value, selectedSupplierId.value, "supplier_qualification") : undefined
    })
  );
}

async function submitReview() {
  if (!selectedSupplierId.value) return;
  await run(() =>
    apiPost(`/api/suppliers/${selectedSupplierId.value}/reviews`, {
      reviewType: reviewType.value,
      status: reviewStatus.value,
      score: reviewScore.value,
      opinion: reviewOpinion.value
    })
  );
}

async function submitSealSample() {
  if (!selectedSupplierId.value) return;
  await run(async () =>
    apiPost(`/api/suppliers/${selectedSupplierId.value}/seal-samples`, {
      sampleName: sealSampleName.value,
      specification: sealSampleSpec.value,
      attachments: await uploadList(sealSampleFile.value, selectedSupplierId.value, "supplier_seal_sample")
    })
  );
  sealSampleFile.value = null;
  sealSampleFileName.value = "";
}

onMounted(async () => {
  await session.loadMe(session.user?.id);
  await load();
});
</script>

<template>
  <section class="panel">
    <h2>{{ session.roleId === "supplier" ? "供应商资料维护" : "供应商准入管理" }}</h2>

    <div v-if="canMaintainSupplier" class="form-grid">
      <label>
        供应商名称
        <input v-model="newSupplierName" />
      </label>
      <label>
        业务品类
        <input v-model="newSupplierCategory" />
      </label>
      <label>
        联系人
        <input v-model="newSupplierContactName" />
      </label>
      <label>
        联系电话
        <input v-model="newSupplierContactPhone" />
      </label>
      <label>
        联系邮箱
        <input v-model="newSupplierContactEmail" />
      </label>
      <label>
        服务区域
        <input v-model="newSupplierRegion" />
      </label>
      <label>
        门店 / 服务点
        <input v-model="newSupplierStore" />
      </label>
      <label>
        资质附件
        <input type="file" @change="(event) => onQualificationChange(event, 'create')" />
      </label>
      <div class="notice">{{ qualificationFileName || "未选择文件" }}</div>
      <button type="button" @click="createSupplier">新增供应商</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>名称</th>
          <th>准入状态</th>
          <th>品类</th>
          <th>联系人</th>
          <th>联系电话</th>
          <th>服务区域</th>
          <th>资质附件</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="supplier in visibleSuppliers" :key="supplier.id">
          <td>{{ supplier.name }}</td>
          <td>{{ labelStatus(supplier.admissionStatus || supplier.status) }}</td>
          <td>{{ supplier.categoryAuth.join("，") || "-" }}</td>
          <td>{{ supplier.contactName || "-" }}</td>
          <td>{{ supplier.contactPhone || "-" }}</td>
          <td>{{ supplier.serviceRegions?.map((item) => `${item.region}/${item.storeName}`).join("，") || "-" }}</td>
          <td>
            <AttachmentList :attachments="supplier.qualificationAttachments" compact />
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="selectedSupplierId || visibleSuppliers.length" class="form-grid">
      <label>
        当前供应商
        <select v-model="selectedSupplierId" @change="resetProfileForm(selectedSupplier)">
          <option v-for="supplier in visibleSuppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option>
        </select>
      </label>
      <label>
        供应商名称
        <input v-model="profileName" :disabled="!canEditOwnSupplier" />
      </label>
      <label>
        联系人
        <input v-model="profileContactName" :disabled="!canEditOwnSupplier" />
      </label>
      <label>
        联系电话
        <input v-model="profileContactPhone" :disabled="!canEditOwnSupplier" />
      </label>
      <label>
        联系邮箱
        <input v-model="profileContactEmail" :disabled="!canEditOwnSupplier" />
      </label>
      <label>
        品类
        <input v-model="profileCategory" :disabled="!canEditOwnSupplier" />
      </label>
      <label>
        服务区域
        <input v-model="profileRegion" :disabled="!canEditOwnSupplier" />
      </label>
      <label>
        门店 / 服务点
        <input v-model="profileStore" :disabled="!canEditOwnSupplier" />
      </label>
      <label v-if="canEditOwnSupplier">
        更新资质附件
        <input type="file" @change="(event) => onQualificationChange(event, 'profile')" />
      </label>
      <div v-if="canEditOwnSupplier" class="notice">{{ profileQualificationFileName || "未选择文件" }}</div>
      <button v-if="canEditOwnSupplier" type="button" :disabled="!selectedSupplierId" @click="saveProfile">保存资料</button>
    </div>

    <div v-if="canMaintainSupplier && selectedSupplierId" class="form-grid">
      <label>
        评审类型
        <select v-model="reviewType">
          <option value="qualification_initial_review">资质初审</option>
          <option value="admission_assessment">准入评审</option>
          <option value="regularization_review">转正评审</option>
          <option value="periodic_assessment">周期考核</option>
        </select>
      </label>
      <label>
        评审结果
        <select v-model="reviewStatus">
          <option value="passed">通过</option>
          <option value="rejected">驳回</option>
          <option value="pending">待定</option>
        </select>
      </label>
      <label>
        评分
        <input v-model.number="reviewScore" type="number" />
      </label>
      <label>
        评审意见
        <input v-model="reviewOpinion" />
      </label>
      <button type="button" @click="submitReview">提交评审</button>
    </div>

    <div v-if="selectedSupplierId && canEditOwnSupplier" class="form-grid">
      <label>
        封样名称
        <input v-model="sealSampleName" />
      </label>
      <label>
        规格说明
        <input v-model="sealSampleSpec" />
      </label>
      <label>
        封样附件
        <input type="file" @change="(event) => onQualificationChange(event, 'seal')" />
      </label>
      <div class="notice">{{ sealSampleFileName || "未选择文件" }}</div>
      <button type="button" @click="submitSealSample">上传封样</button>
    </div>

    <div v-if="selectedSupplier" class="workbench-grid">
      <section class="section-block">
        <h3>准入评审记录</h3>
        <div v-if="selectedSupplier.admissionReviews?.length">
          <div v-for="review in selectedSupplier.admissionReviews" :key="review.id" class="stack-item">
            <strong>{{ reviewTypeLabels[review.reviewType] ?? review.reviewType }} / {{ labelStatus(review.status) }}</strong>
            <span>{{ review.opinion || "-" }}</span>
            <small>{{ formatDateTime(review.reviewedAt) }} / 评分 {{ review.score ?? "-" }}</small>
          </div>
        </div>
        <p v-else class="notice">暂无评审记录。</p>
      </section>

      <section class="section-block">
        <h3>封样与样品</h3>
        <div v-if="selectedSupplier.sealSamples?.length">
          <div v-for="sample in selectedSupplier.sealSamples" :key="sample.id" class="stack-item">
            <strong>{{ sample.sampleName }}</strong>
            <span>{{ sample.specification || "-" }}</span>
            <AttachmentList
              :attachments="sample.fileId ? [{ id: sample.fileId, fileName: sample.fileName, uploadedAt: sample.uploadedAt }] : []"
              compact
            />
            <small>{{ sample.confirmedBy }} / {{ formatDateTime(sample.uploadedAt) }}</small>
          </div>
        </div>
        <p v-else class="notice">暂无封样资料。</p>
      </section>
    </div>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
