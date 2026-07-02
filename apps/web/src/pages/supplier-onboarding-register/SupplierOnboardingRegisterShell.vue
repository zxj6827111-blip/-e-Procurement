<script setup lang="ts">
import { RouterLink } from "vue-router";
import { PageHeader, StatusTag } from "../../components/base";

defineProps<{
  busy: boolean;
  resultSubmitted: boolean;
}>();
</script>

<template>
  <PageHeader title="供应商注册" eyebrow="供应商入驻" description="按集团准入要求提交企业、联系人、主营产品、场所和资质资料。提交后由集团进行资质初审和准入审批。">
    <template #actions>
      <StatusTag v-if="busy" tone="warning">提交中</StatusTag>
      <StatusTag v-if="resultSubmitted" tone="success">已提交</StatusTag>
      <RouterLink class="eds-button eds-button-text" to="/login">返回登录</RouterLink>
    </template>
  </PageHeader>
</template>
