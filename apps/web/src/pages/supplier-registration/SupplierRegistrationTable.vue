<script setup lang="ts">
import { ref } from "vue";
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

const selectedRegistration = ref<Registration | null>(null);
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="报名资料" description="审核供应商提交的报名材料与资质。">
    <DataTable
      :columns="canReviewRegistration ? REVIEW_REGISTRATION_COLUMNS : REGISTRATION_COLUMNS"
      :rows="registrations"
      row-key="id"
      empty-text="暂无报名记录。"
    >
      <template #registration="{ row }">
        <strong>{{ row.id }}</strong>
        <p class="eds-meta">{{ announcementTitle(row.announcementId) }}</p>
      </template>
      <template #project="{ row }">{{ projectLabel(row.projectId) }}</template>
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="registrationStatusTone(row.status)">{{ registrationStatusLabel(row.status) }}</StatusTag>
      </template>
      <template #submittedAt="{ row }">{{ formatDateTime(row.submittedAt) }}</template>
      <template #review="{ row }">
        <EnterpriseButton type="text" @click="selectedRegistration = row">审核/详情</EnterpriseButton>
      </template>
    </DataTable>
  </EnterpriseSurface>

  <div v-if="selectedRegistration" class="g-hotel-modal" role="dialog" aria-modal="true" aria-label="报名资料审核">
    <button class="g-hotel-modal-mask" type="button" aria-label="关闭" @click="selectedRegistration = null"></button>
    <article class="g-hotel-modal-panel">
      <header>
        <h3>资料审核：{{ supplierName(selectedRegistration.supplierId) }}</h3>
        <button type="button" aria-label="关闭" @click="selectedRegistration = null">×</button>
      </header>
      <div class="g-hotel-detail-list">
        <p><span>报名编号：</span>{{ selectedRegistration.id }}</p>
        <p><span>公告：</span>{{ announcementTitle(selectedRegistration.announcementId) }}</p>
        <p><span>项目：</span>{{ projectLabel(selectedRegistration.projectId) }}</p>
        <p><span>提交日期：</span>{{ formatDateTime(selectedRegistration.submittedAt) }}</p>
        <p><span>状态：</span>{{ registrationStatusLabel(selectedRegistration.status) }}</p>
      </div>
      <section>
        <h4>报名材料</h4>
        <AttachmentList :attachments="selectedRegistration.materialMetadata" compact />
        <AttachmentList
          v-if="selectedRegistration.supplementMaterialMetadata?.length"
          :attachments="selectedRegistration.supplementMaterialMetadata"
          prefix="补充"
          compact
        />
        <p v-if="!selectedRegistration.materialMetadata?.length && !selectedRegistration.supplementMaterialMetadata?.length" class="eds-meta">暂无附件。</p>
      </section>
      <footer>
        <EnterpriseButton @click="selectedRegistration = null">取消</EnterpriseButton>
        <EnterpriseButton
          v-if="canReviewRegistration && selectedRegistration.status === 'submitted'"
          :disabled="busy"
          @click="emit('reviewRegistration', selectedRegistration.id, 'rejected'); selectedRegistration = null"
        >
          退回
        </EnterpriseButton>
        <EnterpriseButton
          v-if="canReviewRegistration && selectedRegistration.status === 'submitted'"
          type="primary"
          :disabled="busy"
          @click="emit('reviewRegistration', selectedRegistration.id, 'qualified'); selectedRegistration = null"
        >
          审核通过
        </EnterpriseButton>
        <EnterpriseButton v-else type="primary" @click="selectedRegistration = null">关闭</EnterpriseButton>
      </footer>
    </article>
  </div>
</template>
