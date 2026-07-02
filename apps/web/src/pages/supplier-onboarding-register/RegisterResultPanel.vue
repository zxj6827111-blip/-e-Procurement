<script setup lang="ts">
import { EnterpriseSurface, StatusTag } from "../../components/base";
import type { RegisterResult } from "./types";

defineProps<{
  result: RegisterResult | null;
}>();
</script>

<template>
  <EnterpriseSurface v-if="result" title="入驻申请已提交" description="当前资料已转集团进行资质初审和准入审批。">
    <div class="eds-stack-tight">
      <p>供应商编号：{{ result.supplier.id }}</p>
      <p v-if="result.accounts.admin">
        管理员账号：{{ result.accounts.admin.username }}
        <template v-if="result.accounts.admin.initialPassword"> / 初始密码：{{ result.accounts.admin.initialPassword }}</template>
      </p>
      <p v-if="result.accounts.quotation">
        报价账号：{{ result.accounts.quotation.username }}
        <template v-if="result.accounts.quotation.initialPassword"> / 初始密码：{{ result.accounts.quotation.initialPassword }}</template>
      </p>
      <StatusTag tone="success">{{ result.supplier.admissionStatus ?? "pending" }}</StatusTag>
      <p class="eds-meta">{{ result.adapterBoundary }}</p>
    </div>
  </EnterpriseSurface>
</template>
