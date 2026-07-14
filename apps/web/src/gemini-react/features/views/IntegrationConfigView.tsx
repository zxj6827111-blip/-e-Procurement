import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Ban, CheckCircle2, Play, RefreshCw, RotateCcw, Search, Send, Settings } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { apiGet, apiPost } from '../../../api/http';
import { formatDateTime, statusLabelMap } from '../../../utils/status-labels';

type IntegrationJobAction = 'execute' | 'retry' | 'repush' | 'cancel';
type LoadState = 'idle' | 'loading';

interface IntegrationLog {
  id: string;
  jobId?: string;
  adapterKey?: string;
  adapter?: string;
  operation: string;
  mode?: string;
  status: string;
  endpoint?: string;
  businessType?: string;
  businessId?: string;
  requestId?: string;
  idempotencyKey?: string;
  attemptCount?: number;
  nextRetryAt?: string | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string | null;
  warning?: string;
  createdAt?: string;
  updatedAt?: string;
  key?: string;
}

interface IntegrationAdapter {
  key: string;
  name: string;
  mode: string;
  logs: IntegrationLog[];
}

interface IntegrationActionResponse {
  log: IntegrationLog;
  warning?: string;
  originalJobId?: string;
  replayMode?: string;
}

function jobKey(job: IntegrationLog) {
  return job.jobId ?? job.id;
}

function statusLabel(value?: string) {
  if (!value) return '-';
  return statusLabelMap[value] ?? value;
}

function statusVariant(status?: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' {
  if (status === 'succeeded') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'running') return 'info';
  if (status === 'pending' || status === 'retrying') return 'warning';
  if (status === 'cancelled') return 'default';
  return 'outline';
}

function adapterHealth(adapter: IntegrationAdapter) {
  const latest = [...(adapter.logs ?? [])].sort(
    (left, right) =>
      new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() -
      new Date(left.updatedAt ?? left.createdAt ?? 0).getTime()
  )[0];
  if (!latest) return { label: '未触发', variant: 'default' as const };
  if (latest.status === 'failed') return { label: '异常', variant: 'danger' as const };
  if (latest.status === 'retrying') return { label: '重试中', variant: 'warning' as const };
  if (latest.status === 'running') return { label: '执行中', variant: 'info' as const };
  if (latest.status === 'pending') return { label: '待执行', variant: 'warning' as const };
  if (latest.status === 'cancelled') return { label: '已取消', variant: 'default' as const };
  return { label: '正常', variant: 'success' as const };
}

function previewPayload(value: unknown) {
  if (value === undefined || value === null) return '-';
  try {
    const text = JSON.stringify(value);
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
  } catch {
    return String(value);
  }
}

function canRunAction(job: IntegrationLog, action: IntegrationJobAction) {
  if (action === 'execute') return ['pending', 'retrying'].includes(job.status);
  if (action === 'retry') return ['failed', 'retrying', 'pending'].includes(job.status);
  if (action === 'cancel') return ['pending', 'retrying', 'running'].includes(job.status);
  return true;
}

const actionLabelMap: Record<IntegrationJobAction, string> = {
  execute: '执行',
  retry: '重试',
  repush: '补推',
  cancel: '取消'
};

export function IntegrationConfigView() {
  const { currentUser } = useApp();
  const [adapters, setAdapters] = useState<IntegrationAdapter[]>([]);
  const [jobs, setJobs] = useState<IntegrationLog[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [searchText, setSearchText] = useState('');
  const [adapterFilter, setAdapterFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyActionKey, setBusyActionKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      setAdapters([]);
      setJobs([]);
      return;
    }
    setLoadState('loading');
    setError('');
    try {
      const [adapterData, jobData] = await Promise.all([
        apiGet<{ adapters: IntegrationAdapter[] }>('/api/integration-adapters', currentUser.id),
        apiGet<{ jobs: IntegrationLog[] }>('/api/integration-jobs', currentUser.id)
      ]);
      setAdapters(adapterData.adapters ?? []);
      setJobs(
        [...(jobData.jobs ?? [])].sort(
          (left, right) =>
            new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() -
            new Date(left.updatedAt ?? left.createdAt ?? 0).getTime()
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '集成状态加载失败');
    } finally {
      setLoadState('idle');
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredJobs = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return jobs.filter((job) => {
      const currentAdapterKey = job.key ?? job.adapterKey ?? 'unknown';
      const matchesAdapter = adapterFilter === 'all' || currentAdapterKey === adapterFilter;
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
      const matchesKeyword =
        !keyword ||
        [
          jobKey(job),
          currentAdapterKey,
          job.adapter,
          job.operation,
          job.businessType,
          job.businessId,
          job.requestId,
          job.idempotencyKey,
          job.errorMessage
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      return matchesAdapter && matchesStatus && matchesKeyword;
    });
  }, [adapterFilter, jobs, searchText, statusFilter]);

  const statusOptions = useMemo(() => ['all', ...Array.from(new Set(jobs.map((job) => job.status).filter(Boolean)))], [jobs]);
  const pendingCount = useMemo(() => jobs.filter((job) => ['pending', 'retrying', 'running'].includes(job.status)).length, [jobs]);
  const failedCount = useMemo(() => jobs.filter((job) => job.status === 'failed').length, [jobs]);
  const latestUpdatedAt = useMemo(() => jobs[0]?.updatedAt ?? jobs[0]?.createdAt ?? '', [jobs]);

  async function operateJob(job: IntegrationLog, action: IntegrationJobAction) {
    const adapterKey = job.key ?? job.adapterKey;
    if (!adapterKey || !currentUser?.id) return;
    setBusyActionKey(`${action}:${jobKey(job)}`);
    setError('');
    setMessage('');
    try {
      const result = await apiPost<IntegrationActionResponse>(
        `/api/integration-adapters/${encodeURIComponent(adapterKey)}/jobs/${encodeURIComponent(jobKey(job))}/${action}`,
        {},
        currentUser.id
      );
      const responseMessage =
        result.warning ??
        result.log.warning ??
        (action === 'repush' && result.originalJobId
          ? `${jobKey(job)} 已创建补推任务`
          : `${jobKey(job)} 已执行${actionLabelMap[action]}操作`);
      setMessage(responseMessage);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '集成任务操作失败');
    } finally {
      setBusyActionKey('');
    }
  }

  return (
    <div data-ui-check="integration-config-view" className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Settings className="h-6 w-6 text-[#006666]" />
            集成配置与队列
          </h2>
          <p className="mt-1 text-sm text-slate-500">读取真实 adapter 与 integration_jobs 队列，直接操作后端已开放的执行、重试、补推、取消能力。</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void loadData()} disabled={loadState === 'loading'}>
          <RefreshCw className={`h-4 w-4 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
          刷新状态
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Adapter</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{adapters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">作业总数</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{jobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">待处理/运行中</div>
            <div className="mt-2 text-2xl font-semibold text-amber-700">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">失败作业</div>
            <div className="mt-2 text-2xl font-semibold text-rose-700">{failedCount}</div>
            <div className="mt-1 text-xs text-slate-500">{latestUpdatedAt ? `最近更新 ${formatDateTime(latestUpdatedAt)}` : '暂无作业记录'}</div>
          </CardContent>
        </Card>
      </div>

      {(message || error) ? (
        <div className={`rounded-md border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      ) : null}

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base">Adapter 状态</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">Adapter</th>
                <th className="px-4 py-3 font-medium">模式</th>
                <th className="px-4 py-3 font-medium">最新状态</th>
                <th className="px-4 py-3 font-medium">最近作业</th>
                <th className="px-6 py-3 font-medium text-right">累计日志</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadState === 'loading' ? (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={5}>
                    正在加载 adapter 状态...
                  </td>
                </tr>
              ) : adapters.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={5}>
                    暂无可见 adapter
                  </td>
                </tr>
              ) : (
                adapters.map((adapter) => {
                  const latest = adapter.logs[0];
                  const health = adapterHealth(adapter);
                  return (
                    <tr key={adapter.key} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{adapter.name}</div>
                        <div className="mt-1 font-mono text-xs text-slate-500">{adapter.key}</div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline">{String(adapter.mode || 'unknown').toUpperCase()}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={health.variant}>
                          {health.variant === 'danger' ? <AlertCircle className="mr-1 h-3 w-3" /> : null}
                          {health.variant === 'success' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
                          {health.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        {latest ? (
                          <>
                            <div>{latest.operation}</div>
                            <div className="mt-1 text-slate-500">{formatDateTime(latest.updatedAt ?? latest.createdAt)}</div>
                          </>
                        ) : (
                          <span className="text-slate-400">尚无作业</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">{adapter.logs.length}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">作业队列</CardTitle>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-[280px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  data-ui-check="integration-job-search"
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                  placeholder="搜索 jobId、adapter、业务编号、requestId..."
                />
              </div>
              <select
                data-ui-check="integration-adapter-filter"
                value={adapterFilter}
                onChange={(event) => setAdapterFilter(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
              >
                <option value="all">全部 Adapter</option>
                {adapters.map((adapter) => (
                  <option key={adapter.key} value={adapter.key}>
                    {adapter.name}
                  </option>
                ))}
              </select>
              <select
                data-ui-check="integration-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? '全部状态' : statusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">任务</th>
                <th className="px-4 py-3 font-medium">业务对象</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">请求 / 响应</th>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-6 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadState === 'loading' ? (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={6}>
                    正在加载作业队列...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={6}>
                    当前筛选条件下没有作业
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const currentAdapterKey = job.key ?? job.adapterKey ?? 'unknown';
                  return (
                    <tr key={`${currentAdapterKey}:${jobKey(job)}`} className="align-top hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{job.operation}</div>
                        <div className="mt-1 font-mono text-xs text-slate-500">{jobKey(job)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {job.adapter || currentAdapterKey} / {String(job.mode || '-').toUpperCase()}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        <div>{job.businessType || '-'}</div>
                        <div className="mt-1">业务编号：{job.businessId || '-'}</div>
                        <div className="mt-1">requestId：{job.requestId || '-'}</div>
                        <div className="mt-1">attempt：{job.attemptCount ?? 0}</div>
                        {job.nextRetryAt ? <div className="mt-1 text-amber-700">下次重试：{formatDateTime(job.nextRetryAt)}</div> : null}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={statusVariant(job.status)}>{statusLabel(job.status)}</Badge>
                        {job.errorMessage ? <div className="mt-2 text-xs text-rose-600">{job.errorMessage}</div> : null}
                        {job.warning ? <div className="mt-2 text-xs text-amber-700">{job.warning}</div> : null}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        <div className="max-w-[320px] break-all rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600">
                          {previewPayload(job.requestPayload)}
                        </div>
                        <div className="mt-2 max-w-[320px] break-all rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600">
                          {job.errorMessage ? job.errorMessage : previewPayload(job.responsePayload)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        <div>创建：{formatDateTime(job.createdAt)}</div>
                        <div className="mt-1">更新：{formatDateTime(job.updatedAt ?? job.createdAt)}</div>
                        {job.endpoint ? <div className="mt-1 break-all text-slate-500">{job.endpoint}</div> : null}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 px-2"
                            disabled={!canRunAction(job, 'execute') || busyActionKey !== ''}
                            onClick={() => void operateJob(job, 'execute')}
                          >
                            <Play className="h-3.5 w-3.5" />
                            执行
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 px-2"
                            disabled={!canRunAction(job, 'retry') || busyActionKey !== ''}
                            onClick={() => void operateJob(job, 'retry')}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            重试
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 px-2"
                            disabled={!canRunAction(job, 'repush') || busyActionKey !== ''}
                            onClick={() => void operateJob(job, 'repush')}
                          >
                            <Send className="h-3.5 w-3.5" />
                            补推
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            disabled={!canRunAction(job, 'cancel') || busyActionKey !== ''}
                            onClick={() => void operateJob(job, 'cancel')}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            取消
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
