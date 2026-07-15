export type Role =
  | 'GROUP_PROCUREMENT_MANAGER'
  | 'PROCUREMENT_AGENT'
  | 'HOTEL_PROCUREMENT'
  | 'HOTEL_FINANCE'
  | 'PLATFORM_OPERATIONS'
  | 'SUPPLIER'
  | 'SUPPLIER_ADMIN'
  | 'SUPPLIER_BIDDER'
  | 'EXPERT'
  | 'FINANCE_REVIEWER'
  | 'DISCIPLINARY_AUDIT'
  | 'SYSTEM_ADMIN';

export const RoleNames: Record<Role, string> = {
  GROUP_PROCUREMENT_MANAGER: '集团采购管理人',
  PROCUREMENT_AGENT: '采购经办人',
  HOTEL_PROCUREMENT: '酒店采购',
  HOTEL_FINANCE: '酒店财务',
  PLATFORM_OPERATIONS: '平台运营',
  SUPPLIER: '供应商',
  SUPPLIER_ADMIN: '供应商管理员',
  SUPPLIER_BIDDER: '供应商报价人员',
  EXPERT: '专家',
  FINANCE_REVIEWER: '财务审核',
  DISCIPLINARY_AUDIT: '纪检审计',
  SYSTEM_ADMIN: '系统管理员',
};

export type ProjectStage =
  | 'REQUEST' // 采购申请
  | 'INITIATION' // 项目立项
  | 'DOCUMENT' // 采购文件
  | 'ANNOUNCEMENT' // 公告邀请
  | 'REGISTRATION' // 报名资料
  | 'BIDDING' // 报价响应 (Pre-deadline)
  | 'REVIEW' // 专家评审
  | 'AWARD' // 定标审批
  | 'FULFILLMENT' // 订单履约
  | 'SETTLEMENT' // 结算资料
  | 'ARCHIVE' // 项目档案
  | 'EXTERNAL_FILED'; // 外部交易备案

export const StageNames: Record<ProjectStage, string> = {
  REQUEST: '采购申请',
  INITIATION: '项目立项',
  DOCUMENT: '采购文件',
  ANNOUNCEMENT: '公告邀请',
  REGISTRATION: '报名资料',
  BIDDING: '报价响应',
  REVIEW: '专家评审',
  AWARD: '定标审批',
  FULFILLMENT: '订单履约',
  SETTLEMENT: '结算资料',
  ARCHIVE: '项目档案',
  EXTERNAL_FILED: '外部交易备案',
};

export interface Project {
  id: string;
  code: string;
  name: string;
  type: string;
  method: string;
  stage: ProjectStage;
  organization: string;
  agent: string;
  budget: number;
  bidDeadline?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  archiveCompleteness: number;
  isExternal: boolean;
  externalDetails?: {
    platformName: string;
    projectCode: string;
  };
}

export interface User {
  id: string;
  name: string;
  role: Role;
  organization: string;
}

export type ViewState =
  | 'LOGIN'
  | 'DASHBOARD'
  | 'TODO'
  | 'MESSAGES'
  | 'PROJECTS'
  | 'PROJECT_DETAIL'
  | 'PURCHASE_REQUEST'
  | 'PROCUREMENT_DOCUMENT'
  | 'ANNOUNCEMENT'
  | 'QUOTE_RESPONSE'
  | 'EXPERT_RATING'
  | 'AUDIT_LOG'
  | 'SYSTEM_SETTINGS'
  | 'APPROVAL_RULES'
  | 'REQUEST_APPROVE'
  | 'QUOTE_PROGRESS'
  | 'EXPERT_DIRECTORY'
  | 'REVIEW_AWARD'
  | 'RATING_TEMPLATE'
  | 'AWARD_APPROVE'
  | 'SUPPLIERS'
  | 'ITEM_CATALOG'
  | 'ORDER_FULFILLMENT'
  | 'SETTLEMENT'
  | 'PAYMENT_PROGRESS'
  | 'ITEM_MAINTENANCE'
  | 'SUPPLIER_PROFILE'
  | 'REGISTRATION'
  | 'AWARD_RESULT'
  | 'SETTLEMENT_MATS'
  | 'AUDIT_SUPERVISION'
  | 'AWARD_SUPERVISION'
  | 'SUPPLIER_SUPERVISION'
  | 'OPERATION_LOGS'
  | 'INTEGRATION'
  | 'SYS_MANAGE'
  | 'PROCUREMENT_REQUEST_CREATE'
  | 'PROCUREMENT_REQUEST_DETAIL'
  | 'PROJECT_SOURCING'
  | 'PROJECT_FULFILLMENT'
  | 'AWARD_RESULT_DETAIL'
  | 'SUPPLIER_CREATE'
  | 'SUPPLIER_DETAIL'
  | 'SUPPLIER_PORTAL'
  | 'SUPPLY_MALL'
  | 'ACCOUNT_SECURITY'
  | 'SUPPLIER_ONBOARDING'
  | 'EXTERNAL_TRADE'
  | 'FILE_CENTER';
