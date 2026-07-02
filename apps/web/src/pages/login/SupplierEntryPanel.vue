<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseSurface } from "../../components/base";
</script>

<template>
  <EnterpriseSurface title="供应商准入" description="首次入驻先提交企业资料，集团审核通过后再参与采购项目。">
    <RouterLink class="eds-button eds-button-text" to="/supplier-onboarding-register">供应商注册</RouterLink>
  </EnterpriseSurface>
</template>
