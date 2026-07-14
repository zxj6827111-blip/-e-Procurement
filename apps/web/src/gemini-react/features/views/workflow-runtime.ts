import { apiGet } from '../../../api/http';
import {
  approveWorkflowInstance,
  completeWorkflowTask,
  loadWorkflowNotifications,
  loadWorkflowTasks,
  markNotificationRead as markWorkflowNotificationRead,
  rejectWorkflowInstance,
  type R8ApprovalBusinessType,
  type R8WorkflowNotificationView,
  type WorkflowSessionLike
} from '../../../api/workflow';
import { loadProcessTasks, type ProcessTaskView } from '../../../api/process';

export interface AuthSessionResponse extends WorkflowSessionLike {
  user: {
    id: string;
    supplierId?: string;
    expertId?: string;
  } | null;
}

export interface UnifiedTaskView {
  id: string;
  source: 'process' | 'r8';
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

export interface UnifiedTaskLoadResult {
  tasks: UnifiedTaskView[];
  errorMessage: string;
}

function findCompatibleR8Task(processTask: ProcessTaskView, r8Tasks: Awaited<ReturnType<typeof loadWorkflowTasks>>) {
  return r8Tasks.find(
    (task) =>
      task.businessType === processTask.businessType &&
      task.businessId === processTask.businessId &&
      task.taskType === processTask.taskType &&
      task.status === processTask.status
  );
}

export async function loadAuthSession(userId?: string) {
  return apiGet<AuthSessionResponse>('/api/auth/session', userId);
}

export async function loadUnifiedTasks(userId?: string): Promise<UnifiedTaskLoadResult> {
  const session = await loadAuthSession(userId);
  const [processResult, r8Result] = await Promise.allSettled([loadProcessTasks(userId), loadWorkflowTasks(session, 'all', userId)]);

  const processTasks = processResult.status === 'fulfilled' ? processResult.value : [];
  const r8Tasks = r8Result.status === 'fulfilled' ? r8Result.value : [];
  const matchedR8TaskIds = new Set<string>();
  const tasks: UnifiedTaskView[] = [
    ...processTasks.map((task) => {
      const r8Task = findCompatibleR8Task(task, r8Tasks);
      if (r8Task) matchedR8TaskIds.add(r8Task.id);
      return {
        id: task.id,
        source: 'process' as const,
        sourceLabel: '业务待办',
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
    }),
    ...r8Tasks
      .filter((task) => !matchedR8TaskIds.has(task.id))
      .map((task) => ({
        id: task.id,
        source: 'r8' as const,
        sourceLabel: '审批任务',
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
      }))
  ];

  let errorMessage = '';
  if (processResult.status === 'rejected' && r8Result.status === 'rejected') {
    throw (r8Result.reason instanceof Error ? r8Result.reason : new Error('待办任务加载失败'));
  }
  if (processResult.status === 'rejected') {
    errorMessage = '业务待办暂时不可用，当前仅展示审批任务。';
  }
  return { tasks, errorMessage };
}

export async function loadNotifications(userId?: string): Promise<R8WorkflowNotificationView[]> {
  return loadWorkflowNotifications('all', userId);
}

export async function markNotificationRead(messageId: string, userId?: string) {
  return markWorkflowNotificationRead(messageId, userId);
}

export async function markNotificationsRead(messageIds: string[], userId?: string) {
  if (!messageIds.length) return [];
  return Promise.all(messageIds.map((messageId) => markWorkflowNotificationRead(messageId, userId)));
}

export async function runTaskAction(task: UnifiedTaskView, action: 'approve' | 'reject' | 'complete', opinion: string, userId?: string) {
  if (action === 'approve' && task.approvalInstanceId) {
    return approveWorkflowInstance(task.approvalInstanceId, opinion, userId);
  }
  if (action === 'reject' && task.approvalInstanceId) {
    return rejectWorkflowInstance(task.approvalInstanceId, opinion || '页面处理驳回。', userId);
  }
  if (task.actionTaskId) {
    return completeWorkflowTask(task.actionTaskId, userId);
  }
  throw new Error('该任务当前只有查看路径，没有可执行动作。');
}

export function formatDateTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}
