import React from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Save, Send, ShieldAlert, FileText, Upload } from 'lucide-react';

export function SupplierCreateView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-800">新增供应商</h2>
        <div className="flex gap-3">
          <Button variant="outline"><Save className="w-4 h-4 mr-2" />保存草稿</Button>
          <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">加入限制名单</Button>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white"><Send className="w-4 h-4 mr-2" />提交准入</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-[#006666]" />基础信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-500 mb-1">企业全称 *</label>
                  <input type="text" className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" placeholder="请输入营业执照上的全称" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">统一社会信用代码 *</label>
                  <input type="text" className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" placeholder="18位社会信用代码" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">企业类型</label>
                  <select className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none">
                    <option>制造商/生产商</option>
                    <option>代理商/经销商</option>
                    <option>服务商</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">法人代表</label>
                  <input type="text" className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" placeholder="法人姓名" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">注册资本 (万元)</label>
                  <input type="number" className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" placeholder="注册资本" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium flex items-center gap-2"><Upload className="w-5 h-5 text-[#006666]" />资质证照</h3>
                <Button variant="outline" size="sm">批量上传</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-3 px-4 font-medium">证照类型</th>
                      <th className="py-3 px-4 font-medium">有效期</th>
                      <th className="py-3 px-4 font-medium">附件</th>
                      <th className="py-3 px-4 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4">营业执照 *</td>
                      <td className="py-3 px-4 text-gray-400">请选择日期</td>
                      <td className="py-3 px-4"><span className="text-blue-600 cursor-pointer hover:underline text-xs">上传文件</span></td>
                      <td className="py-3 px-4"><span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">待上传</span></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">开户许可证 *</td>
                      <td className="py-3 px-4 text-gray-400">请选择日期</td>
                      <td className="py-3 px-4"><span className="text-blue-600 cursor-pointer hover:underline text-xs">上传文件</span></td>
                      <td className="py-3 px-4"><span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">待上传</span></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">ISO质量体系认证</td>
                      <td className="py-3 px-4 text-gray-400">请选择日期</td>
                      <td className="py-3 px-4"><span className="text-blue-600 cursor-pointer hover:underline text-xs">上传文件</span></td>
                      <td className="py-3 px-4"><span className="text-xs text-gray-500">可选</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">服务能力授权</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-2">供货品类授权</p>
                  <div className="border rounded p-3 h-32 overflow-y-auto space-y-2 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-[#006666] focus:ring-[#006666]" /> 客房用品</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-[#006666] focus:ring-[#006666]" /> 餐饮食品</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-[#006666] focus:ring-[#006666]" /> 工程设备</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-[#006666] focus:ring-[#006666]" /> IT弱电</label>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">服务区域授权</p>
                  <div className="border rounded p-3 h-32 overflow-y-auto space-y-2 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-[#006666] focus:ring-[#006666]" /> 华东大区 (上海、江苏、浙江)</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-[#006666] focus:ring-[#006666]" /> 华南大区 (广东、福建、海南)</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-[#006666] focus:ring-[#006666]" /> 华北大区 (北京、天津、河北)</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-[#006666] focus:ring-[#006666]" /> 西南大区 (四川、重庆、云南)</label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-[#006666]" />风险与准入预判</h3>
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded text-sm text-gray-500 border border-slate-200 text-center">
                  请先输入企业名称或信用代码以进行企查查接口校验
                </div>
                <div className="opacity-50 pointer-events-none">
                  <div className="flex justify-between text-sm mb-2"><span>经营异常</span><span>--</span></div>
                  <div className="flex justify-between text-sm mb-2"><span>行政处罚</span><span>--</span></div>
                  <div className="flex justify-between text-sm mb-2"><span>失信被执行人</span><span>--</span></div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-gray-500 mb-2">系统准入建议</p>
                  <p className="text-xs bg-slate-100 text-slate-500 p-2 rounded">待完善信息后评估</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
