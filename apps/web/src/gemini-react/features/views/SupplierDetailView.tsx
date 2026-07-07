import React, { useState } from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { ShieldCheck, History, Activity, FileText, Package, AlertCircle } from 'lucide-react';

export function SupplierDetailView() {
  const [activeTab, setActiveTab] = useState('base');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold text-gray-800">南通纺织供应链有限公司</h2>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium border border-green-200">入库合格供应商</span>
          </div>
          <p className="text-sm text-gray-500">统一社会信用代码：91320600MA1TXXXXX</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">更新评估</Button>
          <Button variant="outline" className="text-red-600 hover:bg-red-50 border-red-200">降级淘汰</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3 space-y-6">
          <div className="flex border-b">
            {[
              { id: 'base', label: '基础资料' },
              { id: 'cert', label: '资质证照' },
              { id: 'auth', label: '品类授权' },
              { id: 'quote', label: '报价记录' },
              { id: 'perf', label: '履约评价' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#006666] text-[#006666]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="p-6">
              {activeTab === 'base' && (
                <div className="space-y-6">
                  <h3 className="font-medium flex items-center gap-2"><FileText className="w-5 h-5 text-[#006666]" />企业基础信息</h3>
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div><span className="text-gray-500 block mb-1">企业类型</span><span className="font-medium">制造商</span></div>
                    <div><span className="text-gray-500 block mb-1">法人代表</span><span className="font-medium">张建国</span></div>
                    <div><span className="text-gray-500 block mb-1">注册资本</span><span className="font-medium">5000 万人民币</span></div>
                    <div><span className="text-gray-500 block mb-1">成立日期</span><span className="font-medium">2010-05-12</span></div>
                    <div className="col-span-2"><span className="text-gray-500 block mb-1">注册地址</span><span className="font-medium">江苏省南通市通州区川姜镇家纺产业园A区18号</span></div>
                    <div className="col-span-2"><span className="text-gray-500 block mb-1">联系人/电话</span><span className="font-medium">李明 / 13800000000</span></div>
                  </div>
                </div>
              )}
              {activeTab === 'perf' && (
                <div className="space-y-6">
                  <h3 className="font-medium flex items-center gap-2"><Activity className="w-5 h-5 text-[#006666]" />历史履约评价</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b">
                        <tr>
                          <th className="py-3 px-4 font-medium">评价项目/订单号</th>
                          <th className="py-3 px-4 font-medium">评价酒店</th>
                          <th className="py-3 px-4 font-medium">质量得分</th>
                          <th className="py-3 px-4 font-medium">交付得分</th>
                          <th className="py-3 px-4 font-medium">综合评价</th>
                          <th className="py-3 px-4 font-medium">时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-3 px-4">PO-202511-042</td>
                          <td className="py-3 px-4">上海外滩G-Hotel</td>
                          <td className="py-3 px-4 text-green-600">4.8 / 5</td>
                          <td className="py-3 px-4 text-green-600">5.0 / 5</td>
                          <td className="py-3 px-4">优秀</td>
                          <td className="py-3 px-4">2025-12-01</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4">PO-202508-011</td>
                          <td className="py-3 px-4">杭州西湖G-Hotel</td>
                          <td className="py-3 px-4 text-green-600">4.5 / 5</td>
                          <td className="py-3 px-4 text-amber-600">3.8 / 5</td>
                          <td className="py-3 px-4">良好</td>
                          <td className="py-3 px-4">2025-09-15</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab !== 'base' && activeTab !== 'perf' && (
                <div className="py-12 text-center text-gray-500">
                  {tabLabels[activeTab]}信息已加载，当前仅展示重点切片。
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-600" />综合风险评级</h3>
              <div className="text-center py-4 border-b">
                <span className="text-4xl font-bold text-[#006666]">A</span>
                <p className="text-sm text-gray-500 mt-2">优质供应商</p>
              </div>
              <div className="space-y-3 pt-4">
                <div className="flex justify-between text-sm"><span className="text-gray-600">企查查风险状态</span><span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 正常</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">证照过期预警</span><span className="text-gray-800">无异常</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">历史黑名单命中</span><span className="text-gray-800">否</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><History className="w-5 h-5 text-[#006666]" />最近业务摘要</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">本年度合作金额</p>
                  <p className="font-medium text-lg">¥ 1,245,000.00</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">最近参与项目</p>
                  <p className="font-medium text-blue-600 hover:underline cursor-pointer">2026年Q3客房布草集中采购</p>
                  <p className="text-xs text-gray-500 mt-1">状态：已中标</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const tabLabels: Record<string, string> = {
  cert: '资质证照',
  auth: '品类授权',
  quote: '报价记录'
};

const CheckCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
