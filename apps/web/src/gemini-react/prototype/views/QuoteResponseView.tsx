import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FileText, Save, Send, AlertCircle, Info, Upload } from 'lucide-react';
import { cn } from '../lib/utils';

export function QuoteResponseView() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#006666]" />
            项目报价响应
          </h2>
          <p className="text-sm text-slate-500 mt-1">项目编号: PROJ-2026-0034 | 截止时间: 2026-07-10 17:00:00</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="warning" className="text-sm px-3 py-1">距离截止还剩 5天 02:59:00</Badge>
        </div>
      </div>

      {/* 需求分屏 (上半) */}
      <Card>
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center justify-between">
            <span>采购方需求明细</span>
            <Button variant="outline" size="sm" className="gap-1 bg-white">
              <Upload className="w-4 h-4" /> 下载采购需求书 (PDF)
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-medium">序号</th>
                <th className="px-6 py-3 font-medium">标的物名称</th>
                <th className="px-6 py-3 font-medium">规格型号/技术要求</th>
                <th className="px-6 py-3 font-medium">数量/单位</th>
                <th className="px-6 py-3 font-medium">交货期要求</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50">
                <td className="px-6 py-4">1</td>
                <td className="px-6 py-4 font-medium text-slate-900">大堂迎宾智能机器人</td>
                <td className="px-6 py-4 text-slate-600 text-xs">带人脸识别、语音交互、支持室内自主导航。详见附件参数表。</td>
                <td className="px-6 py-4 font-medium">5 台</td>
                <td className="px-6 py-4">合同签订后 30天内</td>
              </tr>
              <tr className="hover:bg-bg-slate-50/50">
                <td className="px-6 py-4">2</td>
                <td className="px-6 py-4 font-medium text-slate-900">智能客房控制主机</td>
                <td className="px-6 py-4 text-slate-600 text-xs">支持 KNX 协议，对接主流酒店管理系统。</td>
                <td className="px-6 py-4 font-medium">500 套</td>
                <td className="px-6 py-4">合同签订后 45天内</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 报价分屏 (下半) */}
      <Card className="border-[#006666]/20 shadow-md">
        <CardHeader className="bg-[#006666]/5 border-b border-[#006666]/10 py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#006666]">我的报价单 (请认真核对后填写)</CardTitle>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Info className="w-4 h-4" /> 报价含税金额
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-[#006666] transition-colors">
              <div className="col-span-3">
                <p className="font-medium text-slate-900 text-sm">1. 大堂迎宾智能机器人</p>
                <p className="text-xs text-slate-500">数量: 5 台</p>
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">响应品牌/型号 *</label>
                <input type="text" className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:ring-[#006666] focus:border-[#006666]" placeholder="例如: 猎户星空 豹小秘" />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">含税单价 (元) *</label>
                <input type="number" className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:ring-[#006666] focus:border-[#006666]" placeholder="0.00" />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">交货期 (天) *</label>
                <input type="number" className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:ring-[#006666] focus:border-[#006666]" placeholder="30" defaultValue="30" />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-[#006666] transition-colors">
              <div className="col-span-3">
                <p className="font-medium text-slate-900 text-sm">2. 智能客房控制主机</p>
                <p className="text-xs text-slate-500">数量: 500 套</p>
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">响应品牌/型号 *</label>
                <input type="text" className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:ring-[#006666] focus:border-[#006666]" placeholder="例如: 罗格朗" />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">含税单价 (元) *</label>
                <input type="number" className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:ring-[#006666] focus:border-[#006666]" placeholder="0.00" />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">交货期 (天) *</label>
                <input type="number" className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:ring-[#006666] focus:border-[#006666]" placeholder="45" defaultValue="45" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">温馨提示：</p>
              <p className="mt-1">请仔细核对填报金额。点击【提交并锁定报价】后，在截标前您将无法再次修改或撤回报价。如需多次确认，请使用【暂存草稿】。</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-[220px] right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex justify-end gap-4 pr-12">
        <Button variant="outline" className="px-6 h-11 text-base font-medium min-w-[140px] border-[#006666] text-[#006666] hover:bg-[#006666]/5">
          <Save className="w-5 h-5 mr-2" />
          暂存草稿
        </Button>
        <Button variant="primary" className="px-8 h-11 text-base font-bold min-w-[180px]">
          <Send className="w-5 h-5 mr-2" />
          提交并锁定报价
        </Button>
      </div>
    </div>
  );
}
