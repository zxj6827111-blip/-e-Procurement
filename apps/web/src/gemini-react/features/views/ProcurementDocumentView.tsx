import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { FileText, Filter, Search, Send, X } from 'lucide-react';
import { apiPost } from '../../../api/http';
import { useApp } from '../../core/AppContext';
import {
  AnnouncementRecord,
  ProcurementDocumentRecord,
  formatDateTime,
  humanizeStatus,
  statusBadgeVariant,
  useProjectWorkbenchData
} from './project-workbench-data';

function buildDefaultDocumentTitle(requestCode: string | undefined, projectName: string) {
  return `${requestCode ?? projectName} 采购文件`;
}

function buildDefaultDocumentSummary(projectName: string, requestPurpose?: string) {
  return requestPurpose?.trim() || `${projectName}的采购范围、报名要求、报价说明与履约条款。`;
}

export function ProcurementDocumentView() {
  const { currentProjectId, setCurrentProjectId, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading, error, reload } = useProjectWorkbenchData(currentProjectId);
  const [selectedDoc, setSelectedDoc] = useState<ProcurementDocumentRecord | null>(null);
  const [message, setMessage] = useState('');
  const [keyword, setKeyword] = useState('');
  const [pendingAction, setPendingAction] = useState<'create' | string | null>(null);

  useEffect(() => {
    if (!currentProjectId && resolvedProjectId) {
      setCurrentProjectId(resolvedProjectId);
    }
  }, [currentProjectId, resolvedProjectId, setCurrentProjectId]);

  const announcementByDocumentId = useMemo(() => {
    const map = new Map<string, AnnouncementRecord>();
    workbench?.announcements.forEach((item) => {
      if (item.documentId) map.set(item.documentId, item);
    });
    return map;
  }, [workbench]);

  const documents = useMemo(() => {
    const source = [...(workbench?.procurementDocuments ?? [])].sort((left, right) =>
      String(right.updatedAt ?? right.createdAt).localeCompare(String(left.updatedAt ?? left.createdAt))
    );
    if (!keyword.trim()) return source;
    const normalized = keyword.trim().toLowerCase();
    return source.filter((item) => {
      const announcement = announcementByDocumentId.get(item.id);
      return [item.id, item.title, announcement?.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [announcementByDocumentId, keyword, workbench?.procurementDocuments]);

  const createDraft = async () => {
    if (!resolvedProjectId || !workbench) return;
    setPendingAction('create');
    setMessage('');
    try {
      const title = buildDefaultDocumentTitle(workbench.procurementRequest?.code, workbench.project.name);
      const contentSummary = buildDefaultDocumentSummary(workbench.project.name, workbench.procurementRequest?.purpose);
      await apiPost(`/api/projects/${encodeURIComponent(resolvedProjectId)}/procurement-documents`, { title, contentSummary });
      setMessage(`已为 ${workbench.project.code} 新建采购文件草稿。`);
      reload();
    } catch (createError) {
      setMessage(createError instanceof Error ? createError.message : '采购文件草稿创建失败。');
    } finally {
      setPendingAction(null);
    }
  };

  const publishDocument = async (documentId: string) => {
    setPendingAction(documentId);
    setMessage('');
    try {
      await apiPost(`/api/procurement-documents/${encodeURIComponent(documentId)}/publish`, {});
      setMessage(`采购文件 ${documentId} 已发布并锁定。`);
      reload();
    } catch (publishError) {
      setMessage(publishError instanceof Error ? publishError.message : '采购文件发布失败。');
    } finally {
      setPendingAction(null);
    }
  };

  if (loading && !workbench) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">采购文件加载中...</div>;
  }

  if (error && !workbench) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{error}</div>;
  }

  if (!workbench || !resolvedProjectId) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的采购项目。</div>;
  }

  return (
    <div className="relative space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <FileText className="h-6 w-6 text-[#006666]" />
            采购文件
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            当前项目：{workbench.project.code} / {workbench.project.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setCurrentView('PROJECT_DETAIL')}>
            返回项目详情
          </Button>
          <Button variant="outline" className="text-slate-600">
            <Filter className="mr-2 h-4 w-4" />
            状态筛选
          </Button>
          <Button className="bg-[#006666] text-white hover:bg-[#005252]" onClick={createDraft} disabled={pendingAction === 'create'}>
            <FileText className="mr-2 h-4 w-4" />
            {pendingAction === 'create' ? '创建中...' : '起草文件'}
          </Button>
        </div>
      </div>

      {message ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}

      <Card>
        <CardHeader className="border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索文件编号、标题或公告..."
                className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-4 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
              />
            </div>
            <div className="text-sm text-slate-500">共 {documents.length} 份文件</div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-6 py-4">文件编号 / 标题</th>
                  <th className="border-b border-slate-200 px-6 py-4">关联公告</th>
                  <th className="border-b border-slate-200 px-6 py-4">更新时间</th>
                  <th className="border-b border-slate-200 px-6 py-4">状态</th>
                  <th className="border-b border-slate-200 px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((document) => {
                  const announcement = announcementByDocumentId.get(document.id);
                  return (
                    <tr key={document.id} className="group transition-colors hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{document.title}</div>
                        <div className="text-xs text-slate-500">
                          {document.id} · V{document.versionNo}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{announcement?.title ?? '未关联公告'}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <div>{formatDateTime(document.updatedAt)}</div>
                        <div className="text-xs text-slate-400">{document.lockedAt ? `锁定于 ${formatDateTime(document.lockedAt)}` : '尚未锁定'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusBadgeVariant(document.status)}>{humanizeStatus(document.status)}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                          <button className="text-xs font-medium text-[#006666] hover:text-[#005252]" onClick={() => setSelectedDoc(document)}>
                            查看详情
                          </button>
                          {document.status !== 'locked' ? (
                            <button
                              className="inline-flex items-center text-xs font-medium text-[#006666] hover:text-[#005252]"
                              onClick={() => publishDocument(document.id)}
                              disabled={pendingAction === document.id}
                            >
                              <Send className="mr-1 h-3.5 w-3.5" />
                              {pendingAction === document.id ? '发布中...' : '发布锁定'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {documents.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">当前项目还没有采购文件记录。</div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {selectedDoc ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedDoc(null)} />
          <div className="relative flex h-full w-[460px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
              <h3 className="flex items-center gap-2 font-medium text-slate-900">
                <FileText className="h-5 w-5 text-[#006666]" />
                文件详情
              </h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setSelectedDoc(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">文件信息</h4>
                <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  <p>
                    <span className="text-slate-500">标题：</span>
                    {selectedDoc.title}
                  </p>
                  <p>
                    <span className="text-slate-500">编号：</span>
                    {selectedDoc.id}
                  </p>
                  <p>
                    <span className="text-slate-500">版本：</span>
                    V{selectedDoc.versionNo}
                  </p>
                  <p>
                    <span className="text-slate-500">状态：</span>
                    {humanizeStatus(selectedDoc.status)}
                  </p>
                  <p>
                    <span className="text-slate-500">更新时间：</span>
                    {formatDateTime(selectedDoc.updatedAt)}
                  </p>
                </div>
              </div>

              {selectedDoc.contentSummary ? (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">内容摘要</h4>
                  <div className="rounded-md border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{selectedDoc.contentSummary}</div>
                </div>
              ) : null}

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">关联公告</h4>
                <div className="rounded-md border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  {(() => {
                    const announcement = announcementByDocumentId.get(selectedDoc.id);
                    if (!announcement) return '当前文件尚未关联采购公告。';
                    return (
                      <div className="space-y-2">
                        <div className="font-medium text-slate-900">{announcement.title}</div>
                        <div>公告状态：{humanizeStatus(announcement.status)}</div>
                        <div>发布时间：{formatDateTime(announcement.publishedAt ?? announcement.updatedAt)}</div>
                        <div>报价截止：{formatDateTime(announcement.quoteDeadlineAt)}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-4">
              <Button className="flex-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => setSelectedDoc(null)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
