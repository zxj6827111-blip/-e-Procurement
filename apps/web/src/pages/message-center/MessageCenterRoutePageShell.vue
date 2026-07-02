<script setup lang="ts">
import ErrorAlert from "../../components/ErrorAlert.vue";
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
</template>

