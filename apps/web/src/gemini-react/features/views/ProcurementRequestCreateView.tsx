import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, FileText, Plus, Save, Send, Trash2 } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import { apiPost } from '../../../api/http';

interface RequestLineDraft {
  id: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  budgetAmount: number;
  requiredByDate: string;
  remark: string;
}

interface CreatedRequestResponse {
  procurementRequest: {
    id: string;
  };
}

type BusyAction = 'draft' | 'submit' | null;

function todayPlus(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function newLineItem(index: number): RequestLineDraft {
  return {
    id: `line-${Date.now()}-${index}`,
    itemName: '',
    specification: '',
    quantity: 1,
    unit: '项',
    estimatedUnitPrice: 0,
    budgetAmount: 0,
    requiredByDate: todayPlus(14),
    remark: ''
  };
}

function money(value: number) {
  return `CNY ${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProcurementRequestCreateView() {
  const { currentUser, setCurrentView } = useApp();
  const [title, setTitle] = useState('客房布草补采采购');
  const [category, setCategory] = useState('客房布草');
  const [requestDepartment, setRequestDepartment] = useState('客房部');
  const [requesterName, setRequesterName] = useState(currentUser?.name ?? '');
  const [expectedArrivalAt, setExpectedArrivalAt] = useState(todayPlus(14));
  const [receivingLocation, setReceivingLocation] = useState('上海滨江酒店收货部');
  const [purpose, setPurpose] = useState('库存低于安全水位，需要补充门店日常运营物资。');
  const [externalTradeFlag, setExternalTradeFlag] = useState(false);
  const [lineItems, setLineItems] = useState<RequestLineDraft[]>([
    {
      ...newLineItem(1),
      itemName: '高支棉床单',
      specification: '200x230cm',
      quantity: 500,
      unit: '条',
      estimatedUnitPrice: 120,
      budgetAmount: 60000
    }
  ]);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const budgetAmount = useMemo(
    () => lineItems.reduce((sum, item) => sum + Number(item.budgetAmount || item.quantity * item.estimatedUnitPrice || 0), 0),
    [lineItems]
  );

  function updateLineItem(id: string, patch: Partial<RequestLineDraft>) {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if ('quantity' in patch || 'estimatedUnitPrice' in patch) {
          next.budgetAmount = Number((Number(next.quantity || 0) * Number(next.estimatedUnitPrice || 0)).toFixed(2));
        }
        return next;
      })
    );
  }

  function addLineItem() {
    setLineItems((items) => [...items, newLineItem(items.length + 1)]);
  }

  function removeLineItem(id: string) {
    setLineItems((items) => (items.length <= 1 ? items : items.filter((item) => item.id !== id)));
  }

  function buildPayload() {
    return {
      title: title.trim(),
      category: category.trim(),
      requestDepartment: requestDepartment.trim(),
      requesterName: requesterName.trim(),
      budgetLabel: '按酒店制度执行',
      budgetAmount,
      purpose: purpose.trim(),
      expectedArrivalAt,
      receivingLocation: receivingLocation.trim(),
      externalTradeFlag,
      lineItems: lineItems
        .filter((item) => item.itemName.trim())
        .map((item, index) => ({
          id: `line-${index + 1}`,
          itemName: item.itemName.trim(),
          category: category.trim(),
          specification: item.specification.trim(),
          quantity: Number(item.quantity || 0),
          unit: item.unit.trim() || '项',
          estimatedUnitPrice: Number(item.estimatedUnitPrice || 0),
          budgetAmount: Number(item.budgetAmount || 0),
          requiredByDate: item.requiredByDate,
          remark: item.remark.trim()
        }))
    };
  }

  async function createRequest(submitAfterCreate: boolean) {
    setError('');
    setSuccessMessage('');
    if (!title.trim()) {
      setError('请填写申请标题。');
      return;
    }
    if (!requestDepartment.trim()) {
      setError('请填写使用部门。');
      return;
    }
    if (!lineItems.some((item) => item.itemName.trim())) {
      setError('请至少填写一条采购明细。');
      return;
    }
    setBusyAction(submitAfterCreate ? 'submit' : 'draft');
    try {
      const created = await apiPost<CreatedRequestResponse>('/api/procurement-requests', buildPayload(), currentUser?.id);
      if (submitAfterCreate) {
        await apiPost(`/api/procurement-requests/${encodeURIComponent(created.procurementRequest.id)}/submit`, {}, currentUser?.id);
      }
      setSuccessMessage(submitAfterCreate ? '采购申请已提交审批。' : '采购申请草稿已保存。');
      setCurrentView('PURCHASE_REQUEST');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建采购申请失败');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <form data-ui-check="procurement-request-create-form" className="h-full overflow-auto pb-12" onSubmit={(event) => { event.preventDefault(); void createRequest(true); }}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button type="button" variant="ghost" className="p-2 hover:bg-slate-100" onClick={() => setCurrentView('PURCHASE_REQUEST')}>
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#006666]" />
                新建采购申请
              </h2>
              <p className="text-sm text-slate-500 mt-1">录入酒店需求，保存为草稿或直接提交集团审批。</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button data-ui-check="procurement-request-save-draft" type="button" variant="outline" disabled={busyAction !== null} onClick={() => void createRequest(false)}>
              <Save className="w-4 h-4 mr-2" />
              保存草稿
            </Button>
            <Button data-ui-check="procurement-request-submit-create" type="submit" variant="primary" disabled={busyAction !== null}>
              <Send className="w-4 h-4 mr-2" />
              提交审批
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#006666]" />
                  基本信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm text-slate-500 mb-1">需求标题</span>
                    <input data-ui-check="procurement-request-title-input" value={title} onChange={(event) => setTitle(event.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" />
                  </label>
                  <label className="block">
                    <span className="block text-sm text-slate-500 mb-1">采购品类</span>
                    <input value={category} onChange={(event) => setCategory(event.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" />
                  </label>
                  <label className="block">
                    <span className="block text-sm text-slate-500 mb-1">使用部门</span>
                    <input value={requestDepartment} onChange={(event) => setRequestDepartment(event.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" />
                  </label>
                  <label className="block">
                    <span className="block text-sm text-slate-500 mb-1">申请人</span>
                    <input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" />
                  </label>
                  <label className="block">
                    <span className="block text-sm text-slate-500 mb-1">需求日期</span>
                    <input type="date" value={expectedArrivalAt} onChange={(event) => setExpectedArrivalAt(event.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" />
                  </label>
                  <label className="block">
                    <span className="block text-sm text-slate-500 mb-1">收货地点</span>
                    <input value={receivingLocation} onChange={(event) => setReceivingLocation(event.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" />
                  </label>
                  <label className="block col-span-2">
                    <span className="block text-sm text-slate-500 mb-1">需求用途</span>
                    <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={4} className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={externalTradeFlag} onChange={(event) => setExternalTradeFlag(event.target.checked)} />
                    外部交易备案路径
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium flex items-center gap-2">采购明细</h3>
                  <Button data-ui-check="procurement-request-add-line" type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    添加物料
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b">
                      <tr>
                        <th className="py-3 px-3 font-medium min-w-[160px]">物料名称</th>
                        <th className="py-3 px-3 font-medium min-w-[140px]">规格</th>
                        <th className="py-3 px-3 font-medium w-24">数量</th>
                        <th className="py-3 px-3 font-medium w-24">单位</th>
                        <th className="py-3 px-3 font-medium w-32">预估单价</th>
                        <th className="py-3 px-3 font-medium w-32">行预算</th>
                        <th className="py-3 px-3 font-medium w-16 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr className="border-b hover:bg-slate-50" key={item.id}>
                          <td className="py-3 px-3">
                            <input data-ui-check={index === 0 ? 'procurement-request-line-name-input' : undefined} value={item.itemName} onChange={(event) => updateLineItem(item.id, { itemName: event.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5" />
                          </td>
                          <td className="py-3 px-3">
                            <input value={item.specification} onChange={(event) => updateLineItem(item.id, { specification: event.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5" />
                          </td>
                          <td className="py-3 px-3">
                            <input type="number" min={1} value={item.quantity} onChange={(event) => updateLineItem(item.id, { quantity: Number(event.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1.5" />
                          </td>
                          <td className="py-3 px-3">
                            <input value={item.unit} onChange={(event) => updateLineItem(item.id, { unit: event.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5" />
                          </td>
                          <td className="py-3 px-3">
                            <input type="number" min={0} step="0.01" value={item.estimatedUnitPrice} onChange={(event) => updateLineItem(item.id, { estimatedUnitPrice: Number(event.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1.5" />
                          </td>
                          <td className="py-3 px-3">
                            <input type="number" min={0} step="0.01" value={item.budgetAmount} onChange={(event) => updateLineItem(item.id, { budgetAmount: Number(event.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1.5" />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button type="button" variant="ghost" size="sm" disabled={lineItems.length <= 1} onClick={() => removeLineItem(item.id)} aria-label="删除物料">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#006666]" />
                  采购规则预判
                </h3>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded border border-blue-100">
                    <p className="text-sm text-blue-800 font-medium mb-1">预算金额</p>
                    <p data-ui-check="procurement-request-budget-preview" className="text-lg font-semibold text-blue-900">{money(budgetAmount)}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded border border-amber-100">
                    <p className="text-sm text-amber-800 font-medium mb-1">建议采购方式</p>
                    <p className="text-xs text-amber-700">{budgetAmount >= 100000 ? '金额较高，建议后续由集团采购经办判定公开招采或比选。' : '可进入集团需求审批后再按规则判定采购方式。'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-2">预计审批链</p>
                    <div className="relative border-l-2 border-[#006666] ml-2 pl-4 space-y-4">
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#006666]" />
                        <p className="text-sm font-medium">集团采购管理人审批</p>
                        <p className="text-xs text-slate-500">提交后生成审批待办</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300" />
                        <p className="text-sm font-medium text-slate-500">采购经办判定采购方式</p>
                        <p className="text-xs text-slate-500">审批通过后进入项目承接</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </form>
  );
}
