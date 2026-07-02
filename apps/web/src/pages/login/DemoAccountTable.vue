<script setup lang="ts">
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import type { DemoUser } from "./types";

defineProps<{
  rows: DemoUser[];
  selectedUserId: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
  enter: [];
}>();

const columns = [
  { key: "role", label: "角色" },
  { key: "org", label: "组织" },
  { key: "summary", label: "业务范围" },
  { key: "action", label: "选择" }
];
</script>

<template>
  <EnterpriseSurface title="试用账号" description="用于本地验证和业务流检查；正式环境应使用账号密码或统一身份入口。">
    <DataTable :columns="columns" :rows="rows" row-key="id" empty-text="暂无试用账号">
      <template #role="{ row }">
        <span>{{ row.role }}</span>
        <StatusTag v-if="row.id === selectedUserId" tone="primary">当前选择</StatusTag>
      </template>
      <template #action="{ row }">
        <EnterpriseButton type="text" @click="emit('select', row.id)">选择</EnterpriseButton>
      </template>
    </DataTable>
    <div class="eds-submit-panel">
      <EnterpriseButton type="primary" :disabled="loading" @click="emit('enter')">以当前角色进入</EnterpriseButton>
    </div>
  </EnterpriseSurface>
</template>
