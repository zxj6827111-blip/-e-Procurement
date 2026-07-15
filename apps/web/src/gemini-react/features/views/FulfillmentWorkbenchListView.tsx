import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, ClipboardList, RotateCcw, Search, Star, Truck } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import { formatCurrency, formatDateTime } from './project-workbench-data';
import {
  fulfillmentStatusMeta,
  fulfillmentStatusOptions,
  loadFulfillmentOverview,
  type FulfillmentOverviewResponse,
  type FulfillmentOverviewStatus
} from './fulfillment-overview-data';

const inputClass = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#006666] focus:ring-2 focus:ring-[#006666]/20';

export function FulfillmentWorkbenchListView() {
  const { currentUser, navigateToPath } = useApp();
  const [data, setData] = useState<FulfillmentOverviewResponse | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'all' | FulfillmentOverviewStatus>('all');
  const [onlyPending, setOnlyPending] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    const userId = currentUser.id;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await loadFulfillmentOverview(userId, { keyword, status, onlyPending, page, pageSize: 20 });
        if (!active) return;
        setData(result);
        if (result.pagination.page !== page) setPage(result.pagination.page);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : '履约工作台加载失败。');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [currentUser?.id, keyword, onlyPending, page, status]);

  const resetFilters = () => {
    setKeywordInput('');
    setKeyword('');
    setStatus('all');
    setOnlyPending(false);
    setPage(1);
  };

  const summaryCards = [
    { label: '履约记录', value: data?.summary.total ?? 0, icon: ClipboardList, color: 'bg-blue-100 text-blue-700' },
    { label: '待处理', value: data?.summary.pending ?? 0, icon: Truck, color: 'bg-amber-100 text-amber-700' },
    { label: '履约异常', value: data?.summary.exception ?? 0, icon: AlertTriangle, color: 'bg-rose-100 text-rose-700' },
    { label: '待评价', value: data?.summary.pendingEvaluation ?? 0, icon: Star, color: 'bg-emerald-100 text-emerald-700' }
  ];

  return (
    <div className="space-y-6" data-ui-check="fulfillment-workbench-list">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">订单履约工作台</h2>
        <p className="mt-1 text-sm text-slate-500">集中查看合同、订单、收货异常和待评价事项，按待处理优先排序。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${color}`}><Icon className="h-5 w-5" /></div>
              <div><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-semibold text-slate-900">{value}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_220px_auto_auto] lg:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              setKeyword(keywordInput.trim());
              setPage(1);
            }}
          >
            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-medium text-slate-500">搜索履约记录</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  data-ui-check="fulfillment-search"
                  className={`${inputClass} pl-10`}
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  placeholder="项目、合同、订单或供应商"
                />
              </div>
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block text-xs font-medium text-slate-500">履约状态</span>
              <select
                data-ui-check="fulfillment-status-filter"
                className={inputClass}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as 'all' | FulfillmentOverviewStatus);
                  setPage(1);
                }}
              >
                {fulfillmentStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700">
              <input
                data-ui-check="fulfillment-only-pending"
                type="checkbox"
                checked={onlyPending}
                onChange={(event) => {
                  setOnlyPending(event.target.checked);
                  setPage(1);
                }}
              />
              只看待处理
            </label>
            <div className="flex gap-2">
              <Button type="submit" variant="brand"><Search className="mr-1 h-4 w-4" />查询</Button>
              <Button type="button" variant="outline" onClick={resetFilters} title="重置筛选"><RotateCcw className="h-4 w-4" /></Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="font-medium text-slate-900">履约记录</div>
            <div className="text-sm text-slate-500">共 {data?.pagination.total ?? 0} 条{loading ? '，正在刷新...' : ''}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3">项目</th>
                  <th className="px-5 py-3">合同 / 订单</th>
                  <th className="px-5 py-3">供应商</th>
                  <th className="px-5 py-3">金额</th>
                  <th className="px-5 py-3">计划到货</th>
                  <th className="px-5 py-3">履约状态</th>
                  <th className="px-5 py-3">下一步</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.rows.map((row) => {
                  const statusMeta = fulfillmentStatusMeta[row.fulfillmentStatus];
                  const overdue = Boolean(
                    row.expectedDeliveryAt &&
                    row.fulfillmentStatus !== 'completed' &&
                    new Date(row.expectedDeliveryAt).getTime() < Date.now()
                  );
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">{row.projectName}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span>{row.projectCode}</span>
                          {row.externalTradeFlag ? <Badge variant="outline">外部交易备案</Badge> : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <div>{row.contractNo ?? '未关联合同编号'}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.orderNo ?? '采购订单待生成'}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{row.supplierName}</td>
                      <td className="px-5 py-4 text-slate-700">{formatCurrency(row.amount)}</td>
                      <td className="px-5 py-4">
                        <div className={overdue ? 'font-medium text-rose-700' : 'text-slate-700'}>{formatDateTime(row.expectedDeliveryAt, false)}</div>
                        {overdue ? <div className="mt-1 text-xs text-rose-600">已超过计划到货日</div> : null}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                        {row.hasOpenException ? <div className="mt-2 text-xs text-rose-600">存在待处理异常</div> : null}
                      </td>
                      <td className="px-5 py-4">
                        <Button
                          size="sm"
                          variant={row.fulfillmentStatus === 'exception' ? 'danger' : 'outline'}
                          onClick={() => navigateToPath(`/order-fulfillment?projectId=${encodeURIComponent(row.projectId)}`)}
                        >
                          {row.nextActionLabel}<ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && data?.rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">没有符合当前条件的履约记录。</td></tr>
                ) : null}
                {loading && !data ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">履约记录加载中...</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
            <div className="text-sm text-slate-500">第 {data?.pagination.page ?? 1} / {data?.pagination.totalPages ?? 1} 页</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={loading || (data?.pagination.page ?? 1) <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft className="mr-1 h-4 w-4" />上一页
              </Button>
              <Button size="sm" variant="outline" disabled={loading || (data?.pagination.page ?? 1) >= (data?.pagination.totalPages ?? 1)} onClick={() => setPage((value) => value + 1)}>
                下一页<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
