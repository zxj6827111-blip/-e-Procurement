import React, { useEffect, useMemo } from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { FileArchive, FileCheck, Receipt, Star, Truck } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import {
  calculateArchiveCompleteness,
  formatCurrency,
  formatDateTime,
  humanizeStatus,
  resolveSupplierName,
  sortByNewest,
  statusBadgeVariant,
  useProjectWorkbenchData
} from './project-workbench-data';

export function ProjectFulfillmentView() {
  const { currentProjectId, setCurrentProjectId, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading, error } = useProjectWorkbenchData(currentProjectId);

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) {
      setCurrentProjectId(resolvedProjectId);
    }
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  const archivePercent = calculateArchiveCompleteness(workbench);
  const latestEvaluation = useMemo(
    () => (workbench ? sortByNewest(workbench.supplierEvaluations, (item) => item.id)[0] ?? null : null),
    [workbench]
  );

  if (loading && !workbench) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">履约结算数据加载中...</div>;
  }

  if (error && !workbench) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{error}</div>;
  }

  if (!workbench || !resolvedProjectId) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的项目。</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">项目履约与结算</h2>
          <p className="mt-1 text-sm text-slate-500">
            {workbench.project.code} / {workbench.project.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setCurrentView('PROJECT_DETAIL')}>
            返回项目详情
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">采购订单</p>
              <p className="text-sm font-medium">{workbench.purchaseOrders.length} 张</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">收货记录</p>
              <p className="text-sm font-medium">{workbench.receiptRecords.length} 条</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">结算材料</p>
              <p className="text-sm font-medium">{workbench.settlementMaterials.length} 份</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <FileArchive className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">档案完整度</p>
              <p className="text-sm font-medium">{archivePercent}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-900">
            <Truck className="h-5 w-5 text-[#006666]" />
            采购订单与收货
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">订单编号</th>
                  <th className="px-4 py-3 font-medium">供应商</th>
                  <th className="px-4 py-3 font-medium">订单金额</th>
                  <th className="px-4 py-3 font-medium">计划到货</th>
                  <th className="px-4 py-3 font-medium">收货地点</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workbench.purchaseOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{order.orderNo}</td>
                    <td className="px-4 py-3 text-slate-600">{resolveSupplierName(workbench, order.supplierId)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(order.expectedDeliveryAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{order.receivingLocation}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(order.status)}>{humanizeStatus(order.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-900">
              <Receipt className="h-5 w-5 text-[#006666]" />
              收货与结算材料
            </h3>
            <div className="space-y-3">
              {workbench.receiptRecords.map((receipt) => (
                <div key={receipt.id} className="rounded border p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium text-slate-900">{receipt.id}</div>
                    <Badge variant={statusBadgeVariant(receipt.handlingStatus ?? receipt.receiptType)}>
                      {humanizeStatus(receipt.handlingStatus ?? receipt.receiptType)}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-700">{receipt.summary}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDateTime(receipt.createdAt)}</div>
                </div>
              ))}

              {workbench.settlementMaterials.map((material) => (
                <div key={material.id} className="rounded border p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium text-slate-900">{material.fileName ?? material.materialType}</div>
                    <Badge variant={statusBadgeVariant(material.status)}>{humanizeStatus(material.status)}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    材料类型：{humanizeStatus(material.materialType)}{material.verificationOpinion ? ` · ${material.verificationOpinion}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-medium text-slate-900">
                <Star className="h-5 w-5 text-[#006666]" />
                供应商履约评价
              </h3>
              {latestEvaluation ? <Badge variant={statusBadgeVariant(latestEvaluation.status)}>{humanizeStatus(latestEvaluation.status)}</Badge> : null}
            </div>

            {latestEvaluation ? (
              <div className="space-y-4">
                <div className="rounded border bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">评价供应商</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{resolveSupplierName(workbench, latestEvaluation.supplierId)}</div>
                  <div className="mt-2 text-sm text-slate-700">总分：{latestEvaluation.score}</div>
                  <div className="mt-2 text-sm text-slate-700">{latestEvaluation.description}</div>
                </div>

                <div className="space-y-3">
                  {Object.entries(latestEvaluation.dimensions).map(([key, value]) => (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-gray-600">{key}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-[#006666]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded border bg-slate-50 p-4 text-sm text-slate-500">当前项目尚未形成供应商履约评价记录。</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
