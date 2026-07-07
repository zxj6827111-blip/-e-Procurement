import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { FileText, Search, Filter, CheckCircle2, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';

export function ProcurementDocumentView() {
  const [docs, setDocs] = useState([
    { id: 'DOC-2026-001', project: 'PROJ-2026-002', name: '大堂家具更新采购文件.pdf', status: '已审核', date: '2026-07-01', author: '李采购' },
    { id: 'DOC-2026-002', project: 'PROJ-2026-004', name: '安保外包招标文件.docx', status: '待审核', date: '2026-07-05', author: '王经办' },
    { id: 'DOC-2026-003', project: 'PROJ-2026-005', name: '电梯维保采购文件.pdf', status: '草稿', date: '2026-07-05', author: '张经理' }
  ]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const handleSubmit = (id: string) => {
    if (confirm('确认提交该文件进行审核？')) {
      setDocs(docs.map(d => d.id === id ? { ...d, status: '待审核' } : d));
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#006666]" />
            采购文件
          </h2>
          <p className="text-sm text-slate-500 mt-1">管理招标文件、采购清单及合同范本草案</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-slate-600">
            <Filter className="w-4 h-4 mr-2" /> 状态筛选
          </Button>
          <Button className="bg-[#006666] hover:bg-[#005252] text-white">
            <FileText className="w-4 h-4 mr-2" /> 起草文件
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader className="py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索文件名称或项目..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">文件编号/名称</th>
                  <th className="px-6 py-4 border-b border-slate-200">关联项目</th>
                  <th className="px-6 py-4 border-b border-slate-200">更新时间</th>
                  <th className="px-6 py-4 border-b border-slate-200">状态</th>
                  <th className="px-6 py-4 border-b border-slate-200">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{doc.name}</div>
                      <div className="text-xs text-slate-500">{doc.id}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{doc.project}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{doc.date}</div>
                      <div className="text-xs text-slate-400">{doc.author}</div>
                    </td>
                    <td className="px-6 py-4">
                      {doc.status === '已审核' && <span className="text-emerald-600 font-medium">{doc.status}</span>}
                      {doc.status === '待审核' && <span className="text-amber-600 font-medium">{doc.status}</span>}
                      {doc.status === '草稿' && <span className="text-slate-500 font-medium">{doc.status}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-[#006666] hover:text-[#005252] text-xs font-medium" onClick={() => setSelectedDoc(doc)}>查看详情</button>
                        {doc.status === '草稿' && (
                          <button className="text-[#006666] hover:text-[#005252] text-xs font-medium" onClick={() => handleSubmit(doc.id)}>提交审核</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Document Detail Drawer */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedDoc(null)}></div>
          <div className="relative w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#006666]" />
                文件版本详情
              </h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setSelectedDoc(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">文件信息</h4>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-md space-y-2 text-sm text-slate-700">
                  <p><span className="text-slate-500">名称：</span>{selectedDoc.name}</p>
                  <p><span className="text-slate-500">编号：</span>{selectedDoc.id}</p>
                  <p><span className="text-slate-500">项目：</span>{selectedDoc.project}</p>
                  <p><span className="text-slate-500">状态：</span>{selectedDoc.status}</p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">版本历史</h4>
                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-slate-200">
                  <div className="flex gap-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center shrink-0 border-2 border-white mt-0.5"></div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">{selectedDoc.date}</div>
                      <div className="text-sm font-medium text-slate-900">V1.0 创建文件</div>
                      <div className="text-xs text-slate-500">操作人: {selectedDoc.author}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <Button className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setSelectedDoc(null)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
