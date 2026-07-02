<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { apiPost, uploadFile, type UploadedFileMetadata } from "../../api/http";
import ErrorAlert from "../../components/ErrorAlert.vue";
import EnterpriseButton from "../../components/base/EnterpriseButton.vue";
import FormSection from "../../components/base/FormSection.vue";
import PageHeader from "../../components/base/PageHeader.vue";
import SubmitPanel from "../../components/base/SubmitPanel.vue";

interface SupplierAccessAccount {
  username: string;
  initialPassword?: string;
}

interface SupplierCreateResult {
  supplier?: { id: string };
  accounts?: {
    admin?: SupplierAccessAccount;
    quotation?: SupplierAccessAccount;
  };
  auditLogId?: string;
}

const router = useRouter();
const name = ref("");
const category = ref("");
const contactName = ref("");
const contactPhone = ref("");
const contactEmail = ref("");
const region = ref("");
const storeName = ref("");
const qualificationFiles = ref<File[]>([]);
const qualificationFileName = ref("");
const latestAccounts = ref<SupplierCreateResult["accounts"] | null>(null);
const busy = ref(false);
const error = ref("");

function onQualificationChange(event: Event) {
  const input = event.target as HTMLInputElement;
  qualificationFiles.value = Array.from(input.files ?? []);
  qualificationFileName.value = qualificationFiles.value.map((file) => file.name).join("，");
}

async function uploadList(files: File[], objectId: string): Promise<UploadedFileMetadata[]> {
  const uploaded = await Promise.all(
    files.map((file) =>
      uploadFile(file, {
        attachmentKind: "supplier_qualification",
        objectType: "supplier",
        objectId
      })
    )
  );
  return uploaded.map((item) => item.file);
}

async function createSupplier() {
  error.value = "";
  busy.value = true;
  try {
    const draftId = `supplier-draft-${Date.now()}`;
    const result = await apiPost<SupplierCreateResult>("/api/suppliers/admissions", {
      name: name.value.trim(),
      category: category.value.trim(),
      contactName: contactName.value.trim(),
      contactPhone: contactPhone.value.trim(),
      contactEmail: contactEmail.value.trim(),
      serviceRegions: [
        {
          region: region.value.trim(),
          storeName: storeName.value.trim(),
          category: category.value.trim()
        }
      ],
      qualificationAttachments: await uploadList(qualificationFiles.value, draftId)
    });
    latestAccounts.value = result.accounts ?? null;
    if (result.supplier?.id) {
      await router.replace(`/suppliers/${encodeURIComponent(result.supplier.id)}`);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "新增供应商失败";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="eds-section">
    <PageHeader title="新增供应商" eyebrow="供应商建档" description="集团供应商治理人员录入供应商基础档案，系统同步开通供应商登录账号。">
      <template #actions>
        <RouterLink class="eds-button" to="/suppliers">返回列表</RouterLink>
      </template>
    </PageHeader>

    <ErrorAlert v-if="error" :message="error" />

    <FormSection title="基础信息">
      <label>
        供应商名称
        <input v-model="name" placeholder="请输入企业全称" />
      </label>
      <label>
        业务品类
        <input v-model="category" placeholder="例如：客房一次性用品" />
      </label>
      <label>
        联系人
        <input v-model="contactName" />
      </label>
      <label>
        联系电话
        <input v-model="contactPhone" />
      </label>
      <label>
        联系邮箱
        <input v-model="contactEmail" type="email" />
      </label>
    </FormSection>

    <FormSection title="服务范围">
      <label>
        服务区域
        <input v-model="region" placeholder="例如：上海" />
      </label>
      <label>
        门店 / 服务点
        <input v-model="storeName" placeholder="例如：滨江店" />
      </label>
    </FormSection>

    <FormSection title="资质附件">
      <label>
        资质文件
        <input type="file" multiple @change="onQualificationChange" />
      </label>
      <p class="eds-meta">{{ qualificationFileName || "可一次选择营业执照、食品经营许可、检测报告等多份文件。" }}</p>
    </FormSection>

    <FormSection v-if="latestAccounts" title="账号开通结果">
      <p v-if="latestAccounts.admin" class="eds-meta">
        管理员账号：{{ latestAccounts.admin.username }}
        <template v-if="latestAccounts.admin.initialPassword"> / 初始密码：{{ latestAccounts.admin.initialPassword }}</template>
      </p>
      <p v-if="latestAccounts.quotation" class="eds-meta">
        报价员账号：{{ latestAccounts.quotation.username }}
        <template v-if="latestAccounts.quotation.initialPassword"> / 初始密码：{{ latestAccounts.quotation.initialPassword }}</template>
      </p>
    </FormSection>

    <SubmitPanel>
      <RouterLink class="eds-button" to="/suppliers">取消</RouterLink>
      <EnterpriseButton type="primary" :disabled="busy || !name.trim() || !category.trim()" @click="createSupplier">提交建档</EnterpriseButton>
    </SubmitPanel>
  </section>
</template>

