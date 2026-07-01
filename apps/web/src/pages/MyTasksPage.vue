<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import {
  approveWorkflowInstance,
  completeWorkflowTask,
  loadWorkflowTasks,
  rejectWorkflowInstance,
  type R8ApprovalBusinessType,
  type R8WorkflowTaskView
} from "../api/workflow";
import { loadProcessTasks, type ProcessTaskView } from "../api/process";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";
import { formatDateTime } from "../utils/status-labels";
import { r8BusinessTypeLabels } from "../../../api/src/workflow-ui-contract";

type TaskStatusFilter = "all" | "pending" | "handled_by_me" | "completed" | "cancelled";
type DateFilter = "all" | "today" | "7d" | "30d";
type UnifiedTaskSource = "process" | "r8";

interface UnifiedTaskView {
  id: string;
  source: UnifiedTaskSource;
  sourceLabel: string;
  actionTaskId?: string;
  approvalInstanceId?: string;
  businessType: R8ApprovalBusinessType;
  businessId: string;
  projectId?: string;
  taskTypeLabel: string;
  title: string;
  businessTypeLabel: string;
  status: string;
  statusLabel: string;
  assigneeLabel: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
  processStatusLabel?: string;
  nodeLabel?: string;
  targetPath: string;
  targetLabel: string;
  canComplete: boolean;
}

const session = useSessionStore();
const processTasks = ref<ProcessTaskView[]>([]);
const r8Tasks = ref<R8WorkflowTaskView[]>([]);
const loading = ref(false);
const error = ref("");
const auditLogId = ref("");
const statusFilter = ref<TaskStatusFilter>("pending");
const businessTypeFilter = ref<"all" | R8ApprovalBusinessType>("all");
const dateFilter = ref<DateFilter>("all");
const actionBusy = ref("");
const opinion = ref("页面验收处理意见：资料符合当前节点要求。");

function findCompatibleR8Task(processTask: ProcessTaskView) {
  return r8Tasks.value.find(
    (task) =>
      task.businessType === processTask.businessType &&
      task.businessId === processTask.businessId &&
      task.taskType === processTask.taskType &&
      task.status === processTask.status
  );
}

const tasks = computed<UnifiedTaskView[]>(() => {
  const matchedR8TaskIds = new Set<string>();
  const processRows = processTasks.value.map((task) => {
    const r8Task = findCompatibleR8Task(task);
    if (r8Task) matchedR8TaskIds.add(r8Task.id);
    return {
      id: task.id,
      source: "process" as const,
      sourceLabel: "Process",
      actionTaskId: r8Task?.id,
      approvalInstanceId: r8Task?.approvalInstanceId,
      businessType: task.businessType,
      businessId: task.businessId,
      projectId: task.projectId,
      taskTypeLabel: task.taskTypeLabel,
      title: task.businessTitle || task.title,
      businessTypeLabel: task.businessTypeLabel,
      status: task.status,
      statusLabel: task.statusLabel,
      assigneeLabel: task.assigneeLabel,
      createdAt: task.createdAt,
      completedAt: r8Task?.completedAt ?? task.processCompletedAt,
      completedBy: r8Task?.completedBy,
      processStatusLabel: task.processStatusLabel,
      nodeLabel: task.nodeLabel,
      targetPath: task.targetPath,
      targetLabel: task.targetLabel,
      canComplete: Boolean(r8Task?.canComplete)
    };
  });
  const r8Rows = r8Tasks.value
    .filter((task) => !matchedR8TaskIds.has(task.id))
    .map((task) => ({
      id: task.id,
      source: "r8" as const,
      sourceLabel: "R8 兼容",
      actionTaskId: task.id,
      approvalInstanceId: task.approvalInstanceId,
      businessType: task.businessType,
      businessId: task.businessId,
      projectId: task.projectId,
      taskTypeLabel: task.taskTypeLabel,
      title: task.title,
      businessTypeLabel: task.businessTypeLabel,
      status: task.status,
      statusLabel: task.statusLabel,
      assigneeLabel: task.assigneeLabel,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      completedBy: task.completedBy,
      targetPath: task.targetPath,
      targetLabel: task.targetLabel,
      canComplete: task.canComplete
    }));
  return [...processRows, ...r8Rows];
});

const businessTypeOptions = computed(() => {
  const seen = new Set(tasks.value.map((task) => task.businessType));
  return Array.from(seen).map((value) => ({ value, label: r8BusinessTypeLabels[value] ?? value }));
});

const taskStats = computed(() => ({
  pending: tasks.value.filter((task) => task.status === "pending").length,
  handledByMe: tasks.value.filter((task) => task.completedBy === session.user?.id).length,
  completed: tasks.value.filter((task) => task.status === "completed").length
}));

function createdAfter(task: UnifiedTaskView) {
  if (dateFilter.value === "all") return true;
  const created = new Date(task.createdAt).getTime();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  if (dateFilter.value === "today") return new Date(task.createdAt).toDateString() === new Date().toDateString();
  if (dateFilter.value === "7d") return now - created <= 7 * oneDay;
  return now - created <= 30 * oneDay;
}

const filteredTasks = computed(() =>
  tasks.value
    .filter((task) => businessTypeFilter.value === "all" || task.businessType === businessTypeFilter.value)
    .filter((task) => {
      if (statusFilter.value === "all") return true;
      if (statusFilter.value === "handled_by_me") return task.completedBy === session.user?.id;
      return task.status === statusFilter.value;
    })
    .filter(createdAfter)
);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [processResult, r8Result] = await Promise.allSettled([loadProcessTasks(), loadWorkflowTasks(session)]);
    processTasks.value = processResult.status === "fulfilled" ? processResult.value : [];
    r8Tasks.value = r8Result.status === "fulfilled" ? r8Result.value : [];
    if (processResult.status === "rejected" && r8Result.status === "rejected") throw r8Result.reason;
    if (processResult.status === "rejected") error.value = "Process 待办暂不可用，已显示 R8 兼容待办。";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "任务加载失败";
    processTasks.value = [];
    r8Tasks.value = [];
  } finally {
    loading.value = false;
  }
}

async function runTaskAction(task: UnifiedTaskView, action: "approve" | "reject" | "complete") {
  actionBusy.value = `${action}:${task.id}`;
  error.value = "";
  auditLogId.value = "";
  try {
    if (action === "approve" && task.approvalInstanceId) {
      const result = await approveWorkflowInstance(task.approvalInstanceId, opinion.value);
      auditLogId.value = result.auditLogId ?? "";
    } else if (action === "reject" && task.approvalInstanceId) {
      const result = await rejectWorkflowInstance(task.approvalInstanceId, opinion.value || "页面验收驳回。");
      auditLogId.value = result.auditLogId ?? "";
    } else if (task.actionTaskId) {
      const result = await completeWorkflowTask(task.actionTaskId);
      auditLogId.value = result.auditLogId ?? "";
    } else {
      throw new Error("该任务当前仅可查看流程轨迹。");
    }
    await load();
  } catch (err) {
    const typed = err as Error & { auditLogId?: string };
    error.value = typed.message;
    auditLogId.value = typed.auditLogId ?? "";
  } finally {
    actionBusy.value = "";
  }
}

onMounted(load);

watch(
  () => session.roleId,
  () => {
    void load();
  }
);
</script>

<template>
  <section class="panel">
    <div class="page-head">
      <div>
        <p class="eyebrow">Process + R8 任务中心</p>
        <h2>待办中心</h2>
      </div>
      <RouterLink class="secondary-button link-button" to="/messages">消息中心</RouterLink>
    </div>

    <div class="metrics">
      <div><strong>{{ taskStats.pending }}</strong><span>待办任务</span></div>
      <div><strong>{{ taskStats.handledByMe }}</strong><span>我已处理</span></div>
      <div><strong>{{ taskStats.completed }}</strong><span>已完成任务</span></div>
      <div><strong>{{ session.roleId === "admin" ? "不处理业务" : "按角色隔离" }}</strong><span>权限边界</span></div>
    </div>
  </section>

  <section class="panel">
    <div class="form-grid">
      <label>
        状态
        <select v-model="statusFilter">
          <option value="all">全部任务</option>
          <option value="pending">待办</option>
          <option value="handled_by_me">已办</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </label>
      <label>
        业务类型
        <select v-model="businessTypeFilter">
          <option value="all">全部业务</option>
          <option v-for="item in businessTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <label>
        时间
        <select v-model="dateFilter">
          <option value="all">全部时间</option>
          <option value="today">今天</option>
          <option value="7d">近 7 天</option>
          <option value="30d">近 30 天</option>
        </select>
      </label>
      <label>
        处理意见
        <input v-model="opinion" />
      </label>
    </div>

    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />

    <div v-if="loading" class="notice">正在加载任务...</div>
    <div v-else-if="filteredTasks.length === 0" class="empty">当前筛选条件下没有可见任务。</div>

    <table v-else>
      <thead>
        <tr>
          <th>任务</th>
          <th>业务对象</th>
          <th>状态</th>
          <th>分派</th>
          <th>时间</th>
          <th>入口</th>
          <th>处理</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="task in filteredTasks" :key="task.id">
          <td>
            <strong>{{ task.taskTypeLabel }} <span class="tag subtle-tag">{{ task.sourceLabel }}</span></strong>
            <small>{{ task.title }}</small>
            <small v-if="task.nodeLabel">当前节点：{{ task.nodeLabel }} / 流程状态：{{ task.processStatusLabel }}</small>
          </td>
          <td>{{ task.businessTypeLabel }} / {{ task.businessId }}</td>
          <td><span class="tag">{{ task.statusLabel }}</span></td>
          <td>{{ task.assigneeLabel }}</td>
          <td>
            <span>创建：{{ formatDateTime(task.createdAt) }}</span>
            <small v-if="task.completedAt">完成：{{ formatDateTime(task.completedAt) }}</small>
          </td>
          <td><RouterLink class="secondary-button link-button" :to="task.targetPath">{{ task.targetLabel }}</RouterLink></td>
          <td class="actions">
            <button
              v-if="task.approvalInstanceId"
              type="button"
              :disabled="!task.canComplete || Boolean(actionBusy)"
              @click="runTaskAction(task, 'approve')"
            >
              同意
            </button>
            <button
              v-if="task.approvalInstanceId"
              type="button"
              class="secondary-button"
              :disabled="!task.canComplete || Boolean(actionBusy)"
              @click="runTaskAction(task, 'reject')"
            >
              驳回
            </button>
            <button
              v-if="!task.approvalInstanceId && task.actionTaskId"
              type="button"
              :disabled="!task.canComplete || Boolean(actionBusy)"
              @click="runTaskAction(task, 'complete')"
            >
              完成任务
            </button>
            <span v-if="!task.canComplete" class="notice">只读或无处理权限</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
