<script setup lang="ts">
import { ref } from "vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import { ANNOUNCEMENT_COLUMNS } from "./constants";
import type { Announcement, StatusTone } from "./types";

defineProps<{
  announcements: Announcement[];
  documentLabel: (documentId: string) => string;
  labelStatus: (value: string) => string;
  formatDateTime: (value?: string | null) => string;
  statusTone: (status: string) => StatusTone;
}>();

const emit = defineEmits<{
  select: [announcementId: string];
}>();

const selectedAnnouncement = ref<Announcement | null>(null);

function showDetails(announcement: Announcement) {
  selectedAnnouncement.value = announcement;
  emit("select", announcement.id);
}
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="公告列表" :description="`当前项目共 ${announcements.length} 条公告。`">
    <DataTable :columns="ANNOUNCEMENT_COLUMNS" :rows="announcements" row-key="id" empty-text="当前项目还没有公告。">
      <template #type="{ row }">
        <div class="eds-table-primary-cell">
          <strong>{{ row.id }}</strong>
          <span>{{ labelStatus(row.procurementMethod) }}</span>
        </div>
      </template>
      <template #title="{ row }">
        <div class="eds-table-primary-cell">
          <strong>{{ row.title }}</strong>
          <span>{{ documentLabel(row.documentId) }}</span>
        </div>
      </template>
      <template #project="{ row }">{{ row.projectId }}</template>
      <template #date="{ row }">{{ formatDateTime(row.createdAt || row.publishedAt) }}</template>
      <template #document="{ row }">{{ documentLabel(row.documentId) }}</template>
      <template #methodScope="{ row }">{{ labelStatus(row.procurementMethod) }} / {{ labelStatus(row.scope) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ labelStatus(row.status) }}</StatusTag>
      </template>
      <template #registrationDeadline="{ row }">{{ formatDateTime(row.registrationDeadlineAt) }}</template>
      <template #quoteDeadline="{ row }">{{ formatDateTime(row.quoteDeadlineAt) }}</template>
      <template #published="{ row }">
        {{ row.status === "published" ? `已发布：${formatDateTime(row.publishedAt)}` : row.status === "closed" ? "已关闭" : "未发布草稿" }}
      </template>
      <template #actions="{ row }">
        <div class="eds-actions-table">
          <EnterpriseButton size="sm" type="text" @click="showDetails(row)">详情</EnterpriseButton>
          <EnterpriseButton v-if="row.status === 'draft'" size="sm" type="primary" @click="emit('select', row.id)">发布</EnterpriseButton>
        </div>
      </template>
    </DataTable>
  </EnterpriseSurface>

  <div v-if="selectedAnnouncement" class="g-hotel-drawer" role="dialog" aria-modal="true" aria-label="公告详情">
    <button class="g-hotel-drawer-mask" type="button" aria-label="关闭详情" @click="selectedAnnouncement = null"></button>
    <aside class="g-hotel-drawer-panel">
      <header>
        <h3>公告详情</h3>
        <button type="button" @click="selectedAnnouncement = null">×</button>
      </header>
      <section>
        <h4>公告信息</h4>
        <div class="g-hotel-detail-list">
          <p><span>标题：</span>{{ selectedAnnouncement.title }}</p>
          <p><span>类型：</span>{{ labelStatus(selectedAnnouncement.procurementMethod) }}</p>
          <p><span>范围：</span>{{ labelStatus(selectedAnnouncement.scope) }}</p>
          <p><span>状态：</span>{{ labelStatus(selectedAnnouncement.status) }}</p>
          <p><span>采购文件：</span>{{ documentLabel(selectedAnnouncement.documentId) }}</p>
        </div>
      </section>
      <section>
        <h4>关键时间</h4>
        <div class="g-hotel-detail-list">
          <p><span>报名截止：</span>{{ formatDateTime(selectedAnnouncement.registrationDeadlineAt) }}</p>
          <p><span>报价截止：</span>{{ formatDateTime(selectedAnnouncement.quoteDeadlineAt) }}</p>
          <p><span>发布时间：</span>{{ formatDateTime(selectedAnnouncement.publishedAt) }}</p>
        </div>
      </section>
      <footer>
        <EnterpriseButton @click="selectedAnnouncement = null">关闭</EnterpriseButton>
      </footer>
    </aside>
  </div>
</template>
