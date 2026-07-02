<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { REGISTRATION_COLUMNS, REVIEW_REGISTRATION_COLUMNS } from "./constants";
import type { Registration, RegistrationStatus, StatusTone } from "./types";

defineProps<{
  announcementTitle: (announcementId: string) => string;
  busy: boolean;
  canReviewRegistration: boolean;
  formatDateTime: (value?: string | null) => string;
  projectLabel: (projectId: string) => string;
  registrationStatusLabel: (status: string) => string;
  registrationStatusTone: (status: string) => StatusTone;
  registrations: Registration[];
  supplierName: (supplierId: string) => string;
}>();

const emit = defineEmits<{
  reviewRegistration: [registrationId: string, status: Exclude<RegistrationStatus, "submitted">];
}>();
</script>

<template>
  <EnterpriseSurface title="报名记录" description="按公告和项目展示供应商提交状态、资料和资格审核处理。">
    <DataTable
      :columns="canReviewRegistration ? REVIEW_REGISTRATION_COLUMNS : REGISTRATION_COLUMNS"
      :rows="registrations"
      row-key="id"
      empty-text="暂无报名记录。"
    >
      <template #announcement="{ row }">{{ announcementTitle(row.announcementId) }}</template>
      <template #project="{ row }">{{ projectLabel(row.projectId) }}</template>
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="registrationStatusTone(row.status)">{{ registrationStatusLabel(row.status) }}</StatusTag>
      </template>
      <template #materials="{ row }">
        <AttachmentList :attachments="row.materialMetadata" compact />
        <AttachmentList v-if="row.supplementMaterialMetadata?.length" :attachments="row.supplementMaterialMetadata" prefix="补充" compact />
        <span v-if="!row.materialMetadata?.length && !row.supplementMaterialMetadata?.length">-</span>
      </template>
      <template #submittedAt="{ row }">{{ formatDateTime(row.submittedAt) }}</template>
      <template #review="{ row }">
        <div v-if="row.status === 'submitted'" class="eds-actions">
          <EnterpriseButton type="primary" :disabled="busy" @click="emit('reviewRegistration', row.id, 'qualified')">资格通过</EnterpriseButton>
          <EnterpriseButton :disabled="busy" @click="emit('reviewRegistration', row.id, 'rejected')">不通过</EnterpriseButton>
        </div>
        <span v-else class="eds-meta">{{ row.qualificationReason || "已处理" }}</span>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
