import { useEffect, useState } from 'react';
import { apiGet } from '../../../api/http';
import { statusLabelMap } from '../../../utils/status-labels';

export interface WorkbenchProject {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  displayStatus: string;
  buyer: string;
  quoteDeadlineAt: string | null;
  beforeDeadline?: boolean;
  category?: string;
  orgName?: string;
  budgetAmount?: number;
  requestDepartment?: string;
  requesterName?: string;
  receivingLocation?: string;
  expectedArrivalAt?: string;
  externalTradeFlag?: boolean;
}

export interface ProcurementRequestRecord {
  id: string;
  code?: string;
  title: string;
  requestDepartment?: string;
  requesterName?: string;
  budgetLabel?: string;
  budgetAmount?: number;
  purpose?: string;
  expectedArrivalAt?: string;
  receivingLocation?: string;
  lineItems?: Array<{
    id: string;
    itemName: string;
    specification: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice?: number;
  }>;
}

export interface ProcurementDocumentRecord {
  id: string;
  projectId: string;
  title: string;
  versionNo: number;
  status: string;
  reviewStatus?: string;
  contentSummary?: string;
  attachmentMetadata?: Array<{
    id: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    uploadedAt: string;
  }>;
  previousDocumentId?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  lockedAt?: string | null;
}

export interface AnnouncementRecord {
  id: string;
  projectId: string;
  documentId?: string;
  title: string;
  status: string;
  contentSummary?: string;
  scope?: string;
  registrationDeadlineAt?: string | null;
  quoteDeadlineAt?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface InvitationRecord {
  id: string;
  projectId: string;
  announcementId: string;
  supplierId?: string;
  status: string;
  notificationStatus?: string;
  notifiedAt?: string | null;
}

export interface RegistrationRecord {
  id: string;
  projectId: string;
  announcementId: string;
  supplierId: string;
  status: string;
  submittedAt?: string;
  qualifiedAt?: string;
  qualificationReason?: string;
}

export interface SupplierRecord {
  id: string;
  name: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  qualification?: string;
  risk?: string;
  evaluationScore?: number | null;
}

export interface BidRecord {
  id: string;
  supplierId: string;
  supplierName?: string;
  status: string;
  amount?: number;
  submittedAt?: string | null;
  lockedAt?: string | null;
  deliveryDays?: number;
  serviceCommitment?: string;
  lineItems?: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface ScoringSheetRecord {
  id: string;
  expertId: string;
  expertName?: string;
  supplierId: string;
  supplierName?: string;
  technical: number;
  service: number;
  price: number;
  total: number;
  status: string;
  opinion: string;
  versionNo: number;
  submittedAt?: string | null;
  lockedAt?: string | null;
}

export interface ComparisonReportRecord {
  reportNo: string;
  status?: string;
  recommendedSupplierId: string;
  awardReason: string;
  comparisonRows?: Array<{
    supplierId: string;
    supplierName: string;
    amount: number;
    deliveryDays: number;
    finalScore?: number;
    submittedScoreCount?: number;
    rank: number;
    isLowestPrice: boolean;
  }>;
}

export interface AwardApprovalRecord {
  id: string;
  recommendedSupplierId?: string;
  selectedSupplierId: string;
  approvalStatus: string;
  isLowestPrice?: boolean;
  nonLowestPriceReason?: string;
  createdAt?: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
}

export interface PricingReportRecord {
  id: string;
  reportNo: string;
  selectedSupplierId: string;
  status: string;
  items: Array<{
    id: string;
    itemName: string;
    specification?: string;
    purchasePrice: number;
    salePrice: number;
    unit: string;
    effectiveFrom: string;
    effectiveTo?: string;
  }>;
  createdAt: string;
  approvedAt?: string | null;
}

export interface PurchaseOrderRecord {
  id: string;
  orderNo: string;
  supplierId: string;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  expectedDeliveryAt: string;
  receivingLocation: string;
  statusRemark?: string;
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string | null;
  lineItems: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    receivedQuantity: number;
  }>;
}

export interface ReceiptRecord {
  id: string;
  receiptType: string;
  exceptionType?: string;
  summary: string;
  handlingStatus?: string;
  createdAt: string;
}

export interface SupplierEvaluationRecord {
  id: string;
  supplierId: string;
  score: number;
  description: string;
  status: string;
  versionNo: number;
  dimensions: Record<string, number>;
}

export interface SettlementMaterialRecord {
  id: string;
  projectId?: string;
  supplierId?: string;
  purchaseOrderId?: string;
  materialType: string;
  status: string;
  fileName?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationOpinion?: string;
}

export interface ArchiveItemRecord {
  id: string;
  itemName: string;
  requiredFlag: boolean;
  collectedFlag: boolean;
  status: string;
  sealed?: boolean;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  actorId: string;
  result: string;
  createdAt: string;
  reason?: string;
}

export interface ReviewReportRecord {
  id: string;
  reportNo: string;
  status: string;
  generatedAt: string;
  frozenAt?: string | null;
}

export interface ResultNotificationRecord {
  id: string;
  projectId: string;
  awardApprovalId?: string;
  supplierId?: string;
  scope?: string;
  status: string;
  visibilityConfig?: string;
  contentSummary?: string;
  sentAt?: string | null;
  createdAt: string;
}

export interface WorkbenchData {
  project: WorkbenchProject;
  procurementRequest: ProcurementRequestRecord | null;
  procurementDocuments: ProcurementDocumentRecord[];
  announcements: AnnouncementRecord[];
  invitations: InvitationRecord[];
  registrations: RegistrationRecord[];
  suppliers: SupplierRecord[];
  bids: BidRecord[];
  comparisonReport: ComparisonReportRecord | null;
  scoringSheets: ScoringSheetRecord[];
  reviewReports?: ReviewReportRecord[];
  awardApprovals: AwardApprovalRecord[];
  pricingReports?: PricingReportRecord[];
  resultNotifications?: ResultNotificationRecord[];
  purchaseOrders: PurchaseOrderRecord[];
  receiptRecords: ReceiptRecord[];
  supplierEvaluations: SupplierEvaluationRecord[];
  settlementMaterials: SettlementMaterialRecord[];
  archiveItems: ArchiveItemRecord[];
  auditLogs: AuditLogRecord[];
}

export interface SettlementBillRecord {
  id: string;
  billNo: string;
  purchaseOrderId: string;
  purchaseOrderNo?: string;
  projectId: string;
  supplierId: string;
  period: string;
  orderAmount: number;
  receivedAmount: number;
  returnAmount: number;
  serviceFee: number;
  settlementAmount: number;
  status: string;
  createdAt: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvalOpinion?: string;
}

export interface InvoiceRecord {
  id: string;
  settlementBillId: string;
  orderId?: string;
  supplierId: string;
  invoiceNo: string;
  invoiceType?: string;
  issueDate?: string;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  fileName?: string;
  status: string;
  uploadedAt?: string;
  verifiedAt?: string;
  verificationOpinion?: string;
}

export interface ReconciliationLineRecord {
  id: string;
  sourceType: string;
  sourceId: string;
  projectId: string;
  supplierId: string;
  expectedAmount: number;
  actualAmount: number;
  status: string;
  reason?: string;
  updatedAt?: string;
}

export interface FundLedgerEntryRecord {
  id: string;
  ledgerNo: string;
  settlementBillId: string;
  supplierId: string;
  amount: number;
  direction: string;
  entryType: string;
  status: string;
  createdAt: string;
  operatedAt?: string;
  note?: string;
}

export interface SettlementFinanceOverview {
  settlementBills: SettlementBillRecord[];
  settlementMaterials: SettlementMaterialRecord[];
  invoices: InvoiceRecord[];
  reconciliationLines: ReconciliationLineRecord[];
  fundLedgerEntries: FundLedgerEntryRecord[];
}

interface ProjectListItem {
  id: string;
  code?: string;
}

function compareProjectCodeDesc(left: ProjectListItem, right: ProjectListItem) {
  return String(right.code ?? '').localeCompare(String(left.code ?? ''));
}

async function loadLatestProjectId() {
  const data = await apiGet<{ projects: ProjectListItem[] }>('/api/projects');
  return [...(data.projects ?? [])].sort(compareProjectCodeDesc)[0]?.id ?? null;
}

export function useProjectWorkbenchData(preferredProjectId: string | null) {
  const [resolvedProjectId, setResolvedProjectId] = useState<string | null>(preferredProjectId);
  const [workbench, setWorkbench] = useState<WorkbenchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const nextProjectId = preferredProjectId ?? (await loadLatestProjectId());
        if (!active) return;
        if (!nextProjectId) {
          setResolvedProjectId(null);
          setWorkbench(null);
          setError('当前没有可查看的采购项目。');
          return;
        }
        setResolvedProjectId(nextProjectId);
        const data = await apiGet<WorkbenchData>(`/api/project-workbench/projects/${encodeURIComponent(nextProjectId)}`);
        if (!active) return;
        setWorkbench(data);
      } catch (loadError) {
        if (!active) return;
        setWorkbench(null);
        setError(loadError instanceof Error ? loadError.message : '项目工作台加载失败。');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [preferredProjectId, reloadToken]);

  return {
    workbench,
    resolvedProjectId,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1)
  };
}

export function useSettlementFinanceOverview() {
  const [overview, setOverview] = useState<SettlementFinanceOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await apiGet<SettlementFinanceOverview>('/api/settlement-finance/overview');
        if (!active) return;
        setOverview(data);
      } catch (loadError) {
        if (!active) return;
        setOverview(null);
        setError(loadError instanceof Error ? loadError.message : '结算付款台账加载失败。');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [reloadToken]);

  return {
    overview,
    loading,
    error,
    reload: () => setReloadToken((value) => value + 1)
  };
}

export function formatCurrency(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `CNY ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(value?: string | null, withTime = true) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (!withTime) return `${year}-${month}-${day}`;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function humanizeStatus(status?: string | null) {
  const normalized = String(status ?? '').trim();
  if (!normalized) return '-';
  const mapping: Record<string, string> = {
    draft: '草稿',
    reviewing: '审核中',
    locked: '已发布',
    published: '已发布',
    closed: '已关闭',
    voided: '已作废',
    sent: '已发送',
    viewed: '已查看',
    registered: '已报名',
    submitted: '已提交',
    qualified: '已通过',
    rejected: '已驳回',
    generated: '已生成',
    frozen: '已冻结',
    approved: '已批准',
    pending_confirmation: '待供应商确认',
    supplier_confirmed: '供应商已确认',
    performing: '履约中',
    partially_received: '部分收货',
    received: '已收货',
    exception: '异常',
    pending_verification: '待核验',
    verified: '已核验',
    payable: '待付款',
    paid: '已付款',
    payment_reserved: '付款已预留',
    payment_requested: '付款申请中',
    matched: '已对账',
    complete: '已归集',
    collecting: '归集中',
    sealed: '已封存',
    submitted_locked: '已锁定',
    resubmitted_locked: '已重锁',
    admitted: '已准入',
    restricted: '受限',
    assigned: '待专家确认',
    confirmed: '已确认',
    scoring: '评分中',
    completed: '已完成',
    replaced: '已替换',
    archived: '已归档',
    withdrawn: '已撤回',
    resubmitted: '已重新提交',
    pending: '待处理'
  };
  return mapping[normalized] ?? statusLabelMap[normalized] ?? normalized.replaceAll('_', ' ');
}

export function statusBadgeVariant(status?: string | null): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' {
  const normalized = String(status ?? '').trim();
  if (['approved', 'locked', 'published', 'qualified', 'verified', 'received', 'complete', 'sealed', 'submitted_locked', 'resubmitted_locked', 'admitted', 'generated', 'frozen', 'paid', 'matched'].includes(normalized)) {
    return 'success';
  }
  if (['reviewing', 'submitted', 'sent', 'registered', 'pending_confirmation', 'pending_verification', 'collecting', 'payment_requested', 'payment_reserved'].includes(normalized)) {
    return 'warning';
  }
  if (['rejected', 'voided', 'exception', 'restricted'].includes(normalized)) {
    return 'danger';
  }
  if (['performing', 'supplier_confirmed', 'partially_received', 'viewed', 'payable'].includes(normalized)) {
    return 'info';
  }
  if (normalized === 'draft' || normalized === 'closed') {
    return 'outline';
  }
  return 'default';
}

export function projectStageLabel(project: WorkbenchProject) {
  const mapping: Record<string, string> = {
    project_created: '项目已立项',
    document_preparing: '采购文件编制中',
    document_published: '采购文件已发布',
    registration_open: '供应商报名中',
    bidding_open: '报价进行中',
    bidding_locked: '报价已截标',
    expert_reviewing: '专家评审中',
    review_report_frozen: '评审报告已冻结',
    award_approving: '定标审批中',
    awarded_pending_order: '待生成采购订单',
    result_notified: '结果已通知',
    contract_registered: '采购订单已生成',
    performing: '履约中',
    evaluated: '供应商已评价',
    archived: '已归档'
  };
  const mappedStatus = mapping[project.status] ?? statusLabelMap[project.status];
  if (mappedStatus) return mappedStatus;
  if (project.displayStatus && /[\u3400-\u9fff]/.test(project.displayStatus)) return project.displayStatus;
  return humanizeStatus(project.status);
}

export function calculateArchiveCompleteness(workbench: WorkbenchData | null) {
  const total = workbench?.archiveItems.length ?? 0;
  if (total === 0) return 0;
  const collected = workbench?.archiveItems.filter((item) => item.collectedFlag).length ?? 0;
  return Math.round((collected / total) * 100);
}

export interface AwardReadiness {
  ready: boolean;
  blockers: string[];
  hasFrozenSource: boolean;
  validBidCount: number;
}

export function getAwardReadiness(workbench: WorkbenchData): AwardReadiness {
  const blockers: string[] = [];
  const validBidCount = workbench.bids.filter((bid) => ['submitted', 'locked'].includes(bid.status)).length;
  const hasFrozenSource =
    workbench.comparisonReport?.status === 'frozen' ||
    (workbench.reviewReports ?? []).some((report) => report.status === 'frozen');

  if (workbench.project.beforeDeadline) blockers.push('报价尚未截止');
  if (validBidCount === 0) blockers.push('尚无已提交或已锁定的有效报价');
  if (!hasFrozenSource) blockers.push('尚未形成冻结的比价报告或评审报告');

  return {
    ready: blockers.length === 0,
    blockers,
    hasFrozenSource,
    validBidCount
  };
}

export function resolveSupplierName(workbench: WorkbenchData, supplierId?: string | null) {
  if (!supplierId) return '-';
  return (
    workbench.suppliers.find((item) => item.id === supplierId)?.name ??
    workbench.bids.find((item) => item.supplierId === supplierId)?.supplierName ??
    supplierId
  );
}

export function sortByNewest<T>(items: T[], getter: (item: T) => string | null | undefined) {
  return [...items].sort((left, right) => String(getter(right) ?? '').localeCompare(String(getter(left) ?? '')));
}

export function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
