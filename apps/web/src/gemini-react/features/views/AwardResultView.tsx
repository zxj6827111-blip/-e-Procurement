import React, { useEffect, useMemo } from 'react';
import { BellRing, Download, FileSignature, FileText, Trophy, Truck } from 'lucide-react';
import { apiBlob, apiGet, apiPost } from '../../../api/http';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import {
  downloadTextFile,
  ContractLedgerRecord,
  formatCurrency,
  formatDateTime,
  humanizeStatus,
  resolveSupplierName,
  sortByNewest,
  statusBadgeVariant,
  useProjectWorkbenchData
} from './project-workbench-data';

function isSupplierRole(role?: string | null) {
  return role === 'SUPPLIER' || role === 'SUPPLIER_ADMIN' || role === 'SUPPLIER_BIDDER';
}

function contractStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending_supplier_confirmation: '待供应商确认',
    registered: '合同已确认',
    performing: '履约中',
    completed: '已完成',
    cancelled: '已取消'
  };
  return labels[status] ?? humanizeStatus(status);
}

interface AwardProjectOption {
  id: string;
  code?: string;
  name: string;
  externalTradeFlag?: boolean;
}

export function AwardResultView() {
  const { currentProjectId, currentUser, navigateToPath, setCurrentProjectId, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading, error, reload } = useProjectWorkbenchData(currentProjectId);
  const supplierSide = isSupplierRole(currentUser?.role ?? null);
  const [awardProjects, setAwardProjects] = React.useState<AwardProjectOption[]>([]);
  const [awardProjectsLoading, setAwardProjectsLoading] = React.useState(false);
  const [contractBusy, setContractBusy] = React.useState<'start' | 'confirm' | null>(null);
  const [contractMessage, setContractMessage] = React.useState('');
  const [contractError, setContractError] = React.useState('');
  const [downloadingFileId, setDownloadingFileId] = React.useState('');

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) {
      setCurrentProjectId(resolvedProjectId);
    }
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  useEffect(() => {
    if (!supplierSide || !currentUser) return;
    let active = true;
    const userId = currentUser.id;

    async function loadAwardProjects() {
      setAwardProjectsLoading(true);
      try {
        const data = await apiGet<{ projects: AwardProjectOption[] }>('/api/projects', userId);
        const visibleProjects = await Promise.all(
          (data.projects ?? [])
            .filter((project) => !project.externalTradeFlag)
            .map(async (project) => {
              const result = await apiGet<{ notifications: unknown[] }>(
                `/api/projects/${encodeURIComponent(project.id)}/result-notifications`,
                userId
              ).catch(() => ({ notifications: [] }));
              return result.notifications.length > 0 ? project : null;
            })
        );
        if (!active) return;
        setAwardProjects(
          visibleProjects
            .filter((project): project is AwardProjectOption => Boolean(project))
            .sort((left, right) => String(right.code ?? '').localeCompare(String(left.code ?? '')))
        );
      } catch {
        if (active) setAwardProjects([]);
      } finally {
        if (active) setAwardProjectsLoading(false);
      }
    }

    void loadAwardProjects();
    return () => {
      active = false;
    };
  }, [currentUser?.id, supplierSide]);

  useEffect(() => {
    if (!supplierSide || awardProjectsLoading || awardProjects.length === 0) return;
    const activeProjectId = currentProjectId ?? resolvedProjectId;
    if (activeProjectId && awardProjects.some((project) => project.id === activeProjectId)) return;
    navigateToPath(`/award-result?projectId=${encodeURIComponent(awardProjects[0].id)}`);
  }, [awardProjects, awardProjectsLoading, currentProjectId, navigateToPath, resolvedProjectId, supplierSide]);

  const latestAward = useMemo(
    () => (workbench ? sortByNewest(workbench.awardApprovals, (item) => item.approvedAt ?? item.submittedAt ?? item.createdAt)[0] ?? null : null),
    [workbench]
  );
  const latestNotice = useMemo(
    () => (workbench ? sortByNewest(workbench.resultNotifications ?? [], (item) => item.sentAt ?? item.createdAt)[0] ?? null : null),
    [workbench]
  );
  const latestOrder = useMemo(
    () => (workbench ? sortByNewest(workbench.purchaseOrders, (item) => item.createdAt ?? item.expectedDeliveryAt)[0] ?? null : null),
    [workbench]
  );
  const latestBid = useMemo(
    () => (workbench ? sortByNewest(workbench.bids, (item) => item.lockedAt ?? item.submittedAt)[0] ?? null : null),
    [workbench]
  );
  const latestPricingReport = useMemo(
    () => (workbench ? sortByNewest(workbench.pricingReports ?? [], (item) => item.approvedAt ?? item.createdAt)[0] ?? null : null),
    [workbench]
  );
  const currentContract = useMemo(
    () => (workbench ? sortByNewest(workbench.contracts ?? [], (item) => item.updatedAt ?? item.createdAt)[0] ?? null : null),
    [workbench]
  );

  const winnerSupplierId = latestAward?.selectedSupplierId ?? currentContract?.supplierId ?? latestOrder?.supplierId ?? null;
  const winnerSupplierName = workbench ? resolveSupplierName(workbench, winnerSupplierId) : '-';
  const supplierOutcome = !latestNotice
    ? '待通知'
    : latestNotice.contentSummary?.includes('未中标')
      ? '未中标'
      : '已中标';
  const contractConfirmed = Boolean(currentContract && ['registered', 'performing', 'completed'].includes(currentContract.status));
  const canStartContractSigning =
    ['PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS'].includes(String(currentUser?.role)) &&
    latestAward?.approvalStatus === 'approved' &&
    !currentContract;
  const canConfirmContract =
    supplierSide &&
    currentContract?.status === 'pending_supplier_confirmation' &&
    currentContract.attachmentMetadata.length > 0;
  const showContractSection = !supplierSide || supplierOutcome === '已中标' || Boolean(currentContract);

  async function startContractSigning() {
    if (!currentUser || !resolvedProjectId || !canStartContractSigning || contractBusy) return;
    setContractBusy('start');
    setContractMessage('');
    setContractError('');
    try {
      await apiPost(`/api/projects/${encodeURIComponent(resolvedProjectId)}/contracts/signing`, {}, currentUser.id);
      setContractMessage('合同签订已发起，等待中标供应商确认。');
      reload();
    } catch (startError) {
      setContractError(startError instanceof Error ? startError.message : '合同签订发起失败。');
    } finally {
      setContractBusy(null);
    }
  }

  async function confirmContract() {
    if (!currentUser || !currentContract || !canConfirmContract || contractBusy) return;
    setContractBusy('confirm');
    setContractMessage('');
    setContractError('');
    try {
      await apiPost(`/api/contracts/${encodeURIComponent(currentContract.id)}/confirm`, {}, currentUser.id);
      setContractMessage('合同已确认，可以继续办理采购订单和履约。');
      reload();
    } catch (confirmError) {
      setContractError(confirmError instanceof Error ? confirmError.message : '合同确认失败。');
    } finally {
      setContractBusy(null);
    }
  }

  async function downloadContractDocument(file: ContractLedgerRecord['attachmentMetadata'][number]) {
    if (!currentUser || downloadingFileId) return;
    setDownloadingFileId(file.id);
    setContractMessage('');
    setContractError('');
    try {
      const blob = await apiBlob(`/api/files/${encodeURIComponent(file.id)}/download`, currentUser.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName || `${file.id}.bin`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setContractMessage(`${file.fileName} 已开始下载。`);
    } catch (downloadError) {
      setContractError(downloadError instanceof Error ? downloadError.message : '合同文件下载失败。');
    } finally {
      setDownloadingFileId('');
    }
  }

  const downloadNotice = () => {
    if (!workbench) return;
    const lines = [
      `项目编号：${workbench.project.code}`,
      `项目名称：${workbench.project.name}`,
      `采购申请：${workbench.procurementRequest?.code ?? '-'}`,
      `通知状态：${humanizeStatus(latestNotice?.status)}`,
      `中标供应商：${winnerSupplierName}`,
      `中标金额：${formatCurrency(latestBid?.amount ?? latestOrder?.totalAmount)}`,
      `通知时间：${formatDateTime(latestNotice?.sentAt ?? latestNotice?.createdAt)}`
    ];
    if (latestNotice?.contentSummary) {
      lines.push('', `通知内容：${latestNotice.contentSummary}`);
    }
    downloadTextFile(`${workbench.project.code}-award-notice.txt`, lines.join('\n'));
  };

  if (loading && !workbench) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">定标结果加载中...</div>;
  }

  if (error && !workbench) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{error}</div>;
  }

  if (!workbench) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的定标结果。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">定标结果</h2>
          <p className="mt-1 text-sm text-slate-500">
            {workbench.project.code} / {workbench.project.name}
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-3">
          {supplierSide ? (
            <label className="min-w-[280px] text-sm text-slate-600">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                切换中标结果{awardProjectsLoading ? '' : `（${awardProjects.length} 条）`}
              </span>
              <select
                data-ui-check="award-result-switcher"
                value={currentProjectId ?? resolvedProjectId ?? ''}
                onChange={(event) => navigateToPath(`/award-result?projectId=${encodeURIComponent(event.target.value)}`)}
                disabled={awardProjectsLoading || awardProjects.length === 0}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20 disabled:bg-slate-100"
              >
                {awardProjectsLoading ? <option value="">中标结果加载中...</option> : null}
                {!awardProjectsLoading && awardProjects.length === 0 ? <option value="">暂无可切换结果</option> : null}
                {awardProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code ?? project.id} / {project.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {supplierSide && latestOrder && contractConfirmed ? (
            <Button variant="brand" onClick={() => setCurrentView('PROJECT_FULFILLMENT')}>
              <Truck className="mr-2 h-4 w-4" />
              进入订单履约
            </Button>
          ) : null}
          <Button variant="outline" onClick={downloadNotice} disabled={!latestNotice}>
            下载结果通知
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">{supplierSide ? '本方结果' : '中标供应商'}</div>
              <div className="text-sm font-medium text-slate-900">{supplierSide ? supplierOutcome : winnerSupplierName}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">结果通知</div>
              <Badge variant={statusBadgeVariant(latestNotice?.status ?? 'pending')}>
                {humanizeStatus(latestNotice?.status ?? 'pending')}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">{supplierSide ? '本方报价' : '定标金额'}</div>
              <div className="text-sm font-medium text-slate-900">{formatCurrency(latestBid?.amount ?? latestOrder?.totalAmount)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">后续订单</div>
              <div className="text-sm font-medium text-slate-900">{latestOrder?.orderNo ?? '-'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showContractSection ? (
        <Card data-ui-check="award-contract-panel">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-base font-medium text-slate-900">
                  <FileSignature className="h-5 w-5 text-[#006666]" />
                  合同签订
                </h3>
                <p className="mt-1 text-sm text-slate-500">采购经办发起合同后，由中标供应商确认，再进入订单履约。</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {canStartContractSigning ? (
                  <Button variant="brand" onClick={() => void startContractSigning()} disabled={Boolean(contractBusy)}>
                    <FileSignature className="mr-2 h-4 w-4" />
                    {contractBusy === 'start' ? '发起中...' : '发起合同签订'}
                  </Button>
                ) : null}
                {canConfirmContract ? (
                  <Button variant="brand" onClick={() => void confirmContract()} disabled={Boolean(contractBusy)}>
                    <FileSignature className="mr-2 h-4 w-4" />
                    {contractBusy === 'confirm' ? '确认中...' : '确认合同'}
                  </Button>
                ) : null}
              </div>
            </div>

            {contractMessage || contractError ? (
              <div
                className={`mt-4 rounded-md border px-4 py-3 text-sm ${contractError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                role="status"
              >
                {contractError || contractMessage}
              </div>
            ) : null}

            {currentContract ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-md border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">合同编号</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">{currentContract.contractNo}</div>
                  </div>
                  <div className="rounded-md border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">合同金额</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">{formatCurrency(currentContract.amount)}</div>
                  </div>
                  <div className="rounded-md border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">合同状态</div>
                    <div className="mt-2">
                      <Badge variant={contractConfirmed ? 'success' : statusBadgeVariant(currentContract.status)}>{contractStatusLabel(currentContract.status)}</Badge>
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">更新时间</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(currentContract.updatedAt)}</div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
                    <FileText className="h-4 w-4 text-[#006666]" />
                    合同文件
                  </div>
                  {currentContract.attachmentMetadata.length > 0 ? (
                    <div className="space-y-2">
                      {currentContract.attachmentMetadata.map((file) => (
                        <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900">{file.fileName}</div>
                            <div className="mt-1 text-xs text-slate-500">{Math.max(1, Math.ceil(file.sizeBytes / 1024))} KB · {formatDateTime(file.uploadedAt)}</div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => void downloadContractDocument(file)} disabled={Boolean(downloadingFileId)}>
                            <Download className="mr-2 h-4 w-4" />
                            {downloadingFileId === file.id ? '下载中...' : '下载合同'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {contractConfirmed
                        ? '采购方尚未补传合同文件，合同状态已确认，但当前没有可下载文件。请联系采购经办补传正式文件。'
                        : '采购方尚未上传合同文件，当前不能确认合同。请联系采购经办补传正式文件。'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {supplierSide ? '采购经办尚未发起合同签订，请等待合同通知。' : '当前项目尚未发起合同签订。'}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {supplierSide ? (
        <div className="grid gap-6 lg:grid-cols-[1.3fr,0.7fr]">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <div className="text-base font-medium text-slate-900">供应商结果通知</div>
                <div className="mt-1 text-sm text-slate-500">仅展示当前供应商可见的中标结果与后续履约信息。</div>
              </div>
              {latestNotice ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="font-medium text-slate-900">{latestNotice.id}</div>
                    <Badge variant={statusBadgeVariant(latestNotice.status)}>{humanizeStatus(latestNotice.status)}</Badge>
                  </div>
                  <div className="text-sm text-slate-700">{latestNotice.contentSummary}</div>
                  <div className="mt-3 text-xs text-slate-500">发送时间：{formatDateTime(latestNotice.sentAt ?? latestNotice.createdAt)}</div>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  采购方尚未发送定标结果通知，请等待正式通知。
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">本方报价</th>
                      <th className="px-4 py-3">订单号</th>
                      <th className="px-4 py-3">订单状态</th>
                      <th className="px-4 py-3">付款状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(latestBid?.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{latestOrder?.orderNo ?? '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(latestOrder?.status)}>{humanizeStatus(latestOrder?.status)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(latestOrder?.paymentStatus)}>{humanizeStatus(latestOrder?.paymentStatus)}</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="text-base font-medium text-slate-900">中标摘要</div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">通知结论</div>
                <div className="text-sm font-medium text-slate-900">{supplierOutcome}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">通知时间</div>
                <div className="text-sm font-medium text-slate-900">{formatDateTime(latestNotice?.sentAt ?? latestNotice?.createdAt)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">定价报告</div>
                <div className="text-sm font-medium text-slate-900">{latestPricingReport?.reportNo ?? '-'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">审批单号</th>
                    <th className="px-4 py-3">推荐供应商</th>
                    <th className="px-4 py-3">中标供应商</th>
                    <th className="px-4 py-3">审批状态</th>
                    <th className="px-4 py-3">审批时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workbench.awardApprovals.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.id}</td>
                      <td className="px-4 py-3 text-slate-600">{resolveSupplierName(workbench, item.recommendedSupplierId)}</td>
                      <td className="px-4 py-3 text-slate-900">{resolveSupplierName(workbench, item.selectedSupplierId)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(item.approvalStatus)}>{humanizeStatus(item.approvalStatus)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(item.approvedAt ?? item.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="text-base font-medium text-slate-900">执行摘要</div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">定价报告</div>
                <div className="text-sm font-medium text-slate-900">{latestPricingReport?.reportNo ?? '-'}</div>
                <div className="mt-2 text-xs text-slate-500">审批通过时间：{formatDateTime(latestPricingReport?.approvedAt ?? latestPricingReport?.createdAt)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">订单生成</div>
                <div className="text-sm font-medium text-slate-900">{latestOrder?.orderNo ?? '-'}</div>
                <div className="mt-2 text-xs text-slate-500">
                  {latestOrder ? `${humanizeStatus(latestOrder.status)} / ${formatCurrency(latestOrder.totalAmount)}` : '尚未生成订单'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-1 text-xs text-slate-500">采购申请</div>
                <div className="text-sm font-medium text-slate-900">{workbench.procurementRequest?.code ?? '-'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
