import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../core/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckSquare,
  Clock,
  Edit2,
  FileCheck,
  HandCoins,
  RotateCcw,
  Settings,
  ShieldAlert,
  Store,
  Users
} from 'lucide-react';
import { cn } from '../../shared/lib/utils';
import { type Role, type ViewState } from '../../shared/types';
import { getGovernedMenuItems } from '../../core/governed-menu';
import { apiGet } from '../../../api/http';
import { formatDateTime, labelStatus } from '../../../utils/status-labels';
import { ProcurementAnalytics } from '../components/ProcurementAnalytics';
import { SmartRiskPanel, type SmartRiskItem } from '../components/SmartRiskPanel';

interface ApiProject {
  id: string;
  code?: string;
  name?: string;
  displayName?: string;
  status: string;
  displayStatus?: string;
  category?: string;
  buyer?: string;
  orgName?: string;
  budgetAmount?: number;
  quoteDeadlineAt?: string | null;
  updatedAt?: string;
  dueAt?: string;
  externalTradeFlag?: boolean;
}

interface ApiProduct {
  id: string;
  skuCode?: string;
  name: string;
  category?: string;
  status: string;
  supplierName?: string;
  activePrice?: { salePrice?: number; price?: number } | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiOrder {
  id: string;
  orderNo: string;
  status: string;
  totalAmount?: number;
  paymentStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiSupplier {
  id: string;
  name: string;
  status: string;
  admissionStatus?: string;
  qualification?: string;
  risk?: string;
  admissionReviews?: Array<{ reviewedAt?: string }>;
}

interface ApiAuditLog {
  id: string;
  action: string;
  objectType: string;
  objectId: string;
  result?: string;
  createdAt?: string;
}

interface ApiTask {
  id: string;
  status: string;
  statusLabel?: string;
  title?: string;
  businessTitle?: string;
  businessType?: string;
  businessId?: string;
  projectId?: string;
  dueAt?: string;
  updatedAt?: string;
}

interface DashboardData {
  projects: ApiProject[];
  products: ApiProduct[];
  orders: ApiOrder[];
  suppliers: ApiSupplier[];
  auditLogs: ApiAuditLog[];
  tasks: ApiTask[];
}

type Tone = 'primary' | 'warning' | 'blue' | 'danger' | 'success';

interface KpiCard {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  meta: string;
  tone: Tone;
  icon: 'todo' | 'deadline' | 'review' | 'exception' | 'supplier' | 'catalog' | 'finance' | 'audit' | 'system';
  target?: DashboardTarget;
}

interface DashboardTarget {
  view: ViewState;
  projectId?: string;
}

interface WorkItem {
  id: string;
  status: string;
  title: string;
  code: string;
  deadline: string;
  target: DashboardTarget;
}

interface TimelineRow {
  id: string;
  title: string;
  meta: string;
  status: string;
  phase: string;
  progress: number;
  tone: Tone;
  target: DashboardTarget;
}

const emptyDashboardData: DashboardData = {
  projects: [],
  products: [],
  orders: [],
  suppliers: [],
  auditLogs: [],
  tasks: []
};

const supplierRoles: Role[] = ['SUPPLIER', 'SUPPLIER_ADMIN', 'SUPPLIER_BIDDER'];
const financeRoles: Role[] = ['HOTEL_FINANCE', 'FINANCE_REVIEWER'];
const procurementRoles: Role[] = ['GROUP_PROCUREMENT_MANAGER', 'PROCUREMENT_AGENT', 'HOTEL_PROCUREMENT', 'PLATFORM_OPERATIONS'];
const auditRoles: Role[] = ['DISCIPLINARY_AUDIT'];

async function safeGet<T>(path: string, userId: string, fallback: T) {
  try {
    return await apiGet<T>(path, userId);
  } catch {
    return fallback;
  }
}

function isSupplierRole(role: Role) {
  return supplierRoles.includes(role);
}

function isFinanceRole(role: Role) {
  return financeRoles.includes(role);
}

function canReadProjects(role: Role) {
  return procurementRoles.includes(role) || supplierRoles.includes(role) || auditRoles.includes(role);
}

function canReadProducts(role: Role) {
  return role !== 'SYSTEM_ADMIN' && role !== 'EXPERT';
}

function canReadOrders(role: Role) {
  return procurementRoles.includes(role) || supplierRoles.includes(role) || financeRoles.includes(role);
}

function canReadSuppliers(role: Role) {
  return ['GROUP_PROCUREMENT_MANAGER', 'PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS', 'DISCIPLINARY_AUDIT', 'SUPPLIER', 'SUPPLIER_ADMIN'].includes(role);
}

function canReadAuditLogs(role: Role) {
  return [...procurementRoles, ...financeRoles, ...auditRoles].includes(role);
}

function money(value?: number) {
  if (value === undefined || Number.isNaN(Number(value))) return '-';
  return `¥${Number(value).toLocaleString('zh-CN')}`;
}

function displayTime(value?: string | null) {
  return value ? formatDateTime(value) : '按业务状态';
}

function projectTitle(project: ApiProject) {
  return project.displayName ?? project.name ?? project.code ?? project.id;
}

function projectCode(project: ApiProject) {
  return project.code ?? project.id;
}

function isActiveProject(project: ApiProject) {
  return !['archived', 'closed', 'external_archived', 'external_closed'].includes(project.status);
}

function isQuoteDeadlineProject(project: ApiProject) {
  return ['document_published', 'registration_open', 'bidding_open'].includes(project.status);
}

function supplierProjectTarget(project: ApiProject): DashboardTarget {
  if (['document_published', 'registration_open'].includes(project.status)) {
    return { view: 'REGISTRATION', projectId: project.id };
  }
  if (['awarded_pending_order', 'result_notified'].includes(project.status)) {
    return { view: 'AWARD_RESULT', projectId: project.id };
  }
  if (['contract_registered', 'performing', 'evaluated', 'archived'].includes(project.status)) {
    return { view: 'ORDER_FULFILLMENT', projectId: project.id };
  }
  return { view: 'QUOTE_RESPONSE', projectId: project.id };
}

function isReviewProject(project: ApiProject) {
  return ['expert_reviewing', 'review_report_frozen', 'award_approving', 'awarded_pending_order'].includes(project.status);
}

function isAbnormalOrder(order: ApiOrder) {
  return ['return_requested', 'return_rejected', 'partial', 'partially_received', 'exception'].includes(order.status);
}

function productNeedsMaintenance(product: ApiProduct) {
  return ['draft', 'pending', 'unlisted', 'inactive'].includes(product.status) || !product.activePrice;
}

function isSupplierRisk(supplier: ApiSupplier) {
  const status = supplier.admissionStatus ?? supplier.status;
  return ['pending', 'restricted', 'suspended', 'inactive'].includes(status) || supplier.qualification === '即将到期' || Boolean(supplier.risk && supplier.risk !== '正常');
}

function projectProgress(status: string) {
  const stages: Record<string, { phase: string; progress: number; tone: Tone }> = {
    draft: { phase: '需求草稿', progress: 8, tone: 'warning' },
    request_submitted: { phase: '需求审批', progress: 16, tone: 'warning' },
    method_decided: { phase: '方式判定', progress: 24, tone: 'primary' },
    project_created: { phase: '项目立项', progress: 30, tone: 'primary' },
    document_preparing: { phase: '文件编制', progress: 38, tone: 'primary' },
    document_published: { phase: '公告发布', progress: 46, tone: 'warning' },
    registration_open: { phase: '报名进行', progress: 54, tone: 'warning' },
    bidding_open: { phase: '报价响应', progress: 62, tone: 'warning' },
    bidding_locked: { phase: '报价锁定', progress: 70, tone: 'blue' },
    expert_reviewing: { phase: '专家评审', progress: 76, tone: 'blue' },
    review_report_frozen: { phase: '评审汇总', progress: 82, tone: 'blue' },
    award_approving: { phase: '定标审批', progress: 88, tone: 'blue' },
    awarded_pending_order: { phase: '待生成订单', progress: 92, tone: 'success' },
    result_notified: { phase: '结果通知', progress: 94, tone: 'success' },
    contract_registered: { phase: '订单/合同', progress: 96, tone: 'success' },
    performing: { phase: '履约中', progress: 98, tone: 'warning' },
    evaluated: { phase: '履约评价', progress: 99, tone: 'success' },
    archived: { phase: '归档完成', progress: 100, tone: 'success' },
    external_result_recorded: { phase: '外部结果备案', progress: 78, tone: 'blue' },
    external_performing: { phase: '外部履约', progress: 92, tone: 'warning' },
    external_archived: { phase: '外部归档', progress: 100, tone: 'success' }
  };
  return stages[status] ?? { phase: labelStatus(status), progress: 40, tone: 'primary' as const };
}

function productProgress(product: ApiProduct) {
  if (product.status === 'listed') return { phase: '已上架', progress: 100, tone: 'success' as const };
  if (product.activePrice) return { phase: '待上架复核', progress: 70, tone: 'warning' as const };
  return { phase: '目录维护', progress: 45, tone: 'primary' as const };
}

function orderProgress(order: ApiOrder) {
  if (order.paymentStatus === 'paid' || order.status === 'closed') return { phase: '已关闭', progress: 100, tone: 'success' as const };
  if (isAbnormalOrder(order)) return { phase: '异常处理', progress: 72, tone: 'danger' as const };
  if (order.paymentStatus && order.paymentStatus !== 'paid') return { phase: '结算付款', progress: 86, tone: 'blue' as const };
  return { phase: labelStatus(order.status), progress: 64, tone: 'warning' as const };
}

function fallbackTargetForRole(role: Role): DashboardTarget {
  if (role === 'SYSTEM_ADMIN') return { view: 'SYS_MANAGE' };
  if (role === 'EXPERT') return { view: 'EXPERT_RATING' };
  if (role === 'HOTEL_PROCUREMENT') return { view: 'PURCHASE_REQUEST' };
  if (isSupplierRole(role)) return { view: 'QUOTE_RESPONSE' };
  if (isFinanceRole(role)) return { view: 'SETTLEMENT' };
  if (role === 'DISCIPLINARY_AUDIT') return { view: 'OPERATION_LOGS' };
  return { view: 'TODO' };
}

function canOpenProjectWorkbench(role: Role) {
  return ['GROUP_PROCUREMENT_MANAGER', 'PROCUREMENT_AGENT', 'PLATFORM_OPERATIONS', 'DISCIPLINARY_AUDIT'].includes(role);
}

function taskTarget(task: ApiTask, role: Role): DashboardTarget {
  const businessType = String(task.businessType ?? '');
  if (role === 'EXPERT' || businessType === 'expert_scoring') return { view: 'EXPERT_RATING' };
  if (businessType === 'review_award') return { view: role === 'GROUP_PROCUREMENT_MANAGER' ? 'AWARD_APPROVE' : 'REVIEW_AWARD', projectId: task.projectId };
  if (businessType === 'award_approval') return { view: 'AWARD_APPROVE', projectId: task.projectId };
  if (businessType === 'procurement_request') return { view: role === 'GROUP_PROCUREMENT_MANAGER' ? 'REQUEST_APPROVE' : 'PURCHASE_REQUEST' };
  if (businessType === 'supplier_onboarding') return { view: role === 'GROUP_PROCUREMENT_MANAGER' || role === 'DISCIPLINARY_AUDIT' ? 'SUPPLIERS' : 'REGISTRATION' };
  if (['order_fulfillment', 'contract_preparation'].includes(businessType)) return { view: 'ORDER_FULFILLMENT' };
  if (['settlement', 'invoice', 'payment'].includes(businessType)) return { view: isSupplierRole(role) ? 'SETTLEMENT_MATS' : 'SETTLEMENT' };
  if (businessType === 'archive') return { view: 'AUDIT_LOG' };
  if (task.projectId && canOpenProjectWorkbench(role)) return { view: 'PROJECT_DETAIL', projectId: task.projectId };
  return fallbackTargetForRole(role);
}

function kpiIcon(card: KpiCard) {
  const className = 'w-5 h-5';
  if (card.icon === 'todo') return <CheckSquare className={className} />;
  if (card.icon === 'deadline') return <Clock className={className} />;
  if (card.icon === 'review') return <Users className={className} />;
  if (card.icon === 'exception') return <AlertCircle className={className} />;
  if (card.icon === 'supplier') return <ShieldAlert className={className} />;
  if (card.icon === 'catalog') return <Store className={className} />;
  if (card.icon === 'finance') return <HandCoins className={className} />;
  if (card.icon === 'audit') return <FileCheck className={className} />;
  return <Settings className={className} />;
}

function kpiToneClass(tone: Tone) {
  if (tone === 'danger') return 'border-rose-100 bg-rose-50/30 text-rose-600';
  if (tone === 'warning') return 'text-[#B7791F]';
  if (tone === 'blue') return 'text-blue-600';
  if (tone === 'success') return 'text-emerald-600';
  return 'border-l-4 border-l-[#006666] text-[#006666]';
}

function kpiIconWrapClass(tone: Tone) {
  if (tone === 'danger') return 'bg-rose-100 text-rose-600';
  if (tone === 'warning') return 'bg-amber-50 text-[#B7791F]';
  if (tone === 'blue') return 'bg-blue-50 text-blue-600';
  if (tone === 'success') return 'bg-emerald-50 text-emerald-600';
  return 'bg-slate-50 text-[#006666]';
}

function timelineToneClass(tone: Tone) {
  if (tone === 'danger') return 'bg-rose-500';
  if (tone === 'warning') return 'bg-[#FFC107]';
  if (tone === 'blue') return 'bg-blue-500';
  if (tone === 'success') return 'bg-emerald-500';
  return 'bg-[#006666]';
}

export function DashboardView() {
  const {
    currentUser,
    setCurrentView,
    setCurrentProjectId,
    menuConfig,
    canResetRuntimeData,
    resettingData,
    resetMessage,
    resetRuntimeData
  } = useApp();
  const [isEditingQuickActions, setIsEditingQuickActions] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>(emptyDashboardData);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  if (!currentUser) return null;

  const roleAvailableActions = getGovernedMenuItems(menuConfig);

  useEffect(() => {
    let mounted = true;
    setLoadingDashboard(true);
    const userId = currentUser.id;
    const role = currentUser.role;

    Promise.all([
      canReadProjects(role) ? safeGet<{ projects: ApiProject[] }>('/api/projects', userId, { projects: [] }) : Promise.resolve({ projects: [] }),
      canReadProducts(role) ? safeGet<{ products: ApiProduct[] }>('/api/mall/products', userId, { products: [] }) : Promise.resolve({ products: [] }),
      canReadOrders(role) ? safeGet<{ orders: ApiOrder[] }>('/api/mall/orders', userId, { orders: [] }) : Promise.resolve({ orders: [] }),
      canReadSuppliers(role) ? safeGet<{ suppliers: ApiSupplier[] }>('/api/suppliers', userId, { suppliers: [] }) : Promise.resolve({ suppliers: [] }),
      canReadAuditLogs(role) ? safeGet<{ auditLogs: ApiAuditLog[] }>('/api/audit-logs', userId, { auditLogs: [] }) : Promise.resolve({ auditLogs: [] }),
      safeGet<{ processTasks: ApiTask[] }>('/api/process/tasks', userId, { processTasks: [] }),
      safeGet<{ tasks: ApiTask[] }>('/api/workflow/tasks', userId, { tasks: [] })
    ])
      .then(([projectData, productData, orderData, supplierData, auditData, processTaskData, workflowTaskData]) => {
        if (!mounted) return;
        setDashboardData({
          projects: projectData.projects,
          products: productData.products,
          orders: orderData.orders,
          suppliers: supplierData.suppliers,
          auditLogs: auditData.auditLogs,
          tasks: [...processTaskData.processTasks, ...workflowTaskData.tasks]
        });
      })
      .finally(() => {
        if (mounted) setLoadingDashboard(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentUser.id]);

  const openTarget = (target?: DashboardTarget) => {
    if (!target) return;
    setCurrentProjectId(target.projectId ?? null);
    setCurrentView(target.view);
  };

  const openAllWorkItems = () => {
    setCurrentView(currentUser.role === 'SYSTEM_ADMIN' ? 'SYS_MANAGE' : 'TODO');
  };

  const pendingTasks = useMemo(() => dashboardData.tasks.filter((task) => task.status === 'pending'), [dashboardData.tasks]);
  const supplierRiskCount = useMemo(() => dashboardData.suppliers.filter(isSupplierRisk).length, [dashboardData.suppliers]);
  const activeProjects = useMemo(() => dashboardData.projects.filter(isActiveProject), [dashboardData.projects]);
  const quoteProjects = useMemo(() => dashboardData.projects.filter(isQuoteDeadlineProject), [dashboardData.projects]);
  const reviewProjects = useMemo(() => dashboardData.projects.filter(isReviewProject), [dashboardData.projects]);
  const abnormalOrders = useMemo(() => dashboardData.orders.filter(isAbnormalOrder), [dashboardData.orders]);
  const productsToMaintain = useMemo(() => dashboardData.products.filter(productNeedsMaintenance), [dashboardData.products]);

  const updatedAtLabel = useMemo(() => {
    const candidates = [
      ...dashboardData.projects.map((item) => item.updatedAt ?? item.dueAt ?? item.quoteDeadlineAt),
      ...dashboardData.products.map((item) => item.updatedAt ?? item.createdAt),
      ...dashboardData.orders.map((item) => item.updatedAt ?? item.createdAt),
      ...dashboardData.suppliers.map((item) => item.admissionReviews?.[0]?.reviewedAt),
      ...dashboardData.auditLogs.map((item) => item.createdAt),
      ...dashboardData.tasks.map((item) => item.updatedAt ?? item.dueAt)
    ].filter(Boolean) as string[];
    const latest = candidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
    if (latest) return formatDateTime(latest);
    return loadingDashboard ? '正在读取角色业务数据' : '暂无业务更新';
  }, [dashboardData, loadingDashboard]);

  const kpiCards = useMemo<KpiCard[]>(() => {
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return [
        { id: 'system', label: '系统配置', value: '已隔离', meta: '管理员不展示业务数据', tone: 'success', icon: 'system', target: { view: 'SYSTEM_SETTINGS' } },
        { id: 'role', label: '当前角色', value: '管理员', meta: 'RBAC 与模块配置', tone: 'primary', icon: 'system', target: { view: 'SYS_MANAGE' } },
        { id: 'menus', label: '配置入口', value: roleAvailableActions.length, unit: '个', meta: '当前可见菜单', tone: 'blue', icon: 'system', target: { view: 'SYS_MANAGE' } },
        { id: 'business', label: '业务待办', value: 0, unit: '项', meta: '管理员不处理业务流转', tone: 'success', icon: 'audit' }
      ];
    }

    if (currentUser.role === 'GROUP_PROCUREMENT_MANAGER') {
      const approvalCount = pendingTasks.filter((task) => ['procurement_request', 'award_approval'].includes(String(task.businessType))).length;
      return [
        { id: 'approval', label: '待审批需求', value: approvalCount, unit: '项', meta: '集团审批任务', tone: 'primary', icon: 'todo', target: { view: 'TODO' } },
        { id: 'active-projects', label: '在途项目', value: activeProjects.length, unit: '个', meta: '集团组织范围', tone: 'warning', icon: 'review', target: { view: 'PROJECTS' } },
        { id: 'award', label: '定标/评审关注', value: reviewProjects.length, unit: '个', meta: '需复核节点', tone: 'blue', icon: 'review', target: { view: 'AWARD_APPROVE' } },
        { id: 'supplier-risk', label: '供应商风险', value: supplierRiskCount, unit: '项', meta: '准入与资质', tone: supplierRiskCount ? 'danger' : 'success', icon: 'supplier', target: { view: 'SUPPLIERS' } }
      ];
    }

    if (currentUser.role === 'PLATFORM_OPERATIONS') {
      return [
        { id: 'catalog', label: '商品待维护', value: productsToMaintain.length, unit: '项', meta: '价格/上架/目录', tone: productsToMaintain.length ? 'warning' : 'success', icon: 'catalog', target: { view: 'ITEM_CATALOG' } },
        { id: 'supplier-risk', label: '准入资质关注', value: supplierRiskCount, unit: '项', meta: '供应商运营', tone: supplierRiskCount ? 'danger' : 'success', icon: 'supplier', target: { view: 'REGISTRATION' } },
        { id: 'mall-orders', label: '商城订单在途', value: dashboardData.orders.filter((order) => !['closed', 'cancelled'].includes(order.status)).length, unit: '单', meta: '运营协同', tone: 'blue', icon: 'catalog', target: { view: 'ORDER_FULFILLMENT' } },
        { id: 'ops-todos', label: '运营待办', value: pendingTasks.length, unit: '项', meta: '配置/流程任务', tone: 'primary', icon: 'system', target: { view: 'TODO' } }
      ];
    }

    if (isSupplierRole(currentUser.role)) {
      return [
        { id: 'supplier-todos', label: '待处理事项', value: pendingTasks.length, unit: '项', meta: '本企业账号', tone: 'primary', icon: 'todo', target: { view: 'TODO' } },
        {
          id: 'bidding',
          label: '可参与项目',
          value: quoteProjects.length,
          unit: '个',
          meta: '报名/报价范围',
          tone: 'warning',
          icon: 'deadline',
          target: quoteProjects[0] ? supplierProjectTarget(quoteProjects[0]) : { view: 'REGISTRATION' }
        },
        { id: 'orders', label: '订单履约', value: dashboardData.orders.length, unit: '单', meta: '本企业订单', tone: 'blue', icon: 'catalog', target: { view: 'ORDER_FULFILLMENT' } },
        { id: 'settlement', label: '待结算/异常', value: dashboardData.orders.filter((order) => order.paymentStatus !== 'paid' || isAbnormalOrder(order)).length, unit: '单', meta: '发票与验收', tone: abnormalOrders.length ? 'danger' : 'success', icon: 'finance', target: { view: 'SETTLEMENT_MATS' } }
      ];
    }

    if (currentUser.role === 'HOTEL_PROCUREMENT') {
      return [
        { id: 'hotel-requests', label: '采购申请', value: pendingTasks.length, unit: '项', meta: '酒店内部需求', tone: 'primary', icon: 'todo', target: { view: 'PURCHASE_REQUEST' } },
        { id: 'hotel-catalog', label: '商品目录', value: productsToMaintain.length, unit: '项', meta: '可选供货目录', tone: 'blue', icon: 'catalog', target: { view: 'ITEM_CATALOG' } },
        { id: 'hotel-orders', label: '订单履约', value: dashboardData.orders.length, unit: '单', meta: '酒店可见订单', tone: 'warning', icon: 'finance', target: { view: 'ORDER_FULFILLMENT' } },
        { id: 'hotel-abnormal', label: '履约异常', value: abnormalOrders.length, unit: '起', meta: '需酒店侧跟进', tone: abnormalOrders.length ? 'danger' : 'success', icon: 'exception', target: { view: 'ORDER_FULFILLMENT' } }
      ];
    }

    if (isFinanceRole(currentUser.role)) {
      const pendingAmount = dashboardData.orders.filter((order) => order.paymentStatus !== 'paid').reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0);
      return [
        { id: 'finance-todos', label: '财务待办', value: pendingTasks.length, unit: '项', meta: '结算/发票', tone: 'primary', icon: 'todo', target: { view: 'TODO' } },
        { id: 'pending-orders', label: '待核验订单', value: dashboardData.orders.filter((order) => order.paymentStatus !== 'paid').length, unit: '单', meta: '当前可见', tone: 'warning', icon: 'finance', target: { view: 'SETTLEMENT' } },
        { id: 'amount', label: '待付款金额', value: money(pendingAmount), meta: '可见订单合计', tone: 'blue', icon: 'finance', target: { view: 'PAYMENT_PROGRESS' } },
        { id: 'abnormal', label: '结算异常', value: abnormalOrders.length, unit: '起', meta: '退回/部分/异常', tone: abnormalOrders.length ? 'danger' : 'success', icon: 'exception', target: { view: 'SETTLEMENT' } }
      ];
    }

    if (currentUser.role === 'DISCIPLINARY_AUDIT') {
      const deniedCount = dashboardData.auditLogs.filter((log) => log.result === 'denied').length;
      return [
        { id: 'audit-logs', label: '审计流水', value: dashboardData.auditLogs.length, unit: '条', meta: '授权范围', tone: 'primary', icon: 'audit', target: { view: 'OPERATION_LOGS' } },
        { id: 'denied', label: '越权/拒绝', value: deniedCount, unit: '条', meta: '需核查', tone: deniedCount ? 'danger' : 'success', icon: 'exception', target: { view: 'OPERATION_LOGS' } },
        { id: 'active-projects', label: '在途项目', value: activeProjects.length, unit: '个', meta: '监督范围', tone: 'blue', icon: 'review', target: { view: 'AUDIT_LOG' } },
        { id: 'supplier-risk', label: '供应商风险', value: supplierRiskCount, unit: '项', meta: '准入留痕', tone: supplierRiskCount ? 'warning' : 'success', icon: 'supplier', target: { view: 'SUPPLIER_SUPERVISION' } }
      ];
    }

    return [
      { id: 'todos', label: '我的待办事项', value: pendingTasks.length, unit: '项', meta: '当前账号', tone: 'primary', icon: 'todo', target: { view: 'TODO' } },
      { id: 'deadline', label: '报价截止关注', value: quoteProjects.length, unit: '个', meta: '经办项目', tone: 'warning', icon: 'deadline', target: { view: 'ANNOUNCEMENT' } },
      { id: 'review', label: '评审/定标推进', value: reviewProjects.length, unit: '个', meta: '下一步材料', tone: 'blue', icon: 'review', target: { view: 'REVIEW_AWARD' } },
      { id: 'abnormal', label: '履约异常', value: abnormalOrders.length, unit: '起', meta: '订单/验收', tone: abnormalOrders.length ? 'danger' : 'success', icon: 'exception', target: { view: 'ORDER_FULFILLMENT' } }
    ];
  }, [currentUser.role, roleAvailableActions.length, pendingTasks, activeProjects.length, reviewProjects.length, supplierRiskCount, productsToMaintain.length, dashboardData.orders, dashboardData.auditLogs, quoteProjects.length, abnormalOrders.length]);

  const workItems = useMemo<WorkItem[]>(() => {
    const taskRows = pendingTasks.slice(0, 4).map((task) => ({
      id: task.id,
      status: task.statusLabel ?? labelStatus(task.status),
      title: task.businessTitle ?? task.title ?? '待处理任务',
      code: task.businessId ?? task.id,
      deadline: displayTime(task.dueAt ?? task.updatedAt),
      target: taskTarget(task, currentUser.role)
    }));
    if (taskRows.length) return taskRows;

    if (currentUser.role === 'PLATFORM_OPERATIONS') {
      return [
        ...productsToMaintain.slice(0, 2).map((product) => ({
          id: `product-${product.id}`,
          status: labelStatus(product.status),
          title: product.name,
          code: product.skuCode ?? product.id,
          deadline: product.activePrice ? '待确认上架' : '待补齐价格',
          target: { view: 'ITEM_CATALOG' as const }
        })),
        ...dashboardData.suppliers.filter(isSupplierRisk).slice(0, 2).map((supplier) => ({
          id: `supplier-${supplier.id}`,
          status: labelStatus(supplier.admissionStatus ?? supplier.status),
          title: supplier.name,
          code: supplier.id,
          deadline: supplier.risk || '准入/资质关注',
          target: { view: 'REGISTRATION' as const }
        }))
      ].slice(0, 4);
    }

    if (isFinanceRole(currentUser.role)) {
      return dashboardData.orders.slice(0, 4).map((order) => ({
        id: `finance-${order.id}`,
        status: labelStatus(order.paymentStatus ?? order.status),
        title: order.orderNo,
        code: order.id,
        deadline: money(order.totalAmount),
        target: { view: 'SETTLEMENT' as const }
      }));
    }

    if (currentUser.role === 'DISCIPLINARY_AUDIT') {
      return dashboardData.auditLogs.slice(0, 4).map((log) => ({
        id: `audit-${log.id}`,
        status: labelStatus(log.result ?? 'recorded'),
        title: log.action,
        code: log.objectId,
        deadline: displayTime(log.createdAt),
        target: { view: 'OPERATION_LOGS' as const }
      }));
    }

    if (isSupplierRole(currentUser.role)) {
      return [
        ...quoteProjects.slice(0, 2).map((project) => ({
          id: `quote-${project.id}`,
          status: labelStatus(project.status),
          title: projectTitle(project),
          code: projectCode(project),
          deadline: project.quoteDeadlineAt ? displayTime(project.quoteDeadlineAt) : '等待采购方推进',
          target: supplierProjectTarget(project)
        })),
        ...dashboardData.orders.slice(0, 2).map((order) => ({
          id: `order-${order.id}`,
          status: labelStatus(order.status),
          title: order.orderNo,
          code: order.id,
          deadline: labelStatus(order.paymentStatus ?? order.status),
          target: { view: 'ORDER_FULFILLMENT' as const }
        }))
      ].slice(0, 4);
    }

    if (currentUser.role === 'HOTEL_PROCUREMENT') {
      return [
        ...activeProjects.slice(0, 2).map((project) => ({
          id: `hotel-request-${project.id}`,
          status: labelStatus(project.status),
          title: projectTitle(project),
          code: projectCode(project),
          deadline: project.quoteDeadlineAt ? displayTime(project.quoteDeadlineAt) : '按采购申请跟进',
          target: { view: 'PURCHASE_REQUEST' as const }
        })),
        ...dashboardData.orders.slice(0, 2).map((order) => ({
          id: `hotel-order-${order.id}`,
          status: labelStatus(order.status),
          title: order.orderNo,
          code: order.id,
          deadline: labelStatus(order.paymentStatus ?? order.status),
          target: { view: 'ORDER_FULFILLMENT' as const }
        }))
      ].slice(0, 4);
    }

    return activeProjects.slice(0, 4).map((project) => ({
      id: `project-${project.id}`,
      status: labelStatus(project.status),
      title: projectTitle(project),
      code: projectCode(project),
      deadline: project.quoteDeadlineAt ? displayTime(project.quoteDeadlineAt) : project.dueAt ? displayTime(project.dueAt) : '按阶段推进',
      target: { view: 'PROJECT_DETAIL' as const, projectId: project.id }
    }));
  }, [pendingTasks, currentUser.role, productsToMaintain, dashboardData.suppliers, dashboardData.orders, dashboardData.auditLogs, quoteProjects, activeProjects]);

  const riskItems = useMemo<SmartRiskItem[]>(() => {
    const risks: SmartRiskItem[] = [];
    const riskySupplier = dashboardData.suppliers.find(isSupplierRisk);
    const abnormalOrder = abnormalOrders[0];
    const deadlineProject = quoteProjects[0];
    const deniedLog = dashboardData.auditLogs.find((log) => log.result === 'denied');
    const reviewProject = reviewProjects[0];

    if (currentUser.role === 'PLATFORM_OPERATIONS') {
      const product = productsToMaintain[0];
      if (product) {
        risks.push({
          id: `product-${product.id}`,
          type: '商品目录待维护',
          description: `${product.name} 当前为 ${labelStatus(product.status)}，${product.activePrice ? '需要确认上架状态。' : '需要补齐有效价格或来源信息。'}`,
          time: displayTime(product.updatedAt ?? product.createdAt),
          level: 'medium',
          nextView: 'ITEM_CATALOG'
        });
      }
    }

    if (riskySupplier && !isFinanceRole(currentUser.role) && currentUser.role !== 'SYSTEM_ADMIN') {
      risks.push({
        id: `supplier-${riskySupplier.id}`,
        type: '供应商准入/资质关注',
        description: `${riskySupplier.name} 当前状态为 ${labelStatus(riskySupplier.admissionStatus ?? riskySupplier.status)}，${riskySupplier.risk || '需要跟进资质、准入或限制状态。'}`,
        time: '供应商档案',
        level: riskySupplier.admissionStatus === 'restricted' ? 'high' : 'medium',
        nextView: currentUser.role === 'DISCIPLINARY_AUDIT' ? 'SUPPLIER_SUPERVISION' : currentUser.role === 'PLATFORM_OPERATIONS' ? 'REGISTRATION' : 'SUPPLIERS'
      });
    }

    if (abnormalOrder) {
      risks.push({
        id: `order-${abnormalOrder.id}`,
        type: '履约/结算异常',
        description: `${abnormalOrder.orderNo} 当前为 ${labelStatus(abnormalOrder.status)}，涉及金额 ${money(abnormalOrder.totalAmount)}。`,
        time: displayTime(abnormalOrder.updatedAt ?? abnormalOrder.createdAt),
        level: 'high',
        nextView: isFinanceRole(currentUser.role) ? 'SETTLEMENT' : 'ORDER_FULFILLMENT'
      });
    }

    if (deadlineProject && !isFinanceRole(currentUser.role) && currentUser.role !== 'SYSTEM_ADMIN') {
      risks.push({
        id: `deadline-${deadlineProject.id}`,
        type: '报价截止关注',
        description: `${projectTitle(deadlineProject)} 处于 ${labelStatus(deadlineProject.status)}，需要关注报名、报价和截止节点。`,
        time: deadlineProject.quoteDeadlineAt ? displayTime(deadlineProject.quoteDeadlineAt) : displayTime(deadlineProject.updatedAt),
        level: 'medium',
        nextView: isSupplierRole(currentUser.role) ? 'QUOTE_RESPONSE' : currentUser.role === 'HOTEL_PROCUREMENT' ? 'PURCHASE_REQUEST' : 'PROJECTS'
      });
    }

    if (reviewProject && currentUser.role === 'GROUP_PROCUREMENT_MANAGER') {
      risks.push({
        id: `review-${reviewProject.id}`,
        type: '定标/评审节点',
        description: `${projectTitle(reviewProject)} 当前为 ${labelStatus(reviewProject.status)}，集团侧需要关注审批材料和结果留痕。`,
        time: displayTime(reviewProject.updatedAt),
        level: 'info',
        nextView: 'AWARD_APPROVE'
      });
    }

    if (deniedLog && currentUser.role === 'DISCIPLINARY_AUDIT') {
      risks.push({
        id: `audit-${deniedLog.id}`,
        type: '越权访问留痕',
        description: `${deniedLog.action} / ${deniedLog.objectType} 被系统拒绝，需要核查是否存在越权路径。`,
        time: displayTime(deniedLog.createdAt),
        level: 'high',
        nextView: 'OPERATION_LOGS'
      });
    }

    return risks.slice(0, 4);
  }, [dashboardData.suppliers, dashboardData.auditLogs, abnormalOrders, quoteProjects, reviewProjects, productsToMaintain, currentUser.role]);

  const timelineRows = useMemo<TimelineRow[]>(() => {
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return [
        { id: 'admin-permissions', title: '权限与组织配置', status: '配置巡检', meta: '系统管理员', phase: '基础配置', progress: 60, tone: 'primary', target: { view: 'SYSTEM_SETTINGS' } },
        { id: 'admin-modules', title: '系统模块入口', status: '可维护', meta: '业务隔离', phase: '系统管理', progress: 70, tone: 'blue', target: { view: 'SYS_MANAGE' } }
      ];
    }

    if (currentUser.role === 'PLATFORM_OPERATIONS') {
      const productRows = dashboardData.products.slice(0, 4).map<TimelineRow>((product) => {
        const progress = productProgress(product);
        return {
          id: `product-${product.id}`,
          title: product.name,
          status: labelStatus(product.status),
          meta: [product.skuCode ?? product.id, product.category].filter(Boolean).join(' / '),
          phase: progress.phase,
          progress: progress.progress,
          tone: progress.tone,
          target: { view: 'ITEM_CATALOG' }
        };
      });
      const orderRows = dashboardData.orders.slice(0, Math.max(0, 6 - productRows.length)).map<TimelineRow>((order) => {
        const progress = orderProgress(order);
        return {
          id: `order-${order.id}`,
          title: order.orderNo,
          status: labelStatus(order.status),
          meta: money(order.totalAmount),
          phase: progress.phase,
          progress: progress.progress,
          tone: progress.tone,
          target: { view: 'ORDER_FULFILLMENT' }
        };
      });
      return [...productRows, ...orderRows];
    }

    if (isFinanceRole(currentUser.role)) {
      return dashboardData.orders.slice(0, 6).map((order) => {
        const progress = orderProgress(order);
        return {
          id: `finance-order-${order.id}`,
          title: order.orderNo,
          status: labelStatus(order.paymentStatus ?? order.status),
          meta: money(order.totalAmount),
          phase: progress.phase,
          progress: progress.progress,
          tone: progress.tone,
          target: { view: 'SETTLEMENT' }
        };
      });
    }

    if (currentUser.role === 'DISCIPLINARY_AUDIT') {
      return dashboardData.auditLogs.slice(0, 6).map((log) => ({
        id: `audit-${log.id}`,
        title: log.action,
        status: labelStatus(log.result ?? 'recorded'),
        meta: `${log.objectType} / ${log.objectId}`,
        phase: log.result === 'denied' ? '越权核查' : '审计留痕',
        progress: log.result === 'denied' ? 75 : 100,
        tone: log.result === 'denied' ? 'danger' : 'success',
        target: { view: 'OPERATION_LOGS' }
      }));
    }

    if (isSupplierRole(currentUser.role)) {
      const projectRows = dashboardData.projects.slice(0, 4).map<TimelineRow>((project) => {
        const progress = projectProgress(project.status);
        return {
          id: `supplier-project-${project.id}`,
          title: projectTitle(project),
          status: labelStatus(project.status),
          meta: projectCode(project),
          phase: progress.phase,
          progress: progress.progress,
          tone: progress.tone,
          target: supplierProjectTarget(project)
        };
      });
      const orderRows = dashboardData.orders.slice(0, Math.max(0, 6 - projectRows.length)).map<TimelineRow>((order) => {
        const progress = orderProgress(order);
        return {
          id: `supplier-order-${order.id}`,
          title: order.orderNo,
          status: labelStatus(order.status),
          meta: money(order.totalAmount),
          phase: progress.phase,
          progress: progress.progress,
          tone: progress.tone,
          target: { view: 'ORDER_FULFILLMENT' }
        };
      });
      return [...projectRows, ...orderRows];
    }

    if (currentUser.role === 'HOTEL_PROCUREMENT') {
      const requestRows = activeProjects.slice(0, 4).map<TimelineRow>((project) => {
        const progress = projectProgress(project.status);
        return {
          id: `hotel-project-${project.id}`,
          title: projectTitle(project),
          status: labelStatus(project.status),
          meta: projectCode(project),
          phase: progress.phase,
          progress: progress.progress,
          tone: progress.tone,
          target: { view: 'PURCHASE_REQUEST' }
        };
      });
      const orderRows = dashboardData.orders.slice(0, Math.max(0, 6 - requestRows.length)).map<TimelineRow>((order) => {
        const progress = orderProgress(order);
        return {
          id: `hotel-order-${order.id}`,
          title: order.orderNo,
          status: labelStatus(order.status),
          meta: money(order.totalAmount),
          phase: progress.phase,
          progress: progress.progress,
          tone: progress.tone,
          target: { view: 'ORDER_FULFILLMENT' }
        };
      });
      return [...requestRows, ...orderRows];
    }

    return activeProjects.slice(0, 6).map((project) => {
      const progress = projectProgress(project.status);
      return {
        id: `project-${project.id}`,
        title: projectTitle(project),
        status: labelStatus(project.status),
        meta: [projectCode(project), project.category, project.buyer].filter(Boolean).join(' / '),
        phase: progress.phase,
        progress: progress.progress,
        tone: progress.tone,
        target: { view: 'PROJECT_DETAIL', projectId: project.id }
      };
    });
  }, [currentUser.role, dashboardData.products, dashboardData.orders, dashboardData.auditLogs, dashboardData.projects, activeProjects]);

  const [activeActionIds, setActiveActionIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`quickActions_${currentUser.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Ignore corrupted personalization state and fall back to governed defaults.
      }
    }
    return roleAvailableActions.map((action) => action.id).slice(0, 4);
  });

  const toggleAction = (id: string) => {
    setActiveActionIds((prev) => {
      let newIds;
      if (prev.includes(id)) {
        newIds = prev.filter((actionId) => actionId !== id);
      } else {
        if (prev.length >= 6) return prev;
        newIds = [...prev, id];
      }
      localStorage.setItem(`quickActions_${currentUser.id}`, JSON.stringify(newIds));
      return newIds;
    });
  };

  const activeActions = activeActionIds.map((id) => roleAvailableActions.find((action) => action.id === id)).filter(Boolean) as typeof roleAvailableActions;

  return (
    <div data-ui-check="dashboard" className="space-y-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-xl font-semibold text-slate-900">工作台概览</h2>
        <div className="text-sm text-slate-500 flex items-center gap-3 flex-wrap justify-end">
          <span>更新时间: {updatedAtLabel}</span>
          {canResetRuntimeData ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={resettingData}
              onClick={() => void resetRuntimeData()}
              className="shrink-0"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              {resettingData ? '正在恢复' : '恢复初始业务数据'}
            </Button>
          ) : null}
        </div>
      </div>
      {resetMessage ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {resetMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiCards.slice(0, 4).map((card) => (
          <Card
            key={card.id}
            data-ui-check="summary-card"
            role={card.target ? 'button' : undefined}
            tabIndex={card.target ? 0 : undefined}
            onClick={() => openTarget(card.target)}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && card.target) openTarget(card.target);
            }}
            className={cn(card.target ? 'cursor-pointer hover:border-[#006666] hover:shadow-md transition' : '', kpiToneClass(card.tone))}
          >
            <CardContent className="p-5">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium text-slate-500 mb-1', card.tone === 'danger' ? 'text-rose-600' : '')}>{card.label}</p>
                  <p className={cn('text-3xl font-bold truncate', card.tone === 'danger' ? 'text-rose-600' : 'text-slate-900')}>
                    {card.value}
                    {card.unit ? <span className={cn('text-sm font-normal ml-1', card.tone === 'danger' ? 'text-rose-600/70' : 'text-slate-500')}>{card.unit}</span> : null}
                  </p>
                </div>
                <div className={cn('p-2 rounded-md shrink-0', kpiIconWrapClass(card.tone))}>{kpiIcon(card)}</div>
              </div>
              <div className="mt-4 flex items-center text-xs">
                <Badge variant={card.tone === 'danger' ? 'danger' : card.tone === 'warning' ? 'warning' : 'outline'}>{card.meta}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div data-ui-check="template-a-grid template-a-flow" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card data-ui-check="surface todo-surface" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold">高优待处理任务</CardTitle>
              <Button variant="ghost" size="sm" className="text-[#006666] hover:text-[#005252]" onClick={openAllWorkItems}>
                查看全部 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <div data-ui-check="table-wrap" className="overflow-x-auto">
              <table data-ui-check="table" className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-5 py-3 rounded-tl-lg">状态</th>
                    <th className="px-5 py-3">任务名称</th>
                    <th className="px-5 py-3">关联编号</th>
                    <th className="px-5 py-3">截止/更新</th>
                    <th className="px-5 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workItems.slice(0, 4).map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <Badge variant="warning">{task.status}</Badge>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">{task.title}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{task.code}</td>
                      <td className="px-5 py-3 text-slate-500">{task.deadline}</td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => openTarget(task.target)}>
                          {task.target.view === 'REGISTRATION' ? '去报名' : '去处理'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {workItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-400">当前角色暂无待处理业务记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card data-ui-check="surface quick-surface" className="h-full">
            <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">快捷操作中心</CardTitle>
              <button
                onClick={() => setIsEditingQuickActions(!isEditingQuickActions)}
                className="text-xs text-slate-500 hover:text-[#006666] flex items-center gap-1"
              >
                {isEditingQuickActions ? <><Check className="w-3 h-3" /> 完成</> : <><Edit2 className="w-3 h-3" /> 自定义</>}
              </button>
            </CardHeader>
            <CardContent className="p-5">
              {isEditingQuickActions ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 mb-3">选择要在工作台展示的快捷操作，最多 6 个。</p>
                  <div className="grid grid-cols-2 gap-2">
                    {roleAvailableActions.map((action) => {
                      const isActive = activeActionIds.includes(action.id);
                      return (
                        <div
                          key={action.id}
                          onClick={() => toggleAction(action.id)}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors text-sm',
                            isActive
                              ? 'border-[#006666] bg-[#006666]/5 text-[#006666]'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          )}
                        >
                          <div className={cn('flex-shrink-0', isActive ? 'text-[#006666]' : 'text-slate-400')}>
                            {React.isValidElement<{ className?: string }>(action.icon)
                              ? React.cloneElement(action.icon, { className: 'w-4 h-4' })
                              : action.icon}
                          </div>
                          <span className="flex-1 truncate">{action.label}</span>
                          {isActive && <Check className="w-3 h-3 text-[#006666]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {activeActions.length > 0 ? (
                    activeActions.map((action) => (
                      <Button
                        data-ui-check="quick-card"
                        key={action.id}
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2 items-center justify-center text-slate-600 hover:text-[#006666] hover:border-[#006666] transition-colors"
                        onClick={() => setCurrentView(action.id as ViewState)}
                      >
                        <div className="p-2 bg-slate-50 rounded-full group-hover:bg-[#006666]/10">
                          {action.icon}
                        </div>
                        <span className="text-sm font-medium">{action.label}</span>
                      </Button>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-slate-400 text-sm">
                      暂无快捷操作，请点击右上角自定义添加
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card data-ui-check="surface template-a-timeline" className="h-full">
            <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">当前角色业务流转进度</CardTitle>
              <span className="text-sm text-slate-500">{timelineRows.length}项可见记录</span>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <div data-ui-check="gantt-board" className="min-w-[700px] p-5">
                <div className="flex border-b border-slate-200 pb-2 text-xs font-medium text-slate-500 mb-4">
                  <div className="w-56 shrink-0">业务对象</div>
                  <div className="flex-1 grid grid-cols-4 text-center">
                    <div>发起/配置</div>
                    <div>执行/提交</div>
                    <div>评审/处理</div>
                    <div>履约/关闭</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {timelineRows.slice(0, 6).map((row) => (
                    <button key={row.id} className="w-full flex items-center text-sm text-left group" onClick={() => openTarget(row.target)}>
                      <div className="w-56 shrink-0 pr-4 truncate font-medium text-slate-700">
                        <span className={cn('inline-block w-2 h-2 rounded-full mr-2', timelineToneClass(row.tone))} />
                        {row.title}
                        <div className="ml-4 mt-0.5 text-xs text-slate-400 truncate">{row.meta}</div>
                      </div>
                      <div className="flex-1 relative h-7 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn('absolute top-0 bottom-0 left-0 rounded-full opacity-15', timelineToneClass(row.tone))} style={{ width: `${Math.min(100, Math.max(8, row.progress))}%` }} />
                        <div className={cn('absolute top-0 bottom-0 left-0 rounded-full flex items-center px-3 text-xs text-white group-hover:brightness-95', timelineToneClass(row.tone))} style={{ width: `${Math.min(100, Math.max(18, row.progress))}%` }}>
                          <span className="truncate">{row.phase}</span>
                        </div>
                      </div>
                      <div className="w-28 shrink-0 pl-4 text-xs text-slate-500 truncate">{row.status}</div>
                    </button>
                  ))}
                  {timelineRows.length === 0 && (
                    <div className="py-10 text-center text-sm text-slate-400">当前角色暂无可展示的业务流转记录。</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <SmartRiskPanel risks={riskItems} onOpenRisk={(risk) => openTarget(risk.nextView ? { view: risk.nextView } : undefined)} />
        </div>
      </div>

      {['GROUP_PROCUREMENT_MANAGER', 'SYSTEM_ADMIN', 'FINANCE_REVIEWER'].includes(currentUser.role) && (
        <ProcurementAnalytics />
      )}
    </div>
  );
}
