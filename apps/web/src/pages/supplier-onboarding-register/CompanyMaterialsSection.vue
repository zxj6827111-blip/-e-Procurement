<script setup lang="ts">
import type { UploadPayload } from "../../api/http";
import { EnterpriseSurface } from "../../components/base";
import { attachmentText } from "./display";
import type { CompanyMaterialsDraft } from "./types";

const companyMaterials = defineModel<CompanyMaterialsDraft>("companyMaterials", { required: true });

defineEmits<{
  attachFiles: [event: Event, target: UploadPayload[]];
}>();

defineProps<{
  stepSummary: string;
}>();
</script>

<template>
  <EnterpriseSurface title="企业资料" :description="`第 ${stepSummary} 步。补充资质、体系、案例和廉洁承诺，供集团准入审批使用。`">
    <div class="eds-form-section">
      <label>企业性质<input v-model="companyMaterials.enterpriseNature" placeholder="例如：民营 / 国有 / 外资" /></label>
      <label>纳税人形式<input v-model="companyMaterials.taxpayerType" /></label>
      <label>注册资金<input v-model="companyMaterials.registeredCapital" /></label>
      <label>员工规模<input v-model="companyMaterials.employeeScale" /></label>
      <label>年营业额<input v-model="companyMaterials.annualRevenue" /></label>
      <label>质量管理体系<input v-model="companyMaterials.qualitySystem" /></label>
      <label>质量管理状况说明<textarea v-model="companyMaterials.qualityDescription" rows="3" /></label>
      <label>合作案例<textarea v-model="companyMaterials.cooperationCases" rows="3" /></label>
      <label>发展计划<textarea v-model="companyMaterials.developmentPlan" rows="3" /></label>
      <label>企业资料附件<input type="file" multiple @change="$emit('attachFiles', $event, companyMaterials.attachments)" /></label>
      <p class="eds-meta">{{ attachmentText(companyMaterials.attachments.length, "可上传营业执照、体系证书、合同范本、企业介绍、产品资料、合作案例等") }}</p>
      <label><span>阳光采购承诺</span><input v-model="companyMaterials.sunshineCommitmentAccepted" type="checkbox" /> 承诺遵守集团阳光采购和廉洁合作要求</label>
    </div>
  </EnterpriseSurface>
</template>
