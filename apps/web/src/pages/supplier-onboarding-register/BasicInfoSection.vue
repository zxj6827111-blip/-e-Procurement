<script setup lang="ts">
import { EnterpriseSurface } from "../../components/base";
import type { BasicDraft } from "./types";

const basic = defineModel<BasicDraft>("basic", { required: true });

defineProps<{
  stepSummary: string;
}>();
</script>

<template>
  <EnterpriseSurface title="基础信息" :description="`第 ${stepSummary} 步。公司主体信息将进入供应商档案和准入审批。`">
    <div class="eds-form-section">
      <label>公司全称<input v-model="basic.companyName" /></label>
      <label>统一社会信用代码<input v-model="basic.socialCreditCode" maxlength="18" /></label>
      <label>营业执照编号<input v-model="basic.businessLicenseNo" /></label>
      <label>法定代表人<input v-model="basic.legalRepresentative" /></label>
      <label>注册地址<input v-model="basic.registeredAddress" /></label>
      <label>详细地址<input v-model="basic.detailAddress" /></label>
      <label>公司网址<input v-model="basic.website" /></label>
      <label>供应商类型<input v-model="basic.supplierType" /></label>
      <label>经营范围<textarea v-model="basic.businessScope" rows="3" /></label>
    </div>
  </EnterpriseSurface>
</template>
