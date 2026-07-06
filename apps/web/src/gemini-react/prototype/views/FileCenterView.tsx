import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Folder, File, Download, Search, Filter, Shield, Eye } from 'lucide-react';

export function FileCenterView() {
  return (
    <div className="flex h-[calc(100vh-120px)] gap-6">
      <div className="w-64 shrink-0 space-y-4">
        <Card className="h-full">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-medium flex items-center gap-2 text-gray-800 mb-4"><Folder className="w-5 h-5 text-[#006666]" />文件类型库</h3>
            <div className="space-y-1 text-sm font-medium">
              <div className="px-3 py-2 bg-[#006666]/10 text-[#006666] rounded cursor-pointer flex justify-between items-center">
                <span>全部文件</span>
                <span className="text-xs">4,120</span>
              </div>
              <div className="px-3 py-2 text-gray-600 hover:bg-slate-50 rounded cursor-pointer flex justify-between items-center">
                <span>采购需求附件</span>
                <span className="text-xs">850</span>
              </div>
              <div className="px-3 py-2 text-gray-600 hover:bg-slate-50 rounded cursor-pointer flex justify-between items-center">
                <span>采购文件(招标文件)</span>
                <span className="text-xs">320</span>
              </div>
              <div className="px-3 py-2 text-gray-600 hover:bg-slate-50 rounded cursor-pointer flex justify-between items-center">
                <span>供应商响应(投标文件)</span>
                <span className="text-xs">1,245</span>
              </div>
              <div className="px-3 py-2 text-gray-600 hover:bg-slate-50 rounded cursor-pointer flex justify-between items-center">
                <span>定标与评审报告</span>
                <span className="text-xs">412</span>
              </div>
              <div className="px-3 py-2 text-gray-600 hover:bg-slate-50 rounded cursor-pointer flex justify-between items-center">
                <span>合同归档</span>
                <span className="text-xs">890</span>
              </div>
              <div className="px-3 py-2 text-gray-600 hover:bg-slate-50 rounded cursor-pointer flex justify-between items-center">
                <span>供应商资质证照</span>
                <span className="text-xs">403</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 flex flex-col space-y-4">
        <Card>
          <CardContent className="p-4 flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input type="text" className="w-full border rounded-md px-10 py-2 text-sm focus:ring-[#006666] outline-none" placeholder="搜索文件名称、关联项目编号、上传人..." />
            </div>
            <select className="border rounded-md px-3 py-2 text-sm outline-none bg-white">
              <option>全部密级</option>
              <option>公开</option>
              <option>内部只读</option>
              <option>核心机密 (加密)</option>
            </select>
            <Button variant="outline" className="flex items-center gap-2"><Filter className="w-4 h-4" />高级筛选</Button>
          </CardContent>
        </Card>

        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardContent className="p-0 flex-1 overflow-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-6 font-medium">文件名称</th>
                  <th className="py-3 px-4 font-medium">关联业务对象</th>
                  <th className="py-3 px-4 font-medium">密级</th>
                  <th className="py-3 px-4 font-medium">上传人/时间</th>
                  <th className="py-3 px-6 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-slate-50 group">
                  <td className="py-4 px-6 flex items-center gap-3">
                    <File className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-[#006666] cursor-pointer">公开招标采购文件_V1.pdf</p>
                      <p className="text-xs text-gray-400">2.4 MB • 版本 1</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-600 text-xs">项目: PROJ-202607-001</td>
                  <td className="py-4 px-4"><span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">公开</span></td>
                  <td className="py-4 px-4 text-xs">
                    <p className="text-gray-700">张经理</p>
                    <p className="text-gray-400">2026-07-05 10:00</p>
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <Button variant="outline" size="sm" className="px-2 h-8"><Eye className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" className="px-2 h-8"><Download className="w-4 h-4" /></Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 group">
                  <td className="py-4 px-6 flex items-center gap-3">
                    <File className="w-5 h-5 text-blue-500 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-[#006666] cursor-pointer">南通纺织_投标文件_商务部分.pdf</p>
                      <p className="text-xs text-gray-400">15.8 MB • 包含电子签章</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-600 text-xs">项目: PROJ-202607-001<br/>供应商: 南通纺织</td>
                  <td className="py-4 px-4"><span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded border border-red-100 flex items-center gap-1 w-max"><Shield className="w-3 h-3"/> 核心机密</span></td>
                  <td className="py-4 px-4 text-xs">
                    <p className="text-gray-700">系统自动存档</p>
                    <p className="text-gray-400">2026-07-20 18:00</p>
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <span className="text-xs text-gray-400 mr-2">暂无权限下载</span>
                    <Button variant="outline" size="sm" className="px-2 h-8 text-[#006666] border-[#006666]"><Shield className="w-4 h-4" /> 申请解密</Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 group">
                  <td className="py-4 px-6 flex items-center gap-3">
                    <File className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-[#006666] cursor-pointer">客房布草预算参考表_2025版.xlsx</p>
                      <p className="text-xs text-gray-400">1.2 MB</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-600 text-xs">需求: REQ-202607-001</td>
                  <td className="py-4 px-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">内部只读</span></td>
                  <td className="py-4 px-4 text-xs">
                    <p className="text-gray-700">王店长</p>
                    <p className="text-gray-400">2026-07-02 14:15</p>
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <Button variant="outline" size="sm" className="px-2 h-8"><Download className="w-4 h-4" /></Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
