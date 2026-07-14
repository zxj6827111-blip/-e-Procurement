import React, { useState, useRef, useEffect } from 'react';
import { useApp } from './AppContext';
import { RoleNames, type ViewState } from '../shared/types';
import { loadNotifications, markNotificationsRead, markNotificationRead as markRuntimeNotificationRead } from '../features/views/workflow-runtime';
import { Shield, LogOut, FileText, Bell } from 'lucide-react';
import { cn } from '../shared/lib/utils';
import { getGovernedMenuItems } from './governed-menu';
import { LoginView } from '../features/views/LoginView';
import { DashboardView } from '../features/views/DashboardView';
import { ProjectListView } from '../features/views/ProjectListView';
import { ProjectDetailView } from '../features/views/ProjectDetailView';
import { AuditLogView } from '../features/views/AuditLogView';
import { TodoView } from '../features/views/TodoView';
import { SystemSettingsView } from '../features/views/SystemSettingsView';
import { PurchaseRequestView } from '../features/views/PurchaseRequestView';
import { QuoteResponseView } from '../features/views/QuoteResponseView';
import { ExpertRatingView } from '../features/views/ExpertRatingView';
import { RequestApproveView } from '../features/views/RequestApproveView';
import { AwardApproveView } from '../features/views/AwardApproveView';
import { AuditSupervisionView } from '../features/views/AuditSupervisionView';
import { AwardSupervisionView } from '../features/views/AwardSupervisionView';
import { SupplierSupervisionView } from '../features/views/SupplierSupervisionView';
import { SysManageView } from '../features/views/SysManageView';
import { MessageCenterView } from '../features/views/MessageCenterView';
import { ProcurementDocumentView } from '../features/views/ProcurementDocumentView';
import { AnnouncementInvitationView } from '../features/views/AnnouncementInvitationView';
import { RegistrationMaterialView } from '../features/views/RegistrationMaterialView';
import { QuoteProgressView } from '../features/views/QuoteProgressView';
import { ReviewAwardView } from '../features/views/ReviewAwardView';
import { AwardResultView } from '../features/views/AwardResultView';
import { OrderFulfillmentView } from '../features/views/OrderFulfillmentView';
import { SettlementMaterialView } from '../features/views/SettlementMaterialView';
import { SettlementPaymentView } from '../features/views/SettlementPaymentView';
import { SupplierProfileView } from '../features/views/SupplierProfileView';
import { SupplierManagementView } from '../features/views/SupplierManagementView';
import { ItemCatalogView } from '../features/views/ItemCatalogView';
import { OperationLogView } from '../features/views/OperationLogView';
import { IntegrationConfigView } from '../features/views/IntegrationConfigView';
import { ApprovalRuleView } from '../features/views/ApprovalRuleView';
import { RatingTemplateView } from '../features/views/RatingTemplateView';
import { ProcurementRequestCreateView } from '../features/views/ProcurementRequestCreateView';
import { ProcurementRequestDetailView } from '../features/views/ProcurementRequestDetailView';
import { ProjectSourcingView } from '../features/views/ProjectSourcingView';
import { ProjectFulfillmentView } from '../features/views/ProjectFulfillmentView';
import { AwardResultDetailView } from '../features/views/AwardResultDetailView';
import { SupplierCreateView } from '../features/views/SupplierCreateView';
import { SupplierDetailView } from '../features/views/SupplierDetailView';
import { SupplierPortalSectionView } from '../features/views/SupplierPortalSectionView';
import { SupplyMallSectionView } from '../features/views/SupplyMallSectionView';
import { AccountSecurityView } from '../features/views/AccountSecurityView';
import { SupplierOnboardingRegisterView } from '../features/views/SupplierOnboardingRegisterView';
import { ExternalTradeView } from '../features/views/ExternalTradeView';
import { FileCenterView } from '../features/views/FileCenterView';

export function AppShell() {
  const {
    currentUser,
    currentView,
    setCurrentView,
    navigateToPath,
    logout,
    menuConfig
  } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Awaited<ReturnType<typeof loadNotifications>>>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const unreadNotifications = notifications.filter((item) => !item.read);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }
    setLoadingNotifications(true);
    void loadNotifications(currentUser.id)
      .then((items) => setNotifications(items))
      .catch(() => setNotifications([]))
      .finally(() => setLoadingNotifications(false));
  }, [currentUser?.id]);

  const handleMarkNotificationRead = async (messageId: string) => {
    if (!currentUser?.id) return;
    try {
      const updated = await markRuntimeNotificationRead(messageId, currentUser.id);
      setNotifications((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      // ignore read-state refresh failures in topbar
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!currentUser?.id) return;
    const pendingIds = unreadNotifications.map((item) => item.id);
    if (!pendingIds.length) return;
    try {
      const updatedItems = await markNotificationsRead(pendingIds, currentUser.id);
      const updatedMap = new Map(updatedItems.map((item) => [item.id, item]));
      setNotifications((items) => items.map((item) => updatedMap.get(item.id) ?? item));
    } catch {
      // ignore read-state refresh failures in topbar
    }
  };

  if (!currentUser) {
    return <LoginView />;
  }

  const visibleNavItems = getGovernedMenuItems(menuConfig);
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
                    onClick={() => setCurrentView(item.id as ViewState)}
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
                      <button className="text-xs text-[#006666] hover:underline" onClick={() => void handleMarkAllNotificationsRead()}>全部已读</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="px-4 py-4 text-center text-sm text-slate-400">正在加载消息...</div>
                      ) : null}
                      {unreadNotifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">暂无未读消息</div>
                      ) : (
                        unreadNotifications.map((message) => (
                          <div
                            key={message.id}
                            className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => {
                              void handleMarkNotificationRead(message.id).finally(() => {
                                setShowNotifications(false);
                                navigateToPath(message.targetPath || '/messages');
                              });
                            }}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-medium text-slate-800">{message.eventTypeLabel}</span>
                              <span className="text-xs text-slate-400">{message.createdAt.replace('T', ' ').slice(5, 16)}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{message.contentSummary}</p>
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
