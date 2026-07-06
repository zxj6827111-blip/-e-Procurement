import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Check, X, CornerUpLeft, ArrowRight, Clock, FileText } from 'lucide-react';

export function ProcurementRequestDetailView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-800">采购申请审批</h2>
        <div className="flex gap-3">
          <Button variant="outline"><CornerUpLeft className="w-4 h-4 mr-2" />返回列表</Button>
          <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"><X className="w-4 h-4 mr-2" />驳回</Button>
          <Button variant="outline" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"><CornerUpLeft className="w-4 h-4 mr-2" />退回修改</Button>
          <Button className="bg-[#006666] hover:bg-[#004d4d] text-white"><Check className="w-4 h-4 mr-2" />审核通过</Button>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white"><ArrowRight className="w-4 h-4 mr-2" />生成采购项目</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-800">2026年Q3客房布草采购申请</h3>
                  <p className="text-sm text-gray-500 mt-1">单号：REQ-202607-001</p>
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">待集团审核</span>
              </div>
              <div className="grid grid-cols-3 gap-y-4 text-sm">
                <div><span className="text-gray-500 block mb-1">申请酒店</span><span className="font-medium">上海外滩G-Hotel</span></div>
                <div><span className="text-gray-500 block mb-1">申请部门</span><span className="font-medium">客房部</span></div>
                <div><span className="text-gray-500 block mb-1">申请人</span><span className="font-medium">张经理</span></div>
                <div><span className="text-gray-500 block mb-1">采购品类</span><span className="font-medium">客房用品 - 布草</span></div>
                <div><span className="text-gray-500 block mb-1">预算总计</span><span className="font-medium text-red-600">¥ 150,000.00</span></div>
                <div><span className="text-gray-500 block mb-1">期望到货</span><span className="font-medium">2026-08-15</span></div>
                <div className="col-span-3"><span className="text-gray-500 block mb-1">收货地址</span><span className="font-medium">上海市黄浦区中山东一路88号 G-Hotel 负一楼收货部</span></div>
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
                      <th className="py-3 px-4 font-medium">单价(¥)</th>
                      <th className="py-3 px-4 font-medium">总额(¥)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4">高支棉床单</td>
                      <td className="py-3 px-4">200x230cm</td>
                      <td className="py-3 px-4">500</td>
                      <td className="py-3 px-4">条</td>
                      <td className="py-3 px-4">120.00</td>
                      <td className="py-3 px-4">60,000.00</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">羽绒被芯</td>
                      <td className="py-3 px-4">200x230cm, 1200g</td>
                      <td className="py-3 px-4">300</td>
                      <td className="py-3 px-4">床</td>
                      <td className="py-3 px-4">300.00</td>
                      <td className="py-3 px-4">90,000.00</td>
                    </tr>
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
                  <p className="text-xs text-gray-500 mb-1">张经理 · 2026-07-01 09:00</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#006666]"></div>
                  <p className="text-sm font-medium">部门总监审批</p>
                  <p className="text-xs text-gray-500 mb-1">李总监 · 2026-07-01 10:30</p>
                  <p className="text-xs bg-slate-50 p-2 rounded text-slate-600 mt-1">同意，旺季备货需求合理。</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#006666]"></div>
                  <p className="text-sm font-medium">酒店驻店经理审批</p>
                  <p className="text-xs text-gray-500 mb-1">王店长 · 2026-07-02 14:15</p>
                  <p className="text-xs bg-slate-50 p-2 rounded text-slate-600 mt-1">同意提交集团采购。</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-amber-500 bg-white"></div>
                  <p className="text-sm font-medium text-amber-600">集团采购中心审核</p>
                  <p className="text-xs text-gray-500 mb-1">待处理</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">执行建议</h3>
              <div className="p-3 bg-blue-50 rounded border border-blue-100 text-sm mb-3">
                <span className="font-medium text-blue-800 block mb-1">建议采购方式：公开招标</span>
                <span className="text-blue-600 text-xs">预算超过10万元，且为通用标准品，符合集团公开招标条件。</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-sm">
                <span className="font-medium text-slate-800 block mb-1">历史价格参考</span>
                <span className="text-slate-600 text-xs">高支棉床单 去年均价：115.00元<br/>羽绒被芯 去年均价：290.00元</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
