import React from "react";
import {
  Activity,
  AlertCircle,
  Archive,
  Bell,
  Building,
  Check,
  CheckSquare,
  Clock,
  Edit2,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  HandCoins,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Megaphone,
  PackageSearch,
  PenTool,
  RotateCcw,
  Settings,
  Shield,
  ShieldAlert,
  Store,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/Card";
import { cn } from "./lib/utils";

export interface GeminiNavItem {
  id: string;
  label: string;
  to: string;
}

export interface GeminiTodoRow {
  status: string;
  title: string;
  code: string;
  deadline: string;
  to: string;
}

export interface GeminiDashboardProps {
  userName: string;
  roleLabel: string;
  organization: string;
  navItems: GeminiNavItem[];
  quickActions: GeminiNavItem[];
  todoRows: GeminiTodoRow[];
  updatedAt: string;
  kpis: {
    todo: number;
    quoteDeadline: number;
    review: number;
    abnormal: number;
  };
  canResetRuntimeData?: boolean;
  resettingData?: boolean;
  resetMessage?: string;
  onResetRuntimeData?: () => void;
  onNavigate: (to: string) => void;
  onLogout: () => void;
}

const iconMap: Array<[RegExp, React.ReactNode]> = [
  [/工作台|dashboard/i, <LayoutDashboard className="w-5 h-5" />],
  [/待办|todo/i, <ListTodo className="w-5 h-5" />],
  [/消息|message/i, <Bell className="w-5 h-5" />],
  [/审批|approval|定标/i, <FileCheck className="w-5 h-5" />],
  [/申请|文件|报名|报价|document|bidding/i, <FileText className="w-5 h-5" />],
  [/项目|project/i, <FolderKanban className="w-5 h-5" />],
  [/公告|邀请|announcement/i, <Megaphone className="w-5 h-5" />],
  [/评审|专家|评分|review|scoring/i, <Users className="w-5 h-5" />],
  [/模板|template/i, <PenTool className="w-5 h-5" />],
  [/供应商|supplier/i, <Building className="w-5 h-5" />],
  [/商品|目录|mall|catalog/i, <Store className="w-5 h-5" />],
  [/订单|履约|order/i, <PackageSearch className="w-5 h-5" />],
  [/结算|付款|payment|settlement/i, <HandCoins className="w-5 h-5" />],
  [/档案|审计|日志|audit|archive/i, <Archive className="w-5 h-5" />],
  [/集成|系统|权限|配置|settings|permission/i, <Settings className="w-5 h-5" />]
];

function navIcon(item: GeminiNavItem) {
  return iconMap.find(([pattern]) => pattern.test(`${item.label} ${item.id} ${item.to}`))?.[1] ?? <Activity className="w-5 h-5" />;
}

function SmartRiskPanel() {
  const risks = [
    {
      id: "RSK-001",
      type: "价格偏离异常",
      description: "客房洗涤用品标段，江苏优选酒店用品报价低于历史均价 35%，存在低价冲标风险。",
      icon: <TrendingUp className="w-4 h-4 text-rose-500" />,
      time: "10分钟前"
    },
    {
      id: "RSK-002",
      type: "供应商关联预警",
      description: "北京宏利达与北京鑫鑫科技存在潜在企业图谱交叉持股关联。",
      icon: <Users className="w-4 h-4 text-rose-500" />,
      time: "1小时前"
    },
    {
      id: "RSK-003",
      type: "履约逾期风险",
      description: "项目 PROJ-2026-002 已超期未提交结算材料，且历史履约有延迟记录。",
      icon: <Activity className="w-4 h-4 text-amber-500" />,
      time: "3小时前"
    }
  ];

  return (
    <Card data-ui-check="risk-panel surface" className="h-full border-rose-100/50 bg-gradient-to-br from-white to-rose-50/20">
      <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-100 text-rose-600 rounded">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <CardTitle className="text-base font-semibold">AI 智能风控预警</CardTitle>
        </div>
        <Badge variant="danger">3项高优风险</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {risks.map((risk) => (
            <div key={risk.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  {risk.icon}
                  <span className="font-medium text-sm text-slate-800">{risk.type}</span>
                </div>
                <span className="text-xs text-slate-400">{risk.time}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2 pl-6">{risk.description}</p>
              <div className="pl-6 mt-3 flex gap-2">
                <button className="text-xs text-[#006666] hover:underline">查看分析报告</button>
                <button className="text-xs text-slate-400 hover:text-slate-600">忽略此项</button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function GeminiDashboardApp(props: GeminiDashboardProps) {
  const activePath = "/";
  const quickActions = props.quickActions.slice(0, 4);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  return (
    <div className="h-screen overflow-hidden bg-[#F5F7FA] text-slate-900 font-sans">
      <div className="hidden">
        <span className="text-[18px] text-slate-950">G-Hotel Enterprise Procurement Platform</span>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-7 text-sm font-semibold text-slate-900">
          <button className="px-4 h-10 rounded-2xl border border-slate-200 bg-white">↗ Remix</button>
          <button>▣ Device</button>
          <button>↕</button>
          <button>⌗</button>
        </div>
      </div>

      <div data-ui-check="shell" className="flex h-screen bg-[#F5F7FA] overflow-hidden text-slate-900 font-sans">
        <aside
          data-ui-check="sidebar"
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[220px] bg-[#006666] text-slate-300 flex flex-col shrink-0 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            type="button"
            aria-label="关闭导航菜单"
            className="absolute right-3 top-3 p-1 text-[#b3d1d1] hover:text-white lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="h-14 flex items-center px-5 border-b border-[#005252]">
            <Shield className="w-5 h-5 text-amber-500 mr-2" />
            <span className="font-semibold text-white tracking-wide text-sm">集团内部采购规范化平台</span>
          </div>

          <div className="p-5 border-b border-[#005252]">
            <div className="font-medium text-white mb-1 text-sm">{props.roleLabel}</div>
            <div className="text-xs text-[#80b3b3] truncate">{props.userName}</div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1">
              {props.navItems.map((item) => {
                const isActive = item.to === activePath;
                return (
                  <li key={`${item.id}-${item.to}`}>
                    <button
                      onClick={() => {
                        props.onNavigate(item.to);
                        setMobileSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center px-5 py-3 text-sm font-medium transition-colors relative",
                        isActive ? "bg-[#005252] text-white" : "text-[#b3d1d1] hover:bg-[#005252]/50 hover:text-white"
                      )}
                    >
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFC107]" />}
                      <span data-ui-check="nav-icon" className={cn("mr-3", isActive ? "text-[#FFC107]" : "")}>{navIcon(item)}</span>
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-[#005252]">
            <button onClick={props.onLogout} className="w-full flex items-center px-3 py-2 text-sm font-medium text-[#b3d1d1] hover:text-white transition-colors">
              <LogOut className="w-5 h-5 mr-3" />
              退出登录
            </button>
          </div>
        </aside>

        {mobileSidebarOpen ? (
          <button
            type="button"
            aria-label="关闭导航菜单"
            className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}

        <main data-ui-check="main" className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header data-ui-check="topbar" className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 lg:px-6 shrink-0 z-30 shadow-sm relative">
            <div className="flex min-w-0 items-center text-sm text-slate-500">
              <button
                type="button"
                aria-label="打开导航菜单"
                className="mr-2 shrink-0 rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-[#006666] lg:hidden"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="hidden font-medium text-slate-700 sm:inline">{props.roleLabel}</span>
              <span className="mx-2 hidden sm:inline">/</span>
              <span className="text-[#006666] font-medium">工作台</span>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:gap-5">
              <button data-ui-check="bell-button" className="relative text-slate-400 hover:text-slate-600 transition-colors" onClick={() => props.onNavigate("/messages")}>
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
              <div className="hidden h-6 w-px bg-slate-200 sm:block" />
              <div data-ui-check="role-switch" className="hidden text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200 sm:block">{props.organization}</div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#006666] text-white flex items-center justify-center font-medium text-sm">{props.userName.charAt(0)}</div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
            <div className="mx-auto" style={{ maxWidth: "1440px" }}>
              <div data-ui-check="dashboard" className="space-y-6">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-slate-900">工作台概览</h2>
                  <div className="text-sm text-slate-500 flex items-center gap-3 flex-wrap justify-end">
                    <span>更新时间: {props.updatedAt}</span>
                    {props.canResetRuntimeData && props.onResetRuntimeData ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={props.resettingData}
                        onClick={props.onResetRuntimeData}
                        className="shrink-0"
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        {props.resettingData ? "正在恢复" : "恢复初始业务数据"}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {props.resetMessage ? (
                  <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {props.resetMessage}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card data-ui-check="summary-card" className="border-l-4 border-l-[#006666]">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-1">我的待办事项</p>
                          <p className="text-3xl font-bold text-slate-900">
                            {props.kpis.todo}
                            <span className="text-sm font-normal text-slate-500 ml-1">项</span>
                          </p>
                        </div>
                        <div className="p-2 bg-slate-50 text-[#006666] rounded-md">
                          <CheckSquare className="w-5 h-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-ui-check="summary-card">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-1">今日截止报价项目</p>
                          <p className="text-3xl font-bold text-slate-900">
                            {props.kpis.quoteDeadline}
                            <span className="text-sm font-normal text-slate-500 ml-1">个</span>
                          </p>
                        </div>
                        <div className="p-2 bg-slate-50 text-[#FFC107] rounded-md">
                          <Clock className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-xs">
                        <Badge variant="warning">需密切关注</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-ui-check="summary-card">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-slate-500 mb-1">待评审/定标项目</p>
                          <p className="text-3xl font-bold text-slate-900">
                            {props.kpis.review}
                            <span className="text-sm font-normal text-slate-500 ml-1">个</span>
                          </p>
                        </div>
                        <div className="p-2 bg-slate-50 text-blue-600 rounded-md">
                          <Users className="w-5 h-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-ui-check="summary-card" className="border-rose-100 bg-rose-50/30">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-rose-600 mb-1">异常履约/违约告警</p>
                          <p className="text-3xl font-bold text-rose-600">
                            {props.kpis.abnormal}
                            <span className="text-sm font-normal text-rose-600/70 ml-1">起</span>
                          </p>
                        </div>
                        <div className="p-2 bg-rose-100 text-rose-600 rounded-md">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-xs">
                        <Badge variant="danger">立即处理</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div data-ui-check="template-a-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div data-ui-check="template-a-flow" className="lg:col-span-8">
                    <Card data-ui-check="surface todo-surface" className="h-full">
                      <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-slate-100">
                        <CardTitle className="text-base font-semibold">高优待处理任务</CardTitle>
                        <Button variant="ghost" size="sm" className="text-[#006666] hover:text-[#005252]" onClick={() => props.onNavigate("/my-tasks")}>
                          查看全部 →
                        </Button>
                      </CardHeader>
                      <div data-ui-check="table-wrap" className="overflow-x-auto">
                        <table data-ui-check="table" className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                              <th className="px-5 py-3 rounded-tl-lg">状态</th>
                              <th className="px-5 py-3">任务名称</th>
                              <th className="px-5 py-3">关联项目编号</th>
                              <th className="px-5 py-3">截止时间</th>
                              <th className="px-5 py-3 text-right">操作</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {props.todoRows.slice(0, 4).map((task, index) => (
                              <tr key={`${task.code}-${index}`} className="hover:bg-slate-50/50">
                                <td className="px-5 py-3">
                                  <Badge variant="warning">{task.status}</Badge>
                                </td>
                                <td className="px-5 py-3 font-medium text-slate-900">{task.title}</td>
                                <td className="px-5 py-3 text-slate-500 font-mono text-xs">{task.code}</td>
                                <td className="px-5 py-3 text-slate-500">{task.deadline}</td>
                                <td className="px-5 py-3 text-right">
                                  <Button variant="outline" size="sm" className="text-xs" onClick={() => props.onNavigate(task.to)}>
                                    去处理
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                    <div aria-hidden="true" data-ui-check="template-a-timeline-marker" style={{ height: 1, visibility: "hidden" }} />
                  </div>

                  <div data-ui-check="template-a-side" className="lg:col-span-4">
                    <Card data-ui-check="surface quick-surface" className="h-full">
                      <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold">快捷操作中心</CardTitle>
                        <button className="text-xs text-slate-500 hover:text-[#006666] flex items-center gap-1">
                          <Edit2 className="w-3 h-3" /> 自定义
                        </button>
                      </CardHeader>
                      <CardContent className="p-5">
                        <div className="grid grid-cols-2 gap-3">
                          {quickActions.map((action) => (
                            <Button
                              key={`${action.id}-${action.to}`}
                              variant="outline"
                              data-ui-check="quick-card"
                              className="h-auto py-4 flex flex-col gap-2 items-center justify-center text-slate-600 hover:text-[#006666] hover:border-[#006666] transition-colors"
                              onClick={() => props.onNavigate(action.to)}
                            >
                              <div className="p-2 bg-slate-50 rounded-full">{navIcon(action)}</div>
                              <span className="text-sm font-medium">{action.label}</span>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8">
                    <Card data-ui-check="surface template-a-timeline" className="h-full">
                      <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold">主干项目进度概览 (Gantt)</CardTitle>
                        <span className="text-sm text-slate-500">2个进行中项目</span>
                      </CardHeader>
                      <CardContent className="p-0 overflow-x-auto">
                        <div data-ui-check="gantt-board" className="min-w-[700px] p-5">
                          <div className="flex border-b border-slate-200 pb-2 text-xs font-medium text-slate-500 mb-4">
                            <div className="w-48 shrink-0">项目名称</div>
                            <div className="flex-1 grid grid-cols-4 text-center">
                              <div>1月上旬</div>
                              <div>2月中旬</div>
                              <div>3月下旬</div>
                              <div>4月以后</div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center text-sm">
                              <div className="w-48 shrink-0 pr-4 truncate font-medium text-slate-700">
                                <span className="inline-block w-2 h-2 bg-[#FFC107] rounded-full mr-2" />
                                客房毛巾年度采购
                              </div>
                              <div className="flex-1 relative h-6 bg-slate-100 rounded-full overflow-hidden">
                                <div className="absolute top-0 bottom-0 left-[10%] w-[40%] bg-[#006666] rounded-full opacity-20" />
                                <div className="absolute top-0 bottom-0 left-[10%] w-[25%] bg-[#006666] rounded-full flex items-center px-3 text-xs text-white">需求提报阶段</div>
                              </div>
                            </div>
                            <div className="flex items-center text-sm">
                              <div className="w-48 shrink-0 pr-4 truncate font-medium text-slate-700">
                                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2" />
                                清洁服务外包
                              </div>
                              <div className="flex-1 relative h-6 bg-slate-100 rounded-full overflow-hidden">
                                <div className="absolute top-0 bottom-0 left-[30%] w-[50%] bg-[#006666] rounded-full opacity-20" />
                                <div className="absolute top-0 bottom-0 left-[30%] w-[10%] bg-[#006666] rounded-full flex items-center px-3 text-xs text-white">定标中</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="lg:col-span-4">
                    <SmartRiskPanel />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
