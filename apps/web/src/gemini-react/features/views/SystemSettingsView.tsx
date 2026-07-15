import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Network, RefreshCw, Settings, Shield, Users } from 'lucide-react';
import { AccountManagementPanel } from './AccountManagementPanel';
import { loadSystemAdminSnapshot, type SystemAdminSnapshot } from './system-admin-runtime';

type Panel = 'permissions' | 'organization';

function statusVariant(status?: string): 'outline' | 'success' | 'warning' {
  if (status === 'active' || status === 'enabled') return 'success';
  if (status === 'disabled' || status === 'suspended') return 'warning';
  return 'outline';
}

export function SystemSettingsView() {
  const { currentUser, setCurrentView } = useApp();
  const [activePanel, setActivePanel] = useState<Panel>('permissions');
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
      setError(err instanceof Error ? err.message : '系统配置数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentUser?.id]);

  const permissionRows = useMemo(() => {
    return (snapshot?.rolePermissions ?? []).map((item) => ({
      ...item,
      roleName: snapshot?.roles.find((role) => role.id === item.roleId)?.name ?? item.roleId
    }));
  }, [snapshot]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            <Settings className="h-6 w-6 text-slate-700" />
            系统配置与权限
          </h2>
          <p className="mt-1 text-sm text-slate-500">这里读取当前后端真实组织、角色、账号、菜单和审批规则摘要。</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {snapshot?.adminError ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{snapshot.adminError}</div> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className={`w-full justify-start ${activePanel === 'permissions' ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
            onClick={() => setActivePanel('permissions')}
          >
            <Shield className="mr-2 h-4 w-4" />
            角色与权限
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start ${activePanel === 'organization' ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
            onClick={() => setActivePanel('organization')}
          >
            <Users className="mr-2 h-4 w-4" />
            组织与账号
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-600" onClick={() => setCurrentView('APPROVAL_RULES')}>
            <Network className="mr-2 h-4 w-4" />
            审批规则引擎
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-600" onClick={() => setCurrentView('INTEGRATION')}>
            <Settings className="mr-2 h-4 w-4" />
            集成边界
          </Button>
        </div>

        <div className="space-y-6 md:col-span-3">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['可见菜单', snapshot?.menus.length ?? 0, '按当前账号'],
              ['动作权限', snapshot?.actions.length ?? 0, '接口授权'],
              ['角色数量', snapshot?.roles.length ?? 0, '系统角色'],
              ['审批规则', snapshot?.approvalRules.length ?? 0, '规则总数']
            ].map(([label, value, helper]) => (
              <Card key={String(label)}>
                <CardContent className="p-5">
                  <div className="text-sm text-slate-500">{label}</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
                  <div className="mt-2 text-xs text-slate-400">{helper}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {activePanel === 'permissions' ? (
            <>
              <Card>
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>角色权限矩阵</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">按真实 `/api/role-permissions` 汇总角色的菜单数和动作数。</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="border-b border-slate-200 px-6 py-4">角色</th>
                          <th className="border-b border-slate-200 px-6 py-4">菜单数</th>
                          <th className="border-b border-slate-200 px-6 py-4">动作数</th>
                          <th className="border-b border-slate-200 px-6 py-4">示例菜单</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                              正在加载权限矩阵...
                            </td>
                          </tr>
                        ) : permissionRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                              当前没有可展示的权限矩阵数据。
                            </td>
                          </tr>
                        ) : (
                          permissionRows.map((item) => (
                            <tr key={item.roleId}>
                              <td className="px-6 py-4 font-medium text-slate-900">{item.roleName}</td>
                              <td className="px-6 py-4 text-slate-600">{item.menus.length}</td>
                              <td className="px-6 py-4 text-slate-600">{item.actions.length}</td>
                              <td className="px-6 py-4 text-slate-500">{item.menus.slice(0, 3).join('、') || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>当前账号菜单范围</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 p-6">
                  {(snapshot?.menus ?? []).map((menu) => (
                    <Badge key={menu} variant="outline">
                      {menu}
                    </Badge>
                  ))}
                  {(snapshot?.menus.length ?? 0) === 0 ? <span className="text-sm text-slate-400">未返回菜单数据</span> : null}
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>组织结构</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">按真实 `/api/organizations` 展示。</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="border-b border-slate-200 px-6 py-4">组织名称</th>
                          <th className="border-b border-slate-200 px-6 py-4">层级</th>
                          <th className="border-b border-slate-200 px-6 py-4">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(snapshot?.organizations ?? []).map((org) => (
                          <tr key={org.id}>
                            <td className="px-6 py-4 font-medium text-slate-900">{org.name}</td>
                            <td className="px-6 py-4 text-slate-600">{org.level ?? '-'}</td>
                            <td className="px-6 py-4">
                              <Badge variant={statusVariant(org.status)}>{org.status ?? 'active'}</Badge>
                            </td>
                          </tr>
                        ))}
                        {(snapshot?.organizations.length ?? 0) === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                              当前没有可展示的组织数据。
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <AccountManagementPanel
                users={snapshot?.users ?? []}
                roles={snapshot?.roles ?? []}
                organizations={snapshot?.organizations ?? []}
                currentUserId={currentUser?.id}
                onReload={load}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
