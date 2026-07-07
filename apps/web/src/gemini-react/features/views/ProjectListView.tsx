import React from 'react';
import { useApp } from '../../core/AppContext';
import { BUSINESS_CASES } from '../reference-data';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Search, Filter, Eye, ShieldAlert } from 'lucide-react';
import { StageNames } from '../../shared/types';
import { ProjectContract } from '../../../contracts';

export function ProjectListView() {
  const { setCurrentView, setCurrentProjectId } = useApp();

  const handleViewProject = (id: string) => {
    setCurrentProjectId(id);
    setCurrentView('PROJECT_DETAIL');
  };
  const projectRows = BUSINESS_CASES.map((project) => ({
    source: project,
    contract: ProjectContract.toWorkbenchViewModel({
      ...project,
      stageLabel: StageNames[project.stage],
      archiveStatus: project.archiveCompleteness >= 100 ? '已归档' : '归档中',
      supplierRiskLevel: project.riskLevel,
      quotationVersion: project.stage === 'BIDDING' ? 'V1' : 'V2'
    }).viewModel
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">采购项目台账</h2>
          <p className="text-sm text-slate-500 mt-1">查看和管理授权范围内的采购项目</p>
        </div>
        <Button variant="primary">新建项目</Button>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50 rounded-t-lg">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索项目编号、名称或经办人"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> 规则筛选
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">项目编号 / 名称</th>
                <th className="px-6 py-4">组织与经办</th>
                <th className="px-6 py-4">采购方式</th>
                <th className="px-6 py-4">当前阶段</th>
                <th className="px-6 py-4">风险提醒</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectRows.map(({ source: project, contract }) => (
                <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{contract.name}</div>
                    <div className="text-slate-500 text-xs mt-1 font-mono">{contract.code}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900">{contract.organization}</div>
                    <div className="text-slate-500 text-xs mt-1">{contract.agent}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={project.isExternal ? "outline" : "default"}>
                      {contract.procurementMethod}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {contract.currentStage.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {project.riskLevel === 'HIGH' && <Badge variant="danger"><ShieldAlert className="w-3 h-3 mr-1 inline"/>高风险</Badge>}
                    {project.riskLevel === 'MEDIUM' && <Badge variant="warning">注意</Badge>}
                    {project.riskLevel === 'LOW' && <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewProject(project.id)}>
                      工作台详情
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <span>共 {BUSINESS_CASES.length} 个项目记录</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>上一页</Button>
            <Button variant="outline" size="sm" disabled>下一页</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
