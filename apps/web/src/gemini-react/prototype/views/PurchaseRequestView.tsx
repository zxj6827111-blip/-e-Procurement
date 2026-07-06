import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Search, Filter, Plus, FileText, CheckCircle2, XCircle, Clock, ArrowLeft, Download, PenTool } from 'lucide-react';
import { cn } from '../lib/utils';

export function PurchaseRequestView() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const requests = [
    { id: 'REQ-202607-091', title: '客房洗漱用品补充采购', department: '客房部', amount: '¥ 45,000', status: 'DRAFT', date: '2026-07-05' },
    { id: 'REQ-202607-088', title: '全日餐厅生鲜食材(下半月)', department: '餐饮部', amount: '¥ 120,000', status: 'PENDING', date: '2026-07-04' },
    { id: 'REQ-202607-085', title: '大堂香氛系统维保服务', department: '工程部', amount: '¥ 12,500', status: 'APPROVED', date: '2026-07-02' },
    { id: 'REQ-202607-082', title: '员工食堂主食干货', department: '餐饮部', amount: '¥ 8,800', status: 'REJECTED', date: '2026-07-01' },
    { id: 'REQ-202606-199', title: '年度保洁服务外包(续签)', department: '前厅部', amount: '¥ 350,000', status: 'APPROVED', date: '2026-06-28' },
  ];

  if (selectedRequest) {
    return (
      <div className="h-full flex flex-col space-y-6 max-w-5xl mx-auto pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="p-2 hover:bg-slate-100" onClick={() => setSelectedRequest(null)}>
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#006666]" />
              采购申请详情
            </h2>
            <p className="text-sm text-slate-500 mt-1">单据编号: {selectedRequest.id}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
             {selectedRequest.status === 'DRAFT' && <Badge variant="default" className="text-sm px-3 py-1">状态：草稿</Badge>}
             {selectedRequest.status === 'PENDING' && <Badge variant="warning" className="text-sm px-3 py-1">状态：审批中</Badge>}
             {selectedRequest.status === 'APPROVED' && <Badge variant="success" className="text-sm px-3 py-1">状态：已通过</Badge>}
             {selectedRequest.status === 'REJECTED' && <Badge variant="danger" className="text-sm px-3 py-1">状态：已驳回</Badge>}
          </div>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4 flex flex-row items-center justify-between">
             <CardTitle className="text-base font-semibold text-slate-800">申请单基本信息</CardTitle>
             <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-white"><Download className="w-4 h-4 mr-1" />导出PDF</Button>
                {selectedRequest.status === 'DRAFT' && <Button variant="outline" size="sm" className="bg-white text-[#006666] border-[#006666]"><PenTool className="w-4 h-4 mr-1" />继续编辑</Button>}
             </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">采购标题</p>
                <p className="text-base font-medium text-slate-900">{selectedRequest.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">提报部门</p>
                <p className="text-base font-medium text-slate-900">{selectedRequest.department}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">预估总金额</p>
                <p className="text-base font-medium text-rose-600">{selectedRequest.amount}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">提报日期</p>
                <p className="text-base font-medium text-slate-900">{selectedRequest.date}</p>
              </div>
            </div>
            
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">采购物资明细</h3>
              <table className="w-full text-sm text-left border border-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-2 border-b border-slate-200">物资名称</th>
                    <th className="px-4 py-2 border-b border-slate-200">规格/型号</th>
                    <th className="px-4 py-2 border-b border-slate-200">数量</th>
                    <th className="px-4 py-2 border-b border-slate-200">单位</th>
                    <th className="px-4 py-2 border-b border-slate-200 text-right">参考单价</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-4 py-3">演示物资 A</td>
                    <td className="px-4 py-3">标准规格</td>
                    <td className="px-4 py-3">100</td>
                    <td className="px-4 py-3">件</td>
                    <td className="px-4 py-3 text-right">¥ 200.00</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">演示物资 B</td>
                    <td className="px-4 py-3">定制规格</td>
                    <td className="px-4 py-3">50</td>
                    <td className="px-4 py-3">套</td>
                    <td className="px-4 py-3 text-right">¥ 500.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8">
              <p className="text-sm font-medium text-slate-500 mb-2">申请理由与说明</p>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-sm leading-relaxed">
                因原有库存告急，为保障下半月运营需求，特申请进行本次采购补充。此内容为系统生成的演示数据。
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#006666]" />
            采购申请单管理
          </h2>
          <p className="text-sm text-slate-500 mt-1">集中管理所有部门提报的采购需求及审批状态</p>
        </div>
        <Button variant="primary" className="gap-2">
          <Plus className="w-4 h-4" /> 新建采购申请
        </Button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
          <div className="flex-1 relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜索单号、标题、提报部门" 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]"
            />
          </div>
          <div className="flex gap-2">
            <select className="border border-slate-300 rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#006666]">
              <option>所有状态</option>
              <option>草稿</option>
              <option>审批中</option>
              <option>已通过</option>
              <option>已驳回</option>
            </select>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" /> 更多筛选
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-6 py-3">申请单号</th>
                <th className="px-6 py-3">采购标题</th>
                <th className="px-6 py-3">需求部门</th>
                <th className="px-6 py-3 text-right">预估金额</th>
                <th className="px-6 py-3 text-center">当前状态</th>
                <th className="px-6 py-3">提报日期</th>
                <th className="px-6 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{req.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{req.title}</td>
                  <td className="px-6 py-4 text-slate-600">{req.department}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700">{req.amount}</td>
                  <td className="px-6 py-4 text-center">
                    {req.status === 'DRAFT' && <Badge variant="default">草稿</Badge>}
                    {req.status === 'PENDING' && <Badge variant="warning"><Clock className="w-3 h-3 mr-1 inline"/>审批中</Badge>}
                    {req.status === 'APPROVED' && <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1 inline"/>已通过</Badge>}
                    {req.status === 'REJECTED' && <Badge variant="danger"><XCircle className="w-3 h-3 mr-1 inline"/>已驳回</Badge>}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{req.date}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="sm" className="text-[#006666]" onClick={() => setSelectedRequest(req)}>查看详情</Button>
                    {req.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => setSelectedRequest(req)}>编辑</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-sm text-slate-500">
          <div>共找到 {requests.length} 条记录</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>上一页</Button>
            <Button variant="outline" size="sm" className="bg-white text-[#006666] border-[#006666]">1</Button>
            <Button variant="outline" size="sm">2</Button>
            <Button variant="outline" size="sm">下一页</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
