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
  projectName: string;
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

interface ProjectNameSource {
  id: string;
  code?: string;
  name?: string;
  sourceRequestTitle?: string;
  displayName?: string;
}

function projectDisplayName(project: ProjectNameSource) {
  const explicitName = project.name?.trim() || project.sourceRequestTitle?.trim();
  if (explicitName) return explicitName;
  const displayName = project.displayName?.trim();
  const codePrefix = project.code ? `${project.code} / ` : '';
  if (displayName && codePrefix && displayName.startsWith(codePrefix)) return displayName.slice(codePrefix.length).trim();
  if (displayName && displayName !== project.id && displayName !== project.code) return displayName;
  return '项目名称暂不可用';
}

function resolveProjectName(projects: Map<string, ProjectNameSource>, projectId: string | undefined, businessType: R8ApprovalBusinessType) {
  if (!projectId) return businessType === 'procurement_request' ? '尚未生成采购项目' : '未关联采购项目';
  const project = projects.get(projectId);
  if (!project) return '项目名称暂不可用';
  return projectDisplayName(project);
}

function findCompatibleR8Task(processTask: ProcessTaskView, r8Tasks: Awaited<ReturnType<typeof loadWorkflowTasks>>) {
  return r8Tasks.find(
    (task) =>
      task.businessId === processTask.businessId &&
      task.status === processTask.status
  );
}

export async function loadAuthSession(userId?: string) {
  return apiGet<AuthSessionResponse>('/api/auth/session', userId);
}

export async function loadUnifiedTasks(userId?: string): Promise<UnifiedTaskLoadResult> {
  const session = await loadAuthSession(userId);
  const [processResult, r8Result, projectsResult] = await Promise.allSettled([
    loadProcessTasks(userId),
    loadWorkflowTasks(session, 'all', userId),
    apiGet<{ projects: ProjectNameSource[] }>('/api/projects', userId)
  ]);

  const processTasks = processResult.status === 'fulfilled' ? processResult.value : [];
  const r8Tasks = r8Result.status === 'fulfilled' ? r8Result.value : [];
  const projects = new Map(
    (projectsResult.status === 'fulfilled' ? projectsResult.value.projects : []).map((project) => [project.id, project])
  );
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
        projectName: resolveProjectName(projects, task.projectId, task.businessType),
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
        projectName: resolveProjectName(projects, task.projectId, task.businessType),
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
      }))
  ];

  const warnings: string[] = [];
  if (processResult.status === 'rejected' && r8Result.status === 'rejected') {
    throw (r8Result.reason instanceof Error ? r8Result.reason : new Error('待办任务加载失败'));
  }
  if (processResult.status === 'rejected') {
    warnings.push('业务待办暂时不可用，当前仅展示审批任务。');
  }
  if (projectsResult.status === 'rejected') {
    warnings.push('项目名称暂时不可用，请稍后刷新。');
  }
  return { tasks, errorMessage: warnings.join(' ') };
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
