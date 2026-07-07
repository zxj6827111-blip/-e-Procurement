import React, { useState } from 'react';
import { useApp, type NotificationMessage } from '../../core/AppContext';
import { Card, CardContent, CardHeader } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Bell, Search, Filter, FileText, ChevronLeft, ChevronRight, X } from 'lucide-react';

export function MessageCenterView() {
  const { notifications: messages, markAllNotificationsRead, markNotificationRead } = useApp();
  const [selectedMessage, setSelectedMessage] = useState<NotificationMessage | null>(null);

  const openMessage = (message: NotificationMessage) => {
    markNotificationRead(message.id);
    setSelectedMessage({ ...message, read: true });
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#006666]" />
            消息中心
          </h2>
          <p className="text-sm text-slate-500 mt-1">查看系统通知、业务提醒与待办消息</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-slate-600">
            <Filter className="w-4 h-4 mr-2" /> 更多筛选
          </Button>
          <Button className="bg-[#006666] hover:bg-[#005252] text-white" onClick={markAllNotificationsRead}>
            <Bell className="w-4 h-4 mr-2" /> 全部标记已读
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader className="py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="输入关键字搜索..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
              />
            </div>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <span>状态筛选:</span>
              <select className="border border-slate-200 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#006666]">
                <option>全部状态</option>
                <option>未读</option>
                <option>已读</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">消息类型</th>
                  <th className="px-6 py-4 border-b border-slate-200">内容</th>
                  <th className="px-6 py-4 border-b border-slate-200">发送时间</th>
                  <th className="px-6 py-4 border-b border-slate-200">状态</th>
                  <th className="px-6 py-4 border-b border-slate-200">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((message) => (
                  <tr key={message.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{message.type}</td>
                    <td className="px-6 py-4 text-slate-600">{message.content}</td>
                    <td className="px-6 py-4 text-slate-600">{message.time}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${message.read ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {message.read ? '已读' : '未读'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-[#006666] hover:text-[#005252] text-xs font-medium" onClick={() => openMessage(message)}>
                          查看详情
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {messages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      暂无相关数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <div>共 {messages.length} 条记录</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-slate-100">1</Button>
          </div>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedMessage(null)} />
          <div className="relative w-[400px] bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#006666]" />
                消息详情
              </h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setSelectedMessage(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">类型</h4>
                <div className="text-sm font-medium text-slate-900">{selectedMessage.type}</div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">时间</h4>
                <div className="text-sm text-slate-600">{selectedMessage.time}</div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">内容详情</h4>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded text-sm text-slate-700 leading-relaxed">
                  {selectedMessage.content}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <Button className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setSelectedMessage(null)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
