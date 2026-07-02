<script setup lang="ts">
import { RouterLink } from "vue-router";
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseSurface, PageHeader, SummaryCards, type SummaryCardItem } from "../../components/base";

defineProps<{
  pageTitle: string;
  flowDescription: string;
  canCreateRequest: boolean;
  workflowTaskError: string;
  error: string;
  auditLogId: string;
  summaryItems: SummaryCardItem[];
}>();
</script>

<template>
  <section class="eds-section">
    <PageHeader :title="pageTitle" eyebrow="采购申请" :description="flowDescription">
      <template #actions>
        <RouterLink v-if="canCreateRequest" class="eds-button eds-button-primary" to="/procurement-requests/new">新建申请</RouterLink>
        <RouterLink class="eds-button" to="/my-tasks">查看待办</RouterLink>
      </template>
    </PageHeader>

    <ErrorAlert v-if="workflowTaskError" :message="workflowTaskError" />

    <EnterpriseSurface title="需求流转口径" description="酒店提交需求，集团确认采购必要性，采购经办按制度判定采购方式并承接为项目。">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <slot />

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
