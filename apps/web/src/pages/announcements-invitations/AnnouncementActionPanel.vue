<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, StatusTag, SubmitPanel, SummaryCards, type SummaryCardItem } from "../../components/base";
import type { Announcement, SupplierInvitation, SupplierRow } from "./types";

defineProps<{
  announcements: Announcement[];
  selectedAnnouncement: Announcement | null;
  selectedAnnouncementInvitations: SupplierInvitation[];
  eligibleSuppliers: SupplierRow[];
  canMaintainSourcing: boolean;
  canPublishSelectedAnnouncement: boolean;
  canSendSelectedInvitations: boolean;
  canDeleteSelectedAnnouncement: boolean;
  canCloseSelectedAnnouncement: boolean;
  shouldShowCloseReason: boolean;
  selectedSupplierCount: number;
  busyAction: string;
  nextActionHint: string;
  documentLabel: (documentId: string) => string;
  labelStatus: (value: string) => string;
}>();

const selectedAnnouncementId = defineModel<string>("selectedAnnouncementId", { required: true });
const selectedSupplierIds = defineModel<string[]>("selectedSupplierIds", { required: true });
const closeReason = defineModel<string>("closeReason", { required: true });

const emit = defineEmits<{
  publish: [];
  invite: [];
  delete: [];
  close: [];
}>();
</script>

<template>
  <EnterpriseSurface title="当前公告处理" :description="nextActionHint">
    <div class="eds-form-section">
      <label>
        选择公告
        <select v-model="selectedAnnouncementId">
          <option v-if="!announcements.length" value="">当前项目暂无公告</option>
          <option v-for="announcement in announcements" :key="announcement.id" :value="announcement.id">
            {{ announcement.title }} / {{ labelStatus(announcement.status) }}
          </option>
        </select>
      </label>
      <label>
        选择供应商
        <select v-model="selectedSupplierIds" multiple>
          <option v-if="!eligibleSuppliers.length" disabled value="">暂无可邀请供应商</option>
          <option v-for="supplier in eligibleSuppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option>
        </select>
      </label>
      <label v-if="shouldShowCloseReason">
        关闭原因
        <input v-model="closeReason" />
      </label>
    </div>

    <SummaryCards
      v-if="selectedAnnouncement"
      :items="[
        { label: '采购文件', value: documentLabel(selectedAnnouncement.documentId), meta: '公告引用版本' },
        { label: '公告范围', value: labelStatus(selectedAnnouncement.scope), meta: labelStatus(selectedAnnouncement.procurementMethod) },
        { label: '已邀请供应商', value: selectedAnnouncementInvitations.length, meta: '当前公告' },
        { label: '本次选择', value: selectedSupplierCount, meta: '待处理供应商' }
      ] as SummaryCardItem[]"
    />

    <SubmitPanel v-if="selectedAnnouncement && canMaintainSourcing">
      <EnterpriseButton type="primary" :disabled="!canPublishSelectedAnnouncement || busyAction === 'publish'" @click="emit('publish')">
        发布公告<span v-if="selectedSupplierCount">并发送 {{ selectedSupplierCount }} 家邀请</span>
      </EnterpriseButton>
      <EnterpriseButton :disabled="!canSendSelectedInvitations || busyAction === 'invite'" @click="emit('invite')">补发邀请</EnterpriseButton>
      <EnterpriseButton :disabled="!canDeleteSelectedAnnouncement || busyAction === 'delete'" @click="emit('delete')">删除草稿</EnterpriseButton>
      <EnterpriseButton :disabled="!canCloseSelectedAnnouncement || busyAction === 'close'" @click="emit('close')">关闭公告</EnterpriseButton>
      <StatusTag v-if="busyAction" tone="warning">处理中</StatusTag>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
