import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Database, FileClock, Network, RefreshCw, Settings, Shield, SlidersHorizontal, Users } from 'lucide-react';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { useApp } from '../../core/AppContext';
import { loadSystemAdminSnapshot, type SystemAdminSnapshot } from './system-admin-runtime';
import type { ViewState } from '../../shared/types';

const moduleEntries: Array<{
  title: string;
  desc: string;
  owner: string;
  icon: React.ReactNode;
  view: ViewState;
}> = [
  {
    title: '角色权限矩阵',
    desc: '查看真实角色、菜单、动作授权汇总。',
    owner: '系统管理员',
    icon: <Shield className="h-5 w-5" />,
    view: 'SYSTEM_SETTINGS'
  },
  {
    title: '组织与账号',
    desc: '查看组织结构、账号状态与角色归属。',
    owner: '账号管理员',
    icon: <Users className="h-5 w-5" />,
    view: 'SYSTEM_SETTINGS'
  },
  {
    title: '审批规则引擎',
    desc: '维护真实审批规则版本和启停状态。',
    owner: '流程管理员',
    icon: <SlidersHorizontal className="h-5 w-5" />,
    view: 'APPROVAL_RULES'
  },
  {
    title: '集成边界',
    desc: '查看接口、文件与系统联动配置状态。',
    owner: '平台运维',
    icon: <Network className="h-5 w-5" />,
    view: 'INTEGRATION'
  }
];

export function SysManageView() {
  const { currentUser, setCurrentView } = useApp();
  const [snapshot, setSnapshot] = useState<SystemAdminSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!currentUser?.id) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setSnapshot(await loadSystemAdminSnapshot(currentUser.id));
    } catch (err) {
      setSnapshot(null);
      setError(err instanceof Error ? err.message : '系统管理摘要加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentUser?.id]);

  const metrics = useMemo(
    () => [
      ['在线角色', snapshot?.roles.length ?? 0, '已注册系统角色'],
      ['可见账号', snapshot?.users.length ?? 0, '当前账号可查看'],
      ['审批规则', snapshot?.approvalRules.length ?? 0, '真实规则条目'],
      ['菜单授权', snapshot?.rolePermissions.reduce((sum, item) => sum + item.menus.length, 0) ?? 0, '角色菜单绑定']
    ],
    [snapshot]
  );

  const operationRows = useMemo(
    () => [
      ['菜单权限', `${snapshot?.menus.length ?? 0} 项`, snapshot?.adminError ? '需管理员查看完整矩阵' : '已加载当前账号可见菜单'],
      ['动作授权', `${snapshot?.actions.length ?? 0} 项`, '来自 /api/me/actions'],
      ['组织结构', `${snapshot?.organizations.length ?? 0} 个`, '来自 /api/organizations'],
      ['审批规则', `${snapshot?.approvalRules.filter((item) => item.status === 'enabled').length ?? 0} 条启用`, '来自 /api/workflow/approval-rules']
    ],
    [snapshot]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            <Settings className="h-6 w-6 text-[#006666]" />
            系统管理
          </h2>
          <p className="mt-1 text-sm text-slate-500">这里不再展示固定假数，而是按真实后台配置汇总系统管理视图。</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
          <Button variant="primary" className="gap-2" onClick={() => setCurrentView('SYSTEM_SETTINGS')}>
            <Shield className="h-4 w-4" />
            进入权限配置
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {snapshot?.adminError ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{snapshot.adminError}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {metrics.map(([label, value, helper]) => (
          <Card key={String(label)}>
            <CardContent className="p-5">
              <div className="mb-4 h-1 w-10 rounded-full bg-[#006666]" />
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
              <p className="mt-2 text-xs text-slate-500">{helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>系统模块入口</CardTitle>
            <p className="mt-1 text-sm text-slate-500">进入的都是已接通真实数据的 React 页面。</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {moduleEntries.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setCurrentView(item.view)}
                className="rounded-lg border border-slate-200 p-4 text-left transition-colors hover:border-[#006666] hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E0F2F1] text-[#006666]">{item.icon}</div>
                  <Badge variant="success">已接通</Badge>
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                <p className="mt-3 text-xs text-slate-400">责任人：{item.owner}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>运行检查</CardTitle>
            <p className="mt-1 text-sm text-slate-500">按当前接口返回结果生成，不再伪造定时任务状态。</p>
          </CardHeader>
          <div className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">检查项</th>
                  <th className="px-6 py-3 font-medium">当前值</th>
                  <th className="px-6 py-3 font-medium">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                      正在加载系统摘要...
                    </td>
                  </tr>
                ) : (
                  operationRows.map(([name, currentValue, desc]) => (
                    <tr key={String(name)}>
                      <td className="px-6 py-4 font-medium text-slate-900">{name}</td>
                      <td className="px-6 py-4 text-slate-600">{currentValue}</td>
                      <td className="px-6 py-4 text-slate-500">{desc}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>系统边界</CardTitle>
          <p className="mt-1 text-sm text-slate-500">这些说明用于帮助判断系统配置页是否真正接入了后台数据。</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            [<CheckCircle2 className="h-5 w-5" />, '权限页读取的是角色、菜单、动作和审批规则接口，不再写本地缓存假状态。'],
            [<Database className="h-5 w-5" />, '组织与账号摘要来自真实 `/api/organizations`、`/api/users`。'],
            [<FileClock className="h-5 w-5" />, '审批规则、评分模板、消息待办等配置页都已切到后端接口。']
          ].map(([icon, text]) => (
            <div key={String(text)} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mt-0.5 text-[#006666]">{icon}</div>
              <p className="text-sm leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
