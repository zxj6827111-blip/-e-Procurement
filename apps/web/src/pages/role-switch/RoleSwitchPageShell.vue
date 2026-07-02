<script setup lang="ts">
import { PageHeader } from "../../components/base";
import RoleSwitchPanel from "./RoleSwitchPanel.vue";
import { useRoleSwitchPage } from "./useRoleSwitchPage";

const state = useRoleSwitchPage();
</script>

<template>
  <PageHeader title="账号入口" eyebrow="LOCAL ACCESS" description="用于本地验证和角色隔离检查的隐藏入口。" />
  <RoleSwitchPanel
    v-model="state.nextUserId.value"
    :audit-log-id="state.auditLogId.value"
    :enabled="state.enabled.value"
    :error="state.error.value"
    :selected-user="state.selectedUser.value"
    :users="state.switchableUsers.value"
    @switch="state.switchRole"
  />
</template>
