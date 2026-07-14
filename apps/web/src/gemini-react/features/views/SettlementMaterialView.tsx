import React, { useEffect, useMemo } from 'react';
import { FileText, Receipt, ShieldCheck, Wallet } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import {
  formatCurrency,
  formatDateTime,
  humanizeStatus,
  resolveSupplierName,
  sortByNewest,
  statusBadgeVariant,
  useProjectWorkbenchData,
  useSettlementFinanceOverview
} from './project-workbench-data';

export function SettlementMaterialView() {
  const { currentProjectId, setCurrentProjectId } = useApp();
  const { workbench, resolvedProjectId, loading: projectLoading, error: projectError } = useProjectWorkbenchData(currentProjectId);
  const { overview, loading: financeLoading, error: financeError, reload } = useSettlementFinanceOverview();

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) {
      setCurrentProjectId(resolvedProjectId);
    }
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  const projectId = resolvedProjectId ?? workbench?.project.id ?? null;
  const bills = useMemo(
    () => (projectId && overview ? overview.settlementBills.filter((item) => item.projectId === projectId) : []),
    [overview, projectId]
  );
  const materials = useMemo(
    () => (projectId && overview ? overview.settlementMaterials.filter((item) => item.projectId === projectId) : []),
    [overview, projectId]
  );
  const invoices = useMemo(() => {
    if (!overview || !bills.length) return [];
    const billIds = new Set(bills.map((item) => item.id));
    return overview.invoices.filter((item) => billIds.has(item.settlementBillId));
  }, [overview, bills]);
  const reconciliation = useMemo(() => {
    if (!overview || !projectId) return [];
    return overview.reconciliationLines.filter((item) => item.projectId === projectId);
  }, [overview, projectId]);

  const latestBill = useMemo(
    () => sortByNewest(bills, (item) => item.approvedAt ?? item.submittedAt ?? item.createdAt)[0] ?? null,
    [bills]
  );
  const latestInvoice = useMemo(
    () => sortByNewest(invoices, (item) => item.verifiedAt ?? item.uploadedAt ?? item.issueDate)[0] ?? null,
    [invoices]
  );
  const latestReconciliation = useMemo(
    () => sortByNewest(reconciliation, (item) => item.updatedAt)[0] ?? null,
    [reconciliation]
  );

  if ((projectLoading || financeLoading) && !workbench && !overview) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">结算资料加载中...</div>;
  }

  const fatalError = projectError || financeError;
  if (fatalError && !workbench && !overview) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{fatalError}</div>;
  }

  if (!workbench || !projectId) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的结算资料。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">结算资料</h2>
          <p className="mt-1 text-sm text-slate-500">
            {workbench.project.code} / {workbench.project.name}
          </p>
        </div>
        <Button variant="outline" onClick={reload}>
          刷新资料状态
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">结算单</div>
              <div className="text-sm font-medium text-slate-900">{latestBill?.billNo ?? '-'}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">资料上传</div>
              <div className="text-sm font-medium text-slate-900">{materials.length} 份</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">发票核验</div>
              <Badge variant={statusBadgeVariant(latestInvoice?.status)}>{humanizeStatus(latestInvoice?.status)}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">对账结果</div>
              <Badge variant={statusBadgeVariant(latestReconciliation?.status)}>{humanizeStatus(latestReconciliation?.status)}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {!bills.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500">
          当前角色在该项目下没有进入结算阶段的单据。未中标供应商不会生成结算单和结算资料。
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">结算单号</th>
                <th className="px-4 py-3">订单号</th>
                <th className="px-4 py-3">供应商</th>
                <th className="px-4 py-3">结算金额</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">审批时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.billNo}</td>
                  <td className="px-4 py-3 text-slate-600">{item.purchaseOrderNo ?? item.purchaseOrderId}</td>
                  <td className="px-4 py-3 text-slate-600">{resolveSupplierName(workbench, item.supplierId)}</td>
                  <td className="px-4 py-3 text-slate-900">{formatCurrency(item.settlementAmount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(item.status)}>{humanizeStatus(item.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(item.approvedAt ?? item.submittedAt ?? item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="text-base font-medium text-slate-900">结算资料清单</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">资料类型</th>
                    <th className="px-4 py-3">文件名</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">上传时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materials.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-slate-600">{humanizeStatus(item.materialType)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.fileName ?? '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(item.status)}>{humanizeStatus(item.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(item.uploadedAt, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="text-base font-medium text-slate-900">发票与核验意见</div>
            <div className="space-y-4">
              {invoices.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-900">{item.invoiceNo}</div>
                    <Badge variant={statusBadgeVariant(item.status)}>{humanizeStatus(item.status)}</Badge>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <div>发票金额：{formatCurrency(item.amount)}</div>
                    <div>上传时间：{formatDateTime(item.uploadedAt)}</div>
                    <div>开票日期：{formatDateTime(item.issueDate, false)}</div>
                    <div>核验时间：{formatDateTime(item.verifiedAt)}</div>
                  </div>
                  {item.verificationOpinion ? (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{item.verificationOpinion}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
