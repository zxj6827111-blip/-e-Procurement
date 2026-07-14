import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, File, Folder, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useApp } from '../../core/AppContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { apiBlob, apiGet, apiPost } from '../../../api/http';
import { formatDateTime, objectTypeLabelMap, statusLabelMap } from '../../../utils/status-labels';

interface FileCenterRecord {
  id: string;
  fileId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  attachmentKind: string;
  objectType: string;
  objectId: string;
  projectId?: string;
  supplierId?: string;
  uploadedBy: string;
  uploadedAt: string;
  versionNo?: number;
  replacedByFileId?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
  previewable?: boolean;
}

type DeletedFilter = 'active' | 'voided' | 'all';
type LoadState = 'idle' | 'loading';

const supplierRoles = new Set(['SUPPLIER', 'SUPPLIER_ADMIN', 'SUPPLIER_BIDDER']);

function formatBytes(value?: number) {
  if (!value || Number.isNaN(value)) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function objectTypeLabel(value?: string) {
  if (!value) return '-';
  return objectTypeLabelMap[value] ?? value;
}

function attachmentKindLabel(value?: string) {
  if (!value) return '-';
  return statusLabelMap[value] ?? value;
}

function fileStatus(file: FileCenterRecord) {
  if (!file.deletedAt) return { label: '有效', variant: 'success' as const };
  if (file.replacedByFileId) return { label: '已替换', variant: 'warning' as const };
  return { label: '已作废', variant: 'danger' as const };
}

function deletedReason(file: FileCenterRecord) {
  if (file.deletedReason) return file.deletedReason;
  if (file.replacedByFileId) return '旧版本已被新文件替换';
  return '文件已作废';
}

function canDiscardFile(file: FileCenterRecord, role?: string, userId?: string) {
  if (!role || !userId || file.deletedAt) return false;
  if (role === 'PROCUREMENT_AGENT' || role === 'PLATFORM_OPERATIONS') return true;
  if (role === 'HOTEL_PROCUREMENT') {
    return file.objectType === 'procurement_request' && file.uploadedBy === userId;
  }
  if (supplierRoles.has(role)) {
    return file.uploadedBy === userId;
  }
  return false;
}

function matchesDeletedFilter(file: FileCenterRecord, filter: DeletedFilter) {
  if (filter === 'all') return true;
  if (filter === 'voided') return Boolean(file.deletedAt);
  return !file.deletedAt;
}

export function FileCenterView() {
  const { currentUser } = useApp();
  const [files, setFiles] = useState<FileCenterRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [searchText, setSearchText] = useState('');
  const [activeObjectType, setActiveObjectType] = useState('all');
  const [attachmentKindFilter, setAttachmentKindFilter] = useState('all');
  const [deletedFilter, setDeletedFilter] = useState<DeletedFilter>('active');
  const [busyFileId, setBusyFileId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadFiles = useCallback(async () => {
    if (!currentUser?.id) {
      setFiles([]);
      return;
    }
    setLoadState('loading');
    setError('');
    try {
      const data = await apiGet<{ files: FileCenterRecord[] }>('/api/files?includeDeleted=true', currentUser.id);
      setFiles(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件中心数据加载失败');
    } finally {
      setLoadState('idle');
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const filesByDeletedFilter = useMemo(
    () => files.filter((file) => matchesDeletedFilter(file, deletedFilter)),
    [files, deletedFilter]
  );

  const objectTypeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const file of filesByDeletedFilter) {
      counts.set(file.objectType, (counts.get(file.objectType) ?? 0) + 1);
    }
    return [
      { value: 'all', label: '全部业务对象', count: filesByDeletedFilter.length },
      ...Array.from(counts.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([value, count]) => ({ value, label: objectTypeLabel(value), count }))
    ];
  }, [filesByDeletedFilter]);

  const attachmentKindOptions = useMemo(() => {
    const kinds = Array.from(new Set(files.map((file) => file.attachmentKind).filter(Boolean)));
    return ['all', ...kinds];
  }, [files]);

  const filteredFiles = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return files
      .filter((file) => matchesDeletedFilter(file, deletedFilter))
      .filter((file) => activeObjectType === 'all' || file.objectType === activeObjectType)
      .filter((file) => attachmentKindFilter === 'all' || file.attachmentKind === attachmentKindFilter)
      .filter((file) => {
        if (!keyword) return true;
        return [
          file.fileName,
          file.objectId,
          file.projectId,
          file.supplierId,
          file.uploadedBy,
          objectTypeLabel(file.objectType),
          attachmentKindLabel(file.attachmentKind)
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      })
      .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime());
  }, [activeObjectType, attachmentKindFilter, deletedFilter, files, searchText]);

  const activeCount = useMemo(() => files.filter((file) => !file.deletedAt).length, [files]);
  const voidedCount = useMemo(() => files.filter((file) => file.deletedAt).length, [files]);

  async function handleDownload(file: FileCenterRecord) {
    if (!currentUser?.id) return;
    setBusyFileId(file.id);
    setError('');
    setMessage('');
    try {
      const blob = await apiBlob(`/api/files/${encodeURIComponent(file.id)}/download`, currentUser.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName || `${file.id}.bin`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(`${file.fileName} 已开始下载。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件下载失败');
    } finally {
      setBusyFileId('');
    }
  }

  async function handleDiscard(file: FileCenterRecord) {
    if (!currentUser?.id) return;
    const confirmed = window.confirm(`确认作废文件“${file.fileName}”吗？作废后将无法继续下载当前版本。`);
    if (!confirmed) return;
    setBusyFileId(file.id);
    setError('');
    setMessage('');
    try {
      await apiPost<{ file: FileCenterRecord | null; auditLogId?: string }>(
        `/api/files/${encodeURIComponent(file.id)}/discard`,
        { reason: `React 文件中心作废：${file.fileName}` },
        currentUser.id
      );
      setMessage(`${file.fileName} 已作废。`);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件作废失败');
    } finally {
      setBusyFileId('');
    }
  }

  return (
    <div data-ui-check="file-center-view" className="flex h-[calc(100vh-120px)] gap-6">
      <div className="w-64 shrink-0 space-y-4">
        <Card className="h-full">
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Folder className="w-5 h-5 text-[#006666]" />
              业务对象
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">只展示当前身份可见的真实附件</p>
          </CardHeader>
          <CardContent className="space-y-1 p-4">
            {objectTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                  activeObjectType === option.value ? 'bg-[#006666]/10 text-[#006666]' : 'text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setActiveObjectType(option.value)}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                <span className="ml-3 text-xs">{option.count}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-500">可见文件</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{files.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-500">有效文件</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-700">{activeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-500">已作废/历史</div>
              <div className="mt-2 text-2xl font-semibold text-amber-700">{voidedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-500">当前筛选结果</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{filteredFiles.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                data-ui-check="file-center-search"
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
                placeholder="搜索文件名、对象编号、项目编号、上传人..."
              />
            </div>
            <select
              data-ui-check="file-center-kind-filter"
              value={attachmentKindFilter}
              onChange={(event) => setAttachmentKindFilter(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
            >
              {attachmentKindOptions.map((item) => (
                <option key={item} value={item}>
                  {item === 'all' ? '全部附件类型' : attachmentKindLabel(item)}
                </option>
              ))}
            </select>
            <select
              data-ui-check="file-center-deleted-filter"
              value={deletedFilter}
              onChange={(event) => setDeletedFilter(event.target.value as DeletedFilter)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
            >
              <option value="active">仅看有效</option>
              <option value="voided">仅看作废/历史</option>
              <option value="all">查看全部</option>
            </select>
            <Button variant="outline" className="gap-2" onClick={() => void loadFiles()} disabled={loadState === 'loading'}>
              <RefreshCw className={`h-4 w-4 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </CardContent>
        </Card>

        {(message || error) ? (
          <div className={`rounded-md border px-4 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {error || message}
          </div>
        ) : null}

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardContent className="min-h-0 flex-1 overflow-auto p-0">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b bg-slate-50 text-slate-600 shadow-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">文件</th>
                  <th className="px-4 py-3 font-medium">归属对象</th>
                  <th className="px-4 py-3 font-medium">附件类型</th>
                  <th className="px-4 py-3 font-medium">上传信息</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-6 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadState === 'loading' ? (
                  <tr>
                    <td className="px-6 py-10 text-center text-slate-500" colSpan={6}>
                      正在加载真实文件列表...
                    </td>
                  </tr>
                ) : filteredFiles.length === 0 ? (
                  <tr>
                    <td className="px-6 py-10 text-center text-slate-500" colSpan={6}>
                      当前筛选条件下没有可显示的文件
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => {
                    const status = fileStatus(file);
                    const canDiscard = canDiscardFile(file, currentUser?.role, currentUser?.id);
                    const downloading = busyFileId === file.id;
                    return (
                      <tr key={file.fileId} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <File className={`mt-0.5 h-5 w-5 shrink-0 ${file.deletedAt ? 'text-slate-300' : 'text-[#006666]'}`} />
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900">{file.fileName}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                {formatBytes(file.sizeBytes)} / 版本 {file.versionNo ?? 1}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">
                          <div className="font-medium text-slate-800">{objectTypeLabel(file.objectType)}</div>
                          <div className="mt-1">对象编号：{file.objectId}</div>
                          {file.projectId ? <div className="mt-1">项目：{file.projectId}</div> : null}
                          {file.supplierId ? <div className="mt-1">供应商：{file.supplierId}</div> : null}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline">{attachmentKindLabel(file.attachmentKind)}</Badge>
                          <div className="mt-2 text-xs text-slate-500">{file.contentType || '-'}</div>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <div className="text-slate-700">{file.uploadedBy || '-'}</div>
                          <div className="mt-1 text-slate-500">{formatDateTime(file.uploadedAt)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {file.deletedAt ? (
                            <div className="mt-2 text-xs text-slate-500">
                              <div>{deletedReason(file)}</div>
                              <div className="mt-1">{formatDateTime(file.deletedAt)}</div>
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-slate-500">
                              {file.previewable ? '图片类附件' : '标准下载附件'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {!file.deletedAt ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 px-2"
                                disabled={downloading}
                                onClick={() => void handleDownload(file)}
                              >
                                <Download className="h-4 w-4" />
                                下载
                              </Button>
                            ) : null}
                            {canDiscard ? (
                              <Button
                                data-ui-check="file-center-discard"
                                variant="ghost"
                                size="sm"
                                className="gap-1 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                disabled={downloading}
                                onClick={() => void handleDiscard(file)}
                              >
                                <Trash2 className="h-4 w-4" />
                                作废
                              </Button>
                            ) : null}
                            {!canDiscard && file.deletedAt ? <span className="text-xs text-slate-400">历史文件</span> : null}
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
      </div>
    </div>
  );
}
