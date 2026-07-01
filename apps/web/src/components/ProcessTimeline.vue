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
import ErrorAlert from "./ErrorAlert.vue";
import { formatDateTime } from "../utils/status-labels";

const props = withDefaults(
  defineProps<{
    businessType: ProcessBusinessType;
    businessId?: string;
    title?: string;
    refreshKey?: number;
  }>(),
  {
    title: "流程进度",
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
    error.value = err instanceof Error ? err.message : "流程轨迹加载失败";
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
  <section class="process-timeline">
    <div class="section-title">
      <div>
        <p class="eyebrow">Process Layer 只读视图</p>
        <h3>{{ title }}</h3>
      </div>
      <span class="tag">只读</span>
    </div>

    <div v-if="loading" class="notice">正在加载流程轨迹...</div>
    <ErrorAlert v-else-if="error" :message="error" />
    <div v-else-if="!primaryInstance" class="empty">当前业务对象暂无可查看的流程轨迹。</div>

    <template v-else>
      <div class="process-progress-grid">
        <div>
          <span>流程状态</span>
          <strong>{{ currentStatusLabel }}</strong>
        </div>
        <div>
          <span>当前节点</span>
          <strong>{{ currentNodeLabel }}</strong>
        </div>
        <div>
          <span>当前处理角色</span>
          <strong>{{ currentRoleLabel }}</strong>
        </div>
        <div>
          <span>开始时间</span>
          <strong>{{ formatDateTime(primaryInstance.startedAt) }}</strong>
        </div>
        <div>
          <span>完成时间</span>
          <strong>{{ formatDateTime(primaryInstance.completedAt) }}</strong>
        </div>
      </div>

      <ol class="process-event-list">
        <li v-for="event in events" :key="event.id">
          <span class="process-event-dot" aria-hidden="true"></span>
          <div>
            <strong>{{ event.eventName }}</strong>
            <small>{{ formatDateTime(event.createdAt) }} / {{ processNodeLabel(event.toNodeKey) }} / {{ processStatusLabel(event.toStatus) }}</small>
          </div>
        </li>
      </ol>
    </template>
  </section>
</template>
