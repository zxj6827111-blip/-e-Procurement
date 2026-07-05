<script setup lang="ts">
import ErrorAlert from "../../components/ErrorAlert.vue";
import { EnterpriseSurface } from "../../components/base";
import MessageCenterPageShell from "./MessageCenterPageShell.vue";
import MessageFilterPanel from "./MessageFilterPanel.vue";
import MessageTable from "./MessageTable.vue";
import { useMessageCenterPage } from "./useMessageCenterPage";

const {
  businessTypeFilter,
  businessTypeOptions,
  busyMessageId,
  error,
  filteredMessages,
  hasUnreadVisible,
  loading,
  markAllVisibleRead,
  markRead,
  readFilter,
  summaryItems
} = useMessageCenterPage();
</script>

<template>
  <section class="eds-section">
    <MessageCenterPageShell :loading="loading" :summary-items="summaryItems" />

    <div class="eds-process-shell">
      <section class="eds-panel-stack">
        <MessageFilterPanel
          v-model:business-type-filter="businessTypeFilter"
          v-model:read-filter="readFilter"
          :business-type-options="businessTypeOptions"
          :busy-message-id="busyMessageId"
          :has-unread-visible="hasUnreadVisible"
          @mark-all-visible-read="markAllVisibleRead"
        />

        <ErrorAlert v-if="error" :message="error" />

        <MessageTable :busy-message-id="busyMessageId" :loading="loading" :messages="filteredMessages" @mark-read="markRead" />
      </section>

      <aside class="eds-panel-stack">
        <EnterpriseSurface title="当前处理边界" description="本页只做消息分流和已读管理，不在这里替代真实业务流。">
          <p class="eds-meta">当前可见消息：{{ filteredMessages.length }}</p>
          <p class="eds-meta">如果仍有未读消息，建议先按业务类型收窄范围，再做批量已读。</p>
        </EnterpriseSurface>
      </aside>
    </div>
  </section>
</template>
