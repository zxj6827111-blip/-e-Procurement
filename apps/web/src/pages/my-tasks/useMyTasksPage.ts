import { computed, onMounted, ref, watch } from "vue";
import { approveWorkflowInstance, completeWorkflowTask, loadWorkflowTasks, rejectWorkflowInstance, type R8ApprovalBusinessType, type R8WorkflowTaskView } from "../../api/workflow";
import { apiGet } from "../../api/http";
import { loadProcessTasks, type ProcessTaskView } from "../../api/process";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { r8BusinessTypeLabels } from "../../../../api/src/workflow-ui-contract";
import type { BusinessTypeOption, DateFilter, TaskAction, TaskProjectView, TaskStatusFilter, UnifiedTaskView } from "./types";

export function useMyTasksPage() {
  const session = useSessionStore();
  const processTasks = ref<ProcessTaskView[]>([]);
  const r8Tasks = ref<R8WorkflowTaskView[]>([]);
  const projects = ref<TaskProjectView[]>([]);
  const loading = ref(false);
  const error = ref("");
  const auditLogId = ref("");
  const statusFilter = ref<TaskStatusFilter>("pending");
  const businessTypeFilter = ref<"all" | R8ApprovalBusinessType>("all");
  const dateFilter = ref<DateFilter>("all");
  const actionBusy = ref("");
  const opinion = ref("页面验收处理意见：资料符合当前环节要求。");

  function findCompatibleR8Task(processTask: ProcessTaskView) {
    return r8Tasks.value.find(
      (task) =>
        task.businessId === processTask.businessId &&
        task.status === processTask.status
    );
  }

  function resolveProjectName(task: Pick<UnifiedTaskView, "businessType" | "projectId">) {
    if (!task.projectId) {
      return task.businessType === "procurement_request" ? "尚未生成采购项目" : "未关联采购项目";
    }
    const project = projects.value.find((item) => item.id === task.projectId);
    if (!project) return "项目名称暂不可用";
    const explicitName = project.name?.trim() || project.sourceRequestTitle?.trim();
    if (explicitName) return explicitName;
    const displayName = project.displayName?.trim();
    const codePrefix = project.code ? `${project.code} / ` : "";
    if (displayName && codePrefix && displayName.startsWith(codePrefix)) return displayName.slice(codePrefix.length).trim();
    if (displayName && displayName !== project.id && displayName !== project.code) return displayName;
    return "项目名称暂不可用";
  }

  const tasks = computed<UnifiedTaskView[]>(() => {
    const matchedR8TaskIds = new Set<string>();
    const processRows = processTasks.value.map((task) => {
      const r8Task = findCompatibleR8Task(task);
      if (r8Task) matchedR8TaskIds.add(r8Task.id);
      return {
        id: task.id,
        source: "process" as const,
        sourceLabel: "业务待办",
        actionTaskId: r8Task?.id,
        approvalInstanceId: r8Task?.approvalInstanceId,
        businessType: task.businessType,
        businessId: task.businessId,
        projectId: task.projectId,
        projectName: resolveProjectName(task),
        taskTypeLabel: task.taskTypeLabel,
        title: r8Task?.taskTypeLabel ?? task.taskTypeLabel,
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
        sourceLabel: "审批任务",
        actionTaskId: task.id,
        approvalInstanceId: task.approvalInstanceId,
        businessType: task.businessType,
        businessId: task.businessId,
        projectId: task.projectId,
        projectName: resolveProjectName(task),
        taskTypeLabel: task.taskTypeLabel,
        title: task.taskTypeLabel,
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

  const businessTypeOptions = computed<BusinessTypeOption[]>(() => {
    const seen = new Set(tasks.value.map((task) => task.businessType));
    return Array.from(seen).map((value) => ({ value, label: r8BusinessTypeLabels[value] ?? value }));
  });

  const taskStats = computed(() => ({
    pending: tasks.value.filter((task) => task.status === "pending").length,
    handledByMe: tasks.value.filter((task) => task.completedBy === session.user?.id).length,
    completed: tasks.value.filter((task) => task.status === "completed").length
  }));

  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "待办任务", value: taskStats.value.pending, meta: "当前角色可处理" },
    { label: "我已处理", value: taskStats.value.handledByMe, meta: "按当前用户统计" },
    { label: "已完成任务", value: taskStats.value.completed, meta: "业务任务归档" },
    { label: "权限边界", value: session.roleId === "admin" ? "不处理业务" : "按角色隔离", meta: "待办按角色与组织过滤" }
  ]);

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
      const [processResult, r8Result, projectResult] = await Promise.allSettled([
        loadProcessTasks(),
        loadWorkflowTasks(session),
        apiGet<{ projects: TaskProjectView[] }>("/api/projects")
      ]);
      processTasks.value = processResult.status === "fulfilled" ? processResult.value : [];
      r8Tasks.value = r8Result.status === "fulfilled" ? r8Result.value : [];
      projects.value = projectResult.status === "fulfilled" ? projectResult.value.projects : [];
      if (processResult.status === "rejected" && r8Result.status === "rejected") throw r8Result.reason;
      if (processResult.status === "rejected") error.value = "业务待办暂不可用，已显示审批任务。";
    } catch (err) {
      error.value = err instanceof Error ? err.message : "任务加载失败";
      processTasks.value = [];
      r8Tasks.value = [];
      projects.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function runTaskAction(task: UnifiedTaskView, action: TaskAction) {
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
        throw new Error("该任务当前仅可查看活动记录。");
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

  return {
    actionBusy,
    auditLogId,
    businessTypeFilter,
    businessTypeOptions,
    dateFilter,
    error,
    filteredTasks,
    loading,
    opinion,
    runTaskAction,
    statusFilter,
    summaryItems
  };
}
