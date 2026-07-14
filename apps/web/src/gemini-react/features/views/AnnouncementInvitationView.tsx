import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { apiGet, apiPost } from '../../../api/http';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import { Filter, Megaphone, RefreshCw, Search, X } from 'lucide-react';

interface ApiProject {
  id: string;
  code: string;
  sourceRequestId?: string;
  sourceRequestTitle?: string;
  displayName?: string;
  name: string;
  orgName?: string;
  buyer?: string;
  type?: string;
  quoteDeadlineAt?: string | null;
}

interface ApiAnnouncement {
  id: string;
  projectId: string;
  documentId: string;
  title: string;
  procurementMethod: string;
  scope: string;
  status: 'draft' | 'published' | 'closed' | string;
  registrationDeadlineAt: string;
  quoteDeadlineAt: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

interface ApiSupplierInvitation {
  id: string;
  projectId: string;
  announcementId: string;
  supplierId: string;
  status: string;
  notificationStatus: string;
}

interface ApiProcurementRequest {
  id: string;
  code: string;
  projectId?: string;
}

interface ApiProcurementDocument {
  id: string;
  projectId: string;
  title: string;
  status: string;
  updatedAt?: string;
  lockedAt?: string | null;
}

interface AnnouncementRow extends ApiAnnouncement {
  project?: ApiProject;
  sourceRequestCode?: string;
  invitationCount: number;
}

const copy = {
  title: '\u516c\u544a\u9080\u8bf7',
  description: '\u53d1\u5e03\u4e0e\u7ba1\u7406\u771f\u5b9e\u91c7\u8d2d\u9879\u76ee\u7684\u516c\u544a\u548c\u9080\u8bf7\u8bb0\u5f55',
  create: '\u8d77\u8349\u516c\u544a',
  refresh: '\u5237\u65b0',
  searchPlaceholder: '\u641c\u7d22\u516c\u544a\u3001\u9879\u76ee\u7f16\u53f7\u6216\u91c7\u8d2d\u7533\u8bf7\u53f7',
  ruleFilter: '\u89c4\u5219\u7b5b\u9009',
  numberType: '\u7f16\u53f7 / \u7c7b\u578b',
  announcementTitle: '\u516c\u544a\u6807\u9898',
  project: '\u5173\u8054\u9879\u76ee',
  deadlines: '\u622a\u6b62\u65f6\u95f4',
  status: '\u72b6\u6001',
  invitations: '\u9080\u8bf7',
  operation: '\u64cd\u4f5c',
  detail: '\u8be6\u60c5',
  publish: '\u53d1\u5e03',
  projectWorkbench: '\u9879\u76ee\u5de5\u4f5c\u53f0',
  close: '\u5173\u95ed',
  loading: '\u6b63\u5728\u52a0\u8f7d\u771f\u5b9e\u516c\u544a...',
  empty: '\u6682\u65e0\u516c\u544a\u8bb0\u5f55',
  loadFailed: '\u516c\u544a\u63a5\u53e3\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u786e\u8ba4\u540e\u7aef\u670d\u52a1\u548c\u5f53\u524d\u767b\u5f55\u89d2\u8272\u3002',
  createHint: '\u8bf7\u5148\u8fdb\u5165\u9879\u76ee\u5de5\u4f5c\u53f0\uff0c\u5728\u91c7\u8d2d\u6587\u4ef6\u53d1\u5e03\u5e76\u9501\u5b9a\u540e\u8d77\u8349\u516c\u544a\u3002',
  publishedPrefix: '\u5df2\u53d1\u5e03\u516c\u544a ',
  registerDeadline: '\u62a5\u540d\u622a\u6b62',
  quoteDeadline: '\u62a5\u4ef7\u622a\u6b62',
  publishedAt: '\u53d1\u5e03\u65f6\u95f4',
  createdAt: '\u521b\u5efa\u65f6\u95f4',
  document: '\u91c7\u8d2d\u6587\u4ef6',
  scope: '\u516c\u544a\u8303\u56f4',
  countPrefix: '\u5171 ',
  countSuffix: ' \u6761\u516c\u544a\u8bb0\u5f55'
};

const statusLabels: Record<string, string> = {
  draft: '\u8349\u7a3f',
  published: '\u5df2\u53d1\u5e03',
  closed: '\u5df2\u5173\u95ed'
};

const methodLabels: Record<string, string> = {
  internal_open: '\u5185\u90e8\u516c\u5f00',
  comparison: '\u8be2\u4ef7\u6bd4\u9009',
  open_tender: '\u516c\u5f00\u62db\u6807',
  invited_tender: '\u9080\u8bf7\u62db\u6807',
  direct_purchase: '\u76f4\u63a5\u91c7\u8d2d'
};

const scopeLabels: Record<string, string> = {
  public_internal: '\u5185\u90e8\u516c\u5f00',
  invited_suppliers: '\u5b9a\u5411\u9080\u8bf7'
};

function formatDateTime(value?: string | null) {
  return value ? value.replace('T', ' ').replace('.000Z', '').slice(0, 16) : '-';
}

function labelOf(value: string | undefined, labels: Record<string, string>) {
  if (!value) return '-';
  return labels[value] ?? value;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'outline' {
  if (status === 'published') return 'success';
  if (status === 'draft') return 'warning';
  if (status === 'closed') return 'danger';
  return 'outline';
}

export function AnnouncementInvitationView() {
  const { currentUser, currentProjectId, setCurrentProjectId, setCurrentView } = useApp();
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [documents, setDocuments] = useState<ApiProcurementDocument[]>([]);
  const [invitations, setInvitations] = useState<ApiSupplierInvitation[]>([]);
  const [requests, setRequests] = useState<ApiProcurementRequest[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AnnouncementRow | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [announcementData, projectData, documentData, invitationData, requestData] = await Promise.all([
        apiGet<{ announcements: ApiAnnouncement[] }>('/api/announcements', currentUser?.id),
        apiGet<{ projects: ApiProject[] }>('/api/projects', currentUser?.id),
        apiGet<{ procurementDocuments: ApiProcurementDocument[] }>('/api/procurement-documents', currentUser?.id).catch(() => ({ procurementDocuments: [] })),
        apiGet<{ supplierInvitations: ApiSupplierInvitation[] }>('/api/supplier-invitations', currentUser?.id).catch(() => ({ supplierInvitations: [] })),
        apiGet<{ procurementRequests: ApiProcurementRequest[] }>('/api/procurement-requests', currentUser?.id).catch(() => ({ procurementRequests: [] }))
      ]);
      setAnnouncements(announcementData.announcements);
      setProjects(projectData.projects);
      setDocuments(documentData.procurementDocuments ?? []);
      setInvitations(invitationData.supplierInvitations);
      setRequests(requestData.procurementRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [currentUser?.id]);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const requestCodeById = useMemo(() => new Map(requests.map((request) => [request.id, request.code])), [requests]);
  const requestCodeByProjectId = useMemo(
    () => new Map(requests.filter((request) => request.projectId).map((request) => [request.projectId as string, request.code])),
    [requests]
  );
  const invitationCountByAnnouncementId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const invitation of invitations) {
      counts.set(invitation.announcementId, (counts.get(invitation.announcementId) ?? 0) + 1);
    }
    return counts;
  }, [invitations]);

  const rows = useMemo<AnnouncementRow[]>(() => {
    return announcements
      .map((announcement) => ({
        ...announcement,
        project: projectById.get(announcement.projectId),
        sourceRequestCode:
          requestCodeById.get(projectById.get(announcement.projectId)?.sourceRequestId ?? '') ?? requestCodeByProjectId.get(announcement.projectId),
        invitationCount: invitationCountByAnnouncementId.get(announcement.id) ?? 0
      }))
      .sort((a, b) => (b.publishedAt ?? b.createdAt ?? b.id).localeCompare(a.publishedAt ?? a.createdAt ?? a.id));
  }, [announcements, invitationCountByAnnouncementId, projectById, requestCodeById, requestCodeByProjectId]);

  const currentProject = useMemo(
    () => (currentProjectId ? projectById.get(currentProjectId) ?? null : null),
    [currentProjectId, projectById]
  );

  const projectRows = useMemo(
    () => (currentProjectId ? rows.filter((row) => row.projectId === currentProjectId) : rows),
    [currentProjectId, rows]
  );

  const activeProjectAnnouncement = useMemo(
    () => projectRows.find((row) => row.status !== 'closed') ?? null,
    [projectRows]
  );

  const lockedDocuments = useMemo(() => {
    if (!currentProjectId) return [];
    return documents
      .filter((item) => item.projectId === currentProjectId && item.status === 'locked')
      .sort((left, right) => String(right.lockedAt ?? right.updatedAt ?? right.id).localeCompare(String(left.lockedAt ?? left.updatedAt ?? left.id)));
  }, [currentProjectId, documents]);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return projectRows;
    return projectRows.filter((row) =>
      [
        row.id,
        row.title,
        row.documentId,
        row.projectId,
        row.project?.id,
        row.project?.code,
        row.sourceRequestCode,
        row.project?.sourceRequestId,
        row.project?.sourceRequestTitle,
        row.project?.displayName,
        row.project?.name,
        row.project?.buyer
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [projectRows, query]);

  const handleCreateAnnouncement = async () => {
    if (!currentProjectId) {
      setMessage(copy.createHint);
      return;
    }
    if (activeProjectAnnouncement) {
      setMessage(`当前项目已存在公告 ${activeProjectAnnouncement.id}，请直接在列表中继续处理。`);
      return;
    }
    const document = lockedDocuments[0];
    if (!document) {
      setError('请先在采购文件页面发布并锁定当前项目的采购文件，再起草公告。');
      return;
    }
    const currentRequestCode = requestCodeByProjectId.get(currentProjectId);
    const projectTitle = currentProject?.displayName ?? currentProject?.name ?? currentProject?.code ?? currentProjectId;
    const projectType = String(currentProject?.type ?? '').toLowerCase();
    const quoteDeadlineAt = currentProject?.quoteDeadlineAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const registrationDeadlineAt = new Date(new Date(quoteDeadlineAt).getTime() - 24 * 60 * 60 * 1000).toISOString();

    setBusyId('create');
    setMessage('');
    setError('');
    try {
      const result = await apiPost<{ announcement?: ApiAnnouncement }>(
        `/api/projects/${encodeURIComponent(currentProjectId)}/announcements`,
        {
          documentId: document.id,
          title: `${currentRequestCode ?? currentProject?.code ?? currentProjectId} ${projectTitle}公告`,
          procurementMethod: projectType === 'comparison' ? 'comparison' : 'internal_open',
          methodFields:
            projectType === 'comparison'
              ? { priceRounds: 1, deliveryWindow: '7天' }
              : { bidBondRequired: false, openingLocation: currentProject?.orgName ?? '集团采购中心' },
          scope: 'public_internal',
          registrationDeadlineAt,
          quoteDeadlineAt
        },
        currentUser?.id
      );
      setMessage(`已为 ${currentProject?.code ?? currentProjectId} 起草公告 ${result.announcement?.id ?? ''}`.trim());
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadFailed);
    } finally {
      setBusyId('');
    }
  };

  const handlePublish = async (announcementId: string) => {
    setBusyId(announcementId);
    setMessage('');
    setError('');
    try {
      await apiPost(`/api/announcements/${encodeURIComponent(announcementId)}/publish`, {}, currentUser?.id);
      setMessage(`${copy.publishedPrefix}${announcementId}`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadFailed);
    } finally {
      setBusyId('');
    }
  };

  const handleOpenProject = (projectId: string) => {
    setCurrentProjectId(projectId);
    setCurrentView('PROJECT_DETAIL');
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#006666]" />
            {copy.title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {currentProject
              ? `当前项目：${currentProject.code} / ${currentProject.displayName ?? currentProject.name ?? currentProject.id}`
              : copy.description}
          </p>
        </div>
        <div className="flex gap-3">
          {currentProjectId ? (
            <Button
              variant="outline"
              onClick={() => {
                setCurrentProjectId(currentProjectId);
                setCurrentView('PROJECT_DETAIL');
              }}
            >
              返回项目详情
            </Button>
          ) : null}
          <Button variant="outline" className="gap-2" onClick={() => void reload()} disabled={loading}>
            <RefreshCw className="w-4 h-4" /> {copy.refresh}
          </Button>
          <Button
            data-ui-check="announcement-create"
            className="bg-[#006666] hover:bg-[#005252] text-white"
            onClick={() => void handleCreateAnnouncement()}
            disabled={busyId === 'create' || Boolean(activeProjectAnnouncement)}
          >
            {copy.create}
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <Card>
        <CardContent className="p-0">
          <div className="flex gap-3 p-4 border-b border-slate-100">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" /> {copy.ruleFilter}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table data-ui-check="announcement-real-data-table" className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4">{copy.numberType}</th>
                  <th className="px-6 py-4">{copy.announcementTitle}</th>
                  <th className="px-6 py-4">{copy.project}</th>
                  <th className="px-6 py-4">{copy.deadlines}</th>
                  <th className="px-6 py-4">{copy.status}</th>
                  <th className="px-6 py-4">{copy.invitations}</th>
                  <th className="px-6 py-4 text-right">{copy.operation}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-500" colSpan={7}>{copy.loading}</td>
                  </tr>
                ) : filteredRows.length ? filteredRows.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 group">
                    <td className="px-6 py-4">
                      <div className="font-medium">{item.id}</div>
                      <div className="text-xs text-slate-500">{labelOf(item.procurementMethod, methodLabels)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{copy.document}: {item.documentId}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="font-medium text-slate-800">{item.project?.code ?? item.projectId}</div>
                      <div className="text-xs text-slate-500 mt-1">{item.sourceRequestCode ?? item.project?.sourceRequestId ?? item.project?.name ?? '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{copy.registerDeadline}: {formatDateTime(item.registrationDeadlineAt)}</div>
                      <div className="text-xs text-slate-500 mt-1">{copy.quoteDeadline}: {formatDateTime(item.quoteDeadlineAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant(item.status)}>{labelOf(item.status, statusLabels)}</Badge>
                      <div className="text-xs text-slate-500 mt-1">{labelOf(item.scope, scopeLabels)}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.invitationCount}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(item)}>{copy.detail}</Button>
                        {item.status === 'draft' ? (
                          <Button variant="brand" size="sm" disabled={busyId === item.id} onClick={() => void handlePublish(item.id)}>
                            {copy.publish}
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm" onClick={() => handleOpenProject(item.projectId)}>{copy.projectWorkbench}</Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-500" colSpan={7}>{copy.empty}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 text-sm text-slate-500">
            {copy.countPrefix}{filteredRows.length}{copy.countSuffix}
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelected(null)} aria-label={copy.close}></button>
          <div className="relative w-[420px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="p-4 border-b flex justify-between bg-slate-50">
              <h3 className="font-medium flex items-center gap-2"><Megaphone className="w-5 h-5" />{copy.detail}</h3>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div><span className="text-slate-500">{copy.announcementTitle}: </span>{selected.title}</div>
              <div><span className="text-slate-500">{copy.project}: </span>{selected.project?.displayName ?? selected.project?.code ?? selected.projectId}</div>
              <div><span className="text-slate-500">{copy.scope}: </span>{labelOf(selected.scope, scopeLabels)}</div>
              <div><span className="text-slate-500">{copy.status}: </span>{labelOf(selected.status, statusLabels)}</div>
              <div><span className="text-slate-500">{copy.createdAt}: </span>{formatDateTime(selected.createdAt)}</div>
              <div><span className="text-slate-500">{copy.publishedAt}: </span>{formatDateTime(selected.publishedAt)}</div>
              <div><span className="text-slate-500">{copy.registerDeadline}: </span>{formatDateTime(selected.registrationDeadlineAt)}</div>
              <div><span className="text-slate-500">{copy.quoteDeadline}: </span>{formatDateTime(selected.quoteDeadlineAt)}</div>
            </div>
            <div className="p-4 border-t mt-auto">
              <Button className="w-full" variant="outline" onClick={() => setSelected(null)}>{copy.close}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
