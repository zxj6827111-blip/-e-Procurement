import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Download, FilePenLine, FileText, Megaphone, Paperclip, Plus, RotateCcw, Search, Send, Trash2, Upload, X } from 'lucide-react';
import { apiBlob, apiPatch, apiPost, replaceFile, uploadFile, type UploadedFileMetadata } from '../../../api/http';
import { useApp } from '../../core/AppContext';
import {
  AnnouncementRecord,
  ProcurementDocumentRecord,
  formatDateTime,
  humanizeStatus,
  statusBadgeVariant,
  useProjectWorkbenchData
} from './project-workbench-data';

type DocumentEditorMode = 'create' | 'edit' | 'revise';

interface DocumentEditorState {
  mode: DocumentEditorMode;
  document?: ProcurementDocumentRecord;
}

type DocumentAttachment = NonNullable<ProcurementDocumentRecord['attachmentMetadata']>[number];

function buildDefaultDocumentTitle(requestCode: string | undefined, projectName: string) {
  return `${requestCode ?? projectName} 采购文件`;
}

function buildDefaultDocumentSummary(projectName: string, requestPurpose?: string) {
  return requestPurpose?.trim() || `${projectName}的采购范围、报名要求、报价说明与履约条款。`;
}

function formatFileSize(sizeBytes?: number) {
  if (!sizeBytes) return '-';
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ProcurementDocumentView() {
  const { currentProjectId, currentUser, setCurrentProjectId, setCurrentView } = useApp();
  const { workbench, resolvedProjectId, loading, error, reload } = useProjectWorkbenchData(currentProjectId);
  const [selectedDoc, setSelectedDoc] = useState<ProcurementDocumentRecord | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'locked'>('all');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState('');
  const [editor, setEditor] = useState<DocumentEditorState | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorSummary, setEditorSummary] = useState('');
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorError, setEditorError] = useState('');

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
    const source = [...(workbench?.procurementDocuments ?? [])]
      .filter((item) => item.status !== 'voided')
      .filter((item) => statusFilter === 'all' || item.status === statusFilter)
      .sort((left, right) => String(right.updatedAt ?? right.createdAt).localeCompare(String(left.updatedAt ?? left.createdAt)));
    if (!keyword.trim()) return source;
    const normalized = keyword.trim().toLowerCase();
    return source.filter((item) => {
      const announcement = announcementByDocumentId.get(item.id);
      return [item.id, item.title, announcement?.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [announcementByDocumentId, keyword, statusFilter, workbench?.procurementDocuments]);

  function openEditor(mode: DocumentEditorMode, document?: ProcurementDocumentRecord) {
    if (!workbench) return;
    setEditor({ mode, document });
    setEditorTitle(document?.title ?? buildDefaultDocumentTitle(workbench.procurementRequest?.code, workbench.project.name));
    setEditorSummary(document?.contentSummary ?? buildDefaultDocumentSummary(workbench.project.name, workbench.procurementRequest?.purpose));
    setEditorFile(null);
    setEditorError('');
    setNotice(null);
  }

  function closeEditor() {
    if (pendingAction === 'save') return;
    setEditor(null);
    setEditorFile(null);
    setEditorError('');
  }

  async function saveDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || !resolvedProjectId || !workbench || pendingAction === 'save') return;

    const title = editorTitle.trim();
    const contentSummary = editorSummary.trim();
    const existingAttachments = editor.document?.attachmentMetadata ?? [];
    if (!title) {
      setEditorError('请填写采购文件名称。');
      return;
    }
    if (!editorFile && existingAttachments.length === 0) {
      setEditorError('请选择本地采购文件后再保存。');
      return;
    }

    setPendingAction('save');
    setEditorError('');
    setNotice(null);
    try {
      let attachmentMetadata: UploadedFileMetadata[] | DocumentAttachment[] = existingAttachments;
      if (editorFile) {
        const uploadOptions = {
          attachmentKind: 'procurement_document_attachment',
          objectType: 'procurement_document',
          objectId: editor.document?.id ?? `pending-document-${Date.now()}`,
          projectId: resolvedProjectId
        };
        if (editor.mode === 'edit' && existingAttachments[0]?.id) {
          const replaced = await replaceFile(existingAttachments[0].id, editorFile, uploadOptions, currentUser?.id);
          attachmentMetadata = [replaced.file];
        } else {
          const uploaded = await uploadFile(editorFile, uploadOptions, currentUser?.id);
          attachmentMetadata = [uploaded.file];
        }
      }

      if (editor.mode === 'create') {
        await apiPost(
          `/api/projects/${encodeURIComponent(resolvedProjectId)}/procurement-documents`,
          { title, contentSummary, attachmentMetadata },
          currentUser?.id
        );
        setNotice({ tone: 'success', text: `已为 ${workbench.project.code} 创建采购文件草稿。` });
      } else if (editor.document) {
        await apiPatch(
          `/api/procurement-documents/${encodeURIComponent(editor.document.id)}`,
          { title, contentSummary, attachmentMetadata },
          currentUser?.id
        );
        setNotice({
          tone: 'success',
          text: editor.mode === 'revise' ? `已基于 ${editor.document.id} 创建新的修订草稿。` : `采购文件 ${editor.document.id} 已更新。`
        });
      }

      setEditor(null);
      setEditorFile(null);
      reload();
    } catch (saveError) {
      setEditorError(saveError instanceof Error ? saveError.message : '采购文件保存失败。');
    } finally {
      setPendingAction(null);
    }
  }

  async function publishDocument(document: ProcurementDocumentRecord) {
    if (pendingAction) return;
    if (!document.attachmentMetadata?.length) {
      setNotice({ tone: 'error', text: '请先编辑草稿并上传采购文件，再进行发布锁定。' });
      return;
    }
    setPendingAction(`publish:${document.id}`);
    setNotice(null);
    try {
      await apiPost(`/api/procurement-documents/${encodeURIComponent(document.id)}/publish`, {}, currentUser?.id);
      setNotice({ tone: 'success', text: `采购文件 ${document.id} 已发布并锁定。` });
      reload();
    } catch (publishError) {
      setNotice({ tone: 'error', text: publishError instanceof Error ? publishError.message : '采购文件发布失败。' });
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteDraft(document: ProcurementDocumentRecord) {
    if (document.status !== 'draft' || pendingAction) return;
    if (!window.confirm(`确认删除草稿“${document.title}”吗？系统会保留审计记录，但该草稿将不再出现在业务列表中。`)) return;
    setPendingAction(`delete:${document.id}`);
    setNotice(null);
    try {
      await apiPost(
        `/api/procurement-documents/${encodeURIComponent(document.id)}/void`,
        { reason: `采购经办删除草稿：${document.title}` },
        currentUser?.id
      );
      setSelectedDoc(null);
      setNotice({ tone: 'success', text: `草稿 ${document.id} 已删除，并保留审计记录。` });
      reload();
    } catch (deleteError) {
      setNotice({ tone: 'error', text: deleteError instanceof Error ? deleteError.message : '采购文件草稿删除失败。' });
    } finally {
      setPendingAction(null);
    }
  }

  async function downloadAttachment(attachment: DocumentAttachment) {
    if (!attachment.id || downloadingFileId) return;
    setDownloadingFileId(attachment.id);
    setNotice(null);
    try {
      const blob = await apiBlob(`/api/files/${encodeURIComponent(attachment.id)}/download`, currentUser?.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName || `${attachment.id}.bin`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setNotice({ tone: 'error', text: downloadError instanceof Error ? downloadError.message : '采购文件下载失败。' });
    } finally {
      setDownloadingFileId('');
    }
  }

  if (loading && !workbench) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">采购文件加载中...</div>;
  }

  if (error && !workbench) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-rose-700">{error}</div>;
  }

  if (!workbench || !resolvedProjectId) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-500">当前没有可查看的采购项目。</div>;
  }

  const editorExistingAttachments = editor?.document?.attachmentMetadata ?? [];
  const editorHeading = editor?.mode === 'create' ? '起草采购文件' : editor?.mode === 'revise' ? '创建修订版本' : '编辑采购文件';
  const hasLockedDocument = workbench.procurementDocuments.some((document) => document.status === 'locked');

  return (
    <div className="relative space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <FileText className="h-6 w-6 text-[#006666]" />
            采购文件
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            当前项目：{workbench.project.code} / {workbench.project.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setCurrentView('PROJECT_DETAIL')}>
            返回项目详情
          </Button>
          {hasLockedDocument ? (
            <Button
              variant="outline"
              onClick={() => {
                setCurrentProjectId(resolvedProjectId);
                setCurrentView('ANNOUNCEMENT');
              }}
            >
              <Megaphone className="mr-2 h-4 w-4" />
              发布公告/邀请供应商
            </Button>
          ) : null}
          <Button variant="brand" onClick={() => openEditor('create')} disabled={Boolean(pendingAction)}>
            <Plus className="mr-2 h-4 w-4" />
            起草文件
          </Button>
        </div>
      </div>

      {notice ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
          role="status"
        >
          {notice.text}
        </div>
      ) : null}

      <Card>
        <CardHeader className="border-b border-slate-100 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索文件编号、标题或公告..."
                className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-4 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                aria-label="文件状态筛选"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
              >
                <option value="all">全部状态</option>
                <option value="draft">草稿</option>
                <option value="locked">已发布</option>
              </select>
              <div className="whitespace-nowrap text-sm text-slate-500">共 {documents.length} 份文件</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-6 py-4">文件编号 / 标题</th>
                  <th className="border-b border-slate-200 px-6 py-4">附件</th>
                  <th className="border-b border-slate-200 px-6 py-4">关联公告</th>
                  <th className="border-b border-slate-200 px-6 py-4">更新时间</th>
                  <th className="border-b border-slate-200 px-6 py-4">状态</th>
                  <th className="border-b border-slate-200 px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((document) => {
                  const announcement = announcementByDocumentId.get(document.id);
                  const attachmentCount = document.attachmentMetadata?.length ?? 0;
                  const isPublishing = pendingAction === `publish:${document.id}`;
                  const isDeleting = pendingAction === `delete:${document.id}`;
                  return (
                    <tr key={document.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{document.title}</div>
                        <div className="text-xs text-slate-500">
                          {document.id} · V{document.versionNo}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className={`inline-flex items-center gap-1 ${attachmentCount ? 'text-slate-700' : 'text-amber-700'}`}>
                          <Paperclip className="h-4 w-4" />
                          {attachmentCount ? `${attachmentCount} 个附件` : '待上传'}
                        </span>
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
                        <div className="flex min-w-max flex-wrap items-center gap-x-3 gap-y-2">
                          <button className="text-xs font-medium text-[#006666] hover:text-[#005252]" onClick={() => setSelectedDoc(document)}>
                            查看详情
                          </button>
                          {document.status === 'draft' ? (
                            <>
                              <button
                                className="inline-flex items-center text-xs font-medium text-[#006666] hover:text-[#005252]"
                                onClick={() => openEditor('edit', document)}
                                disabled={Boolean(pendingAction)}
                              >
                                <FilePenLine className="mr-1 h-3.5 w-3.5" />
                                编辑/上传
                              </button>
                              <button
                                className="inline-flex items-center text-xs font-medium text-[#006666] hover:text-[#005252] disabled:opacity-50"
                                onClick={() => publishDocument(document)}
                                disabled={Boolean(pendingAction) || attachmentCount === 0}
                                title={attachmentCount ? '发布并锁定采购文件' : '请先上传采购文件'}
                              >
                                <Send className="mr-1 h-3.5 w-3.5" />
                                {isPublishing ? '发布中...' : '发布锁定'}
                              </button>
                              <button
                                className="inline-flex items-center text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                                onClick={() => deleteDraft(document)}
                                disabled={Boolean(pendingAction)}
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                {isDeleting ? '删除中...' : '删除草稿'}
                              </button>
                            </>
                          ) : null}
                          {document.status === 'locked' ? (
                            <button
                              className="inline-flex items-center text-xs font-medium text-[#006666] hover:text-[#005252]"
                              onClick={() => openEditor('revise', document)}
                              disabled={Boolean(pendingAction)}
                            >
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              创建修订版
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
              <div className="px-6 py-12 text-center text-sm text-slate-500">当前筛选条件下没有采购文件记录。</div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {selectedDoc ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" aria-label="关闭文件详情" onClick={() => setSelectedDoc(null)} />
          <div className="relative flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
              <h3 className="flex items-center gap-2 font-medium text-slate-900">
                <FileText className="h-5 w-5 text-[#006666]" />
                文件详情
              </h3>
              <button aria-label="关闭文件详情" className="text-slate-400 hover:text-slate-600" onClick={() => setSelectedDoc(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">文件信息</h4>
                <div className="space-y-2 rounded-md border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  <p><span className="text-slate-500">标题：</span>{selectedDoc.title}</p>
                  <p><span className="text-slate-500">编号：</span>{selectedDoc.id}</p>
                  <p><span className="text-slate-500">版本：</span>V{selectedDoc.versionNo}</p>
                  <p><span className="text-slate-500">状态：</span>{humanizeStatus(selectedDoc.status)}</p>
                  <p><span className="text-slate-500">更新时间：</span>{formatDateTime(selectedDoc.updatedAt)}</p>
                </div>
              </div>

              {selectedDoc.contentSummary ? (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">内容摘要</h4>
                  <div className="rounded-md border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{selectedDoc.contentSummary}</div>
                </div>
              ) : null}

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">采购文件附件</h4>
                <div className="space-y-2">
                  {(selectedDoc.attachmentMetadata ?? []).map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                          <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate">{attachment.fileName}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{formatFileSize(attachment.sizeBytes)} · {formatDateTime(attachment.uploadedAt)}</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAttachment(attachment)}
                        disabled={downloadingFileId === attachment.id}
                        title="下载采购文件"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(selectedDoc.attachmentMetadata?.length ?? 0) === 0 ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">当前草稿还没有上传采购文件。</div>
                  ) : null}
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">关联公告</h4>
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
              {selectedDoc.status === 'draft' ? (
                <Button variant="brand" className="flex-1" onClick={() => { setSelectedDoc(null); openEditor('edit', selectedDoc); }}>
                  <Upload className="mr-2 h-4 w-4" />
                  编辑/上传
                </Button>
              ) : null}
              <Button variant="outline" className="flex-1" onClick={() => setSelectedDoc(null)}>关闭</Button>
            </div>
          </div>
        </div>
      ) : null}

      {editor ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" aria-label="关闭采购文件编辑" onClick={closeEditor} />
          <form className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl" onSubmit={saveDocument}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                <h3 className="font-semibold text-slate-900">{editorHeading}</h3>
                <p className="mt-1 text-xs text-slate-500">填写文件信息并选择本地采购文件，保存后再发布锁定。</p>
              </div>
              <button type="button" aria-label="关闭采购文件编辑" className="text-slate-400 hover:text-slate-600" onClick={closeEditor} disabled={pendingAction === 'save'}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <label className="block text-sm font-medium text-slate-700">
                文件名称
                <input
                  value={editorTitle}
                  onChange={(event) => setEditorTitle(event.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                  maxLength={160}
                  autoFocus
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                文件摘要
                <textarea
                  value={editorSummary}
                  onChange={(event) => setEditorSummary(event.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                本地采购文件
                <span className="ml-2 font-normal text-slate-500">支持 PDF、Word、Excel、图片和 TXT</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => setEditorFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#006666] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#005252]"
                />
              </label>

              {editorFile ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                  <Paperclip className="h-4 w-4" />
                  <span className="min-w-0 flex-1 truncate">{editorFile.name}</span>
                  <span>{formatFileSize(editorFile.size)}</span>
                </div>
              ) : editorExistingAttachments.length ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  当前附件：{editorExistingAttachments.map((attachment) => attachment.fileName).join('、')}
                  {editor.mode === 'edit' ? '；重新选择文件将替换当前附件。' : '；不选择新文件将沿用当前附件。'}
                </div>
              ) : null}

              {editorError ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700" role="alert">{editorError}</div> : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <Button type="button" variant="outline" onClick={closeEditor} disabled={pendingAction === 'save'}>取消</Button>
              <Button type="submit" variant="brand" disabled={pendingAction === 'save'}>
                <Upload className="mr-2 h-4 w-4" />
                {pendingAction === 'save' ? '保存中...' : editor.mode === 'revise' ? '创建修订草稿' : '保存采购文件'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
