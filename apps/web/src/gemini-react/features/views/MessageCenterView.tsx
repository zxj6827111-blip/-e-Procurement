import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent, CardHeader } from '../../shared/ui/Card';
import { Bell, ExternalLink, FileText, Filter, Search, X } from 'lucide-react';
import { formatDateTime, loadNotifications, markNotificationRead, markNotificationsRead } from './workflow-runtime';
import type { R8WorkflowNotificationView } from '../../../api/workflow';

type ReadFilter = 'all' | 'unread' | 'read';

export function MessageCenterView() {
  const { currentUser, navigateToPath } = useApp();
  const [messages, setMessages] = useState<R8WorkflowNotificationView[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<R8WorkflowNotificationView | null>(null);
  const [keyword, setKeyword] = useState('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!currentUser?.id) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setMessages(await loadNotifications(currentUser.id));
    } catch (err) {
      setMessages([]);
      setError(err instanceof Error ? err.message : '消息中心加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentUser?.id]);

  const filteredMessages = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return messages.filter((message) => {
      const matchesRead =
        readFilter === 'all' || (readFilter === 'read' ? message.read : !message.read);
      const matchesKeyword =
        !text ||
        [message.title, message.contentSummary, message.businessTypeLabel, message.eventTypeLabel, message.businessId]
          .join(' ')
          .toLowerCase()
          .includes(text);
      return matchesRead && matchesKeyword;
    });
  }, [keyword, messages, readFilter]);

  const openMessage = async (message: R8WorkflowNotificationView) => {
    if (!currentUser?.id) return;
    try {
      const updated = message.read ? message : await markNotificationRead(message.id, currentUser.id);
      setMessages((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedMessage(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '消息读取失败');
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.id) return;
    const pendingIds = messages.filter((item) => !item.read).map((item) => item.id);
    if (!pendingIds.length) return;
    setBusy(true);
    setError('');
    try {
      const updatedItems = await markNotificationsRead(pendingIds, currentUser.id);
      const updatedMap = new Map(updatedItems.map((item) => [item.id, item]));
      setMessages((items) => items.map((item) => updatedMap.get(item.id) ?? item));
      if (selectedMessage && updatedMap.has(selectedMessage.id)) {
        setSelectedMessage(updatedMap.get(selectedMessage.id) ?? selectedMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '消息批量已读失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Bell className="h-6 w-6 text-[#006666]" />
            消息中心
          </h2>
          <p className="mt-1 text-sm text-slate-500">查看真实流程通知、审批提醒和项目事件消息。</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            刷新
          </Button>
          <Button className="bg-[#006666] text-white hover:bg-[#005252]" onClick={() => void handleMarkAllRead()} disabled={busy || loading}>
            <Bell className="mr-2 h-4 w-4" />
            全部标记已读
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <Card>
        <CardHeader className="border-b border-slate-100 py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="输入标题、内容、业务编号搜索"
                className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-4 text-sm focus:border-[#006666] focus:outline-none focus:ring-2 focus:ring-[#006666]/20"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter className="h-4 w-4" />
              <select
                value={readFilter}
                onChange={(event) => setReadFilter(event.target.value as ReadFilter)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#006666]"
              >
                <option value="all">全部状态</option>
                <option value="unread">未读</option>
                <option value="read">已读</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 font-medium text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-6 py-4">消息类型</th>
                  <th className="border-b border-slate-200 px-6 py-4">标题 / 内容</th>
                  <th className="border-b border-slate-200 px-6 py-4">关联业务</th>
                  <th className="border-b border-slate-200 px-6 py-4">发送时间</th>
                  <th className="border-b border-slate-200 px-6 py-4">状态</th>
                  <th className="border-b border-slate-200 px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      正在加载消息...
                    </td>
                  </tr>
                ) : filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <FileText className="mx-auto mb-3 h-8 w-8 opacity-20" />
                      暂无相关消息
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map((message) => (
                    <tr key={message.id} className="group transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-slate-900">{message.eventTypeLabel}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{message.title}</div>
                        <div className="mt-1 text-slate-500">{message.contentSummary}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div>{message.businessTypeLabel}</div>
                        <div className="mt-1 text-xs text-slate-400">{message.businessId}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{formatDateTime(message.createdAt)}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            message.read ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {message.read ? '已读' : '未读'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                          <button className="text-xs font-medium text-[#006666] hover:text-[#005252]" onClick={() => void openMessage(message)}>
                            查看详情
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <div>共 {filteredMessages.length} 条消息</div>
        <div>当前展示全部结果</div>
      </div>

      {selectedMessage ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedMessage(null)} />
          <div className="relative flex h-full w-[420px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
              <h3 className="flex items-center gap-2 font-medium text-slate-900">
                <Bell className="h-5 w-5 text-[#006666]" />
                消息详情
              </h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setSelectedMessage(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">标题</h4>
                <div className="text-sm font-medium text-slate-900">{selectedMessage.title}</div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">类型</h4>
                <div className="text-sm text-slate-700">{selectedMessage.eventTypeLabel}</div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">时间</h4>
                <div className="text-sm text-slate-700">{formatDateTime(selectedMessage.createdAt)}</div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">内容</h4>
                <div className="rounded border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                  {selectedMessage.contentSummary}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">关联业务</h4>
                <div className="space-y-1 text-sm text-slate-700">
                  <div>{selectedMessage.businessTypeLabel}</div>
                  <div className="text-slate-500">{selectedMessage.businessId}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-4">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedMessage(null)}>
                关闭
              </Button>
              <Button className="flex-1" onClick={() => navigateToPath(selectedMessage.targetPath)}>
                <ExternalLink className="mr-2 h-4 w-4" />
                打开业务
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
