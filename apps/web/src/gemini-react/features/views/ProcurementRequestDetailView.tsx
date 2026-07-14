import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Clock, CornerUpLeft, FileText, X } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import { apiGet, apiPost } from '../../../api/http';
import { formatDateTime, labelStatus } from '../../../utils/status-labels';

interface ApiProcurementRequestLineItem {
  id: string;
  itemName: string;
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
  projectId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lineItems?: ApiProcurementRequestLineItem[];
}

interface CreateProjectResponse {
  project?: { id: string; code?: string; name?: string };
  procurementRequest?: ApiProcurementRequest;
}

function money(value?: number) {
  if (value === undefined || Number.isNaN(Number(value))) return '-';
  return `CNY ${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function requestIdFromRoute(route?: string) {
  const match = route?.match(/^\/procurement-requests\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function statusTone(status?: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (['approved', 'project_created', 'method_decided'].includes(String(status))) return 'success';
  if (['submitted', 'in_review'].includes(String(status))) return 'warning';
  if (['rejected', 'cancelled'].includes(String(status))) return 'danger';
  if (status === 'draft') return 'default';
  return 'info';
}

export function ProcurementRequestDetailView() {
  const { currentUser, routeContext, setCurrentView, setCurrentProjectId } = useApp();
  const requestId = useMemo(() => requestIdFromRoute(routeContext?.route), [routeContext?.route]);
  const [request, setRequest] = useState<ApiProcurementRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadRequest = useCallback(async () => {
    if (!currentUser || !requestId) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<{ procurementRequest: ApiProcurementRequest }>(`/api/procurement-requests/${encodeURIComponent(requestId)}`, currentUser.id);
      setRequest(data.procurementRequest);
    } catch (err) {
      setError(err instanceof Error ? err.message : '采购申请详情加载失败');
    } finally {
      setLoading(false);
    }
  }, [currentUser, requestId]);

  useEffect(() => {
    void loadRequest();
  }, [loadRequest]);

  const updateRequest = (next?: ApiProcurementRequest) => {
    if (next) setRequest(next);
  };

  const approveRequest = async (approved: boolean, opinion: string) => {
    if (!currentUser || !request) return;
    setBusyAction(approved ? 'approve' : 'reject');
    setError('');
    setMessage('');
    try {
      const data = await apiPost<{ procurementRequest: ApiProcurementRequest }>(
        `/api/procurement-requests/${encodeURIComponent(request.id)}/approve`,
        { approved, opinion },
        currentUser.id
      );
      updateRequest(data.procurementRequest);
      setMessage(approved ? '采购申请已审核通过。' : '采购申请已驳回，审批意见已记录。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '采购申请审批失败');
    } finally {
      setBusyAction(null);
    }
  };

  const decideMethod = async () => {
    if (!currentUser || !request) return;
    setBusyAction('method');
    setError('');
    setMessage('');
    try {
      const data = await apiPost<{ procurementRequest: ApiProcurementRequest }>(
        `/api/procurement-requests/${encodeURIComponent(request.id)}/method-decision`,
        { methodSuggestion: request.methodSuggestion || 'open_tender', externalTradeFlag: Boolean(request.externalTradeFlag) },
        currentUser.id
      );
      updateRequest(data.procurementRequest);
      setMessage('采购方式已判定，可以继续生成采购项目。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '采购方式判定失败');
    } finally {
      setBusyAction(null);
    }
  };

  const createProject = async () => {
    if (!currentUser || !request) return;
    setBusyAction('project');
    setError('');
    setMessage('');
    try {
      const data = await apiPost<CreateProjectResponse>('/api/projects', { requestId: request.id, name: request.title }, currentUser.id);
      updateRequest(data.procurementRequest);
      if (data.project?.id) {
        setCurrentProjectId(data.project.id);
        setCurrentView('PROJECT_DETAIL');
        return;
      }
      setMessage('采购项目已生成。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '采购项目生成失败');
    } finally {
      setBusyAction(null);
    }
  };

  const canApprove = currentUser?.role === 'GROUP_PROCUREMENT_MANAGER' && ['submitted', 'rejected'].includes(String(request?.approvalStatus));
  const canDecideMethod = ['PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS'].includes(String(currentUser?.role)) && request?.approvalStatus === 'approved' && request?.status === 'submitted';
  const canCreateProject = ['PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS'].includes(String(currentUser?.role)) && request?.approvalStatus === 'approved' && request?.status === 'method_decided';

  if (loading) {
    return <div data-ui-check="procurement-request-detail" className="p-10 text-center text-slate-500">正在加载采购申请详情...</div>;
  }

  if (!request) {
    return (
      <div data-ui-check="procurement-request-detail" className="space-y-4">
        <Button variant="outline" onClick={() => setCurrentView(currentUser?.role === 'GROUP_PROCUREMENT_MANAGER' ? 'REQUEST_APPROVE' : 'PURCHASE_REQUEST')}>
          <CornerUpLeft className="w-4 h-4 mr-2" />返回列表
        </Button>
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error || '未找到采购申请，或当前账号无权查看。'}
        </div>
      </div>
    );
  }

  const displayStatus = request.approvalStatus || request.status || 'draft';

  return (
    <div data-ui-check="procurement-request-detail" className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">采购申请审批</h2>
          <p className="mt-1 text-sm text-slate-500">{request.code || request.id}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setCurrentView(currentUser?.role === 'GROUP_PROCUREMENT_MANAGER' ? 'REQUEST_APPROVE' : 'PURCHASE_REQUEST')}>
            <CornerUpLeft className="w-4 h-4 mr-2" />返回列表
          </Button>
          {canApprove ? (
            <>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" disabled={busyAction !== null} onClick={() => void approveRequest(false, '资料或预算不满足集团采购要求，驳回本次申请。')}>
                <X className="w-4 h-4 mr-2" />驳回
              </Button>
              <Button className="bg-[#006666] hover:bg-[#004d4d] text-white" disabled={busyAction !== null} onClick={() => void approveRequest(true, '预算合理，资料齐全，同意进入采购方式判定。')}>
                <Check className="w-4 h-4 mr-2" />审核通过
              </Button>
            </>
          ) : null}
          {canDecideMethod ? (
            <Button className="bg-[#006666] hover:bg-[#004d4d] text-white" disabled={busyAction !== null} onClick={() => void decideMethod()}>
              <Check className="w-4 h-4 mr-2" />判定采购方式
            </Button>
          ) : null}
          {canCreateProject ? (
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" disabled={busyAction !== null} onClick={() => void createProject()}>
              <ArrowRight className="w-4 h-4 mr-2" />生成采购项目
            </Button>
          ) : null}
          {request.projectId ? (
            <Button variant="outline" onClick={() => { setCurrentProjectId(request.projectId ?? null); setCurrentView('PROJECT_DETAIL'); }}>
              <ArrowRight className="w-4 h-4 mr-2" />查看采购项目
            </Button>
          ) : null}
        </div>
      </div>

      {(message || error) ? (
        <div className={`rounded-md border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-800">{request.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">单号：{request.code || request.id}</p>
                </div>
                <Badge variant={statusTone(displayStatus)}>{labelStatus(displayStatus)}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 text-sm">
                <div><span className="text-gray-500 block mb-1">申请部门</span><span className="font-medium">{request.requestDepartment || '-'}</span></div>
                <div><span className="text-gray-500 block mb-1">申请人</span><span className="font-medium">{request.requesterName || '-'}</span></div>
                <div><span className="text-gray-500 block mb-1">采购品类</span><span className="font-medium">{request.category || '-'}</span></div>
                <div><span className="text-gray-500 block mb-1">预算总计</span><span className="font-medium text-red-600">{money(request.budgetAmount)}</span></div>
                <div><span className="text-gray-500 block mb-1">期望到货</span><span className="font-medium">{request.expectedArrivalAt ? request.expectedArrivalAt.slice(0, 10) : '-'}</span></div>
                <div><span className="text-gray-500 block mb-1">建议方式</span><span className="font-medium">{labelStatus(request.methodSuggestion || 'pending')}</span></div>
                <div className="md:col-span-3"><span className="text-gray-500 block mb-1">收货地址</span><span className="font-medium">{request.receivingLocation || '-'}</span></div>
                <div className="md:col-span-3"><span className="text-gray-500 block mb-1">采购用途</span><span className="font-medium">{request.purpose || request.description || '-'}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-[#006666]" />需求明细</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-3 px-4 font-medium">物料名称</th>
                      <th className="py-3 px-4 font-medium">规格</th>
                      <th className="py-3 px-4 font-medium">数量</th>
                      <th className="py-3 px-4 font-medium">单位</th>
                      <th className="py-3 px-4 font-medium">预算单价</th>
                      <th className="py-3 px-4 font-medium">预算金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(request.lineItems?.length ? request.lineItems : []).map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3 px-4">{item.itemName}</td>
                        <td className="py-3 px-4">{item.specification || '-'}</td>
                        <td className="py-3 px-4">{item.quantity ?? '-'}</td>
                        <td className="py-3 px-4">{item.unit || '-'}</td>
                        <td className="py-3 px-4">{money(item.estimatedUnitPrice)}</td>
                        <td className="py-3 px-4">{money(item.budgetAmount)}</td>
                      </tr>
                    ))}
                    {!request.lineItems?.length ? (
                      <tr><td className="py-8 px-4 text-center text-slate-400" colSpan={6}>暂无需求明细</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-[#006666]" />审批时间线</h3>
              <div className="relative border-l-2 border-gray-200 ml-2 pl-4 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#006666]"></div>
                  <p className="text-sm font-medium">发起申请</p>
                  <p className="text-xs text-gray-500 mb-1">{request.requesterName || '申请人'} · {request.createdAt ? formatDateTime(request.createdAt) : '-'}</p>
                </div>
                <div className="relative">
                  <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 ${request.approvalStatus === 'approved' ? 'border-emerald-500 bg-emerald-500' : request.approvalStatus === 'rejected' ? 'border-rose-500 bg-rose-500' : 'border-amber-500 bg-white'}`}></div>
                  <p className="text-sm font-medium">集团采购中心审核</p>
                  <p className="text-xs text-gray-500 mb-1">{request.approvedAt ? formatDateTime(request.approvedAt) : '待处理'}</p>
                  {request.approvalOpinion ? <p className="text-xs bg-slate-50 p-2 rounded text-slate-600 mt-1">{request.approvalOpinion}</p> : null}
                </div>
                {request.status === 'method_decided' || request.projectId ? (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#006666]"></div>
                    <p className="text-sm font-medium">采购方式判定</p>
                    <p className="text-xs text-gray-500 mb-1">{labelStatus(request.methodSuggestion || 'method_decided')}</p>
                  </div>
                ) : null}
                {request.projectId ? (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#006666]"></div>
                    <p className="text-sm font-medium">采购项目已生成</p>
                    <p className="text-xs text-gray-500 mb-1">{request.projectId}</p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">执行建议</h3>
              <div className="p-3 bg-blue-50 rounded border border-blue-100 text-sm mb-3">
                <span className="font-medium text-blue-800 block mb-1">建议采购方式：{labelStatus(request.methodSuggestion || '待判定')}</span>
                <span className="text-blue-600 text-xs">审批通过后由采购经办判定采购方式，再生成采购项目进入采购执行。</span>
              </div>
              {request.externalTradeFlag ? (
                <div className="p-3 bg-amber-50 rounded border border-amber-100 text-sm flex gap-2 text-amber-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  当前申请标记为外部依法招标，生成后进入外部交易备案链路。
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
