import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Upload, FileSignature, CheckCircle, RefreshCw } from 'lucide-react';

export function SupplierPortalSectionView() {
  const [activeMenu, setActiveMenu] = useState('profile');

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      <div className="w-64 shrink-0 space-y-2">
        <h3 className="px-4 text-sm font-medium text-gray-500 mb-4">企业档案维护</h3>
        {[
          { id: 'profile', label: '基本企业资料' },
          { id: 'cert', label: '资质与证照更新' },
          { id: 'seal', label: '电子印章/授权' },
          { id: 'category', label: '可供品类范围' },
        ].map(item => (
          <div
            key={item.id}
            onClick={() => setActiveMenu(item.id)}
            className={`px-4 py-3 rounded-lg cursor-pointer transition-colors text-sm font-medium ${activeMenu === item.id ? 'bg-[#006666] text-white' : 'hover:bg-slate-100 text-gray-700'}`}
          >
            {item.label}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {activeMenu === 'profile' && '基本企业资料'}
            {activeMenu === 'cert' && '资质与证照更新'}
            {activeMenu === 'seal' && '电子印章/授权'}
            {activeMenu === 'category' && '可供品类范围'}
          </h2>
          <Button className="bg-[#006666] hover:bg-[#004d4d] text-white">提交变更审核</Button>
        </div>

        {activeMenu === 'cert' ? (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded border border-amber-100">
                温馨提示：修改营业执照、开户许可证等核心证照，需经过集团采购中心审核通过后方可生效。审核期间不影响现有业务。
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-3 px-4 font-medium">证照名称</th>
                      <th className="py-3 px-4 font-medium">有效期至</th>
                      <th className="py-3 px-4 font-medium">当前文件</th>
                      <th className="py-3 px-4 font-medium">状态</th>
                      <th className="py-3 px-4 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">营业执照 (三证合一)</td>
                      <td className="py-3 px-4">2030-12-31</td>
                      <td className="py-3 px-4 text-blue-600 cursor-pointer">yyzz_2020.pdf</td>
                      <td className="py-3 px-4"><span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3"/> 已生效</span></td>
                      <td className="py-3 px-4"><Button variant="outline" size="sm">重新上传</Button></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">银行开户许可证</td>
                      <td className="py-3 px-4 text-gray-400">长期有效</td>
                      <td className="py-3 px-4 text-blue-600 cursor-pointer">khxk_2020.pdf</td>
                      <td className="py-3 px-4"><span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3"/> 已生效</span></td>
                      <td className="py-3 px-4"><Button variant="outline" size="sm">重新上传</Button></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">ISO9001质量认证</td>
                      <td className="py-3 px-4 text-red-600 font-medium">2026-08-01 (即将过期)</td>
                      <td className="py-3 px-4 text-blue-600 cursor-pointer">iso_old.pdf</td>
                      <td className="py-3 px-4"><span className="flex items-center gap-1 text-amber-600"><RefreshCw className="w-3 h-3"/> 待更新</span></td>
                      <td className="py-3 px-4"><Button variant="outline" size="sm" className="border-amber-300 text-amber-700">更新上传</Button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <FileSignature className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p>请选择左侧菜单维护对应信息。</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
