import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { apiDelete, apiGet, apiPatch, uploadFile, type UploadedFileMetadata } from '../../../api/http';
import type { Attachment, Supplier, SupplierPortalProfileForm } from '../../../pages/supplier-portal/types';
import {
  createProfileForm,
  profilePayload,
  reviewTypeLabel,
  selectedFileSummary,
  statusLabel,
  statusTone as resolveSupplierStatusTone,
  supplierSummaryItems
} from '../../../pages/supplier-portal/display';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Building2, ClipboardList, RefreshCw, Save, ShieldCheck, Trash2, Upload, UserCircle } from 'lucide-react';

interface AuthSessionResponse {
  user?: {
    id: string;
    supplierId?: string;
  };
  roleId: string;
  orgScope: string[];
}

function formatDateTime(value?: string | null) {
  return value ? value.replace('T', ' ').replace('.000Z', '').slice(0, 16) : '-';
}

function supplierStatusBadgeVariant(status?: string): 'default' | 'success' | 'warning' | 'danger' {
  const tone = resolveSupplierStatusTone(status);
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'error') return 'danger';
  return 'default';
}

function reviewStatusLabel(status?: string) {
  if (status === 'passed') return '通过';
  if (status === 'rejected') return '驳回';
  if (status === 'pending') return '待处理';
  return status || '-';
}

function reviewStatusVariant(status?: string): 'outline' | 'success' | 'warning' | 'danger' {
  if (status === 'passed') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'pending') return 'warning';
  return 'outline';
}

function buildProfileUpdatePayload(form: SupplierPortalProfileForm, supplier: Supplier) {
  const basePayload = profilePayload(form, supplier);
  const primaryCategory = form.category.trim() || supplier.categoryAuth?.[0] || '';
  const existingCategories = supplier.categoryAuth ?? [];
  const existingRegions = supplier.serviceRegions ?? [];
  const nextCategories = primaryCategory
    ? [primaryCategory, ...existingCategories.filter((item) => item !== primaryCategory)]
    : existingCategories;

  const nextRegions =
    primaryCategory || form.region.trim() || form.storeName.trim() || existingRegions.length
      ? [
          {
            id: existingRegions[0]?.id ?? `sr-${supplier.id}-1`,
            region: form.region.trim(),
            storeName: form.storeName.trim(),
            category: primaryCategory,
            status: existingRegions[0]?.status === 'suspended' ? 'suspended' : 'active'
          },
          ...existingRegions.slice(1)
        ]
      : existingRegions;

  return {
    ...basePayload,
    categoryAuth: nextCategories,
    serviceRegions: nextRegions
  };
}

export function SupplierProfileView() {
  const { currentUser } = useApp();
  const [sessionInfo, setSessionInfo] = useState<AuthSessionResponse | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [profileForm, setProfileForm] = useState<SupplierPortalProfileForm>(createProfileForm(null));
  const [qualificationFiles, setQualificationFiles] = useState<File[]>([]);
  const [qualificationFileName, setQualificationFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingQualificationId, setDeletingQualificationId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [qualificationInputKey, setQualificationInputKey] = useState(0);

  const canEdit = Boolean(sessionInfo?.user?.supplierId && supplier && sessionInfo.user.supplierId === supplier.id);

  const summaryItems = useMemo(() => supplierSummaryItems(supplier), [supplier]);

  const loadSupplierProfile = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      setSupplier(null);
      setSessionInfo(null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const authData = await apiGet<AuthSessionResponse>('/api/auth/session', currentUser.id);
      setSessionInfo(authData);
      const supplierId = authData.user?.supplierId;
      if (!supplierId) {
        setSupplier(null);
        setProfileForm(createProfileForm(null));
        setError('当前登录账号未绑定供应商档案，请联系采购管理员处理。');
        return;
      }
      const data = await apiGet<{ supplier: Supplier }>(`/api/suppliers/${encodeURIComponent(supplierId)}`, currentUser.id);
      setSupplier(data.supplier);
      setProfileForm(createProfileForm(data.supplier));
    } catch (err) {
      setSupplier(null);
      setProfileForm(createProfileForm(null));
      setError(err instanceof Error ? err.message : '供应商档案加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSupplierProfile();
  }, [currentUser?.id]);

  const uploadQualificationFiles = async (files: File[], supplierId: string) => {
    if (!files.length || !currentUser?.id) return undefined;
    const uploaded = await Promise.all(
      files.map((file) =>
        uploadFile(
          file,
          {
            attachmentKind: 'supplier_qualification',
            objectType: 'supplier',
            objectId: supplierId,
            supplierId
          },
          currentUser.id
        )
      )
    );
    return uploaded.map((item) => item.file) satisfies UploadedFileMetadata[];
  };

  const saveProfile = async () => {
    if (!supplier || !currentUser?.id || !canEdit) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await apiPatch<{ supplier: Supplier; auditLogId?: string }>(
        `/api/suppliers/${encodeURIComponent(supplier.id)}/profile`,
        {
          ...buildProfileUpdatePayload(profileForm, supplier),
          qualificationAttachments: qualificationFiles.length ? await uploadQualificationFiles(qualificationFiles, supplier.id) : undefined
        },
        currentUser.id
      );
      setSupplier(result.supplier);
      setProfileForm(createProfileForm(result.supplier));
      setQualificationFiles([]);
      setQualificationFileName('');
      setQualificationInputKey((current) => current + 1);
      setMessage(qualificationFiles.length ? '企业资料已保存，资质附件已追加。' : '企业资料已保存。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '供应商档案保存失败');
    } finally {
      setSaving(false);
    }
  };

  const deleteQualification = async (attachment: Attachment) => {
    if (!supplier || !currentUser?.id || !attachment.id || !canEdit) return;
    if (!window.confirm('确认删除这份资质文件吗？')) return;
    setDeletingQualificationId(attachment.id);
    setError('');
    setMessage('');
    try {
      const result = await apiDelete<{ supplier: Supplier; auditLogId?: string }>(
        `/api/suppliers/${encodeURIComponent(supplier.id)}/qualifications/${encodeURIComponent(attachment.id)}`,
        currentUser.id
      );
      setSupplier(result.supplier);
      setProfileForm(createProfileForm(result.supplier));
      setMessage('资质文件已删除。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '资质文件删除失败');
    } finally {
      setDeletingQualificationId('');
    }
  };

  const handleQualificationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setQualificationFiles(files);
    setQualificationFileName(selectedFileSummary(files));
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <UserCircle className="w-6 h-6 text-[#006666]" />
            供应商档案
          </h2>
          <p className="mt-1 text-sm text-slate-500">加载当前登录供应商的真实档案、资质状态和准入评审记录，不再使用静态资料。</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={supplierStatusBadgeVariant(supplier?.admissionStatus || supplier?.status)}>
            {statusLabel(supplier?.admissionStatus || supplier?.status)}
          </Badge>
          <Button variant="outline" className="gap-2" onClick={() => void loadSupplierProfile()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">正在加载当前供应商档案...</CardContent>
        </Card>
      ) : null}

      {!loading && !supplier ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">当前账号下没有可用的供应商档案。</CardContent>
        </Card>
      ) : null}

      {supplier ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryItems.map((item) => (
              <Card key={item.label}>
                <CardContent className="p-5">
                  <div className="text-sm text-slate-500">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">企业资料</CardTitle>
                  <div className="mt-1 text-sm text-slate-500">保存企业基础信息，并可在同一次保存中追加资质附件。</div>
                </div>
                <Badge variant={canEdit ? 'info' : 'outline'}>{canEdit ? '可编辑' : '只读'}</Badge>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>企业名称</span>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                      disabled={!canEdit}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>联系人</span>
                    <input
                      type="text"
                      value={profileForm.contactName}
                      onChange={(event) => setProfileForm((current) => ({ ...current, contactName: event.target.value }))}
                      disabled={!canEdit}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>联系电话</span>
                    <input
                      type="text"
                      value={profileForm.contactPhone}
                      onChange={(event) => setProfileForm((current) => ({ ...current, contactPhone: event.target.value }))}
                      disabled={!canEdit}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>联系邮箱</span>
                    <input
                      type="email"
                      value={profileForm.contactEmail}
                      onChange={(event) => setProfileForm((current) => ({ ...current, contactEmail: event.target.value }))}
                      disabled={!canEdit}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>统一社会信用代码</span>
                    <input
                      type="text"
                      value={profileForm.socialCreditCode}
                      onChange={(event) => setProfileForm((current) => ({ ...current, socialCreditCode: event.target.value }))}
                      disabled={!canEdit}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>营业执照号</span>
                    <input
                      type="text"
                      value={profileForm.businessLicenseNo}
                      onChange={(event) => setProfileForm((current) => ({ ...current, businessLicenseNo: event.target.value }))}
                      disabled={!canEdit}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>法定代表人</span>
                    <input
                      type="text"
                      value={profileForm.legalRepresentative}
                      onChange={(event) => setProfileForm((current) => ({ ...current, legalRepresentative: event.target.value }))}
                      disabled={!canEdit}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>主营品类</span>
                    <input
                      type="text"
                      value={profileForm.category}
                      onChange={(event) => setProfileForm((current) => ({ ...current, category: event.target.value }))}
                      disabled={!canEdit}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>服务区域</span>
                    <input
                      type="text"
                      value={profileForm.region}
                      onChange={(event) => setProfileForm((current) => ({ ...current, region: event.target.value }))}
                      disabled={!canEdit}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>门店 / 服务点</span>
                    <input
                      type="text"
                      value={profileForm.storeName}
                      onChange={(event) => setProfileForm((current) => ({ ...current, storeName: event.target.value }))}
                      disabled={!canEdit}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                    />
                  </label>
                </div>

                <label className="space-y-1 text-sm text-slate-700">
                  <span>注册地址</span>
                  <input
                    type="text"
                    value={profileForm.registeredAddress}
                    onChange={(event) => setProfileForm((current) => ({ ...current, registeredAddress: event.target.value }))}
                    disabled={!canEdit}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-700">
                  <span>业务范围</span>
                  <textarea
                    value={profileForm.businessScope}
                    onChange={(event) => setProfileForm((current) => ({ ...current, businessScope: event.target.value }))}
                    disabled={!canEdit}
                    rows={4}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                  />
                </label>

                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Upload className="h-4 w-4 text-[#006666]" />
                        追加资质附件
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        资质文件将通过正式文件中心上传，并在保存资料时一并追加到当前供应商档案。
                      </div>
                    </div>
                    <input
                      key={qualificationInputKey}
                      type="file"
                      multiple
                      disabled={!canEdit}
                      onChange={handleQualificationChange}
                      className="block text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
                    />
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{qualificationFileName || '未选择新的资质文件'}</div>
                </div>

                <div className="flex justify-end">
                  <Button variant="brand" className="gap-2" onClick={() => void saveProfile()} disabled={!canEdit || saving}>
                    <Save className="h-4 w-4" />
                    {saving ? '保存中...' : qualificationFiles.length ? '保存资料并追加资质' : '保存资料'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">档案概览</CardTitle>
                    <div className="mt-1 text-sm text-slate-500">当前登录供应商的真实状态、评分和授权范围。</div>
                  </div>
                  <Building2 className="h-5 w-5 text-[#006666]" />
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">供应商编号</span>
                    <span className="font-medium text-slate-900">{supplier.id}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">准入状态</span>
                    <Badge variant={supplierStatusBadgeVariant(supplier.admissionStatus || supplier.status)}>
                      {statusLabel(supplier.admissionStatus || supplier.status)}
                    </Badge>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">综合评分</span>
                    <span className="font-medium text-slate-900">{supplier.evaluationScore ?? '-'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">授权品类</span>
                    <span className="text-right">{supplier.categoryAuth?.length ? supplier.categoryAuth.join('、') : '-'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">风险提示</span>
                    <span className="text-right">{supplier.risk || '-'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">资质证照</CardTitle>
                    <div className="mt-1 text-sm text-slate-500">展示当前供应商真实资质文件，可继续追加上传。</div>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-[#006666]" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3">文件名</th>
                          <th className="px-4 py-3">类型</th>
                          <th className="px-4 py-3">上传时间</th>
                          <th className="px-4 py-3 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supplier.qualificationAttachments?.length ? (
                          supplier.qualificationAttachments.map((attachment) => (
                            <tr key={attachment.id || attachment.fileName}>
                              <td className="px-4 py-3 font-medium text-slate-900">{attachment.fileName || '-'}</td>
                              <td className="px-4 py-3 text-slate-600">{attachment.qualificationType || '-'}</td>
                              <td className="px-4 py-3 text-slate-600">{formatDateTime(attachment.uploadedAt)}</td>
                              <td className="px-4 py-3 text-right">
                                {canEdit ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 text-rose-600 hover:text-rose-700"
                                    disabled={deletingQualificationId === attachment.id}
                                    onClick={() => void deleteQualification(attachment)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    删除
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-400">只读</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                              暂无资质文件
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">准入评审记录</CardTitle>
                <div className="mt-1 text-sm text-slate-500">展示后端返回的真实评审记录，至少覆盖资质初审、准入评审和周期考核结果。</div>
              </div>
              <ClipboardList className="h-5 w-5 text-[#006666]" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">评审类型</th>
                      <th className="px-4 py-3">结果</th>
                      <th className="px-4 py-3">评分</th>
                      <th className="px-4 py-3">评审意见</th>
                      <th className="px-4 py-3">评审人</th>
                      <th className="px-4 py-3">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplier.admissionReviews?.length ? (
                      supplier.admissionReviews.map((review) => (
                        <tr key={review.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{reviewTypeLabel(review.reviewType)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={reviewStatusVariant(review.status)}>{reviewStatusLabel(review.status)}</Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{review.score ?? '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{review.opinion || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{review.reviewer || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDateTime(review.reviewedAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                          暂无准入评审记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
