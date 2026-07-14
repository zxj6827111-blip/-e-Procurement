import React, { useEffect, useMemo, useState } from 'react';
import { Building2, ClipboardCheck, FileText, Send, Upload } from 'lucide-react';
import { apiGet, apiPost, uploadFile, type UploadedFileMetadata } from '../../../api/http';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { formatCurrency, formatDateTime, humanizeStatus, statusBadgeVariant } from './project-workbench-data';

interface ProjectLineItem {
  id: string;
  itemName: string;
  specification?: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice?: number;
  budgetAmount?: number;
}

interface ProjectRecord {
  id: string;
  code?: string;
  name?: string;
  displayName?: string;
  status: string;
  category?: string;
  orgName?: string;
  quoteDeadlineAt?: string | null;
  sourceLineItems?: ProjectLineItem[];
}

interface AnnouncementRecord {
  id: string;
  projectId: string;
  title: string;
  status: string;
  registrationDeadlineAt: string;
  quoteDeadlineAt?: string | null;
  publishedAt?: string | null;
}

interface RegistrationRecord {
  id: string;
  projectId: string;
  announcementId: string;
  supplierId: string;
  status: string;
  submittedAt: string;
  qualifiedAt?: string;
  qualificationReason?: string;
  materialMetadata?: UploadedFileMetadata[];
  supplementMaterialMetadata?: UploadedFileMetadata[];
}

interface SupplierRecord {
  id: string;
  name: string;
}

const supplierRoles = new Set(['SUPPLIER', 'SUPPLIER_ADMIN', 'SUPPLIER_BIDDER']);
const reviewerRoles = new Set(['GROUP_PROCUREMENT_MANAGER', 'PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS']);

function projectName(project?: ProjectRecord | null) {
  const value = project?.displayName ?? project?.name ?? project?.code ?? project?.id ?? '采购项目';
  const codePrefix = project?.code ? `${project.code} / ` : '';
  return codePrefix && value.startsWith(codePrefix) ? value.slice(codePrefix.length) : value;
}

export function RegistrationMaterialView() {
  const { currentUser, currentProjectId, setCurrentProjectId, setCurrentView } = useApp();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId ?? '');
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [supplementFile, setSupplementFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<'submitting' | 'reviewing' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isSupplier = Boolean(currentUser && supplierRoles.has(currentUser.role));
  const canReview = Boolean(currentUser && reviewerRoles.has(currentUser.role));

  const visibleAnnouncements = useMemo(
    () => announcements.filter((item) => !isSupplier || item.status === 'published'),
    [announcements, isSupplier]
  );

  const availableProjects = useMemo(() => {
    const projectIds = new Set(visibleAnnouncements.map((item) => item.projectId));
    return projects.filter((item) => projectIds.has(item.id));
  }, [projects, visibleAnnouncements]);

  const selectedProject = useMemo(
    () => projects.find((item) => item.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const projectAnnouncements = useMemo(
    () => visibleAnnouncements.filter((item) => item.projectId === selectedProjectId),
    [selectedProjectId, visibleAnnouncements]
  );

  const selectedAnnouncement = useMemo(
    () => projectAnnouncements.find((item) => item.id === selectedAnnouncementId) ?? projectAnnouncements[0] ?? null,
    [projectAnnouncements, selectedAnnouncementId]
  );

  const projectRegistrations = useMemo(
    () => registrations.filter((item) => item.projectId === selectedProjectId),
    [registrations, selectedProjectId]
  );

  const ownRegistration = useMemo(
    () => projectRegistrations[0] ?? null,
    [projectRegistrations]
  );

  const supplierNameById = useMemo(
    () => new Map(suppliers.map((item) => [item.id, item.name])),
    [suppliers]
  );

  const registrationClosed = Boolean(
    selectedAnnouncement && new Date(selectedAnnouncement.registrationDeadlineAt).getTime() < Date.now()
  );

  const refresh = async (preferredProjectId?: string) => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const [projectData, announcementData, registrationData, supplierData] = await Promise.all([
        apiGet<{ projects?: ProjectRecord[] }>('/api/projects', currentUser.id),
        apiGet<{ announcements?: AnnouncementRecord[] }>('/api/announcements', currentUser.id),
        apiGet<{ registrations?: RegistrationRecord[] }>('/api/registrations', currentUser.id).catch(() => ({ registrations: [] })),
        apiGet<{ suppliers?: SupplierRecord[] }>('/api/suppliers', currentUser.id).catch(() => ({ suppliers: [] }))
      ]);

      const nextProjects = projectData.projects ?? [];
      const nextAnnouncements = announcementData.announcements ?? [];
      const nextRegistrations = registrationData.registrations ?? [];
      const accessibleAnnouncements = nextAnnouncements.filter((item) => !supplierRoles.has(currentUser.role) || item.status === 'published');
      const accessibleProjectIds = new Set(accessibleAnnouncements.map((item) => item.projectId));
      const preferred = preferredProjectId ?? currentProjectId ?? selectedProjectId;
      const nextProjectId = preferred && accessibleProjectIds.has(preferred)
        ? preferred
        : nextProjects.find((item) => accessibleProjectIds.has(item.id))?.id ?? '';

      setProjects(nextProjects);
      setAnnouncements(nextAnnouncements);
      setRegistrations(nextRegistrations);
      setSuppliers(supplierData.suppliers ?? []);
      setSelectedProjectId(nextProjectId);
      setSelectedAnnouncementId((previous) => {
        const matchesProject = accessibleAnnouncements.filter((item) => item.projectId === nextProjectId);
        return matchesProject.some((item) => item.id === previous) ? previous : matchesProject[0]?.id ?? '';
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '报名资料页面加载失败。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh(currentProjectId ?? undefined);
  }, [currentProjectId, currentUser?.id]);

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentProjectId(projectId || null);
    const nextAnnouncement = visibleAnnouncements.find((item) => item.projectId === projectId);
    setSelectedAnnouncementId(nextAnnouncement?.id ?? '');
    setMaterialFile(null);
    setSupplementFile(null);
    setMessage('');
    setError('');
  };

  const handleSubmitRegistration = async () => {
    if (!currentUser || !selectedProject || !selectedAnnouncement) return;
    if (ownRegistration) {
      setError('当前供应商已经提交过该项目的报名资料，不能重复报名。');
      return;
    }
    if (registrationClosed) {
      setError('当前公告的报名截止时间已过。');
      return;
    }
    if (!materialFile) {
      setError('请选择需要提交的报名主文件。');
      return;
    }

    setBusyAction('submitting');
    setMessage('');
    setError('');
    try {
      const mainUpload = await uploadFile(materialFile, {
        attachmentKind: 'registration_material',
        objectType: 'supplier_registration',
        objectId: selectedAnnouncement.id,
        projectId: selectedProject.id
      }, currentUser.id);
      const supplementUpload = supplementFile
        ? await uploadFile(supplementFile, {
            attachmentKind: 'registration_supplement_material',
            objectType: 'supplier_registration',
            objectId: selectedAnnouncement.id,
            projectId: selectedProject.id
          }, currentUser.id)
        : null;

      await apiPost(`/api/announcements/${encodeURIComponent(selectedAnnouncement.id)}/registrations`, {
        materialMetadata: [mainUpload.file],
        supplementMaterialMetadata: supplementUpload ? [supplementUpload.file] : []
      }, currentUser.id);
      setMaterialFile(null);
      setSupplementFile(null);
      setMessage('报名资料已提交，请等待采购经办进行资格审核。');
      await refresh(selectedProject.id);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '报名资料提交失败。');
    } finally {
      setBusyAction(null);
    }
  };

  const handleQualification = async (registration: RegistrationRecord, status: 'qualified' | 'rejected') => {
    if (!currentUser) return;
    setBusyAction('reviewing');
    setMessage('');
    setError('');
    try {
      await apiPost(`/api/registrations/${encodeURIComponent(registration.id)}/qualify`, {
        status,
        reason: status === 'qualified' ? '报名材料符合当前项目要求。' : '报名材料需要补正后重新审核。'
      }, currentUser.id);
      setMessage(status === 'qualified' ? '供应商资格审核已通过。' : '报名资料已退回补正。');
      await refresh(selectedProjectId);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '资格审核失败。');
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpenQuote = () => {
    if (!selectedProjectId) return;
    setCurrentProjectId(selectedProjectId);
    setCurrentView('QUOTE_RESPONSE');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <ClipboardCheck className="h-6 w-6 text-[#006666]" />
            报名资料
          </h2>
          <p className="mt-1 text-sm text-slate-500">{isSupplier ? '查看采购公告并提交本企业报名资料' : '查看报名记录并完成供应商资格审核'}</p>
        </div>
        {isSupplier && ownRegistration?.status === 'qualified' ? (
          <Button variant="brand" onClick={handleOpenQuote}>
            <FileText className="mr-2 h-4 w-4" />
            进入报价响应
          </Button>
        ) : null}
      </div>

      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block text-sm font-medium text-slate-700">
            选择报名项目
            <select
              aria-label="选择报名项目"
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-[#006666] focus:outline-none focus:ring-1 focus:ring-[#006666]"
              value={selectedProjectId}
              onChange={(event) => handleProjectChange(event.target.value)}
            >
              {!availableProjects.length ? <option value="">暂无可报名项目</option> : null}
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code ?? project.id} / {projectName(project)}
                </option>
              ))}
            </select>
          </label>
          {selectedProject ? (
            <Badge variant={statusBadgeVariant(selectedProject.status)}>{humanizeStatus(selectedProject.status)}</Badge>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-slate-500">正在加载报名项目...</CardContent></Card>
      ) : !selectedProject || !selectedAnnouncement ? (
        <Card><CardContent className="p-8 text-center text-sm text-slate-500">当前账号没有可查看的已发布采购公告。</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center justify-between gap-4 text-base font-semibold text-slate-800">
                  <span className="flex items-center gap-2"><Building2 className="h-5 w-5 text-[#006666]" />采购公告与项目内容</span>
                  <Badge variant={statusBadgeVariant(selectedAnnouncement.status)}>{humanizeStatus(selectedAnnouncement.status)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{selectedAnnouncement.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{selectedProject.code ?? selectedProject.id} / {projectName(selectedProject)}</div>
                </div>
                <div className="grid gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div><div className="text-xs text-slate-500">采购组织</div><div className="mt-1 text-sm font-medium text-slate-900">{selectedProject.orgName ?? '-'}</div></div>
                  <div><div className="text-xs text-slate-500">采购品类</div><div className="mt-1 text-sm font-medium text-slate-900">{selectedProject.category ?? '-'}</div></div>
                  <div><div className="text-xs text-slate-500">报名截止</div><div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(selectedAnnouncement.registrationDeadlineAt)}</div></div>
                  <div><div className="text-xs text-slate-500">报价截止</div><div className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(selectedAnnouncement.quoteDeadlineAt ?? selectedProject.quoteDeadlineAt)}</div></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">物资名称</th>
                        <th className="px-4 py-3 font-medium">规格 / 型号</th>
                        <th className="px-4 py-3 font-medium">数量</th>
                        <th className="px-4 py-3 font-medium">预算金额</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedProject.sourceLineItems ?? []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{item.itemName}</td>
                          <td className="px-4 py-3 text-slate-600">{item.specification ?? '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{item.quantity} {item.unit}</td>
                          <td className="px-4 py-3 text-slate-600">{formatCurrency(item.budgetAmount ?? (item.estimatedUnitPrice ?? 0) * item.quantity)}</td>
                        </tr>
                      ))}
                      {!selectedProject.sourceLineItems?.length ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">当前项目未维护采购物资明细。</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-800">{isSupplier ? '本企业报名' : '报名概况'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                {isSupplier ? (
                  ownRegistration ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-500">当前状态</span>
                        <Badge variant={statusBadgeVariant(ownRegistration.status)}>{humanizeStatus(ownRegistration.status)}</Badge>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <div>提交时间：{formatDateTime(ownRegistration.submittedAt)}</div>
                        {ownRegistration.qualifiedAt ? <div className="mt-2">审核时间：{formatDateTime(ownRegistration.qualifiedAt)}</div> : null}
                        <div className="mt-2">审核意见：{ownRegistration.qualificationReason ?? '采购经办尚未完成资格审核。'}</div>
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-medium text-slate-800">已提交文件</div>
                        <ul className="space-y-2 text-sm text-slate-600">
                          {[...(ownRegistration.materialMetadata ?? []), ...(ownRegistration.supplementMaterialMetadata ?? [])].map((file) => (
                            <li key={file.id} className="rounded-md border border-slate-200 px-3 py-2">{file.fileName}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <label className="block text-sm font-medium text-slate-700">
                        报名主文件
                        <input
                          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-slate-700"
                          type="file"
                          onChange={(event) => setMaterialFile(event.target.files?.[0] ?? null)}
                        />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        补充材料（可选）
                        <input
                          className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-slate-700"
                          type="file"
                          onChange={(event) => setSupplementFile(event.target.files?.[0] ?? null)}
                        />
                      </label>
                      {registrationClosed ? <div className="text-sm text-rose-600">报名截止时间已过，当前不能再提交资料。</div> : null}
                      <Button
                        className="w-full"
                        variant="brand"
                        disabled={!materialFile || registrationClosed || busyAction !== null}
                        onClick={() => void handleSubmitRegistration()}
                      >
                        {busyAction === 'submitting' ? <Upload className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                        {busyAction === 'submitting' ? '正在提交...' : '提交报名资料'}
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-4"><div className="text-xs text-slate-500">报名供应商</div><div className="mt-2 text-xl font-semibold text-slate-900">{projectRegistrations.length} 家</div></div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-4"><div className="text-xs text-slate-500">待审核</div><div className="mt-2 text-xl font-semibold text-slate-900">{projectRegistrations.filter((item) => item.status === 'submitted').length} 家</div></div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-4"><div className="text-xs text-slate-500">资格通过</div><div className="mt-2 text-xl font-semibold text-slate-900">{projectRegistrations.filter((item) => item.status === 'qualified').length} 家</div></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {canReview ? (
            <Card>
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-800">供应商报名与资格审核</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-5 py-3 font-medium">供应商</th>
                        <th className="px-5 py-3 font-medium">提交时间</th>
                        <th className="px-5 py-3 font-medium">报名文件</th>
                        <th className="px-5 py-3 font-medium">资格状态</th>
                        <th className="px-5 py-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projectRegistrations.map((registration) => (
                        <tr key={registration.id}>
                          <td className="px-5 py-4 font-medium text-slate-900">{supplierNameById.get(registration.supplierId) ?? registration.supplierId}</td>
                          <td className="px-5 py-4 text-slate-600">{formatDateTime(registration.submittedAt)}</td>
                          <td className="px-5 py-4 text-slate-600">{(registration.materialMetadata ?? []).map((file) => file.fileName).join('、') || '-'}</td>
                          <td className="px-5 py-4"><Badge variant={statusBadgeVariant(registration.status)}>{humanizeStatus(registration.status)}</Badge></td>
                          <td className="px-5 py-4">
                            {registration.status === 'submitted' ? (
                              <div className="flex gap-2">
                                <Button size="sm" variant="brand" disabled={busyAction !== null} onClick={() => void handleQualification(registration, 'qualified')}>
                                  <ClipboardCheck className="mr-1 h-4 w-4" />资格通过
                                </Button>
                                <Button size="sm" variant="outline" disabled={busyAction !== null} onClick={() => void handleQualification(registration, 'rejected')}>退回补正</Button>
                              </div>
                            ) : <span className="text-slate-400">已处理</span>}
                          </td>
                        </tr>
                      ))}
                      {!projectRegistrations.length ? (
                        <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">当前项目尚无供应商提交报名资料。</td></tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
