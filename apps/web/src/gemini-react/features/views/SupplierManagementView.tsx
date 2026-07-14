import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, FileText, MapPin, Package, RefreshCw, Search, ShieldCheck, Star, Users, X } from 'lucide-react';
import { apiGet, apiPost, apiUrl } from '../../../api/http';
import { formatDateTime, labelStatus } from '../../../utils/status-labels';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';

interface Attachment {
  id: string;
  fileName: string;
  uploadedAt: string;
  contentType?: string;
  sizeBytes?: number;
}

interface ServiceRegion {
  id: string;
  region: string;
  storeName: string;
  category: string;
  status: string;
}

interface AdmissionReview {
  id: string;
  reviewType: string;
  status: string;
  score?: number;
  opinion: string;
  reviewedAt: string;
  reviewer?: string;
}

interface SealSample {
  id: string;
  sampleName: string;
  specification: string;
  confirmedBy: string;
  confirmedAt?: string;
  uploadedAt?: string;
  fileId?: string;
  fileName?: string;
}

interface SupplierRecord {
  id: string;
  name: string;
  status: string;
  admissionStatus?: string;
  admissionLevel?: string;
  categoryAuth: string[];
  qualification: string;
  risk: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  supplierSource?: string;
  socialCreditCode?: string;
  businessLicenseNo?: string;
  legalRepresentative?: string;
  registeredAddress?: string;
  businessScope?: string;
  serviceRegions?: ServiceRegion[];
  qualificationAttachments?: Attachment[];
  admissionReviews?: AdmissionReview[];
  sealSamples?: SealSample[];
  periodicAssessment?: {
    cycle: string;
    lastAssessedAt?: string;
    nextDueAt?: string;
    latestScore?: number;
    latestResult?: string;
  };
  evaluationScore?: number | null;
}

function statusVariant(status: string) {
  if (['admitted', 'regular', 'preferred', 'passed', 'active'].includes(status)) return 'success';
  if (['pending', 'trial', 'reviewing'].includes(status)) return 'warning';
  if (['restricted', 'inactive', 'rejected', 'blacklisted', 'disabled'].includes(status)) return 'danger';
  return 'default';
}

function infoValue(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '-';
  return value;
}

function serviceSummary(supplier: SupplierRecord) {
  const rows = supplier.serviceRegions ?? [];
  if (rows.length === 0) return '-';
  return rows
    .slice(0, 2)
    .map((item) => `${item.region}${item.storeName ? ` / ${item.storeName}` : ''}`)
    .join('；');
}

function currentStatus(supplier: SupplierRecord) {
  return supplier.admissionStatus || supplier.status || 'pending';
}

function canReactivate(status: string) {
  return ['restricted', 'inactive', 'rejected', 'blacklisted', 'disabled'].includes(status);
}

function canRestrict(status: string) {
  return !canReactivate(status);
}

function DetailSection({
  title,
  icon,
  children
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="font-semibold text-slate-900 flex items-center gap-2">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="font-medium text-slate-900 mt-1 leading-relaxed">{value}</div>
    </div>
  );
}

function SupplierDetailDrawer({
  supplier,
  canMaintain,
  busy,
  onClose,
  onToggleStatus
}: {
  supplier: SupplierRecord;
  canMaintain: boolean;
  busy: boolean;
  onClose: () => void;
  onToggleStatus: () => void;
}) {
  const status = currentStatus(supplier);
  const statusText = labelStatus(status);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${supplier.name}供应商详情`}>
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[760px] bg-white h-full shadow-2xl flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-3">
              {supplier.name}
              <Badge variant={statusVariant(status)}>{statusText}</Badge>
            </h3>
            <p className="text-xs text-slate-500 mt-1">{supplier.id} / {supplier.socialCreditCode || supplier.businessLicenseNo || '-'}</p>
          </div>
          <button type="button" className="text-slate-400 hover:text-slate-600" aria-label="关闭供应商详情" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-7 bg-slate-50/40">
          <div className="grid grid-cols-4 gap-3">
            <InfoCard label="准入级别" value={infoValue(supplier.admissionLevel ? labelStatus(supplier.admissionLevel) : undefined)} />
            <InfoCard label="综合评分" value={supplier.evaluationScore ?? '-'} />
            <InfoCard label="资质状态" value={infoValue(labelStatus(supplier.qualification))} />
            <InfoCard label="风险提示" value={infoValue(supplier.risk)} />
          </div>

          <DetailSection title="企业基础信息" icon={<Building2 className="w-5 h-5 text-[#006666]" />}>
            <DetailGrid>
              <InfoCard label="企业全称" value={supplier.name} />
              <InfoCard label="供应商来源" value={infoValue(supplier.supplierSource)} />
              <InfoCard label="统一社会信用代码" value={infoValue(supplier.socialCreditCode)} />
              <InfoCard label="营业执照号" value={infoValue(supplier.businessLicenseNo)} />
              <InfoCard label="法定代表人" value={infoValue(supplier.legalRepresentative)} />
              <InfoCard label="联系人" value={infoValue(supplier.contactName)} />
              <InfoCard label="联系电话" value={infoValue(supplier.contactPhone)} />
              <InfoCard label="联系邮箱" value={infoValue(supplier.contactEmail)} />
              <div className="col-span-2">
                <InfoCard label="注册地址" value={infoValue(supplier.registeredAddress)} />
              </div>
              <div className="col-span-2">
                <InfoCard label="经营范围" value={infoValue(supplier.businessScope)} />
              </div>
            </DetailGrid>
          </DetailSection>

          <DetailSection title="品类与服务覆盖" icon={<Package className="w-5 h-5 text-[#006666]" />}>
            <div className="flex flex-wrap gap-2">
              {(supplier.categoryAuth ?? []).length === 0 ? (
                <span className="text-sm text-slate-500">暂无授权品类</span>
              ) : (
                supplier.categoryAuth.map((category) => (
                  <Badge key={category} variant="info">{category}</Badge>
                ))
              )}
            </div>
            <div className="space-y-3">
              {(supplier.serviceRegions ?? []).length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">暂无服务区域记录。</div>
              ) : (
                supplier.serviceRegions?.map((region) => (
                  <div key={region.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{region.region}</p>
                        <p className="text-xs text-slate-500 mt-1">{region.storeName || '未指定门店'} / {region.category || '未指定品类'}</p>
                      </div>
                      <Badge variant={statusVariant(region.status)}>{labelStatus(region.status)}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DetailSection>

          <DetailSection title="资质附件" icon={<FileText className="w-5 h-5 text-[#006666]" />}>
            {(supplier.qualificationAttachments ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">暂无资质附件。</div>
            ) : (
              <div className="space-y-2">
                {supplier.qualificationAttachments?.map((attachment) => (
                  <div key={attachment.id} className="rounded-lg border border-slate-200 bg-white p-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{attachment.fileName}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatDateTime(attachment.uploadedAt)}</p>
                    </div>
                    <a
                      className="text-[#006666] text-sm hover:underline"
                      href={apiUrl(`/api/files/${encodeURIComponent(attachment.id)}/download`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      下载
                    </a>
                  </div>
                ))}
              </div>
            )}
          </DetailSection>

          <DetailSection title="准入评审记录" icon={<ShieldCheck className="w-5 h-5 text-[#006666]" />}>
            {(supplier.admissionReviews ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">暂无评审记录。</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">评审类型</th>
                      <th className="px-4 py-3">结果</th>
                      <th className="px-4 py-3">评分</th>
                      <th className="px-4 py-3">评审人</th>
                      <th className="px-4 py-3">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplier.admissionReviews?.map((review) => (
                      <tr key={review.id}>
                        <td className="px-4 py-3">{labelStatus(review.reviewType)}</td>
                        <td className="px-4 py-3"><Badge variant={statusVariant(review.status)}>{labelStatus(review.status)}</Badge></td>
                        <td className="px-4 py-3">{review.score ?? '-'}</td>
                        <td className="px-4 py-3">{review.reviewer || '-'}</td>
                        <td className="px-4 py-3">{formatDateTime(review.reviewedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailSection>

          <DetailSection title="封样与考核" icon={<MapPin className="w-5 h-5 text-[#006666]" />}>
            <div className="grid grid-cols-1 gap-3">
              {(supplier.sealSamples ?? []).length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">暂无封样资料。</div>
              ) : (
                supplier.sealSamples?.map((sample) => (
                  <div key={sample.id} className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{sample.sampleName}</p>
                      <p className="text-xs text-slate-500 mt-1">{sample.specification || '未填写规格'} / {sample.confirmedBy || '未确认'}</p>
                    </div>
                    {sample.fileId ? (
                      <a
                        className="text-[#006666] text-sm hover:underline"
                        href={apiUrl(`/api/files/${encodeURIComponent(sample.fileId)}/download`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        下载
                      </a>
                    ) : null}
                  </div>
                ))
              )}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-slate-900 font-medium">
                  <Star className="w-4 h-4 text-amber-500" />
                  周期考核
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm text-slate-600">
                  <div>考核周期：{labelStatus(supplier.periodicAssessment?.cycle)}</div>
                  <div>最近结果：{labelStatus(supplier.periodicAssessment?.latestResult)}</div>
                  <div>最近分数：{supplier.periodicAssessment?.latestScore ?? '-'}</div>
                  <div>下次到期：{supplier.periodicAssessment?.nextDueAt ? formatDateTime(supplier.periodicAssessment.nextDueAt) : '-'}</div>
                </div>
              </div>
            </div>
          </DetailSection>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>关闭</Button>
          {canMaintain ? (
            <Button className="bg-[#006666] text-white" disabled={busy} onClick={onToggleStatus}>
              {canReactivate(status) ? '恢复准入' : '限制供应商'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SupplierManagementView() {
  const { currentUser } = useApp();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canMaintain = currentUser?.role === 'GROUP_PROCUREMENT_MANAGER';

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<{ suppliers: SupplierRecord[] }>('/api/suppliers', currentUser?.id);
      setSuppliers(data.suppliers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '供应商数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    if (selectedId && !suppliers.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, suppliers]);

  const filteredSuppliers = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return suppliers;
    return suppliers.filter((item) =>
      [
        item.id,
        item.name,
        item.contactName,
        item.contactPhone,
        item.socialCreditCode,
        item.businessLicenseNo,
        item.categoryAuth.join(' '),
        serviceSummary(item)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(text)
    );
  }, [keyword, suppliers]);

  const selectedSupplier = selectedId ? suppliers.find((item) => item.id === selectedId) ?? null : null;

  async function toggleSupplierStatus(supplier: SupplierRecord) {
    if (!canMaintain) return;
    const status = currentStatus(supplier);
    const nextStatus = canReactivate(status) ? 'admitted' : 'restricted';
    const reason = canReactivate(status) ? '集团供应商管理恢复准入' : '集团供应商管理限制供应商';
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiPost(`/api/suppliers/${encodeURIComponent(supplier.id)}/status`, { admissionStatus: nextStatus, reason }, currentUser?.id);
      setMessage(`${supplier.name} 状态已更新为${labelStatus(nextStatus)}。`);
      await loadSuppliers();
      setSelectedId(supplier.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '供应商状态更新失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-900">
            <Users className="w-6 h-6 text-[#006666]" />
            供应商管理
          </h2>
          <p className="text-sm text-slate-500 mt-1">基于真实供应商台账，查看准入状态、资质附件、评审记录和服务覆盖范围。</p>
        </div>
        <Button variant="outline" className="gap-2" disabled={loading} onClick={() => void loadSuppliers()}>
          <RefreshCw className="w-4 h-4" />
          刷新
        </Button>
      </div>

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          ['供应商总数', suppliers.length, '当前角色可见'],
          ['已准入', suppliers.filter((item) => currentStatus(item) === 'admitted').length, '正常供应商'],
          ['待处理', suppliers.filter((item) => ['pending', 'trial'].includes(currentStatus(item))).length, '待准入或待评审'],
          ['受限/停用', suppliers.filter((item) => canReactivate(currentStatus(item))).length, '需要治理']
        ].map(([label, value, meta]) => (
          <Card key={String(label)}>
            <CardContent className="p-5">
              <div className="h-1 w-10 rounded-full bg-[#006666] mb-4" />
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-3xl font-semibold text-slate-950 mt-2">{value}</p>
              <p className="text-xs text-slate-500 mt-2">{meta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索企业、联系人、编号、品类"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
            />
          </div>
          <div className="text-sm text-slate-500">共 {filteredSuppliers.length} 家供应商</div>
        </div>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">供应商编号</th>
                <th className="px-6 py-4">企业名称 / 联系人</th>
                <th className="px-6 py-4">主营品类</th>
                <th className="px-6 py-4">服务覆盖</th>
                <th className="px-6 py-4">资质数</th>
                <th className="px-6 py-4">评分</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">供应商数据加载中...</td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">未找到匹配供应商</td>
                </tr>
              ) : (
                filteredSuppliers.map((item) => {
                  const status = currentStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono">{item.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-1">{item.contactName || '-'} / {item.contactPhone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 max-w-[240px] text-slate-600">{item.categoryAuth.length ? item.categoryAuth.join('、') : '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{serviceSummary(item)}</td>
                      <td className="px-6 py-4 text-slate-600">{item.qualificationAttachments?.length ?? 0}</td>
                      <td className="px-6 py-4 text-slate-600">{item.evaluationScore ?? '-'}</td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant(status)}>{labelStatus(status)}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button className="text-[#006666] text-xs font-medium" onClick={() => setSelectedId(item.id)}>查看详情</button>
                          {canMaintain ? (
                            <button className="text-slate-500 text-xs font-medium" disabled={busy} onClick={() => void toggleSupplierStatus(item)}>
                              {canReactivate(status) ? '恢复准入' : '限制供应商'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {selectedSupplier ? (
        <SupplierDetailDrawer
          supplier={selectedSupplier}
          canMaintain={canMaintain}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onToggleStatus={() => void toggleSupplierStatus(selectedSupplier)}
        />
      ) : null}
    </div>
  );
}
