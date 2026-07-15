import { apiGet } from '../../../api/http';

export type SettlementOverviewStatus =
  | 'pending_bill_creation'
  | 'pending_materials'
  | 'pending_submission'
  | 'pending_review'
  | 'pending_payment'
  | 'completed';

export interface SettlementOverviewRow {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  projectStatus: string;
  externalTradeFlag: boolean;
  orderId: string;
  orderNo: string;
  orderStatus: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  settlementBillId: string | null;
  settlementBillNo: string | null;
  settlementBillStatus: string | null;
  materialCount: number;
  invoiceCount: number;
  settlementStatus: SettlementOverviewStatus;
  nextActionLabel: string;
  lastUpdatedAt: string | null;
}

export interface SettlementProjectOption {
  id: string;
  code: string;
  name: string;
  status: string;
  settlementStatus: SettlementOverviewStatus;
  externalTradeFlag: boolean;
  supplierName: string;
  settlementBillNo: string | null;
  lastUpdatedAt: string | null;
}

export interface SettlementOverviewResponse {
  rows: SettlementOverviewRow[];
  projectOptions: SettlementProjectOption[];
  summary: {
    total: number;
    pendingBillCreation: number;
    pendingMaterials: number;
    pendingReview: number;
    pendingPayment: number;
    completed: number;
    statusCounts: Record<SettlementOverviewStatus, number>;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const settlementStatusMeta: Record<
  SettlementOverviewStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' }
> = {
  pending_bill_creation: { label: '待生成结算单', variant: 'warning' },
  pending_materials: { label: '待补结算资料', variant: 'danger' },
  pending_submission: { label: '待提交审核', variant: 'info' },
  pending_review: { label: '待审核', variant: 'warning' },
  pending_payment: { label: '待付款', variant: 'info' },
  completed: { label: '已完成', variant: 'success' }
};

export const settlementStatusOptions: Array<{ value: 'all' | SettlementOverviewStatus; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'pending_bill_creation', label: '待生成结算单' },
  { value: 'pending_materials', label: '待补结算资料' },
  { value: 'pending_submission', label: '待提交审核' },
  { value: 'pending_review', label: '待审核' },
  { value: 'pending_payment', label: '待付款' },
  { value: 'completed', label: '已完成' }
];

export function deriveSettlementOverviewStatus(input: {
  billStatus?: string | null;
  materialStatuses?: string[];
  invoiceStatuses?: string[];
  ledgerStatuses?: string[];
}): SettlementOverviewStatus {
  const materialStatuses = input.materialStatuses ?? [];
  const invoiceStatuses = input.invoiceStatuses ?? [];
  const ledgerStatuses = input.ledgerStatuses ?? [];
  if (!input.billStatus) return 'pending_bill_creation';
  if (input.billStatus === 'paid' || ledgerStatuses.includes('paid')) return 'completed';
  if (['approved', 'payable'].includes(input.billStatus)) return 'pending_payment';
  if (input.billStatus === 'submitted' || materialStatuses.includes('pending_verification') || invoiceStatuses.includes('pending_verification')) {
    return 'pending_review';
  }
  if (
    materialStatuses.length === 0 ||
    invoiceStatuses.length === 0 ||
    materialStatuses.includes('rejected') ||
    invoiceStatuses.includes('rejected')
  ) {
    return 'pending_materials';
  }
  return 'pending_submission';
}

export function loadSettlementOverview(
  userId: string,
  query: {
    keyword?: string;
    status?: 'all' | SettlementOverviewStatus;
    onlyPending?: boolean;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const params = new URLSearchParams();
  if (query.keyword?.trim()) params.set('keyword', query.keyword.trim());
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.onlyPending) params.set('onlyPending', 'true');
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(query.pageSize ?? 20));
  return apiGet<SettlementOverviewResponse>(`/api/project-workbench/settlement-overview?${params.toString()}`, userId);
}
