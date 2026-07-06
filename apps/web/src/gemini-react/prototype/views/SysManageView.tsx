import React from 'react';
import {
  CheckCircle2,
  Database,
  FileClock,
  Network,
  Settings,
  Shield,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useApp } from '../context/AppContext';
import type { ViewState } from '../types';

const modules: Array<{
  title: string;
  desc: string;
  status: '正常' | '需复核';
  owner: string;
  icon: React.ReactNode;
  view: ViewState;
}> = [
  {
    title: '角色权限矩阵',
    desc: '维护 12 类业务角色的菜单、操作、数据范围和审批边界。',
    status: '正常',
    owner: '系统管理员',
    icon: <Shield className="w-5 h-5" />,
    view: 'SYSTEM_SETTINGS',
  },
  {
    title: '组织与账号',
    desc: '管理集团、酒店、供应商、专家账号及岗位归属。',
    status: '正常',
    owner: '账号管理员',
    icon: <Users className="w-5 h-5" />,
    view: 'SYSTEM_SETTINGS',
  },
  {
    title: '审批规则引擎',
    desc: '配置需求审批、定标审批、异常查看和结算审核规则。',
    status: '需复核',
    owner: '流程管理员',
    icon: <SlidersHorizontal className="w-5 h-5" />,
    view: 'APPROVAL_RULES',
  },
  {
    title: '集成与接口',
    desc: '查看 ERP、财务、短信和文件归档接口的联通状态。',
    status: '正常',
    owner: '平台运维',
    icon: <Network className="w-5 h-5" />,
    view: 'INTEGRATION',
  },
];

const jobs = [
  ['菜单权限同步', '每天 02:00', '最近成功', '已覆盖全部角色'],
  ['业务字典刷新', '每 4 小时', '最近成功', '供应商库、商品目录已同步'],
  ['审计日志归档', '每天 23:30', '最近成功', '归档保留策略 180 天'],
];

export function SysManageView() {
  const { setCurrentView } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#006666]" />
            系统管理
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            集中维护账号、权限、审批规则、接口状态和审计归档任务。
          </p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => setCurrentView('SYSTEM_SETTINGS')}>
          <Shield className="w-4 h-4" />
          进入权限矩阵
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          ['在线角色', '12', '已绑定菜单权限'],
          ['启用账号', '86', '含供应商与专家'],
          ['审批规则', '18', '3 条待复核'],
          ['接口状态', '4/4', '核心接口正常'],
        ].map(([label, value, helper]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="h-1 w-10 rounded-full bg-[#006666] mb-4" />
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-3xl font-semibold text-slate-950 mt-2">{value}</p>
              <p className="text-xs text-slate-500 mt-2">{helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>系统模块入口</CardTitle>
            <p className="text-sm text-slate-500 mt-1">按系统管理员日常工作划分，点击可进入对应配置页。</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setCurrentView(item.view)}
                className="text-left border border-slate-200 rounded-lg p-4 hover:border-[#006666] hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#E0F2F1] text-[#006666] flex items-center justify-center">
                    {item.icon}
                  </div>
                  <Badge variant={item.status === '正常' ? 'success' : 'warning'}>{item.status}</Badge>
                </div>
                <h3 className="font-semibold text-slate-900 mt-4">{item.title}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.desc}</p>
                <p className="text-xs text-slate-400 mt-3">责任人：{item.owner}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>运行检查</CardTitle>
            <p className="text-sm text-slate-500 mt-1">系统级任务、数据同步和审计归档的最近执行状态。</p>
          </CardHeader>
          <div className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">任务</th>
                  <th className="px-6 py-3 font-medium">周期</th>
                  <th className="px-6 py-3 font-medium">状态</th>
                  <th className="px-6 py-3 font-medium">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map(([name, cycle, status, desc]) => (
                  <tr key={name}>
                    <td className="px-6 py-4 font-medium text-slate-900">{name}</td>
                    <td className="px-6 py-4 text-slate-600">{cycle}</td>
                    <td className="px-6 py-4">
                      <Badge variant="success">{status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>系统边界</CardTitle>
          <p className="text-sm text-slate-500 mt-1">这些入口只做配置和监控，不改变采购主流程的业务状态机。</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            [<CheckCircle2 className="w-5 h-5" />, '权限仍由角色模型与后端接口共同校验'],
            [<Database className="w-5 h-5" />, '字典和缓存刷新仅影响展示，不绕过审批流程'],
            [<FileClock className="w-5 h-5" />, '审计归档保留操作日志和关键业务证据'],
          ].map(([icon, text]) => (
            <div key={String(text)} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-[#006666] mt-0.5">{icon}</div>
              <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
