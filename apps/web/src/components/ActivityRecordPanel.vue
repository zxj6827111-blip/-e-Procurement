<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  loadBusinessProcess,
  processNodeLabel,
  processRoleLabel,
  processStatusLabel,
  type ProcessBusinessResponse,
  type ProcessBusinessType,
  type ProcessInstanceView
} from "../api/process";
import { formatDateTime } from "../utils/status-labels";
import ErrorAlert from "./ErrorAlert.vue";
import { DataTable, EnterpriseSurface, FeedbackMessage, StatusTag, SummaryCards, type DataTableColumn } from "./base";

const props = withDefaults(
  defineProps<{
    businessType: ProcessBusinessType;
    businessId?: string;
    title?: string;
    refreshKey?: number;
  }>(),
  {
    title: "活动记录",
    businessId: "",
    refreshKey: 0
  }
);

const loading = ref(false);
const error = ref("");
const processData = ref<ProcessBusinessResponse | null>(null);

const primaryInstance = computed<ProcessInstanceView | null>(() => processData.value?.processInstances[0] ?? null);
const currentTask = computed(() => processData.value?.tasks.find((task) => task.status === "pending") ?? processData.value?.tasks[0]);
const events = computed(() => processData.value?.events ?? []);

const currentRoleLabel = computed(() => {
  if (!currentTask.value || primaryInstance.value?.status === "completed" || primaryInstance.value?.status === "rejected" || primaryInstance.value?.status === "cancelled") return "无待办";
  return processRoleLabel(currentTask.value.assigneeRoleId);
});
const currentNodeLabel = computed(() => processNodeLabel(primaryInstance.value?.currentNodeKey ?? currentTask.value?.nodeKey));
const currentStatusLabel = computed(() => processStatusLabel(primaryInstance.value?.status));

function activityText(value?: string | null) {
  return String(value || "-").replaceAll("流程", "活动").replaceAll("事件", "活动").replaceAll("节点", "环节");
}

const eventColumns: DataTableColumn[] = [
  { key: "eventName", label: "活动" },
  { key: "nodeLabel", label: "办理环节" },
  { key: "statusLabel", label: "状态" },
  { key: "createdAt", label: "时间" }
];

const eventRows = computed(() =>
  events.value.map((event) => ({
    id: event.id,
    eventName: activityText(event.eventName),
    nodeLabel: activityText(processNodeLabel(event.toNodeKey)),
    statusLabel: processStatusLabel(event.toStatus),
    createdAt: formatDateTime(event.createdAt)
  }))
);

async function load() {
  if (!props.businessId) {
    processData.value = null;
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    processData.value = await loadBusinessProcess(props.businessType, props.businessId);
  } catch (err) {
    processData.value = null;
    error.value = err instanceof Error ? activityText(err.message) : "活动记录加载失败";
  } finally {
    loading.value = false;
  }
}

onMounted(load);

watch(
  () => [props.businessType, props.businessId, props.refreshKey],
  () => {
    void load();
  }
);
</script>

<template>
  <EnterpriseSurface :title="title" eyebrow="活动记录">
    <template #actions>
      <StatusTag>只读</StatusTag>
    </template>

    <FeedbackMessage v-if="loading">正在加载活动记录...</FeedbackMessage>
    <ErrorAlert v-else-if="error" :message="error" />
    <FeedbackMessage v-else-if="!primaryInstance" align="center">当前业务对象暂无可查看的活动记录。</FeedbackMessage>

    <div v-else class="eds-section">
      <SummaryCards
        :items="[
          { label: '办理状态', value: currentStatusLabel },
          { label: '当前环节', value: activityText(currentNodeLabel) },
          { label: '当前处理角色', value: currentRoleLabel },
          { label: '开始时间', value: formatDateTime(primaryInstance.startedAt) },
          { label: '完成时间', value: formatDateTime(primaryInstance.completedAt) }
        ]"
      />

      <DataTable :columns="eventColumns" :rows="eventRows" row-key="id" empty-text="暂无活动记录">
        <template #statusLabel="{ value }">
          <StatusTag :tone="value === '已完成' ? 'success' : value === '已驳回' ? 'error' : 'default'">{{ value }}</StatusTag>
        </template>
      </DataTable>
    </div>
  </EnterpriseSurface>
</template>
