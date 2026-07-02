import { computed, onMounted, ref, watch } from "vue";
import { loadWorkflowNotifications, markNotificationRead, type R8ApprovalBusinessType, type R8WorkflowNotificationView } from "../../api/workflow";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { r8BusinessTypeLabels } from "../../../../api/src/workflow-ui-contract";
import type { BusinessTypeOption, ReadFilter } from "./types";

export function useMessageCenterPage() {
  const session = useSessionStore();
  const messages = ref<R8WorkflowNotificationView[]>([]);
  const loading = ref(false);
  const error = ref("");
  const readFilter = ref<ReadFilter>("unread");
  const businessTypeFilter = ref<"all" | R8ApprovalBusinessType>("all");
  const busyMessageId = ref("");

  const businessTypeOptions = computed<BusinessTypeOption[]>(() => {
    const seen = new Set(messages.value.map((message) => message.businessType));
    return Array.from(seen).map((value) => ({ value, label: r8BusinessTypeLabels[value] ?? value }));
  });

  const stats = computed(() => ({
    unread: messages.value.filter((message) => !message.read).length,
    read: messages.value.filter((message) => message.read).length,
    total: messages.value.length
  }));

  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "未读消息", value: stats.value.unread, meta: "需处理" },
    { label: "已读消息", value: stats.value.read, meta: "已确认" },
    { label: "可见消息", value: stats.value.total, meta: "当前角色" },
    { label: "可见范围", value: session.roleId === "admin" ? "不接收业务消息" : "按权限过滤", meta: session.roleId || "未登录" }
  ]);

  const filteredMessages = computed(() =>
    messages.value
      .filter((message) => businessTypeFilter.value === "all" || message.businessType === businessTypeFilter.value)
      .filter((message) => {
        if (readFilter.value === "all") return true;
        return readFilter.value === "read" ? message.read : !message.read;
      })
  );

  const hasUnreadVisible = computed(() => filteredMessages.value.some((item) => !item.read));

  async function load() {
    if (!session.roleId) return;
    loading.value = true;
    error.value = "";
    try {
      messages.value = await loadWorkflowNotifications();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "消息加载失败";
      messages.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function markRead(message: R8WorkflowNotificationView) {
    busyMessageId.value = message.id;
    error.value = "";
    try {
      const updated = await markNotificationRead(message.id);
      messages.value = messages.value.map((item) => (item.id === updated.id ? updated : item));
    } catch (err) {
      error.value = err instanceof Error ? err.message : "标记已读失败";
    } finally {
      busyMessageId.value = "";
    }
  }

  async function markAllVisibleRead() {
    for (const message of filteredMessages.value.filter((item) => !item.read)) {
      await markRead(message);
    }
  }

  onMounted(load);

  watch(
    () => session.roleId,
    () => {
      void load();
    }
  );

  return {
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
  };
}
