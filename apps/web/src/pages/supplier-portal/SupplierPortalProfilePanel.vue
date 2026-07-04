<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, FormSection, SubmitPanel, type DataTableColumn } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import type { ServiceRegion, SupplierPortalProfileForm } from "./types";

defineProps<{
  profileForm: SupplierPortalProfileForm;
  serviceRows: ServiceRegion[];
  serviceColumns: DataTableColumn[];
  qualificationFileName: string;
  profileSaving: boolean;
}>();

const emit = defineEmits<{
  fileChange: [event: Event];
  saveProfile: [];
}>();
</script>

<template>
  <div class="eds-stack">
    <FormSection title="基础资料" description="供应商可维护自身基础信息；准入结论由集团采购侧评审后生成。">
      <label>供应商名称<input :value="profileForm.name" @input="profileForm.name = ($event.target as HTMLInputElement).value" /></label>
      <label>联系人<input :value="profileForm.contactName" @input="profileForm.contactName = ($event.target as HTMLInputElement).value" /></label>
      <label>联系电话<input :value="profileForm.contactPhone" @input="profileForm.contactPhone = ($event.target as HTMLInputElement).value" /></label>
      <label>联系邮箱<input :value="profileForm.contactEmail" @input="profileForm.contactEmail = ($event.target as HTMLInputElement).value" /></label>
      <label>统一社会信用代码<input :value="profileForm.socialCreditCode" @input="profileForm.socialCreditCode = ($event.target as HTMLInputElement).value" /></label>
      <label>营业执照编号<input :value="profileForm.businessLicenseNo" @input="profileForm.businessLicenseNo = ($event.target as HTMLInputElement).value" /></label>
      <label>法定代表人<input :value="profileForm.legalRepresentative" @input="profileForm.legalRepresentative = ($event.target as HTMLInputElement).value" /></label>
      <label>注册地址<input :value="profileForm.registeredAddress" @input="profileForm.registeredAddress = ($event.target as HTMLInputElement).value" /></label>
      <label>主营品类<input :value="profileForm.category" @input="profileForm.category = ($event.target as HTMLInputElement).value" /></label>
      <label>服务区域<input :value="profileForm.region" @input="profileForm.region = ($event.target as HTMLInputElement).value" /></label>
      <label>门店 / 服务点<input :value="profileForm.storeName" @input="profileForm.storeName = ($event.target as HTMLInputElement).value" /></label>
      <label class="eds-field-wide eds-file-field">
        <span>追加资质附件</span>
        <span class="eds-file-picker">
          <span class="eds-file-picker-main">
            <strong>选择资质文件</strong>
            <small>{{ qualificationFileName || "营业执照、质量体系、检测报告等可多选上传" }}</small>
          </span>
          <span class="eds-button eds-button-accent">选择文件</span>
          <input type="file" multiple @change="emit('fileChange', $event)" />
        </span>
      </label>
      <label class="eds-field-wide">经营范围<textarea :value="profileForm.businessScope" rows="4" @input="profileForm.businessScope = ($event.target as HTMLTextAreaElement).value" /></label>
      <p class="eds-meta eds-field-wide">资质文件会进入集团采购侧准入审核记录，请上传清晰、有效版本。</p>
    </FormSection>

    <SubmitPanel>
      <EnterpriseButton type="primary" :disabled="profileSaving" @click="emit('saveProfile')">保存档案资料</EnterpriseButton>
    </SubmitPanel>

    <EnterpriseSurface title="服务范围">
      <DataTable :columns="serviceColumns" :rows="serviceRows" row-key="id" empty-text="暂无服务范围">
        <template #status="{ row }">{{ labelStatus(row.status) }}</template>
      </DataTable>
    </EnterpriseSurface>
  </div>
</template>
