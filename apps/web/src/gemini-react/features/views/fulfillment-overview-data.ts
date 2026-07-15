import { apiGet } from '../../../api/http';

export type FulfillmentOverviewStatus =
  | 'pending_contract_confirmation'
  | 'pending_order_generation'
  | 'pending_supplier_confirmation'
  | 'pending_receipt'
  | 'partially_received'
  | 'exception'
  | 'pending_evaluation'
  | 'completed';

export interface FulfillmentOverviewRow {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  projectStatus: string;
  externalTradeFlag: boolean;
  contractId: string | null;
  contractNo: string | null;
  contractStatus: string | null;
  orderId: string | null;
  orderNo: string | null;
  orderStatus: string | null;
  supplierId: string;
  supplierName: string;
  amount: number;
  expectedDeliveryAt: string | null;
  receiptCount: number;
  hasOpenException: boolean;
  fulfillmentStatus: FulfillmentOverviewStatus;
  nextActionLabel: string;
  lastUpdatedAt?: string;
}

export interface FulfillmentProjectOption {
  id: string;
  code: string;
  name: string;
  status: string;
  fulfillmentStatus: FulfillmentOverviewStatus;
  externalTradeFlag: boolean;
  supplierName: string;
  lastUpdatedAt?: string;
}

export interface FulfillmentOverviewResponse {
  rows: FulfillmentOverviewRow[];
  projectOptions: FulfillmentProjectOption[];
  summary: {
    total: number;
    pending: number;
    exception: number;
    pendingReceipt: number;
    pendingEvaluation: number;
    statusCounts: Record<FulfillmentOverviewStatus, number>;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const fulfillmentStatusMeta: Record<
  FulfillmentOverviewStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' }
> = {
  pending_contract_confirmation: { label: '待确认合同', variant: 'warning' },
  pending_order_generation: { label: '待生成订单', variant: 'info' },
  pending_supplier_confirmation: { label: '待确认订单', variant: 'warning' },
  pending_receipt: { label: '待收货', variant: 'info' },
  partially_received: { label: '部分收货', variant: 'warning' },
  exception: { label: '履约异常', variant: 'danger' },
  pending_evaluation: { label: '待履约评价', variant: 'warning' },
  completed: { label: '已完成', variant: 'success' }
};

export const fulfillmentStatusOptions: Array<{ value: 'all' | FulfillmentOverviewStatus; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'exception', label: '履约异常' },
  { value: 'pending_receipt', label: '待收货' },
  { value: 'partially_received', label: '部分收货' },
  { value: 'pending_evaluation', label: '待履约评价' },
  { value: 'pending_supplier_confirmation', label: '待确认订单' },
  { value: 'pending_order_generation', label: '待生成订单' },
  { value: 'pending_contract_confirmation', label: '待确认合同' },
  { value: 'completed', label: '已完成' }
];

export function loadFulfillmentOverview(
  userId: string,
  query: {
    keyword?: string;
    status?: 'all' | FulfillmentOverviewStatus;
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
  return apiGet<FulfillmentOverviewResponse>(`/api/project-workbench/fulfillment-overview?${params.toString()}`, userId);
}
