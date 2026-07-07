import React, { useState } from 'react';
import { useApp, type TodoItem, type TodoPriority } from '../../core/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { ListTodo, Filter, Search, ArrowRight, ArrowLeft, Save, Archive } from 'lucide-react';
import type { ViewState } from '../../shared/types';

function priorityDot(priority: TodoPriority) {
  if (priority === 'URGENT') return 'bg-rose-500';
  if (priority === 'HIGH') return 'bg-amber-500';
  return 'bg-blue-500';
}

function priorityBadge(priority: TodoPriority) {
  if (priority === 'URGENT') return <Badge variant="danger">紧急</Badge>;
  if (priority === 'HIGH') return <Badge variant="warning">高</Badge>;
  return <Badge variant="default">普通</Badge>;
}

export function TodoView() {
  const { todos, completeTodo, rejectTodo, setCurrentView } = useApp();
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [opinion, setOpinion] = useState('');

  const submitTodo = (todo: TodoItem, nextView?: ViewState) => {
    completeTodo(todo.id);
    setSelectedTodo(null);
    setOpinion('');
    if (nextView) setCurrentView(nextView);
  };

  const returnTodo = (todo: TodoItem, nextView?: ViewState) => {
    rejectTodo(todo.id);
    setSelectedTodo(null);
    setOpinion('');
    if (nextView) setCurrentView(nextView);
  };

  if (selectedTodo) {
    return (
      <div className="h-full flex flex-col space-y-6 max-w-5xl mx-auto pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="p-2 hover:bg-slate-100" onClick={() => setSelectedTodo(null)}>
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-slate-700" />
              任务处理
            </h2>
            <p className="text-sm text-slate-500 mt-1">任务编号: {selectedTodo.id} | {selectedTodo.time}</p>
          </div>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
            <CardTitle className="text-base font-semibold text-slate-800">任务基础信息</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">任务名称</p>
                <p className="text-base font-medium text-slate-900">{selectedTodo.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">关联单据 / 项目</p>
                <p className="text-base font-medium text-slate-900 font-mono">{selectedTodo.target}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">任务发起人</p>
                <p className="text-base font-medium text-slate-900">{selectedTodo.sender}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">任务优先级</p>
                <div>{priorityBadge(selectedTodo.priority)}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">处理状态</p>
                <p className="text-base font-medium text-slate-900">{selectedTodo.statusLabel}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">截止时间</p>
                <p className="text-base font-medium text-slate-900">{selectedTodo.deadline}</p>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-medium text-slate-500 mb-2">任务内容详情与审批意见</p>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-sm leading-relaxed">
                您收到来自 {selectedTodo.sender} 的任务分配：<strong>{selectedTodo.title}</strong>。
                <br /><br />
                请核对关联单据的内容，并根据系统要求进行处理。提交后该任务会从待办列表移除，并进入对应业务页面继续处理。
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">您的处理意见（选填）</label>
              <textarea
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                rows={4}
                value={opinion}
                onChange={(event) => setOpinion(event.target.value)}
                placeholder="请输入同意或驳回的详细意见..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-[220px] right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex justify-end gap-4 pr-12">
          <Button variant="outline" className="px-6 h-11 text-base font-medium min-w-[120px]" onClick={() => setSelectedTodo(null)}>
            取消
          </Button>
          <Button
            variant="outline"
            className="px-6 h-11 text-base font-medium min-w-[120px] border-rose-600 text-rose-600 hover:bg-rose-50"
            onClick={() => returnTodo(selectedTodo, 'TODO')}
          >
            <Archive className="w-5 h-5 mr-2" />
            驳回 / 拒绝
          </Button>
          <Button
            variant="primary"
            className="px-8 h-11 text-base font-bold min-w-[180px]"
            onClick={() => submitTodo(selectedTodo, selectedTodo.nextView)}
          >
            <Save className="w-5 h-5 mr-2" />
            同意并提交
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-ui-check="todo-view" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-slate-700" />
            我的待办任务
          </h2>
          <p className="text-sm text-slate-500 mt-1">集中处理需要您确认、审批或执行的业务，当前共 {todos.length} 条。</p>
        </div>
      </div>

      <Card data-ui-check="todo-list">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50 rounded-t-lg">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索待办标题、业务单号"
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> 状态筛选
          </Button>
        </div>
        <div className="divide-y divide-slate-100">
          {todos.map((todo) => (
            <div data-ui-check="todo-row" key={todo.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${priorityDot(todo.priority)}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{todo.type}</span>
                    <h3 className="font-medium text-slate-900">{todo.title}</h3>
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-3">
                    <span>关联单据: {todo.target}</span>
                    <span className="text-slate-300">|</span>
                    <span>发起人: {todo.sender}</span>
                    <span className="text-slate-300">|</span>
                    <span>到达时间: {todo.time}</span>
                    <span className="text-slate-300">|</span>
                    <span>截止时间: {todo.deadline}</span>
                  </div>
                </div>
              </div>
              <Button variant="primary" size="sm" className="shrink-0 gap-1" onClick={() => setSelectedTodo(todo)}>
                去处理 <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {todos.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              当前暂无待办事项
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
