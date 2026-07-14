import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { ArrowLeft, ArrowRight, CheckCircle2, Filter, ListTodo, Search, XCircle } from 'lucide-react';
import { formatDateTime, loadUnifiedTasks, runTaskAction, type UnifiedTaskView } from './workflow-runtime';

type StatusFilter = 'all' | 'pending' | 'completed' | 'cancelled';

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'outline' {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'cancelled') return 'outline';
  return 'default';
}

function actionLabel(task: UnifiedTaskView) {
  if (task.status === 'pending' && task.canComplete && task.approvalInstanceId) return '审批处理';
  if (task.status === 'pending' && task.canComplete && task.actionTaskId) return '完成任务';
  return '查看业务';
}

export function TodoView() {
  const { currentUser, navigateToPath } = useApp();
  const [tasks, setTasks] = useState<UnifiedTaskView[]>([]);
  const [selectedTask, setSelectedTask] = useState<UnifiedTaskView | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [opinion, setOpinion] = useState('页面处理意见：资料已核对。');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const load = async () => {
    if (!currentUser?.id) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await loadUnifiedTasks(currentUser.id);
      setTasks(result.tasks);
      setHint(result.errorMessage);
    } catch (err) {
      setTasks([]);
      setHint('');
      setError(err instanceof Error ? err.message : '待办任务加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentUser?.id]);

  const filteredTasks = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesKeyword =
        !text ||
        [task.title, task.businessId, task.businessTypeLabel, task.taskTypeLabel, task.assigneeLabel]
          .join(' ')
          .toLowerCase()
          .includes(text);
      return matchesStatus && matchesKeyword;
    });
  }, [keyword, statusFilter, tasks]);

  const handleTaskAction = async (task: UnifiedTaskView, action: 'approve' | 'reject' | 'complete') => {
    if (!currentUser?.id) return;
    if (task.status !== 'pending' || !task.canComplete) {
      setError('该任务已完成或当前账号无权处理，请刷新待办列表。');
      return;
    }
    setActionBusy(`${action}:${task.id}`);
    setError('');
    try {
      await runTaskAction(task, action, opinion, currentUser.id);
      await load();
      setSelectedTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '任务处理失败');
    } finally {
      setActionBusy('');
    }
  };

  if (selectedTask) {
    const actionKey = (action: 'approve' | 'reject' | 'complete') => `${action}:${selectedTask.id}`;
    const canProcessTask = selectedTask.status === 'pending' && selectedTask.canComplete;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="p-2 hover:bg-slate-100" onClick={() => setSelectedTask(null)}>
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
              <ListTodo className="h-5 w-5 text-slate-700" />
              任务处理
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedTask.businessTypeLabel} / {selectedTask.taskTypeLabel}
            </p>
          </div>
        </div>

        {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <Card>
          <CardHeader className="border-b border-slate-100 bg-slate-50 py-4">
            <CardTitle className="text-base font-semibold text-slate-800">任务信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 p-6 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm text-slate-500">任务标题</p>
              <p className="font-medium text-slate-900">{selectedTask.title}</p>
            </div>
            <div>
              <p className="mb-1 text-sm text-slate-500">关联业务</p>
              <p className="font-medium text-slate-900">
                {selectedTask.businessId}
                {selectedTask.projectId ? ` / ${selectedTask.projectId}` : ''}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm text-slate-500">当前状态</p>
              <Badge variant={statusVariant(selectedTask.status)}>{selectedTask.statusLabel}</Badge>
            </div>
            <div>
              <p className="mb-1 text-sm text-slate-500">处理角色</p>
              <p className="font-medium text-slate-900">{selectedTask.assigneeLabel || '-'}</p>
            </div>
            <div>
              <p className="mb-1 text-sm text-slate-500">创建时间</p>
              <p className="font-medium text-slate-900">{formatDateTime(selectedTask.createdAt)}</p>
            </div>
            <div>
              <p className="mb-1 text-sm text-slate-500">业务入口</p>
              <Button variant="outline" onClick={() => navigateToPath(selectedTask.targetPath)}>
                打开 {selectedTask.targetLabel}
              </Button>
            </div>
            {selectedTask.nodeLabel ? (
              <div className="md:col-span-2">
                <p className="mb-1 text-sm text-slate-500">流程节点</p>
                <p className="font-medium text-slate-900">
                  {selectedTask.nodeLabel}
                  {selectedTask.processStatusLabel ? ` / ${selectedTask.processStatusLabel}` : ''}
                </p>
              </div>
            ) : null}
            {canProcessTask ? (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">处理意见</label>
                <textarea
                  rows={4}
                  value={opinion}
                  onChange={(event) => setOpinion(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="请输入审批或处理意见"
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigateToPath(selectedTask.targetPath)}>
            查看业务页面
          </Button>
          {canProcessTask && selectedTask.approvalInstanceId ? (
            <>
              <Button
                variant="outline"
                className="border-rose-200 text-rose-600 hover:bg-rose-50"
                disabled={actionBusy.length > 0}
                onClick={() => void handleTaskAction(selectedTask, 'reject')}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {actionBusy === actionKey('reject') ? '处理中...' : '驳回'}
              </Button>
              <Button disabled={actionBusy.length > 0} onClick={() => void handleTaskAction(selectedTask, 'approve')}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {actionBusy === actionKey('approve') ? '处理中...' : '同意'}
              </Button>
            </>
          ) : canProcessTask && selectedTask.actionTaskId ? (
            <Button disabled={actionBusy.length > 0} onClick={() => void handleTaskAction(selectedTask, 'complete')}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {actionBusy === actionKey('complete') ? '处理中...' : '标记完成'}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-ui-check="todo-view">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <ListTodo className="h-6 w-6 text-slate-700" />
            我的待办
          </h2>
          <p className="mt-1 text-sm text-slate-500">这里展示当前账号真实可处理的业务任务和审批任务。</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          刷新
        </Button>
      </div>

      {hint ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{hint}</div> : null}
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <Card data-ui-check="todo-list">
        <div className="flex gap-4 border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索任务标题、业务单号、项目号"
              className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 border-0 bg-transparent text-sm focus:outline-none"
            >
              <option value="all">全部状态</option>
              <option value="pending">待处理</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 text-center text-slate-500">正在加载待办任务...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-500" data-ui-check="todo-empty-state">当前没有可展示的待办任务。</div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50" data-ui-check="todo-row">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{task.sourceLabel}</Badge>
                    <Badge variant={statusVariant(task.status)}>{task.statusLabel}</Badge>
                    <span className="font-medium text-slate-900">{task.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span>{task.businessTypeLabel}</span>
                    <span>{task.businessId}</span>
                    {task.projectId ? <span>{task.projectId}</span> : null}
                    <span>{formatDateTime(task.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => navigateToPath(task.targetPath)}>
                    打开业务
                  </Button>
                  <Button size="sm" onClick={() => setSelectedTask(task)}>
                    {actionLabel(task)}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
