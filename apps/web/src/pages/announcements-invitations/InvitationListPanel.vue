<script setup lang="ts">
import { DataTable, EnterpriseSurface, PaginationBar, StatusTag } from "../../components/base";
import { INVITATION_COLUMNS } from "./constants";
import type { StatusTone, SupplierInvitation } from "./types";

defineProps<{
  invitations: SupplierInvitation[];
  selectedAnnouncementExists: boolean;
  announcementLabel: (announcementId: string) => string;
  announcementStatus: (announcementId: string) => string;
  supplierName: (supplierId: string) => string;
  labelStatus: (value: string) => string;
  formatDateTime: (value?: string | null) => string;
  statusTone: (status: string) => StatusTone;
}>();
</script>

<template>
  <EnterpriseSurface :title="selectedAnnouncementExists ? '当前公告邀请记录' : '当前项目邀请记录'" :description="`共 ${invitations.length} 条邀请记录。`">
    <DataTable :columns="INVITATION_COLUMNS" :rows="invitations" row-key="id" empty-text="暂无邀请记录。">
      <template #announcement="{ row }">{{ announcementLabel(row.announcementId) }}</template>
      <template #announcementStatus="{ row }">
        <StatusTag :tone="statusTone(announcementStatus(row.announcementId))">
          {{ announcementStatus(row.announcementId) === "missing" ? "公告不可见" : labelStatus(announcementStatus(row.announcementId)) }}
        </StatusTag>
      </template>
      <template #supplier="{ row }">{{ supplierName(row.supplierId) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ labelStatus(row.status) }}</StatusTag>
      </template>
      <template #notificationStatus="{ row }">{{ labelStatus(row.notificationStatus) }}</template>
      <template #notifiedAt="{ row }">{{ formatDateTime(row.notifiedAt ?? row.createdAt) }}</template>
    </DataTable>
    <PaginationBar :total="invitations.length" />
  </EnterpriseSurface>
</template>
