<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseButton, EnterpriseSurface } from "../../components/base";
import { accountLabel } from "./useRoleSwitchPage";
import type { SwitchableUser } from "./types";

defineProps<{
  enabled: boolean;
  users: SwitchableUser[];
  selectedUser?: SwitchableUser;
  error: string;
  auditLogId: string;
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  switch: [];
}>();
</script>

<template>
  <EnterpriseSurface title="账号入口" description="该入口仅供受控环境下进行角色切换；正式业务导航不展示。">
    <p v-if="enabled" class="eds-meta">该页面仅保留为隐藏入口。</p>
    <p v-else class="eds-meta">当前环境已禁用账号入口。</p>
    <div v-if="enabled" class="eds-form-section">
      <label>
        切换账号
        <select :value="modelValue" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ accountLabel(user) }}
          </option>
        </select>
      </label>
      <EnterpriseButton type="primary" @click="emit('switch')">进入</EnterpriseButton>
    </div>
    <p v-if="selectedUser?.supplierName" class="eds-meta">当前将进入：{{ selectedUser.supplierName }}，账号 {{ selectedUser.id }}</p>
    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </EnterpriseSurface>
</template>
