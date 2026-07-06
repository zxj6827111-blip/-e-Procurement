<script setup lang="ts">
import { RouterLink } from "vue-router";
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseSurface, PageHeader, type SummaryCardItem } from "../../components/base";

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
  <section class="eds-section g-hotel-page">
    <PageHeader :title="pageTitle === '需求审批' ? '需求审批' : '采购申请单管理'" eyebrow="采购申请" :description="pageTitle === '需求审批' ? '采购需求审核与立项批复' : '集中管理所有部门提报的采购需求及审批状态'">
      <template #actions>
        <RouterLink v-if="canCreateRequest" class="eds-button eds-button-primary" to="/procurement-requests/new">新建申请</RouterLink>
        <RouterLink class="eds-button" to="/my-tasks">查看待办</RouterLink>
      </template>
    </PageHeader>

    <ErrorAlert v-if="workflowTaskError" :message="workflowTaskError" />

    <EnterpriseSurface class="eds-template-b-command-surface g-hotel-ledger-card" title="采购申请单处理口径" :description="flowDescription">
      <div class="eds-template-b-ledger">
        <article v-for="item in summaryItems" :key="item.label" class="eds-template-b-ledger-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small v-if="item.meta">{{ item.meta }}</small>
        </article>
      </div>
    </EnterpriseSurface>

    <slot />

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
