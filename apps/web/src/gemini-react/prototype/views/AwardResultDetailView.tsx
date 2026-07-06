import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Trophy, Mail, FileSignature, Box, AlertCircle } from 'lucide-react';

export function AwardResultDetailView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-800">定标结果与下发</h2>
        <div className="flex gap-3">
          <Button variant="outline"><Mail className="w-4 h-4 mr-2"/>发送通知书</Button>
          <Button className="bg-[#006666] hover:bg-[#004d4d] text-white"><FileSignature className="w-4 h-4 mr-2"/>发起合同签署</Button>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-[#006666] to-[#004d4d] text-white">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-medium border border-green-500/30 mb-3 inline-block">已定标</span>
              <h3 className="text-xl font-semibold mb-2">2026年Q3客房布草集中采购项目</h3>
              <p className="text-white/80 text-sm">定标金额：¥ 138,500.00 | 预算节约率：7.6%</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-sm mb-1">最终中标单位</p>
              <h4 className="text-2xl font-bold flex items-center justify-end gap-2"><Trophy className="w-6 h-6 text-yellow-400" /> 南通纺织供应链有限公司</h4>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">评标排名汇总</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-3 px-4 font-medium">供应商名称</th>
                      <th className="py-3 px-4 font-medium">总报价(¥)</th>
                      <th className="py-3 px-4 font-medium">综合得分</th>
                      <th className="py-3 px-4 font-medium">排名</th>
                      <th className="py-3 px-4 font-medium">定标结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-green-50/30">
                      <td className="py-3 px-4 font-medium">南通纺织供应链有限公司</td>
                      <td className="py-3 px-4">138,500.00</td>
                      <td className="py-3 px-4">87.5</td>
                      <td className="py-3 px-4">1</td>
                      <td className="py-3 px-4"><span className="text-green-600 font-medium flex items-center gap-1"><Trophy className="w-3 h-3"/> 中标</span></td>
                    </tr>
                    <tr className="border-b text-gray-500">
                      <td className="py-3 px-4">上海康乃馨布草制造</td>
                      <td className="py-3 px-4">135,000.00</td>
                      <td className="py-3 px-4">84.0</td>
                      <td className="py-3 px-4">2</td>
                      <td className="py-3 px-4">未中标</td>
                    </tr>
                    <tr className="border-b text-gray-500">
                      <td className="py-3 px-4">江苏梦百合酒店用品</td>
                      <td className="py-3 px-4">142,000.00</td>
                      <td className="py-3 px-4">85.0</td>
                      <td className="py-3 px-4">3</td>
                      <td className="py-3 px-4">未中标</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded text-sm text-amber-800">
                <h4 className="font-medium flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4" />非最低价中标说明</h4>
                <p className="text-amber-700/80">排名第二的上海康乃馨报价最低（135,000.00），但其技术响应中样品克重未达标，综合评分落后。经定标委员会一致同意，推荐综合评分第一的南通纺织中标。</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium flex items-center gap-2"><Mail className="w-5 h-5 text-[#006666]" />通知书下发状态</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-green-800">中标通知书 - 南通纺织</p>
                    <p className="text-xs text-green-600/70">系统生成，已附集团电子章</p>
                  </div>
                  <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-100">查看/重发</Button>
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded">
                  <div>
                    <p className="text-sm font-medium text-slate-700">感谢信(未中标) - 康乃馨、梦百合</p>
                    <p className="text-xs text-slate-500">已于 2026-07-23 10:00 自动发送至供应商邮箱/站内信</p>
                  </div>
                  <span className="text-xs text-gray-500">已发送</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><Box className="w-5 h-5 text-[#006666]" />采购商城转换</h3>
              <p className="text-sm text-gray-500 mb-4">中标物资可自动生成集团商品目录库，供各酒店直采。</p>
              <div className="p-3 border rounded mb-3">
                <p className="text-sm font-medium">高支棉床单 200x230cm</p>
                <p className="text-xs text-gray-500 mb-2">协议价: ¥115.00 | 供应商: 南通纺织</p>
                <div className="flex justify-end"><Button variant="outline" size="sm">配置上架</Button></div>
              </div>
              <div className="p-3 border rounded">
                <p className="text-sm font-medium">羽绒被芯 1200g</p>
                <p className="text-xs text-gray-500 mb-2">协议价: ¥270.00 | 供应商: 南通纺织</p>
                <div className="flex justify-end"><Button variant="outline" size="sm">配置上架</Button></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
