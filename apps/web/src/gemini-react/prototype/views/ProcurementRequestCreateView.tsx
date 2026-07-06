import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Save, Send, Upload, FileText, Settings, AlertCircle } from 'lucide-react';

export function ProcurementRequestCreateView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-800">发起采购申请</h2>
        <div className="flex gap-3">
          <Button variant="outline"><Save className="w-4 h-4 mr-2" />保存草稿</Button>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white"><Send className="w-4 h-4 mr-2" />提交审批</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-[#006666]" />基本信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">需求标题</label>
                  <input type="text" className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" placeholder="例如：2026年Q3客房布草采购" defaultValue="2026年Q3客房布草采购" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">酒店/部门</label>
                  <input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50" defaultValue="上海外滩G-Hotel / 客房部" readOnly />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">需求人</label>
                  <input type="text" className="w-full border rounded px-3 py-2 text-sm bg-gray-50" defaultValue="张经理" readOnly />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">品类</label>
                  <select className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none">
                    <option>客房用品 - 布草</option>
                    <option>餐饮用品</option>
                    <option>工程设备</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">预算总额 (¥)</label>
                  <input type="number" className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" defaultValue={150000} />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">期望到货日期</label>
                  <input type="date" className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" defaultValue="2026-08-15" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-500 mb-1">收货地点</label>
                  <input type="text" className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" defaultValue="上海市黄浦区中山东一路88号 G-Hotel 负一楼收货部" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium flex items-center gap-2"><Settings className="w-5 h-5 text-[#006666]" />需求明细</h3>
                <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-1"/>添加物料</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-3 px-4 font-medium">物料名称</th>
                      <th className="py-3 px-4 font-medium">规格</th>
                      <th className="py-3 px-4 font-medium">数量</th>
                      <th className="py-3 px-4 font-medium">单位</th>
                      <th className="py-3 px-4 font-medium">预算单价(¥)</th>
                      <th className="py-3 px-4 font-medium">预算金额(¥)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">高支棉床单</td>
                      <td className="py-3 px-4">200x230cm</td>
                      <td className="py-3 px-4">500</td>
                      <td className="py-3 px-4">条</td>
                      <td className="py-3 px-4">120.00</td>
                      <td className="py-3 px-4">60,000.00</td>
                    </tr>
                    <tr className="border-b hover:bg-slate-50">
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

          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><Upload className="w-5 h-5 text-[#006666]" />附件与说明</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">需求详细说明</label>
                  <textarea className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none h-24" placeholder="请输入具体的技术要求或特殊说明..."></textarea>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-2">上传附件 (预算依据、参考图片)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-slate-50 cursor-pointer">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">点击或拖拽文件到此处上传</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-[#006666]" />采购规则预判</h3>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded border border-blue-100">
                  <p className="text-sm text-blue-800 font-medium mb-1">预算判定：超10万元</p>
                  <p className="text-xs text-blue-600">当前总预算 150,000.00 元，触发集团集中采购阈值。</p>
                </div>
                <div className="p-3 bg-amber-50 rounded border border-amber-100">
                  <p className="text-sm text-amber-800 font-medium mb-1">建议采购方式：公开招标</p>
                  <p className="text-xs text-amber-600">由于金额较大且属于标准化客房用品，建议采用公开招标方式。</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">预计审批链</p>
                  <div className="relative border-l-2 border-[#006666] ml-2 pl-4 space-y-4">
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#006666]"></div>
                      <p className="text-sm font-medium">部门总监审批</p>
                      <p className="text-xs text-gray-500">客房部</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                      <p className="text-sm font-medium text-gray-500">酒店驻店经理审批</p>
                      <p className="text-xs text-gray-500">G-Hotel</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                      <p className="text-sm font-medium text-gray-500">集团采购中心审核</p>
                      <p className="text-xs text-gray-500">集采中心</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
