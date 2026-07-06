import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AlertCircle, FileText, CheckSquare, Clock, ArrowRight, Plus, Upload, BookOpen, Activity, Users, FolderKanban, Settings, Database, ListTodo, ShieldCheck, Archive, UserCircle, PieChart, Edit2, X, Check, FileCheck, Store } from 'lucide-react';
import { cn } from '../lib/utils';
import { ViewState, Role } from '../types';
import { getRoleMenus } from '../components/layout/AppShell';

import { ProcurementAnalytics } from '../components/ProcurementAnalytics';
import { SmartRiskPanel } from '../components/SmartRiskPanel';

export function DashboardView() {
  const { currentUser, setCurrentView, todos } = useApp();
  const [isEditingQuickActions, setIsEditingQuickActions] = useState(false);
  
  if (!currentUser) return null;

  const roleAvailableActions = getRoleMenus(currentUser.role);
  const highPriorityTodos = todos.slice(0, 4);
  const exceptionCount = todos.filter((todo) => todo.type === 'EXCEPTION').length;

  // Initialize from local storage or defaults
  const [activeActionIds, setActiveActionIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`quickActions_${currentUser.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    // Default based on role (first 4)
    return roleAvailableActions.map(a => a.id).slice(0, 4);
  });

  const toggleAction = (id: string) => {
    setActiveActionIds(prev => {
      let newIds;
      if (prev.includes(id)) {
        newIds = prev.filter(aid => aid !== id);
      } else {
        if (prev.length >= 6) return prev; // max 6 actions
        newIds = [...prev, id];
      }
      localStorage.setItem(`quickActions_${currentUser.id}`, JSON.stringify(newIds));
      return newIds;
    });
  };

  const activeActions = activeActionIds.map(id => roleAvailableActions.find(a => a.id === id)).filter(Boolean) as typeof roleAvailableActions;

  return (
    <div data-ui-check="dashboard" className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-slate-900">工作台概览</h2>
        <div className="text-sm text-slate-500 flex items-center gap-2">
          <span>更新时间: 2026-07-05 14:00</span>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          data-ui-check="summary-card"
          role="button"
          tabIndex={0}
          onClick={() => setCurrentView('TODO')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') setCurrentView('TODO');
          }}
          className="border-l-4 border-l-[#006666] cursor-pointer hover:border-[#006666] hover:shadow-md transition"
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">我的待办事项</p>
                <p className="text-3xl font-bold text-slate-900">{todos.length}<span className="text-sm font-normal text-slate-500 ml-1">项</span></p>
              </div>
              <div className="p-2 bg-slate-50 text-[#006666] rounded-md">
                <CheckSquare className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card
          data-ui-check="summary-card"
          role="button"
          tabIndex={0}
          onClick={() => setCurrentView('QUOTE_PROGRESS')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') setCurrentView('QUOTE_PROGRESS');
          }}
          className="cursor-pointer hover:border-[#006666] hover:shadow-md transition"
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">今日截止报价项目</p>
                <p className="text-3xl font-bold text-slate-900">2<span className="text-sm font-normal text-slate-500 ml-1">个</span></p>
              </div>
              <div className="p-2 bg-slate-50 text-[#FFC107] rounded-md">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs">
              <Badge variant="warning">需密切关注</Badge>
            </div>
          </CardContent>
        </Card>

        <Card
          data-ui-check="summary-card"
          role="button"
          tabIndex={0}
          onClick={() => setCurrentView('REVIEW_AWARD')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') setCurrentView('REVIEW_AWARD');
          }}
          className="cursor-pointer hover:border-[#006666] hover:shadow-md transition"
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">待评审/定标项目</p>
                <p className="text-3xl font-bold text-slate-900">4<span className="text-sm font-normal text-slate-500 ml-1">个</span></p>
              </div>
              <div className="p-2 bg-slate-50 text-blue-600 rounded-md">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          data-ui-check="summary-card"
          role="button"
          tabIndex={0}
          onClick={() => setCurrentView('ORDER_FULFILLMENT')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') setCurrentView('ORDER_FULFILLMENT');
          }}
          className="border-rose-100 bg-rose-50/30 cursor-pointer hover:border-rose-300 hover:shadow-md transition"
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-rose-600 mb-1">异常履约/违约告警</p>
                <p className="text-3xl font-bold text-rose-600">{exceptionCount}<span className="text-sm font-normal text-rose-600/70 ml-1">起</span></p>
              </div>
              <div className="p-2 bg-rose-100 text-rose-600 rounded-md">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs">
              <Badge variant="danger">立即处理</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div data-ui-check="template-a-grid template-a-flow" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 70% Todo Table */}
        <div className="lg:col-span-8">
          <Card data-ui-check="surface todo-surface" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold">高优待处理任务</CardTitle>
              <Button variant="ghost" size="sm" className="text-[#006666] hover:text-[#005252]" onClick={() => setCurrentView('TODO')}>
                查看全部 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <div data-ui-check="table-wrap" className="overflow-x-auto">
              <table data-ui-check="table" className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-5 py-3 rounded-tl-lg">状态</th>
                    <th className="px-5 py-3">任务名称</th>
                    <th className="px-5 py-3">关联项目编号</th>
                    <th className="px-5 py-3">截止时间</th>
                    <th className="px-5 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {highPriorityTodos.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <Badge variant="warning">{task.statusLabel}</Badge>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">{task.title}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{task.target}</td>
                      <td className="px-5 py-3 text-slate-500">{task.deadline}</td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setCurrentView('TODO')}>去处理</Button>
                      </td>
                    </tr>
                  ))}
                  {highPriorityTodos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-400">当前暂无高优待处理任务</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right 30% Quick Actions */}
        <div className="lg:col-span-4">
          <Card data-ui-check="surface quick-surface" className="h-full">
            <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">快捷操作中心</CardTitle>
              <button 
                onClick={() => setIsEditingQuickActions(!isEditingQuickActions)}
                className="text-xs text-slate-500 hover:text-[#006666] flex items-center gap-1"
              >
                {isEditingQuickActions ? <><Check className="w-3 h-3" /> 完成</> : <><Edit2 className="w-3 h-3" /> 自定义</>}
              </button>
            </CardHeader>
            <CardContent className="p-5">
              {isEditingQuickActions ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 mb-3">选择要在工作台展示的快捷操作（最多6个）：</p>
                  <div className="grid grid-cols-2 gap-2">
                    {roleAvailableActions.map(action => {
                      const isActive = activeActionIds.includes(action.id);
                      return (
                        <div 
                          key={action.id}
                          onClick={() => toggleAction(action.id)}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors text-sm",
                            isActive 
                              ? "border-[#006666] bg-[#006666]/5 text-[#006666]" 
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          )}
                        >
                          <div className={cn("flex-shrink-0", isActive ? "text-[#006666]" : "text-slate-400")}>
                            {React.cloneElement(action.icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
                          </div>
                          <span className="flex-1 truncate">{action.label}</span>
                          {isActive && <Check className="w-3 h-3 text-[#006666]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {activeActions.length > 0 ? (
                    activeActions.map(action => (
                      <Button 
                        data-ui-check="quick-card"
                        key={action.id}
                        variant="outline" 
                        className="h-auto py-4 flex flex-col gap-2 items-center justify-center text-slate-600 hover:text-[#006666] hover:border-[#006666] transition-colors" 
                        onClick={() => setCurrentView(action.id as ViewState)}
                      >
                        <div className="p-2 bg-slate-50 rounded-full group-hover:bg-[#006666]/10">
                          {action.icon}
                        </div>
                        <span className="text-sm font-medium">{action.label}</span>
                      </Button>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-slate-400 text-sm">
                      暂无快捷操作，请点击右上角自定义添加
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Layout: Gantt Chart & Risk Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card data-ui-check="surface template-a-timeline" className="h-full">
            <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">主干项目进度概览 (Gantt)</CardTitle>
              <span className="text-sm text-slate-500">2个进行中项目</span>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <div data-ui-check="gantt-board" className="min-w-[700px] p-5">
                <div className="flex border-b border-slate-200 pb-2 text-xs font-medium text-slate-500 mb-4">
                  <div className="w-48 shrink-0">项目名称</div>
                  <div className="flex-1 grid grid-cols-4 text-center">
                    <div>1月上旬</div>
                    <div>2月中旬</div>
                    <div>3月下旬</div>
                    <div>4月以后</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center text-sm">
                    <div className="w-48 shrink-0 pr-4 truncate font-medium text-slate-700">
                      <span className="inline-block w-2 h-2 bg-[#FFC107] rounded-full mr-2"></span>
                      客房毛巾年度采购
                    </div>
                    <div className="flex-1 relative h-6 bg-slate-100 rounded-full overflow-hidden">
                       <div className="absolute top-0 bottom-0 left-[10%] w-[40%] bg-[#006666] rounded-full opacity-20"></div>
                       <div className="absolute top-0 bottom-0 left-[10%] w-[25%] bg-[#006666] rounded-full flex items-center px-3 text-xs text-white">
                          需求提报阶段
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center text-sm">
                    <div className="w-48 shrink-0 pr-4 truncate font-medium text-slate-700">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      清洁服务外包
                    </div>
                    <div className="flex-1 relative h-6 bg-slate-100 rounded-full overflow-hidden">
                       <div className="absolute top-0 bottom-0 left-[30%] w-[50%] bg-[#006666] rounded-full opacity-20"></div>
                       <div className="absolute top-0 bottom-0 left-[30%] w-[10%] bg-[#006666] rounded-full flex items-center px-3 text-xs text-white">
                          定标中
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <SmartRiskPanel />
        </div>
      </div>

      {/* Analytics Dashboard */}
      {['GROUP_PROCUREMENT_MANAGER', 'SYSTEM_ADMIN', 'FINANCE_REVIEWER'].includes(currentUser.role) && (
        <ProcurementAnalytics />
      )}

    </div>
  );
}
