import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileCheck, Truck, Receipt, Star, FileArchive } from 'lucide-react';

export function ProjectFulfillmentView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-800">项目履约与结算</h2>
        <div className="flex gap-3">
          <Button variant="outline">生成采购订单</Button>
          <Button className="bg-[#006666] hover:bg-[#004d4d] text-white">项目归档封存</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">合同状态</p>
              <p className="text-sm font-medium">已签署</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">订单/收货</p>
              <p className="text-sm font-medium">部分收货 (1/2)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">结算状态</p>
              <p className="text-sm font-medium">未结算</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">档案完整度</p>
              <p className="text-sm font-medium">85%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-[#006666]" />采购订单与收货</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b">
                <tr>
                  <th className="py-3 px-4 font-medium">订单编号</th>
                  <th className="py-3 px-4 font-medium">物料/服务</th>
                  <th className="py-3 px-4 font-medium">金额(¥)</th>
                  <th className="py-3 px-4 font-medium">约定交付日期</th>
                  <th className="py-3 px-4 font-medium">状态</th>
                  <th className="py-3 px-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4">PO-202607-001</td>
                  <td className="py-3 px-4">高支棉床单 x 500</td>
                  <td className="py-3 px-4">57,500.00</td>
                  <td className="py-3 px-4">2026-08-01</td>
                  <td className="py-3 px-4"><span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">已入库验收</span></td>
                  <td className="py-3 px-4"><Button variant="outline" size="sm">查看单据</Button></td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">PO-202607-002</td>
                  <td className="py-3 px-4">羽绒被芯 x 300</td>
                  <td className="py-3 px-4">81,000.00</td>
                  <td className="py-3 px-4">2026-08-15</td>
                  <td className="py-3 px-4"><span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">发货中</span></td>
                  <td className="py-3 px-4"><Button variant="outline" size="sm">登记验收</Button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2"><Receipt className="w-5 h-5 text-[#006666]" />结算单据</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="text-sm font-medium">预付款发票 (30%)</p>
                  <p className="text-xs text-gray-500">发票号：09283711 | 金额：¥41,550.00</p>
                </div>
                <Button variant="outline" size="sm">核验流转</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded border-dashed border-gray-300 bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-500">尾款发票 (待上传)</p>
                  <p className="text-xs text-gray-400">需完成全部收货后由供应商提供</p>
                </div>
                <Button variant="outline" size="sm" disabled>等待中</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium flex items-center gap-2"><Star className="w-5 h-5 text-[#006666]" />供应商履约评价</h3>
              <Button variant="outline" size="sm">提交评价</Button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">质量与验收合格率</span><span className="font-medium">待评价</span></div>
                <div className="w-full bg-slate-100 h-2 rounded-full"><div className="bg-slate-300 h-2 rounded-full w-[0%]"></div></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">交付及时性</span><span className="font-medium">待评价</span></div>
                <div className="w-full bg-slate-100 h-2 rounded-full"><div className="bg-slate-300 h-2 rounded-full w-[0%]"></div></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">售后与响应</span><span className="font-medium">待评价</span></div>
                <div className="w-full bg-slate-100 h-2 rounded-full"><div className="bg-slate-300 h-2 rounded-full w-[0%]"></div></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 bg-slate-50 p-2 rounded">注：系统将结合验收记录自动预填部分客观得分。</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
