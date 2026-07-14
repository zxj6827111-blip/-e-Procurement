import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, FileCheck, FileText, Filter, Search, XCircle } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { apiBlob, apiGet, apiPost } from '../../../api/http';
import { formatDateTime, labelStatus } from '../../../utils/status-labels';

interface ProcurementRequestAttachment {
  id: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
}

interface ProcurementRequestLineItem {
  id: string;
  itemName: string;
  category?: string;
  specification?: string;
  quantity?: number;
  unit?: string;
  estimatedUnitPrice?: number;
  budgetAmount?: number;
  requiredByDate?: string;
  remark?: string;
}

interface ApiProcurementRequest {
  id: string;
  code?: string;
  title: string;
  orgId: string;
  requestDepartment?: string;
  requesterName?: string;
  category?: string;
  description?: string;
  budgetAmount?: number;
  purpose?: string;
  expectedArrivalAt?: string;
  receivingLocation?: string;
  methodSuggestion?: string;
  externalTradeFlag?: boolean;
  status?: string;
  approvalStatus?: string;
  approvalOpinion?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  lineItems?: ProcurementRequestLineItem[];
  attachments?: ProcurementRequestAttachment[];
}

type LoadState = 'idle' | 'loading' | 'approving';

function money(value?: number) {
  if (value === undefined || Number.isNaN(Number(value))) return '-';
  return `CNY ${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function requestDate(value?: string) {
  if (!value) return '-';
  return value.includes('T') ? value.slice(0, 10) : value;
}

function requestStatus(request?: ApiProcurementRequest | null) {
  return request?.approvalStatus ?? request?.status ?? 'draft';
}

function statusTone(status?: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (['approved', 'method_decided', 'project_created'].includes(String(status))) return 'success';
  if (['submitted', 'in_review'].includes(String(status))) return 'warning';
  if (['rejected', 'cancelled'].includes(String(status))) return 'danger';
  if (status === 'draft') return 'default';
  return 'info';
}

function canApprove(request?: ApiProcurementRequest | null) {
  return ['submitted', 'rejected'].includes(String(request?.approvalStatus));
}

function sortByUpdatedAtDesc(left: ApiProcurementRequest, right: ApiProcurementRequest) {
  return new Date(right.updatedAt ?? right.createdAt ?? 0).getTime() - new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();
}

export function RequestApproveView() {
  const { currentUser } = useApp();
  const [requests, setRequests] = useState<ApiProcurementRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [busyFileId, setBusyFileId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedRequest = useMemo(() => requests.find((request) => request.id === selectedId) ?? null, [requests, selectedId]);

  const loadRequests = useCallback(async () => {
    setLoadState('loading');
    setError('');
    try {
      const data = await apiGet<{ procurementRequests: ApiProcurementRequest[] }>('/api/procurement-requests', currentUser?.id);
      const nextRequests = [...(data.procurementRequests ?? [])].sort(sortByUpdatedAtDesc);
      setRequests(nextRequests);
      setSelectedId((current) => current ?? nextRequests.find(canApprove)?.id ?? nextRequests[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '需求审批列表加载失败');
    } finally {
      setLoadState('idle');
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return requests.filter((request) => {
      const status = requestStatus(request);
      const matchesKeyword =
        !keyword ||
        [request.code, request.id, request.title, request.requestDepartment, request.requesterName, request.category]
          .filter(Boolean)
          .some((item) => String(item).toLowerCase().includes(keyword));
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && canApprove(request)) ||
        status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [requests, searchText, statusFilter]);

  const pendingCount = useMemo(() => requests.filter(canApprove).length, [requests]);
  const approvedCount = useMemo(() => requests.filter((request) => requestStatus(request) === 'approved').length, [requests]);

  async function approveRequest(request: ApiProcurementRequest, approved: boolean) {
    if (!currentUser) return;
    setLoadState('approving');
    setError('');
    setMessage('');
    try {
      const data = await apiPost<{ procurementRequest: ApiProcurementRequest }>(
        `/api/procurement-requests/${encodeURIComponent(request.id)}/approve`,
        {
          approved,
          opinion: approved ? '预算合理，资料齐全，同意进入采购方式判定。' : '资料或预算依据不足，退回酒店采购补充后重新提交。'
        },
        currentUser.id
      );
      const nextRequest = data.procurementRequest;
      setRequests((items) => items.map((item) => (item.id === nextRequest.id ? nextRequest : item)).sort(sortByUpdatedAtDesc));
      setSelectedId(nextRequest.id);
      setMessage(`${nextRequest.code ?? nextRequest.id} 已${approved ? '审核通过' : '驳回'}。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '需求审批操作失败');
    } finally {
      setLoadState('idle');
    }
  }

  async function previewAttachment(file: ProcurementRequestAttachment) {
    if (!file.id || !currentUser) return;
    setBusyFileId(file.id);
    setError('');
    try {
      const blob = await apiBlob(`/api/files/${encodeURIComponent(file.id)}/download`, currentUser.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '附件打开失败');
    } finally {
      setBusyFileId('');
    }
  }

  return (
    <div data-ui-check="request-approve-view" className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-[#006666]" />
            需求审批
          </h2>
          <p className="text-sm text-slate-500 mt-1">集团采购中心承接酒店提交的真实采购申请，按当前审批状态处理。</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-amber-100 bg-amber-50 px-4 py-3">
            <span className="block text-amber-700">待审批</span>
            <strong className="text-xl text-amber-900">{pendingCount}</strong>
          </div>
          <div className="rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3">
            <span className="block text-emerald-700">已通过</span>
            <strong className="text-xl text-emerald-900">{approvedCount}</strong>
          </div>
        </div>
      </div>

      {(message || error) ? (
        <div className={`rounded-md border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
        <Card className="min-w-0">
          <CardHeader className="py-4 border-b border-slate-100">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  data-ui-check="request-approve-search"
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="搜索单号、标题、提报部门..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
                />
              </div>
              <div className="flex gap-2">
                <select
                  data-ui-check="request-approve-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="border border-slate-300 rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#006666]"
                >
                  <option value="pending">待审批</option>
                  <option value="all">全部状态</option>
                  <option value="submitted">已提交</option>
                  <option value="approved">已通过</option>
                  <option value="rejected">已驳回</option>
                  <option value="method_decided">已判定方式</option>
                  <option value="project_created">已转项目</option>
                </select>
                <Button variant="outline" className="gap-2" onClick={() => { setSearchText(''); setStatusFilter('pending'); }}>
                  <Filter className="w-4 h-4" />
                  重置
                </Button>
                <Button variant="outline" onClick={() => void loadRequests()}>刷新</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-200">单号/日期</th>
                    <th className="px-6 py-4 border-b border-slate-200">申请信息</th>
                    <th className="px-6 py-4 border-b border-slate-200 text-right">预算金额</th>
                    <th className="px-6 py-4 border-b border-slate-200">状态</th>
                    <th className="px-6 py-4 border-b border-slate-200 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadState === 'loading' ? (
                    <tr>
                      <td className="px-6 py-10 text-center text-slate-500" colSpan={5}>正在加载需求审批数据...</td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td className="px-6 py-10 text-center text-slate-500" colSpan={5}>暂无符合条件的采购申请</td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => {
                      const status = requestStatus(request);
                      const selected = request.id === selectedId;
                      return (
                        <tr key={request.id} className={selected ? 'bg-teal-50/40' : 'hover:bg-slate-50/50'}>
                          <td className="px-6 py-4">
                            <div className="font-mono text-xs text-slate-500">{request.code ?? request.id}</div>
                            <div className="text-xs text-slate-500 mt-1">{requestDate(request.createdAt)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{request.title}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {request.requestDepartment || '-'} / {request.requesterName || '-'} / {request.category || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-800">{money(request.budgetAmount)}</td>
                          <td className="px-6 py-4">
                            <Badge variant={statusTone(status)}>
                              {canApprove(request) ? <Clock className="w-3 h-3 mr-1" /> : null}
                              {status === 'approved' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}
                              {status === 'rejected' ? <XCircle className="w-3 h-3 mr-1" /> : null}
                              {labelStatus(status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button data-ui-check="request-approve-detail-entry" variant="ghost" size="sm" className="text-[#006666]" onClick={() => setSelectedId(request.id)}>
                              审核详情
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit bg-slate-50/50">
          <CardHeader className="py-4 border-b border-slate-100 bg-white">
            <CardTitle className="text-base font-medium">审批操作区</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedRequest ? (
              <div className="space-y-5">
                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{selectedRequest.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{selectedRequest.code ?? selectedRequest.id}</p>
                    </div>
                    <Badge variant={statusTone(requestStatus(selectedRequest))}>{labelStatus(requestStatus(selectedRequest))}</Badge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">提报部门</dt>
                      <dd className="font-medium text-slate-900">{selectedRequest.requestDepartment || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">申请人</dt>
                      <dd className="font-medium text-slate-900">{selectedRequest.requesterName || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">需求日期</dt>
                      <dd className="font-medium text-slate-900">{requestDate(selectedRequest.expectedArrivalAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">预算金额</dt>
                      <dd className="font-medium text-rose-600">{money(selectedRequest.budgetAmount)}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">采购明细</h4>
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left">物资</th>
                          <th className="px-3 py-2 text-right">数量</th>
                          <th className="px-3 py-2 text-right">预算</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedRequest.lineItems ?? []).length === 0 ? (
                          <tr><td className="px-3 py-4 text-center text-slate-500" colSpan={3}>暂无明细</td></tr>
                        ) : (
                          selectedRequest.lineItems?.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2">
                                <span className="font-medium text-slate-900">{item.itemName}</span>
                                <span className="block text-slate-500">{item.specification || '-'}</span>
                              </td>
                              <td className="px-3 py-2 text-right">{item.quantity ?? '-'} {item.unit || ''}</td>
                              <td className="px-3 py-2 text-right">{money(item.budgetAmount)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">申请理由与说明</h4>
                  <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700 leading-6">
                    {selectedRequest.purpose || selectedRequest.description || '未填写'}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">附件清单</h4>
                  <div className="space-y-2">
                    {(selectedRequest.attachments ?? []).length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">暂无附件</div>
                    ) : (
                      selectedRequest.attachments?.map((file) => (
                        <div key={file.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-2 text-xs">
                          <div className="min-w-0 flex items-center gap-2 text-slate-700">
                            <FileText className="w-4 h-4 shrink-0 text-[#006666]" />
                            <span className="truncate">{file.fileName || file.id}</span>
                          </div>
                          <button type="button" className="shrink-0 text-[#006666] hover:underline disabled:text-slate-400" disabled={busyFileId === file.id} onClick={() => void previewAttachment(file)}>
                            {busyFileId === file.id ? '打开中' : '查看'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">审批时间线</h4>
                  <div className="relative ml-2 space-y-4 border-l-2 border-slate-200 pl-4 text-sm">
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#006666]" />
                      <p className="font-medium text-slate-900">酒店采购提交申请</p>
                      <p className="text-xs text-slate-500">{selectedRequest.createdAt ? formatDateTime(selectedRequest.createdAt) : '-'}</p>
                    </div>
                    <div className="relative">
                      <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 ${requestStatus(selectedRequest) === 'approved' ? 'border-emerald-500 bg-emerald-500' : requestStatus(selectedRequest) === 'rejected' ? 'border-rose-500 bg-rose-500' : 'border-amber-500 bg-white'}`} />
                      <p className="font-medium text-slate-900">集团采购中心审核</p>
                      <p className="text-xs text-slate-500">{selectedRequest.approvedAt ? formatDateTime(selectedRequest.approvedAt) : '待处理'}</p>
                      {selectedRequest.approvalOpinion ? <p className="mt-2 rounded bg-white p-2 text-xs text-slate-600">{selectedRequest.approvalOpinion}</p> : null}
                    </div>
                  </div>
                </div>

                {canApprove(selectedRequest) ? (
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 mb-2">审批意见</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button data-ui-check="request-approve-pass" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loadState === 'approving'} onClick={() => void approveRequest(selectedRequest, true)}>
                        审核通过
                      </Button>
                      <Button data-ui-check="request-approve-reject" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" disabled={loadState === 'approving'} onClick={() => void approveRequest(selectedRequest, false)}>
                        驳回
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    当前申请已处理，可在“全部状态”中继续追踪。
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <FileCheck className="w-12 h-12 mb-3 text-slate-200" />
                <p className="text-sm">点击左侧列表查看审批详情</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
