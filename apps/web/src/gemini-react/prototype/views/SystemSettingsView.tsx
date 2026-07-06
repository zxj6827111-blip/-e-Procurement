import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Settings, Shield, Users, Network, Save } from 'lucide-react';
import { cn } from '../lib/utils';

export function SystemSettingsView() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            系统配置与权限管理
          </h2>
          <p className="text-sm text-slate-500 mt-1">维护组织、账号、角色、菜单与审批规则</p>
        </div>
        <Button variant="primary" className="gap-2">
          <Save className="w-4 h-4" /> 保存全局配置
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start bg-slate-100 text-slate-900">
            <Shield className="w-4 h-4 mr-2" /> 角色与权限矩阵
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-600">
            <Users className="w-4 h-4 mr-2" /> 组织与账号
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-600">
            <Network className="w-4 h-4 mr-2" /> 审批规则引擎
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-600">
            <Settings className="w-4 h-4 mr-2" /> 集成与接口
          </Button>
        </div>

        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <CardTitle>业务角色权限矩阵</CardTitle>
              <p className="text-sm text-slate-500 mt-1">配置不同角色对各业务模块的访问和操作权限。</p>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-3">模块 / 动作</th>
                    <th className="px-6 py-3 text-center">采购经办人</th>
                    <th className="px-6 py-3 text-center">集团采购管理人</th>
                    <th className="px-6 py-3 text-center">纪检审计</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-6 py-4 font-medium text-slate-900">采购项目立项</td>
                    <td className="px-6 py-4 text-center"><Badge variant="success">允许</Badge></td>
                    <td className="px-6 py-4 text-center"><Badge variant="outline">只读</Badge></td>
                    <td className="px-6 py-4 text-center"><Badge variant="outline">只读</Badge></td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium text-slate-900">查看报价金额(截止前)</td>
                    <td className="px-6 py-4 text-center"><Badge variant="danger">阻断</Badge></td>
                    <td className="px-6 py-4 text-center"><Badge variant="danger">阻断</Badge></td>
                    <td className="px-6 py-4 text-center"><Badge variant="danger">阻断</Badge></td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium text-slate-900">审批异常查看申请</td>
                    <td className="px-6 py-4 text-center"><Badge variant="danger">阻断</Badge></td>
                    <td className="px-6 py-4 text-center"><Badge variant="success">允许</Badge></td>
                    <td className="px-6 py-4 text-center"><Badge variant="outline">只读</Badge></td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium text-slate-900">查看专家评分明细</td>
                    <td className="px-6 py-4 text-center"><Badge variant="outline">只读</Badge></td>
                    <td className="px-6 py-4 text-center"><Badge variant="outline">只读</Badge></td>
                    <td className="px-6 py-4 text-center"><Badge variant="outline">只读</Badge></td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium text-slate-900">修改专家评分</td>
                    <td className="px-6 py-4 text-center"><Badge variant="danger">阻断</Badge></td>
                    <td className="px-6 py-4 text-center"><Badge variant="danger">阻断</Badge></td>
                    <td className="px-6 py-4 text-center"><Badge variant="danger">阻断</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-slate-50 rounded-b-lg border-t border-slate-100">
               <p className="text-xs text-slate-500">提示：修改权限矩阵后需重新生成安全策略，可能会导致部分在线用户重新登录。</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
