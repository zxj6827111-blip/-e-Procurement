import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ExternalLink, Database, Link as LinkIcon, FileText, AlertCircle } from 'lucide-react';

export function ExternalTradeView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-800">外部依法招标备案</h2>
        <div className="flex gap-3">
          <Button variant="outline"><LinkIcon className="w-4 h-4 mr-2" />同步档案</Button>
          <Button className="bg-[#006666] hover:bg-[#004d4d] text-white">登记新备案</Button>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded flex gap-3 text-blue-800">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">外部交易平台联动说明</p>
          <p className="text-blue-700/80">因法规要求在政府指定的公共资源交易平台或第三方招标代理机构完成的依法必招项目，需在此处进行结果备案登记，以便将中标结果引入本系统进行后续合同及订单履约。本模块仅作备案和档案留存，不在此执行招投标全过程。</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium flex items-center gap-2"><Database className="w-5 h-5 text-[#006666]" />外部项目备案列表</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="搜索项目名称、编号..." className="border rounded px-3 py-1 text-sm outline-none w-64" />
              <select className="border rounded px-2 py-1 text-sm outline-none">
                <option>全部平台</option>
                <option>上海市公共资源交易中心</option>
                <option>中国采购与招标网</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr>
                  <th className="py-3 px-4 font-medium">内部备案编号</th>
                  <th className="py-3 px-4 font-medium">项目名称</th>
                  <th className="py-3 px-4 font-medium">外部交易平台</th>
                  <th className="py-3 px-4 font-medium">外部项目编号</th>
                  <th className="py-3 px-4 font-medium">中标单位</th>
                  <th className="py-3 px-4 font-medium">状态</th>
                  <th className="py-3 px-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium text-gray-900">EXT-2026-001</td>
                  <td className="py-3 px-4">G-Hotel 杭州外立面改造工程</td>
                  <td className="py-3 px-4">浙江省公共资源交易中心</td>
                  <td className="py-3 px-4 text-gray-500">ZJ-202605-GC001</td>
                  <td className="py-3 px-4">浙江建工集团</td>
                  <td className="py-3 px-4"><span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">已备案归档</span></td>
                  <td className="py-3 px-4 flex gap-2">
                    <Button variant="outline" size="sm">查看档案</Button>
                    <button type="button" className="inline-flex items-center justify-center border rounded px-2 py-1 text-xs text-gray-600 hover:bg-slate-50"><ExternalLink className="w-3 h-3 mr-1"/>外链</button>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium text-gray-900">EXT-2026-002</td>
                  <td className="py-3 px-4">集团核心数据中心机房建设</td>
                  <td className="py-3 px-4">上海市国际招标有限公司</td>
                  <td className="py-3 px-4 text-gray-500">SITC-2026-IT008</td>
                  <td className="py-3 px-4 text-gray-400">结果未同步</td>
                  <td className="py-3 px-4"><span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">备案中</span></td>
                  <td className="py-3 px-4 flex gap-2">
                    <Button variant="outline" size="sm" className="border-amber-300 text-amber-700">完善结果</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-[#006666]" />必须归档附件清单要求</h3>
            <ul className="text-sm space-y-3 text-gray-600 list-disc pl-5">
              <li>外部平台发布的正式招标公告/邀请书（截图或PDF）</li>
              <li>中标候选人公示页面截图或链接</li>
              <li>加盖公章的正式中标通知书扫描件</li>
              <li>招标代理机构出具的评标报告汇总页</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
