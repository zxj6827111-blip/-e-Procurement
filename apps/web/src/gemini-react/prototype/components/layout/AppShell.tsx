import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { RoleNames, Role, type ViewState } from '../../types';
import { 
  Shield, LayoutDashboard, ListTodo, FolderKanban, Users, Settings, 
  LogOut, Activity, FileText, PackageSearch, PenTool, CheckSquare, 
  Store, Archive, FileSpreadsheet, HandCoins, Building, FileCheck, 
  Bell, Check, Megaphone
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { LoginView } from '../../views/LoginView';
import { DashboardView } from '../../views/DashboardView';
import { ProjectListView } from '../../views/ProjectListView';
import { ProjectDetailView } from '../../views/ProjectDetailView';
import { AuditLogView } from '../../views/AuditLogView';
import { TodoView } from '../../views/TodoView';
import { SystemSettingsView } from '../../views/SystemSettingsView';
import { PurchaseRequestView } from '../../views/PurchaseRequestView';
import { QuoteResponseView } from '../../views/QuoteResponseView';
import { ExpertRatingView } from '../../views/ExpertRatingView';
import { RequestApproveView } from '../../views/RequestApproveView';
import { AwardApproveView } from '../../views/AwardApproveView';
import { AuditSupervisionView } from '../../views/AuditSupervisionView';
import { AwardSupervisionView } from '../../views/AwardSupervisionView';
import { SupplierSupervisionView } from '../../views/SupplierSupervisionView';
import { SysManageView } from '../../views/SysManageView';
import { MessageCenterView } from '../../views/MessageCenterView';
import { ProcurementDocumentView } from '../../views/ProcurementDocumentView';
import { AnnouncementInvitationView } from '../../views/AnnouncementInvitationView';
import { RegistrationMaterialView } from '../../views/RegistrationMaterialView';
import { QuoteProgressView } from '../../views/QuoteProgressView';
import { ReviewAwardView } from '../../views/ReviewAwardView';
import { AwardResultView } from '../../views/AwardResultView';
import { OrderFulfillmentView } from '../../views/OrderFulfillmentView';
import { SettlementMaterialView } from '../../views/SettlementMaterialView';
import { SettlementPaymentView } from '../../views/SettlementPaymentView';
import { SupplierProfileView } from '../../views/SupplierProfileView';
import { SupplierManagementView } from '../../views/SupplierManagementView';
import { ItemCatalogView } from '../../views/ItemCatalogView';
import { OperationLogView } from '../../views/OperationLogView';
import { IntegrationConfigView } from '../../views/IntegrationConfigView';
import { ApprovalRuleView } from '../../views/ApprovalRuleView';
import { RatingTemplateView } from '../../views/RatingTemplateView';
import { ProcurementRequestCreateView } from '../../views/ProcurementRequestCreateView';
import { ProcurementRequestDetailView } from '../../views/ProcurementRequestDetailView';
import { ProjectSourcingView } from '../../views/ProjectSourcingView';
import { ProjectFulfillmentView } from '../../views/ProjectFulfillmentView';
import { AwardResultDetailView } from '../../views/AwardResultDetailView';
import { SupplierCreateView } from '../../views/SupplierCreateView';
import { SupplierDetailView } from '../../views/SupplierDetailView';
import { SupplierPortalSectionView } from '../../views/SupplierPortalSectionView';
import { SupplyMallSectionView } from '../../views/SupplyMallSectionView';
import { AccountSecurityView } from '../../views/AccountSecurityView';
import { SupplierOnboardingRegisterView } from '../../views/SupplierOnboardingRegisterView';
import { ExternalTradeView } from '../../views/ExternalTradeView';
import { FileCenterView } from '../../views/FileCenterView';

type MenuItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

export const getRoleMenus = (role: Role): MenuItem[] => {
  const menus: Record<string, MenuItem> = {
    dashboard: { id: 'DASHBOARD', label: '工作台', icon: <LayoutDashboard className="w-5 h-5" /> },
    todo: { id: 'TODO', label: '我的待办', icon: <ListTodo className="w-5 h-5" /> },
    messages: { id: 'MESSAGES', label: '消息中心', icon: <Bell className="w-5 h-5" /> },
    approvalRules: { id: 'APPROVAL_RULES', label: '审批规则', icon: <CheckSquare className="w-5 h-5" /> },
    requestApprove: { id: 'REQUEST_APPROVE', label: '需求审批', icon: <FileCheck className="w-5 h-5" /> },
    purchaseRequest: { id: 'PURCHASE_REQUEST', label: '采购申请', icon: <FileText className="w-5 h-5" /> },
    projects: { id: 'PROJECTS', label: '采购项目', icon: <FolderKanban className="w-5 h-5" /> },
    procurementDocument: { id: 'PROCUREMENT_DOCUMENT', label: '采购文件', icon: <FileText className="w-5 h-5" /> },
    announcement: { id: 'ANNOUNCEMENT', label: '公告与邀请', icon: <Megaphone className="w-5 h-5" /> },
    quoteProgress: { id: 'QUOTE_PROGRESS', label: '报价进度', icon: <Activity className="w-5 h-5" /> },
    reviewAward: { id: 'REVIEW_AWARD', label: '评审定标', icon: <Users className="w-5 h-5" /> },
    ratingTemplate: { id: 'RATING_TEMPLATE', label: '评分模板', icon: <PenTool className="w-5 h-5" /> },
    awardApprove: { id: 'AWARD_APPROVE', label: '定标审批', icon: <FileCheck className="w-5 h-5" /> },
    suppliers: { id: 'SUPPLIERS', label: '供应商管理', icon: <Building className="w-5 h-5" /> },
    itemCatalog: { id: 'ITEM_CATALOG', label: '商品目录', icon: <Store className="w-5 h-5" /> },
    orderFulfillment: { id: 'ORDER_FULFILLMENT', label: '订单履约', icon: <PackageSearch className="w-5 h-5" /> },
    settlement: { id: 'SETTLEMENT', label: '结算付款', icon: <FileSpreadsheet className="w-5 h-5" /> },
    paymentProgress: { id: 'PAYMENT_PROGRESS', label: '付款进度', icon: <HandCoins className="w-5 h-5" /> },
    archiveAudit: { id: 'AUDIT_LOG', label: '档案审计', icon: <Archive className="w-5 h-5" /> },
    
    // Supplier specific
    itemMaintenance: { id: 'ITEM_MAINTENANCE', label: '商品维护', icon: <Store className="w-5 h-5" /> },
    supplierProfile: { id: 'SUPPLIER_PROFILE', label: '供应商档案', icon: <Building className="w-5 h-5" /> },
    registration: { id: 'REGISTRATION', label: '报名资料', icon: <FileText className="w-5 h-5" /> },
    quoteResponse: { id: 'QUOTE_RESPONSE', label: '报价响应', icon: <FileText className="w-5 h-5" /> },
    awardResult: { id: 'AWARD_RESULT', label: '中标结果', icon: <FolderKanban className="w-5 h-5" /> },
    settlementMaterials: { id: 'SETTLEMENT_MATS', label: '结算材料', icon: <FileSpreadsheet className="w-5 h-5" /> },
    
    // Audit specific
    auditSupervision: { id: 'AUDIT_SUPERVISION', label: '采购监督', icon: <Activity className="w-5 h-5" /> },
    awardSupervision: { id: 'AWARD_SUPERVISION', label: '定标监督', icon: <CheckSquare className="w-5 h-5" /> },
    supplierSupervision: { id: 'SUPPLIER_SUPERVISION', label: '供应商监督', icon: <Building className="w-5 h-5" /> },
    operationLogs: { id: 'OPERATION_LOGS', label: '操作日志', icon: <Archive className="w-5 h-5" /> },
    integrationConfig: { id: 'INTEGRATION', label: '集成配置', icon: <Settings className="w-5 h-5" /> },

    // Admin specific
    sysManage: { id: 'SYS_MANAGE', label: '系统管理', icon: <Settings className="w-5 h-5" /> },
    sysSettings: { id: 'SYSTEM_SETTINGS', label: '系统设置', icon: <Settings className="w-5 h-5" /> },
    
    // Expert specific
    expertRating: { id: 'EXPERT_RATING', label: '专家评分', icon: <PenTool className="w-5 h-5" /> },
  };

  switch (role) {
    case 'GROUP_PROCUREMENT_MANAGER':
      return [menus.dashboard, menus.todo, menus.messages, menus.approvalRules, menus.requestApprove, menus.projects, menus.procurementDocument, menus.announcement, menus.quoteProgress, menus.reviewAward, menus.ratingTemplate, menus.awardApprove, menus.suppliers, menus.itemCatalog, menus.archiveAudit];
    case 'PROCUREMENT_AGENT':
      return [menus.dashboard, menus.todo, menus.messages, menus.purchaseRequest, menus.projects, menus.procurementDocument, menus.announcement, menus.itemCatalog, menus.reviewAward, menus.awardApprove, menus.orderFulfillment, menus.archiveAudit];
    case 'PLATFORM_OPERATIONS':
      return [menus.dashboard, menus.todo, menus.messages, menus.purchaseRequest, menus.projects, menus.itemCatalog, menus.reviewAward, menus.ratingTemplate, menus.awardApprove, menus.orderFulfillment, menus.archiveAudit];
    case 'HOTEL_PROCUREMENT':
      return [menus.dashboard, menus.todo, menus.messages, menus.purchaseRequest, menus.itemCatalog, menus.orderFulfillment];
    case 'HOTEL_FINANCE':
    case 'FINANCE_REVIEWER':
      return [menus.dashboard, menus.todo, menus.messages, menus.settlement, menus.paymentProgress];
    case 'SUPPLIER':
    case 'SUPPLIER_ADMIN':
    case 'SUPPLIER_BIDDER':
      return [menus.dashboard, menus.todo, menus.messages, menus.itemMaintenance, menus.supplierProfile, menus.registration, menus.quoteResponse, menus.awardResult, menus.orderFulfillment, menus.settlementMaterials];
    case 'EXPERT':
      return [menus.dashboard, menus.todo, menus.messages, menus.expertRating];
    case 'DISCIPLINARY_AUDIT':
      return [menus.dashboard, menus.todo, menus.messages, menus.approvalRules, menus.archiveAudit, menus.auditSupervision, menus.awardSupervision, menus.supplierSupervision, menus.operationLogs, menus.integrationConfig];
    case 'SYSTEM_ADMIN':
      return [menus.approvalRules, menus.sysManage, menus.sysSettings];
    default:
      return [menus.dashboard];
  }
};

export function AppShell() {
  const {
    currentUser,
    currentView,
    setCurrentView,
    logout,
    unreadNotifications,
    markAllNotificationsRead,
    markNotificationRead
  } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) {
    return <LoginView />;
  }

  const visibleNavItems = getRoleMenus(currentUser.role);
  const navActiveChildren: Partial<Record<ViewState, ViewState[]>> = {
    PURCHASE_REQUEST: ['PROCUREMENT_REQUEST_CREATE', 'PROCUREMENT_REQUEST_DETAIL'],
    REQUEST_APPROVE: ['PROCUREMENT_REQUEST_DETAIL'],
    PROJECTS: ['PROJECT_DETAIL', 'PROJECT_SOURCING', 'PROJECT_FULFILLMENT'],
    AWARD_APPROVE: ['AWARD_RESULT_DETAIL'],
    AWARD_RESULT: ['AWARD_RESULT_DETAIL'],
    SUPPLIERS: ['SUPPLIER_CREATE', 'SUPPLIER_DETAIL'],
    SUPPLIER_SUPERVISION: ['SUPPLIER_DETAIL'],
    SUPPLIER_PROFILE: ['SUPPLIER_PORTAL'],
    ITEM_CATALOG: ['SUPPLY_MALL'],
    ITEM_MAINTENANCE: ['SUPPLY_MALL']
  };

  const isNavItemActive = (itemId: string) => {
    if (currentView === itemId) return true;
    return navActiveChildren[itemId as ViewState]?.includes(currentView) ?? false;
  };

  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD': return <DashboardView />;
      case 'TODO': return <TodoView />;
      case 'MESSAGES': return <MessageCenterView />;
      case 'PROJECTS': return <ProjectListView />;
      case 'PROJECT_DETAIL': return <ProjectDetailView />;
      case 'AUDIT_LOG': return <AuditLogView />;
      case 'SYSTEM_SETTINGS': return <SystemSettingsView />;
      case 'PURCHASE_REQUEST': return <PurchaseRequestView />;
      case 'QUOTE_RESPONSE': return <QuoteResponseView />;
      case 'EXPERT_RATING': return <ExpertRatingView />;
      case 'PROCUREMENT_DOCUMENT': return <ProcurementDocumentView />;
      case 'ANNOUNCEMENT': return <AnnouncementInvitationView />;
      case 'REGISTRATION': return <RegistrationMaterialView />;
      case 'QUOTE_PROGRESS': return <QuoteProgressView />;
      case 'REVIEW_AWARD': return <ReviewAwardView />;
      case 'AWARD_RESULT': return <AwardResultView />;
      case 'ORDER_FULFILLMENT': return <OrderFulfillmentView />;
      case 'SETTLEMENT_MATS': return <SettlementMaterialView />;
      case 'SETTLEMENT': return <SettlementPaymentView />;
      case 'PAYMENT_PROGRESS': return <SettlementPaymentView />;
      case 'SUPPLIER_PROFILE': return <SupplierProfileView />;
      case 'SUPPLIERS': return <SupplierManagementView />;
      case 'ITEM_CATALOG': return <ItemCatalogView />;
      case 'ITEM_MAINTENANCE': return <ItemCatalogView />;
      case 'OPERATION_LOGS': return <OperationLogView />;
      case 'INTEGRATION': return <IntegrationConfigView />;
      case 'APPROVAL_RULES': return <ApprovalRuleView />;
      case 'REQUEST_APPROVE': return <RequestApproveView />;
      case 'AWARD_APPROVE': return <AwardApproveView />;
      case 'AUDIT_SUPERVISION': return <AuditSupervisionView />;
      case 'AWARD_SUPERVISION': return <AwardSupervisionView />;
      case 'SUPPLIER_SUPERVISION': return <SupplierSupervisionView />;
      case 'SYS_MANAGE': return <SysManageView />;
      case 'RATING_TEMPLATE': return <RatingTemplateView />;
      case 'PROCUREMENT_REQUEST_CREATE': return <ProcurementRequestCreateView />;
      case 'PROCUREMENT_REQUEST_DETAIL': return <ProcurementRequestDetailView />;
      case 'PROJECT_SOURCING': return <ProjectSourcingView />;
      case 'PROJECT_FULFILLMENT': return <ProjectFulfillmentView />;
      case 'AWARD_RESULT_DETAIL': return <AwardResultDetailView />;
      case 'SUPPLIER_CREATE': return <SupplierCreateView />;
      case 'SUPPLIER_DETAIL': return <SupplierDetailView />;
      case 'SUPPLIER_PORTAL': return <SupplierPortalSectionView />;
      case 'SUPPLY_MALL': return <SupplyMallSectionView />;
      case 'ACCOUNT_SECURITY': return <AccountSecurityView />;
      case 'SUPPLIER_ONBOARDING': return <SupplierOnboardingRegisterView />;
      case 'EXTERNAL_TRADE': return <ExternalTradeView />;
      case 'FILE_CENTER': return <FileCenterView />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700">内容为空或无权限访问</h3>
            <p className="text-sm mt-2">请检查您的角色权限 (Permission Denied)</p>
          </div>
        );
    }
  };

  const getBreadcrumb = () => {
    const breadcrumbOverrides: Partial<Record<ViewState, string>> = {
      PROCUREMENT_REQUEST_CREATE: '新建采购申请',
      PROCUREMENT_REQUEST_DETAIL: '采购申请详情',
      PROJECT_DETAIL: '项目详情工作台',
      PROJECT_SOURCING: '招采执行',
      PROJECT_FULFILLMENT: '履约结算',
      AWARD_RESULT_DETAIL: '中标结果详情',
      SUPPLIER_CREATE: '新建供应商',
      SUPPLIER_DETAIL: '供应商档案详情',
      SUPPLIER_PORTAL: '企业档案维护',
      SUPPLY_MALL: '协议商品商城',
      ACCOUNT_SECURITY: '账号安全',
      SUPPLIER_ONBOARDING: '供应商入驻申请',
      EXTERNAL_TRADE: '外部依法招标备案',
      FILE_CENTER: '文件中心'
    };
    if (breadcrumbOverrides[currentView]) return breadcrumbOverrides[currentView];
    const item = visibleNavItems.find(v => v.id === currentView);
    if (currentView === 'PROJECT_DETAIL') return '项目详情工作台';
    return item ? item.label : '业务视图';
  };

  return (
    <div data-ui-check="shell" className="flex h-screen bg-[#F5F7FA] overflow-hidden text-slate-900 font-sans">
      {/* Sidebar */}
      <aside data-ui-check="sidebar" className="w-[220px] bg-[#006666] text-slate-300 flex flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-[#005252]">
          <Shield className="w-5 h-5 text-amber-500 mr-2" />
          <span className="font-semibold text-white tracking-wide text-sm">集团内部采购规范化平台</span>
        </div>
        
        <div className="p-5 border-b border-[#005252]">
          <div className="font-medium text-white mb-1 text-sm">{RoleNames[currentUser.role]}</div>
          <div className="text-xs text-[#80b3b3] truncate">{currentUser.name}</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = isNavItemActive(item.id);
              return (
                <li key={item.id}>
                  <button
                    data-ui-check="nav-item"
                    onClick={() => setCurrentView(item.id as any)}
                    className={cn(
                      "w-full flex items-center px-5 py-3 text-sm font-medium transition-colors relative",
                      isActive
                        ? "bg-[#005252] text-white" 
                        : "text-[#b3d1d1] hover:bg-[#005252]/50 hover:text-white"
                    )}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFC107]"></div>}
                    <span data-ui-check="nav-icon" className={cn("mr-3", isActive ? "text-[#FFC107]" : "")}>{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-[#005252]">
          <button 
            data-ui-check="logout-button"
            onClick={logout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-[#b3d1d1] hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header data-ui-check="topbar" className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40 shadow-sm relative">
          <div className="flex items-center text-sm text-slate-500">
            <span className="font-medium text-slate-700">{RoleNames[currentUser.role]}</span>
            <span className="mx-2">/</span>
            <span className="text-[#006666] font-medium">{getBreadcrumb()}</span>
          </div>
          <div className="flex items-center gap-5">
            {currentUser.role !== 'SYSTEM_ADMIN' && (
              <div className="relative" ref={notificationRef}>
                <button 
                  data-ui-check="bell-button"
                  className="relative text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <span className="font-medium text-slate-700">消息通知</span>
                      <button className="text-xs text-[#006666] hover:underline" onClick={markAllNotificationsRead}>全部已读</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {unreadNotifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">暂无未读消息</div>
                      ) : (
                        unreadNotifications.map((message) => (
                          <div
                            key={message.id}
                            className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => {
                              markNotificationRead(message.id);
                              setShowNotifications(false);
                              setCurrentView('TODO');
                            }}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-medium text-slate-800">{message.type}</span>
                              <span className="text-xs text-slate-400">{message.time}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{message.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2 text-center border-t border-slate-100 bg-slate-50">
                      <button 
                        data-ui-check="notification-view-all"
                        className="text-xs text-slate-500 hover:text-[#006666] transition-colors"
                        onClick={() => { setShowNotifications(false); setCurrentView('MESSAGES'); }}
                      >
                        查看全部消息
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="h-6 w-px bg-slate-200" />
            <div data-ui-check="role-switch" className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200">
              {currentUser.organization}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#006666] text-white flex items-center justify-center font-medium text-sm">
                {currentUser.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto" style={{ maxWidth: '1440px' }}>
            {renderView()}
          </div>
        </div>
      </main>
    </div>
  );
}
