import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../../../api/http';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import { Activity, FileText, History, RefreshCw, ShieldCheck, UserRoundCog } from 'lucide-react';
import type { Supplier, SupplierManagedAccount } from '../../../pages/supplier-management/types';

type DetailTab = 'base' | 'qualifications' | 'accounts' | 'projects' | 'reviews';

interface SupplierProjectParticipation {
  id: string;
  code?: string;
  name: string;
  status?: string;
  stage?: string;
  method?: string;
}

function extractRouteInfo(route?: string) {
  const match = /^\/suppliers\/([^/?]+)(?:\/([^/?]+))?/.exec(route ?? '');
  return {
    supplierId: match?.[1] ? decodeURIComponent(match[1]) : '',
    section: match?.[2] ?? ''
  };
}

function badgeVariant(status?: string): 'outline' | 'success' | 'warning' | 'danger' {
  if (['admitted', 'active', 'approved', 'enabled'].includes(String(status))) return 'success';
  if (['pending', 'trial', 'draft'].includes(String(status))) return 'warning';
  if (['restricted', 'inactive', 'rejected', 'disabled'].includes(String(status))) return 'danger';
  return 'outline';
}

function formatDateTime(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

export function SupplierDetailView() {
  const { currentUser, routeContext, setCurrentView } = useApp();
  const routeInfo = useMemo(() => extractRouteInfo(routeContext?.route), [routeContext?.route]);
  const [activeTab, setActiveTab] = useState<DetailTab>(() => {
    if (routeInfo.section === 'qualifications') return 'qualifications';
    if (routeInfo.section === 'accounts') return 'accounts';
    return 'base';
  });
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [accounts, setAccounts] = useState<SupplierManagedAccount[]>([]);
  const [projects, setProjects] = useState<SupplierProjectParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetBusyId, setResetBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [accountError, setAccountError] = useState('');

  const load = async () => {
    if (!currentUser?.id || !routeInfo.supplierId) {
      setSupplier(null);
      setAccounts([]);
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setAccountError('');
    try {
      const [supplierResult, accountsResult, projectsResult] = await Promise.allSettled([
        apiGet<{ supplier: Supplier }>(`/api/suppliers/${encodeURIComponent(routeInfo.supplierId)}`, currentUser.id),
        apiGet<{ supplierId: string; accounts: SupplierManagedAccount[] }>(
          `/api/suppliers/${encodeURIComponent(routeInfo.supplierId)}/accounts`,
          currentUser.id
        ),
        apiGet<{ supplierId: string; projects: SupplierProjectParticipation[] }>(
          `/api/suppliers/${encodeURIComponent(routeInfo.supplierId)}/project-participations`,
          currentUser.id
        )
      ]);

      if (supplierResult.status === 'rejected') {
        throw supplierResult.reason;
      }

      setSupplier(supplierResult.value.supplier);
      setAccounts(accountsResult.status === 'fulfilled' ? accountsResult.value.accounts : []);
      setProjects(projectsResult.status === 'fulfilled' ? projectsResult.value.projects : []);
      if (accountsResult.status === 'rejected') {
        setAccountError(accountsResult.reason instanceof Error ? accountsResult.reason.message : '账号列表加载失败');
      }
    } catch (err) {
      setSupplier(null);
      setAccounts([]);
      setProjects([]);
      setError(err instanceof Error ? err.message : '供应商详情加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentUser?.id, routeInfo.supplierId]);

  const resetPassword = async (account: SupplierManagedAccount) => {
    if (!currentUser?.id || !routeInfo.supplierId) return;
    setResetBusyId(account.userId);
    setMessage('');
    setError('');
    try {
      const result = await apiPost<{ account: SupplierManagedAccount & { temporaryPassword?: string }; auditLogId?: string }>(
        `/api/suppliers/${encodeURIComponent(routeInfo.supplierId)}/accounts/${encodeURIComponent(account.userId)}/reset-password`,
        {},
        currentUser.id
      );
      setAccounts((items) =>
        items.map((item) =>
          item.userId === account.userId
            ? { ...item, temporaryPassword: result.account.temporaryPassword, credentialSetupRequired: true }
            : item
        )
      );
      setMessage(`账号 ${account.username} 已重置临时密码，审计记录 ${result.auditLogId ?? '-'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码重置失败');
    } finally {
      setResetBusyId('');
    }
  };

  const summary = useMemo(
    () => [
      ['资质附件', supplier?.qualificationAttachments?.length ?? 0],
      ['评审记录', supplier?.admissionReviews?.length ?? 0],
      ['参与项目', projects.length],
      ['账号数量', accounts.length]
    ],
    [accounts.length, projects.length, supplier?.admissionReviews?.length, supplier?.qualificationAttachments?.length]
  );

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-800">{supplier?.name ?? '供应商详情'}</h2>
            {supplier ? <Badge variant={badgeVariant(supplier.admissionStatus || supplier.status)}>{supplier.admissionStatus || supplier.status}</Badge> : null}
          </div>
          <p className="text-sm text-gray-500">统一社会信用代码：{supplier?.socialCreditCode || '-'}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button variant="outline" onClick={() => setCurrentView('SUPPLIERS')}>
            返回列表
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {accountError ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{accountError}</div> : null}

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">正在加载供应商详情...</CardContent>
        </Card>
      ) : null}

      {!loading && supplier ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {summary.map(([label, value]) => (
              <Card key={String(label)}>
                <CardContent className="p-5">
                  <div className="text-sm text-slate-500">{label}</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-3 space-y-6">
              <div className="flex border-b">
                {[
                  ['base', '基础资料'],
                  ['qualifications', '资质附件'],
                  ['accounts', '登录账号'],
                  ['projects', '参与项目'],
                  ['reviews', '评审记录']
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as DetailTab)}
                    className={`border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === id ? 'border-[#006666] text-[#006666]' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Card>
                <CardContent className="p-6">
                  {activeTab === 'base' ? (
                    <div className="space-y-6">
                      <h3 className="flex items-center gap-2 font-medium">
                        <FileText className="h-5 w-5 text-[#006666]" />
                        企业基础信息
                      </h3>
                      <div className="grid grid-cols-2 gap-y-4 text-sm">
                        <div><span className="mb-1 block text-gray-500">供应商类型</span><span className="font-medium">{supplier.supplierType || '-'}</span></div>
                        <div><span className="mb-1 block text-gray-500">法定代表人</span><span className="font-medium">{supplier.legalRepresentative || '-'}</span></div>
                        <div><span className="mb-1 block text-gray-500">联系人</span><span className="font-medium">{supplier.contactName || '-'}</span></div>
                        <div><span className="mb-1 block text-gray-500">联系电话</span><span className="font-medium">{supplier.contactPhone || '-'}</span></div>
                        <div className="col-span-2"><span className="mb-1 block text-gray-500">联系邮箱</span><span className="font-medium">{supplier.contactEmail || '-'}</span></div>
                        <div className="col-span-2"><span className="mb-1 block text-gray-500">注册地址</span><span className="font-medium">{supplier.registeredAddress || '-'}</span></div>
                        <div className="col-span-2"><span className="mb-1 block text-gray-500">经营范围</span><span className="font-medium">{supplier.businessScope || '-'}</span></div>
                        <div className="col-span-2"><span className="mb-1 block text-gray-500">授权品类</span><span className="font-medium">{supplier.categoryAuth?.join('、') || '-'}</span></div>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'qualifications' ? (
                    <div className="space-y-4">
                      <h3 className="font-medium text-slate-900">资质附件</h3>
                      {(supplier.qualificationAttachments ?? []).length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-500">当前没有资质附件记录。</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="border-b border-slate-200 px-4 py-3">文件名</th>
                                <th className="border-b border-slate-200 px-4 py-3">类型</th>
                                <th className="border-b border-slate-200 px-4 py-3">上传时间</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(supplier.qualificationAttachments ?? []).map((attachment) => (
                                <tr key={attachment.id}>
                                  <td className="px-4 py-3 font-medium text-slate-900">{attachment.fileName}</td>
                                  <td className="px-4 py-3 text-slate-600">{attachment.qualificationType || '-'}</td>
                                  <td className="px-4 py-3 text-slate-600">{formatDateTime(attachment.uploadedAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {activeTab === 'accounts' ? (
                    <div className="space-y-4">
                      <h3 className="font-medium text-slate-900">供应商登录账号</h3>
                      {accounts.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-500">当前账号没有权限查看或还未生成登录账号。</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="border-b border-slate-200 px-4 py-3">账号类型</th>
                                <th className="border-b border-slate-200 px-4 py-3">用户名</th>
                                <th className="border-b border-slate-200 px-4 py-3">状态</th>
                                <th className="border-b border-slate-200 px-4 py-3">临时密码</th>
                                <th className="border-b border-slate-200 px-4 py-3">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {accounts.map((account) => (
                                <tr key={account.userId}>
                                  <td className="px-4 py-3 font-medium text-slate-900">{account.label}</td>
                                  <td className="px-4 py-3 text-slate-600">{account.username}</td>
                                  <td className="px-4 py-3"><Badge variant={badgeVariant(account.status)}>{account.status}</Badge></td>
                                  <td className="px-4 py-3 text-slate-600">{account.temporaryPassword || '-'}</td>
                                  <td className="px-4 py-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => void resetPassword(account)}
                                      disabled={resetBusyId === account.userId}
                                    >
                                      <UserRoundCog className="mr-2 h-4 w-4" />
                                      {resetBusyId === account.userId ? '处理中...' : '重置密码'}
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {activeTab === 'projects' ? (
                    <div className="space-y-4">
                      <h3 className="font-medium text-slate-900">项目参与记录</h3>
                      {projects.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-500">当前没有项目参与记录。</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="border-b border-slate-200 px-4 py-3">项目</th>
                                <th className="border-b border-slate-200 px-4 py-3">方式</th>
                                <th className="border-b border-slate-200 px-4 py-3">阶段</th>
                                <th className="border-b border-slate-200 px-4 py-3">状态</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {projects.map((project) => (
                                <tr key={project.id}>
                                  <td className="px-4 py-3 font-medium text-slate-900">
                                    {project.name}
                                    <div className="mt-1 text-xs text-slate-400">{project.code || project.id}</div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">{project.method || '-'}</td>
                                  <td className="px-4 py-3 text-slate-600">{project.stage || '-'}</td>
                                  <td className="px-4 py-3 text-slate-600">{project.status || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {activeTab === 'reviews' ? (
                    <div className="space-y-6">
                      <h3 className="flex items-center gap-2 font-medium">
                        <Activity className="h-5 w-5 text-[#006666]" />
                        评审记录
                      </h3>
                      {(supplier.admissionReviews ?? []).length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-500">当前没有评审记录。</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="border-b border-slate-200 px-4 py-3">评审类型</th>
                                <th className="border-b border-slate-200 px-4 py-3">状态</th>
                                <th className="border-b border-slate-200 px-4 py-3">分数</th>
                                <th className="border-b border-slate-200 px-4 py-3">评审人</th>
                                <th className="border-b border-slate-200 px-4 py-3">时间</th>
                                <th className="border-b border-slate-200 px-4 py-3">意见</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(supplier.admissionReviews ?? []).map((review) => (
                                <tr key={review.id}>
                                  <td className="px-4 py-3 font-medium text-slate-900">{review.reviewType}</td>
                                  <td className="px-4 py-3"><Badge variant={badgeVariant(review.status)}>{review.status}</Badge></td>
                                  <td className="px-4 py-3 text-slate-600">{review.score ?? '-'}</td>
                                  <td className="px-4 py-3 text-slate-600">{review.reviewer || '-'}</td>
                                  <td className="px-4 py-3 text-slate-600">{formatDateTime(review.reviewedAt)}</td>
                                  <td className="px-4 py-3 text-slate-600">{review.opinion || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-medium">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    风险与准入状态
                  </h3>
                  <div className="border-b py-4 text-center">
                    <span className="text-4xl font-bold text-[#006666]">{supplier.evaluationScore ?? '-'}</span>
                    <p className="mt-2 text-sm text-gray-500">综合评分</p>
                  </div>
                  <div className="space-y-3 pt-4 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">准入状态</span><span>{supplier.admissionStatus || supplier.status}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">风险标签</span><span>{supplier.risk || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">评审记录</span><span>{supplier.admissionReviews?.length ?? 0}</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-medium">
                    <History className="h-5 w-5 text-[#006666]" />
                    最近业务摘要
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="mb-1 text-gray-500">参与项目数</p>
                      <p className="text-lg font-medium">{projects.length}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-gray-500">最后一次评审</p>
                      <p className="font-medium">{formatDateTime(supplier.admissionReviews?.[0]?.reviewedAt)}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-gray-500">资质附件数</p>
                      <p className="font-medium">{supplier.qualificationAttachments?.length ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
