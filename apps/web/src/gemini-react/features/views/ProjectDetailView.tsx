import React, { useEffect, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { BUSINESS_CASES } from '../reference-data';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { StageNames, type Project, type ProjectStage } from '../../shared/types';
import { ArrowLeft, Clock, ShieldAlert, FileText, CheckCircle2, Lock, EyeOff } from 'lucide-react';
import { cn } from '../../shared/lib/utils';
import { apiGet } from '../../../api/http';
import { ProjectContract } from '../../../contracts';

interface ApiProject {
  id: string;
  code: string;
  name: string;
  orgName?: string;
  type?: string;
  status?: string;
  displayStatus?: string;
  category?: string;
  budgetAmount?: number;
  buyer?: string;
  quoteDeadlineAt?: string | null;
  externalTradeFlag?: boolean;
}

function mapProjectStage(status?: string): ProjectStage {
  if (!status) return 'INITIATION';
  if (status.includes('document')) return 'DOCUMENT';
  if (status.includes('registration')) return 'REGISTRATION';
  if (status.includes('bidding') || status.includes('bid')) return 'BIDDING';
  if (status.includes('review')) return 'REVIEW';
  if (status.includes('award')) return 'AWARD';
  if (status.includes('fulfillment') || status.includes('contract')) return 'FULFILLMENT';
  if (status.includes('settlement')) return 'SETTLEMENT';
  if (status.includes('archive')) return 'ARCHIVE';
  if (status.includes('external')) return 'EXTERNAL_FILED';
  return 'INITIATION';
}

function toGeminiProject(project: ApiProject): Project {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    type: project.category || project.type || '集中采购',
    method: project.type || project.displayStatus || '内部采购',
    stage: mapProjectStage(project.status),
    organization: project.orgName || '集团采购中心',
    agent: project.buyer || '采购经办',
    budget: project.budgetAmount ?? 0,
    bidDeadline: project.quoteDeadlineAt ?? undefined,
    riskLevel: 'LOW',
    archiveCompleteness: project.status?.includes('archiv') ? 100 : 72,
    isExternal: Boolean(project.externalTradeFlag)
  };
}

export function ProjectDetailView() {
  const { currentProjectId, setCurrentView, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [apiProject, setApiProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);

  useEffect(() => {
    if (!currentProjectId) {
      setApiProject(null);
      return;
    }
    let mounted = true;
    setLoadingProject(true);
    apiGet<{ project: ApiProject }>(`/api/projects/${encodeURIComponent(currentProjectId)}`)
      .then((data) => {
        if (mounted) setApiProject(toGeminiProject(data.project));
      })
      .catch(() => {
        if (mounted) setApiProject(null);
      })
      .finally(() => {
        if (mounted) setLoadingProject(false);
      });
    return () => {
      mounted = false;
    };
  }, [currentProjectId]);

  const project = BUSINESS_CASES.find(p => p.id === currentProjectId) ?? apiProject;

  if (!project) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">{loadingProject ? '项目加载中...' : '项目暂未找到'}</div>;
  }

  const isBiddingPhase = project.stage === 'BIDDING';
  const isAudit = currentUser?.role === 'DISCIPLINARY_AUDIT';
  const projectView = ProjectContract.toWorkbenchViewModel({
    ...project,
    stageLabel: StageNames[project.stage],
    archiveStatus: project.archiveCompleteness >= 100 ? '已归档' : '归档中',
    supplierRiskLevel: project.riskLevel,
    quotationVersion: project.stage === 'BIDDING' ? 'V1' : 'V2'
  }).viewModel;

  const tabs = [
    { id: 'OVERVIEW', label: '项目概览' },
    { id: 'DOCUMENT', label: '采购文件' },
    { id: 'BIDDING', label: '报名与报价' },
    { id: 'REVIEW', label: '专家评审' },
    { id: 'AWARD', label: '定标与结果' },
    { id: 'ARCHIVE', label: '档案与日志' },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => setCurrentView('PROJECTS')}
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
      </button>

      {/* Command Center Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-slate-900">{projectView.name}</h1>
              {project.isExternal && <Badge variant="warning">外部交易备案</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{projectView.code}</span>
              <span>组织: {projectView.organization}</span>
              <span>经办: {projectView.agent}</span>
              <span>方式: {projectView.procurementMethod}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">生成操作日志</Button>
            {project.stage !== 'EXTERNAL_FILED' && !isAudit && <Button variant="primary">进入下一阶段处理</Button>}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 mb-1">当前业务阶段</span>
            <span className="text-lg font-semibold text-blue-700 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              {projectView.currentStage.label}
            </span>
          </div>
          <div className="h-10 w-px bg-slate-200 mx-4" />
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 mb-1">关键时间节点</span>
            <span className="text-sm font-medium text-slate-900 flex items-center gap-1">
              <Clock className="w-4 h-4 text-slate-400" />
              报价截止: {project.bidDeadline ? new Date(project.bidDeadline).toLocaleString() : '未设定'}
            </span>
          </div>
          <div className="h-10 w-px bg-slate-200 mx-4" />
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 mb-1">档案完整度</span>
            <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {projectView.archiveCompleteness}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex border-b border-slate-200 overflow-x-auto px-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                    activeTab === tab.id
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 min-h-[400px]">
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">项目基本信息</h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    <div>
                      <span className="text-slate-500 block mb-1">预算金额</span>
                      <span className="font-medium text-slate-900">{projectView.budgetAmount.display}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">采购类型</span>
                      <span className="font-medium text-slate-900">{project.type}</span>
                    </div>
                    {project.isExternal && project.externalDetails && (
                      <>
                        <div className="col-span-2 mt-4 p-4 bg-orange-50 rounded border border-orange-100">
                          <h4 className="font-medium text-orange-800 flex items-center gap-2 mb-2">
                            <ShieldAlert className="w-4 h-4" /> 外部交易备案信息
                          </h4>
                          <p className="text-sm text-orange-700">外部平台名称: {project.externalDetails.platformName}</p>
                          <p className="text-sm text-orange-700">外部项目编号: {project.externalDetails.projectCode}</p>
                          <p className="text-xs text-orange-600 mt-2">注：该项目已标记为外部依法必须招标，系统内相关的发布公告、报名、报价、专家评审入口已执行业务拦截。</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'BIDDING' && isBiddingPhase && (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-4">
                    <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200">
                      <Lock className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 mb-1">报价截止前锁定状态</h3>
                      <p className="text-sm text-slate-600">当前处于报价响应阶段，根据系统合规要求，报价截止时间前，金额及响应文件对采购方隐藏。</p>

                      <div className="mt-6 grid grid-cols-3 gap-6">
                        <div>
                          <span className="text-xs text-slate-500">已报名供应商</span>
                          <p className="text-xl font-medium text-slate-900 mt-1">4 家</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">已提交报价</span>
                          <p className="text-xl font-medium text-slate-900 mt-1">2 家</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">未提交报价</span>
                          <p className="text-xl font-medium text-slate-900 mt-1">2 家</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <table className="w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-600 font-medium">
                      <tr>
                        <th className="px-4 py-3">供应商名称</th>
                        <th className="px-4 py-3">提交状态</th>
                        <th className="px-4 py-3">报价金额</th>
                        <th className="px-4 py-3">响应文件</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="px-4 py-3 font-medium">江苏优选酒店用品有限公司</td>
                        <td className="px-4 py-3"><Badge variant="success">已提交</Badge></td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center text-slate-400 bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">
                            <EyeOff className="w-3 h-3 mr-1" /> 截止前不可见
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center text-slate-400 bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">
                            <Lock className="w-3 h-3 mr-1" /> 已锁定
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium">杭州世纪日用品供应商</td>
                        <td className="px-4 py-3"><Badge variant="outline">草稿</Badge></td>
                        <td className="px-4 py-3"><span className="text-slate-400">-</span></td>
                        <td className="px-4 py-3"><span className="text-slate-400">-</span></td>
                      </tr>
                    </tbody>
                  </table>

                  {!isAudit && (
                    <div className="flex justify-end mt-4">
                       <Button variant="outline" className="text-slate-600">发起异常查看审批申请</Button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'BIDDING' && !isBiddingPhase && (
                 <div className="p-12 text-center text-slate-500">
                   {project.isExternal ? '此项目为外部交易备案，无内部报价记录。' : '当前阶段无可展示的报价信息，或报价阶段已结束，请前往专家评审标签页查看汇总。'}
                 </div>
              )}

              {/* Other tabs placeholders */}
              {(activeTab === 'DOCUMENT' || activeTab === 'REVIEW' || activeTab === 'AWARD' || activeTab === 'ARCHIVE') && (
                <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                  <p className="mb-2">{tabs.find(t => t.id === activeTab)?.label} - 详情内容</p>
                  <p className="text-xs">系统记录完整，审计轨迹清晰</p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Sidebar: Risk & Audit */}
        <div className="w-80 shrink-0 space-y-6">
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-500" />
                审计跟踪与风险
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="p-3 bg-white border border-slate-200 rounded text-sm">
                <span className="block text-xs text-slate-500 mb-1">合规校验</span>
                <span className="flex items-center text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> 流程步骤合规
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded text-sm">
                <span className="block text-xs text-slate-500 mb-1">最新业务日志</span>
                <p className="text-slate-700 leading-snug">张经办 于 2026-07-05 10:20 发布了采购文件 V1.0 并进行业务锁定。</p>
              </div>
              {project.isExternal && (
                 <div className="p-3 bg-white border border-orange-200 rounded text-sm">
                   <span className="block text-xs text-orange-600 mb-1">系统拦截记录</span>
                   <p className="text-slate-700 leading-snug text-xs">已阻断内部定标审批入口，转为外部结果备案接收。</p>
                 </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
