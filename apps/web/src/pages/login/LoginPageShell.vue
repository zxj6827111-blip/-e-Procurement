<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { PageHeader } from "../../components/base";
import DemoAccountTable from "./DemoAccountTable.vue";
import PasswordLoginPanel from "./PasswordLoginPanel.vue";
import SupplierEntryPanel from "./SupplierEntryPanel.vue";
import { useLoginPage } from "./useLoginPage";

const state = useLoginPage();
</script>

<template>
  <PageHeader title="酒店供应链采购平台" eyebrow="登录入口" description="供应商准入、商品集采、履约结算统一办理。" />
  <SupplierEntryPanel />
  <DemoAccountTable
    :loading="state.loading.value"
    :rows="state.demoUsers"
    :selected-user-id="state.selectedUserId.value"
    @enter="state.enterDemo"
    @select="state.selectDemoUser"
  />
  <PasswordLoginPanel
    v-model:password="state.password.value"
    v-model:username="state.username.value"
    :loading="state.loading.value"
    @login="state.login"
  />
  <ErrorAlert v-if="state.error.value" :message="state.error.value" />
  <AuditLogRef :audit-log-id="state.auditLogId.value" />
</template>
