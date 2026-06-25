export type RoleId =
  | "group_manager"
  | "buyer"
  | "hotel_buyer"
  | "hotel_finance"
  | "platform_operator"
  | "supplier"
  | "supplier_admin"
  | "supplier_quotation"
  | "expert"
  | "finance_reviewer"
  | "auditor"
  | "admin"
  | "system";

export interface Organization {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
  status?: "active" | "disabled";
}

export interface Role {
  id: RoleId;
  name: string;
  hint: string;
}

export interface User {
  id: string;
  name: string;
  roleId: RoleId;
  orgId: string;
  status?: "active" | "disabled" | "suspended" | "offboarded";
  departmentId?: string;
  position?: string;
  orgScope?: string[];
  supplierId?: string;
  expertId?: string;
  managedProjectIds?: string[];
}

export interface AuthContext {
  user: User;
  roleId: RoleId;
  orgScope: string[];
}

export interface Supplier {
  id: string;
  name: string;
  status: string;
  admissionStatus?: "pending" | "admitted" | "rejected" | "restricted" | "inactive";
  admissionLevel?: "trial" | "regular" | "preferred" | "blacklisted";
  admissionRuleCode?: string;
  admissionRuleSnapshot?: SupplierAdmissionRuleSnapshot;
  regularizedAt?: string;
  periodicAssessment?: SupplierPeriodicAssessment;
  registrationTrace?: SupplierRegistrationTrace;
  supplierType?: string;
  supplierSource?: string;
  socialCreditCode?: string;
  businessLicenseNo?: string;
  legalRepresentative?: string;
  registeredAddress?: string;
  businessScope?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  serviceRegions?: SupplierServiceRegion[];
  admissionReviews?: SupplierAdmissionReview[];
  sealSamples?: SupplierSealSample[];
  categoryAuth: string[];
  categoryAuthorizations?: SupplierCategoryAuthorization[];
  qualification: string;
  qualificationAttachments?: SupplierQualificationAttachment[];
  risk: string;
  restrictionReason?: string;
  restrictedAt?: string;
  evaluationScore: number | null;
}

export interface SupplierAdmissionReview {
  id: string;
  reviewType: "qualification_initial_review" | "admission_assessment" | "regularization_review" | "periodic_assessment";
  status: "pending" | "passed" | "rejected";
  score?: number;
  scoreTemplateCode?: string;
  scoreItems?: SupplierAdmissionScoreItem[];
  regularizationDecision?: "trial" | "regular" | "preferred" | "blacklisted";
  reviewer: string;
  opinion: string;
  reviewedAt: string;
}

export interface SupplierAdmissionScoreItem {
  id: string;
  name: string;
  weight: number;
  score: number;
  comment?: string;
}

export interface SupplierAdmissionRuleSnapshot {
  scoreTemplateCode: string;
  passScore: number;
  regularScore: number;
  preferredScore: number;
  blacklistBelowScore: number;
  cycleDays: number;
  templateItems: Array<{ id: string; name: string; weight: number }>;
}

export interface SupplierPeriodicAssessment {
  cycle: "monthly" | "quarterly" | "yearly";
  lastAssessedAt?: string;
  nextDueAt: string;
  latestScore?: number;
  latestResult?: "pending" | "passed" | "warning" | "blacklisted";
}

export interface SupplierRegistrationTrace {
  submittedAt: string;
  agreementAcceptedAt: string;
  captchaProvider: "local_mock";
  captchaVerified: boolean;
  realNameProvider: "local_mock";
  realNameVerified: boolean;
  adapterBoundary: string;
  adminUserId?: string;
  quotationUserId?: string;
}

export interface SupplierServiceRegion {
  id: string;
  region: string;
  storeName: string;
  category: string;
  status: "active" | "suspended";
}

export interface SupplierSealSample {
  id: string;
  sampleName: string;
  specification: string;
  confirmedBy: string;
  confirmedAt: string;
  fileId?: string;
  fileName?: string;
  contentType?: string;
  uploadedAt?: string;
  imageFileName?: string;
}

export interface SupplierCategoryAuthorization {
  category: string;
  status: "active" | "suspended";
  authorizedAt: string;
  expiresAt?: string;
}

export interface SupplierQualificationAttachment {
  id: string;
  fileName: string;
  qualificationType: string;
  validUntil?: string;
  uploadedAt: string;
}

export type ProcurementRequestStatus = "draft" | "submitted" | "method_decided" | "project_created" | "cancelled";

export const procurementRequestStatuses = ["draft", "submitted", "method_decided", "project_created", "cancelled"] as const satisfies readonly ProcurementRequestStatus[];

export type ProcurementRequestApprovalStatus = "draft" | "submitted" | "in_review" | "approved" | "rejected" | "cancelled";

export const procurementRequestApprovalStatuses = ["draft", "submitted", "in_review", "approved", "rejected", "cancelled"] as const satisfies readonly ProcurementRequestApprovalStatus[];

export type InternalProjectStatus =
  | "draft"
  | "request_submitted"
  | "method_decided"
  | "project_created"
  | "document_preparing"
  | "document_published"
  | "registration_open"
  | "bidding_open"
  | "bidding_locked"
  | "expert_reviewing"
  | "review_report_frozen"
  | "award_approving"
  | "awarded_pending_order"
  | "result_notified"
  | "contract_registered"
  | "performing"
  | "evaluated"
  | "archived"
  | "closed"
  | "cancelled";

export const internalProjectStatuses = [
  "draft",
  "request_submitted",
  "method_decided",
  "project_created",
  "document_preparing",
  "document_published",
  "registration_open",
  "bidding_open",
  "bidding_locked",
  "expert_reviewing",
  "review_report_frozen",
  "award_approving",
  "awarded_pending_order",
  "result_notified",
  "contract_registered",
  "performing",
  "evaluated",
  "archived",
  "closed",
  "cancelled"
] as const satisfies readonly InternalProjectStatus[];

export type ExternalProjectStatus =
  | "external_draft"
  | "internal_approval_recorded"
  | "external_project_recorded"
  | "external_announcement_uploaded"
  | "external_result_uploaded"
  | "external_result_recorded"
  | "external_contract_registered"
  | "external_performing"
  | "external_evaluated"
  | "external_archived"
  | "external_closed";

export const externalProjectStatuses = [
  "external_draft",
  "internal_approval_recorded",
  "external_project_recorded",
  "external_announcement_uploaded",
  "external_result_uploaded",
  "external_result_recorded",
  "external_contract_registered",
  "external_performing",
  "external_evaluated",
  "external_archived",
  "external_closed"
] as const satisfies readonly ExternalProjectStatus[];

export type BidStatus = "draft" | "submitted" | "withdrawn" | "resubmitted" | "locked" | "invalid" | "archived";

export const bidStatuses = ["draft", "submitted", "withdrawn", "resubmitted", "locked", "invalid", "archived"] as const satisfies readonly BidStatus[];

export type ScoringSheetStatus =
  | "assigned"
  | "avoidance_pending"
  | "discipline_pending"
  | "confidentiality_pending"
  | "scoring"
  | "saved"
  | "submitted_locked"
  | "reevaluation_requested"
  | "reevaluation_approved"
  | "resubmitted_locked"
  | "replaced"
  | "archived";

export const scoringSheetStatuses = [
  "assigned",
  "avoidance_pending",
  "discipline_pending",
  "confidentiality_pending",
  "scoring",
  "saved",
  "submitted_locked",
  "reevaluation_requested",
  "reevaluation_approved",
  "resubmitted_locked",
  "replaced",
  "archived"
] as const satisfies readonly ScoringSheetStatus[];

export type BidViewApprovalStatus = "draft" | "submitted" | "approved" | "rejected" | "active" | "expired" | "revoked" | "archived";

export const bidViewApprovalStatuses = ["draft", "submitted", "approved", "rejected", "active", "expired", "revoked", "archived"] as const satisfies readonly BidViewApprovalStatus[];

export type ArchiveStatus =
  | "collecting"
  | "checking"
  | "incomplete"
  | "complete"
  | "sealed"
  | "supplement_requested"
  | "supplement_approved"
  | "supplement_rejected"
  | "supplemented"
  | "archived";

export const archiveStatuses = [
  "collecting",
  "checking",
  "incomplete",
  "complete",
  "sealed",
  "supplement_requested",
  "supplement_approved",
  "supplement_rejected",
  "supplemented",
  "archived"
] as const satisfies readonly ArchiveStatus[];

export interface ProcurementProject {
  id: string;
  code: string;
  sourceRequestId?: string;
  name: string;
  orgId: string;
  orgName: string;
  type: string;
  status: InternalProjectStatus | ExternalProjectStatus;
  displayStatus: string;
  category: string;
  budgetLabel?: string;
  budgetAmount?: number;
  requestDepartment?: string;
  requesterName?: string;
  receivingLocation?: string;
  expectedArrivalAt?: string;
  buyer: string;
  attachments?: ProcurementDocumentAttachment[];
  sourceLineItems?: ProcurementRequestLineItem[];
  quoteDeadlineAt: string | null;
  beforeDeadline: boolean;
  qualificationRequirements?: string[];
  quoteRequirements?: string[];
  deliveryRequirements?: string[];
  clarificationRecords?: ProjectClarificationRecord[];
  externalTradeFlag: boolean;
  participantSupplierIds: string[];
  assignedExpertIds: string[];
}

export interface ProjectClarificationRecord {
  id: string;
  question: string;
  answer: string;
  supplierId?: string;
  visibility: "public_to_invited" | "supplier_self";
  status?: "open" | "answered";
  askedAt?: string;
  answeredBy: string;
  answeredAt: string;
  questionAttachments?: ProcurementDocumentAttachment[];
  answerAttachments?: ProcurementDocumentAttachment[];
  notificationTrace?: {
    eventType: string;
    recipientScope: string;
    notifiedAt: string;
    adapterStatus: "local_message_recorded" | "external_pending";
  };
}

export interface ProjectSampleReceipt {
  id: string;
  projectId: string;
  supplierId: string;
  sampleName: string;
  quantity: number;
  status: "received" | "returned" | "discarded";
  receivedBy: string;
  receivedAt: string;
  returnRequired?: boolean;
  returnedBy?: string;
  returnedAt?: string;
  attachmentMetadata?: ProcurementDocumentAttachment[];
  handlingNote?: string;
}

export interface ProcurementRequest {
  id: string;
  code?: string;
  projectId: string | null;
  title: string;
  orgId: string;
  requestDepartment?: string;
  requesterName?: string;
  category?: string;
  description?: string;
  budgetLabel: string;
  budgetAmount?: number;
  purpose?: string;
  expectedArrivalAt?: string;
  receivingLocation?: string;
  lineItems?: ProcurementRequestLineItem[];
  attachments?: ProcurementDocumentAttachment[];
  methodSuggestion: string;
  methodRuleId?: string;
  externalTradeFlag: boolean;
  status?: ProcurementRequestStatus;
  approvalStatus: ProcurementRequestApprovalStatus;
  approvalOpinion?: string;
  approvalBy?: string;
  approvedAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementRequestLineItem {
  id: string;
  itemName: string;
  category?: string;
  specification: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice?: number;
  budgetAmount?: number;
  requiredByDate?: string;
  remark?: string;
}

export interface ProcurementMethodRule {
  id: string;
  ruleCode: string;
  ruleName: string;
  conditionJson: Record<string, unknown>;
  resultMethod: string;
  status: string;
  versionNo: number;
}

export type ApprovalBusinessType =
  | "procurement_request"
  | "award_approval"
  | "archive_supplement"
  | "price_approval"
  | "mall_order"
  | "settlement_bill"
  | "invoice"
  | "payment_request"
  | "return_request"
  | "expert_scoring";

export interface ApprovalRule {
  id: string;
  ruleCode: string;
  ruleName: string;
  businessType: ApprovalBusinessType;
  amountMin?: number;
  amountMax?: number;
  methodTypes: string[];
  nodeRoleIds: RoleId[];
  actions: string[];
  orgScope?: string[];
  hotelScope?: string[];
  approvalOrder?: RoleId[];
  defaultStrategy?: "manual_review_required" | "reject_without_rule";
  status: "enabled" | "disabled";
  versionNo: number;
  updatedAt: string;
}

export type ApprovalInstanceStatus = "submitted" | "in_review" | "approved" | "rejected" | "returned" | "revoked" | "cancelled" | "manual_review_required";
export type WorkflowTaskStatus = "pending" | "completed" | "cancelled";

export interface ApprovalInstance {
  id: string;
  businessType: ApprovalBusinessType;
  businessId: string;
  businessTitle: string;
  projectId?: string;
  orgId?: string;
  supplierId?: string;
  ruleId?: string;
  ruleCode?: string;
  currentNodeIndex: number;
  currentRoleId?: RoleId;
  currentUserId?: string;
  approvalStatus: ApprovalInstanceStatus;
  startedBy?: string;
  startedAt?: string;
  completedBy?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface WorkflowTask {
  id: string;
  taskCode: string;
  taskType: string;
  businessType: ApprovalBusinessType;
  businessId: string;
  projectId?: string;
  title: string;
  assigneeRoleId?: RoleId;
  assigneeUserId?: string;
  supplierId?: string;
  orgId?: string;
  approvalInstanceId?: string;
  status: WorkflowTaskStatus;
  dueAt?: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
  sourceJson?: Record<string, unknown>;
  updatedAt: string;
}

export interface WorkflowNotification {
  id: string;
  messageCode: string;
  eventType: string;
  businessType: ApprovalBusinessType;
  businessId: string;
  projectId?: string;
  recipientUserId?: string;
  recipientRoleId?: RoleId;
  supplierId?: string;
  orgId?: string;
  title: string;
  contentSummary: string;
  read: boolean;
  createdAt: string;
  readAt?: string;
  deliveryChannels: string[];
  externalEventStatus: "not_dispatched" | "queued" | "dispatched" | "failed";
  sourceJson?: Record<string, unknown>;
  updatedAt: string;
}

export interface ProcurementProjectPackage {
  id: string;
  projectId: string;
  packageCode: string;
  packageName: string;
  status: string;
}

export type ProcurementDocumentStatus = "draft" | "reviewing" | "locked" | "voided";
export type ProcurementDocumentReviewStatus = "draft" | "submitted" | "approved" | "voided";

export interface ProcurementDocumentAttachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface ProcurementDocument {
  id: string;
  projectId: string;
  title: string;
  versionNo: number;
  status: ProcurementDocumentStatus;
  reviewStatus: ProcurementDocumentReviewStatus;
  contentSummary: string;
  attachmentMetadata: ProcurementDocumentAttachment[];
  previousDocumentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  lockedAt: string | null;
}

export type ProcurementAnnouncementStatus = "draft" | "published" | "closed";
export type ProcurementAnnouncementScope = "public_internal" | "invited_suppliers";

export interface ProcurementAnnouncement {
  id: string;
  projectId: string;
  documentId: string;
  title: string;
  contentSummary: string;
  procurementMethod: string;
  methodFields?: Record<string, string | number | boolean | null>;
  noticeTemplateCode?: string;
  supplierInstructions?: string;
  evaluationMethod?: string;
  requiredFileRules?: Array<{ id: string; name: string; required: boolean; fileType?: string }>;
  abandonmentRules?: { allowedBeforeDeadline: boolean; reasonRequired: boolean; noticeScope: "buyer_only" | "buyer_and_invited" };
  sampleRules?: { required: boolean; receiveLocation?: string; returnRequired?: boolean };
  scope: ProcurementAnnouncementScope;
  status: ProcurementAnnouncementStatus;
  registrationDeadlineAt: string;
  quoteDeadlineAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export type SupplierInvitationStatus = "created" | "sent" | "viewed" | "registered";

export interface SupplierInvitation {
  id: string;
  projectId: string;
  announcementId: string;
  supplierId: string;
  status: SupplierInvitationStatus;
  notificationStatus: "pending" | "sent";
  notifiedAt: string | null;
  createdAt: string;
}

export type SupplierRegistrationStatus = "submitted" | "qualified" | "rejected";

export interface SupplierRegistration {
  id: string;
  projectId: string;
  announcementId: string;
  supplierId: string;
  status: SupplierRegistrationStatus;
  materialMetadata: ProcurementDocumentAttachment[];
  supplementMaterialMetadata?: ProcurementDocumentAttachment[];
  submittedAt: string;
  qualifiedAt?: string;
  qualificationReason?: string;
}

export type InquirySheetStatus = "draft" | "published" | "round_open" | "priced" | "closed";

export interface InquirySheet {
  id: string;
  projectId: string;
  inquiryNo: string;
  title: string;
  supplierIds: string[];
  currentRound: number;
  maxRounds: number;
  quoteRuleConfig: {
    taxIncluded: boolean;
    allowAlternativeBrand: boolean;
    priceVisibleAfterDeadline: boolean;
    requireDeliveryDays: boolean;
  };
  pricingDecision?: {
    selectedSupplierId: string;
    pricingMethod: string;
    effectiveFrom: string;
    effectiveTo?: string;
    decisionSummary: string;
    decidedBy: string;
    decidedAt: string;
  };
  status: InquirySheetStatus;
  deadlineAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  projectId: string;
  supplierId: string;
  amount: number;
  taxRate?: number | null;
  taxInclusive?: boolean;
  taxNote?: string;
  lineItems?: BidLineItem[];
  deliveryDays?: number;
  responseSummary?: string;
  serviceCommitment?: string;
  status: BidStatus;
  submittedAt: string | null;
  quoteDeadlineAt: string;
  lockedAt: string | null;
  fileId: string;
  fileName: string;
  versionNo?: number;
  withdrawnAt?: string | null;
  withdrawalReason?: string;
  abandonedAt?: string | null;
  abandonmentReason?: string;
  responseFileMetadata?: ProcurementDocumentAttachment[];
}

export interface BidLineItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  totalPrice: number;
  deliveryDays: number;
}

export interface BidVersion {
  id: string;
  bidId: string;
  projectId: string;
  supplierId: string;
  versionNo: number;
  amount: number;
  taxRate?: number | null;
  taxInclusive?: boolean;
  taxNote?: string;
  deliveryDays?: number;
  responseSummary?: string;
  serviceCommitment?: string;
  status: BidStatus;
  responseFileMetadata: ProcurementDocumentAttachment[];
  snapshotJson: Record<string, unknown>;
  createdAt: string;
  reason: string;
}

export interface BidViewApproval {
  id: string;
  projectId: string;
  applicantId: string;
  targetSupplierId: string;
  viewContent: BidViewContent;
  allowDownload: boolean;
  validFrom: string;
  validUntil: string;
  approvalStatus: BidViewApprovalStatus;
}

export type BidViewContent = "amount" | "response_file_metadata" | "response_file_download";

export interface BidViewLog {
  id: string;
  approvalId?: string;
  actorId: string;
  projectId: string;
  supplierId: string;
  content: string;
  downloadFlag: boolean;
  result: "allowed" | "denied";
  outOfScopeReason?: string;
  createdAt: string;
}

export interface Expert {
  id: string;
  name: string;
  category: string;
  status: string;
  accountUserIds?: string[];
  avoidanceTags?: string[];
  maintainedAt?: string;
  maintenanceLog?: string;
}

export interface ExpertAssignment {
  id: string;
  projectId: string;
  expertId: string;
  method: string;
  status: string;
  avoidanceConfirmed: boolean;
  disciplineConfirmed: boolean;
  confidentialityConfirmed: boolean;
  reason?: string;
  replacedByExpertId?: string;
  replacementReason?: string;
  notifiedAt?: string | null;
  createdAt?: string;
  confirmedAt?: string | null;
}

export interface ScoringTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  versionNo: number;
  status: string;
  configJson: Record<string, unknown>;
}

export interface ScoringSheet {
  id: string;
  projectId: string;
  expertId: string;
  supplierId: string;
  templateId: string;
  technical: number;
  service: number;
  price: number;
  total: number;
  status: ScoringSheetStatus;
  opinion: string;
  versionNo: number;
  submittedAt: string | null;
  lockedAt: string | null;
  details?: Record<string, number>;
}

export interface ScoringVersion {
  id: string;
  sheetId: string;
  versionNo: number;
  reason: string;
  approvalStatus: string;
  snapshotJson: Record<string, unknown>;
  createdAt: string;
}

export interface ReviewReport {
  id: string;
  projectId: string;
  reportNo: string;
  status: "draft" | "generated" | "frozen";
  summaryJson: Record<string, unknown>;
  snapshotJson: Record<string, unknown>;
  generatedAt: string;
  frozenAt: string | null;
  createdBy: string;
}

export interface ComparisonReport {
  id: string;
  projectId: string;
  reportNo: string;
  status: "draft" | "generated" | "frozen";
  comparisonRows: ComparisonReportRow[];
  recommendedSupplierId: string;
  awardReason: string;
  nonLowestPriceReason?: string;
  generatedBy: string;
  generatedAt: string;
  frozenAt: string | null;
}

export interface ComparisonReportRow {
  supplierId: string;
  supplierName: string;
  amount: number;
  deliveryDays: number;
  serviceCommitment: string;
  technicalScore?: number;
  serviceScore?: number;
  priceScore?: number;
  expertTotalScore?: number;
  finalScore?: number;
  submittedScoreCount?: number;
  rank: number;
  isLowestPrice: boolean;
}

export interface AwardApproval {
  id: string;
  projectId: string;
  recommendedSupplierId: string;
  selectedSupplierId: string;
  isLowestPrice: boolean;
  nonLowestPriceReason?: string;
  approvalStatus: "draft" | "submitted" | "approved" | "rejected";
  approvalOpinion?: string;
  adapterCallId?: string;
  createdBy: string;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
}

export interface PricingReportItem {
  id: string;
  productId?: string;
  itemName: string;
  specification?: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  serviceFeeRate: number;
  grossMarginRate: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface PricingReport {
  id: string;
  projectId: string;
  awardApprovalId: string;
  sourceReportId: string;
  selectedSupplierId: string;
  reportNo: string;
  status: "draft" | "generated" | "approved" | "voided";
  items: PricingReportItem[];
  basisJson: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
}

export interface ResultNotification {
  id: string;
  projectId: string;
  awardApprovalId?: string;
  supplierId?: string;
  scope: "supplier_self" | "internal_publicity";
  status: "draft" | "sent";
  visibilityConfig: "supplier_self_only" | "show_winner_name";
  contentSummary: string;
  sentAt: string | null;
  adapterCallId?: string;
  createdBy: string;
  createdAt: string;
}

export interface InternalPublicityRecord {
  id: string;
  projectId: string;
  awardApprovalId: string;
  status: "draft" | "published";
  visibilityConfig: "internal_only" | "supplier_self_only";
  publishedAt: string | null;
  contentSummary: string;
  createdBy: string;
  createdAt: string;
}

export interface ExternalTradeRecord {
  id: string;
  projectId: string;
  externalPlatformName: string;
  externalProjectCode: string;
  internalApprovalStatus: "draft" | "recorded";
  internalApprovalOpinion?: string;
  announcementMaterialMetadata: ProcurementDocumentAttachment[];
  resultMaterialMetadata: ProcurementDocumentAttachment[];
  resultRecordStatus: "draft" | "recorded";
  status: ExternalProjectStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractLedger {
  id: string;
  projectId: string;
  supplierId: string;
  contractNo: string;
  amount: number;
  status: "registered" | "performing" | "completed" | "cancelled";
  contractSystemLink?: string;
  attachmentMetadata: ProcurementDocumentAttachment[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceNode {
  id: string;
  contractId: string;
  projectId: string;
  supplierId: string;
  nodeName: string;
  planDate: string;
  status: "planned" | "completed" | "exception";
  acceptanceRecord?: string;
  paymentRecord?: string;
  exceptionNote?: string;
  attachmentMetadata: ProcurementDocumentAttachment[];
  updatedBy: string;
  updatedAt: string;
}

export interface AcceptancePaymentRecord {
  id: string;
  contractId: string;
  projectId: string;
  supplierId: string;
  recordType: "acceptance" | "payment";
  status: "draft" | "recorded";
  amount?: number;
  summary: string;
  attachmentMetadata: ProcurementDocumentAttachment[];
  createdBy: string;
  createdAt: string;
}

export type SupplierEvaluationStatus = "submitted_locked" | "superseded";

export interface SupplierEvaluationDimensions {
  quality: number;
  delivery: number;
  service: number;
  cooperation: number;
  priceReasonableness: number;
}

export interface SupplierEvaluation {
  id: string;
  supplierId: string;
  projectId: string;
  contractId?: string;
  purchaseOrderId?: string;
  dimensions: SupplierEvaluationDimensions;
  score: number;
  status: SupplierEvaluationStatus;
  versionNo: number;
  description: string;
  improvementSuggestion?: string;
  performanceExceptionRef?: string;
  correctionReason?: string;
  previousEvaluationId?: string;
  lockedAt: string;
  createdBy: string;
  createdAt: string;
}

export type PurchaseOrderStatus =
  | "pending_confirmation"
  | "supplier_confirmed"
  | "performing"
  | "partially_received"
  | "received"
  | "exception"
  | "closed";

export interface PurchaseOrder {
  id: string;
  projectId: string;
  supplierId: string;
  contractId?: string;
  sourceRequestId?: string;
  awardApprovalId?: string;
  selectedBidId?: string;
  orderNo: string;
  status: PurchaseOrderStatus;
  paymentStatus?: string;
  buyerId?: string;
  orgId?: string;
  departmentId?: string;
  totalAmount: number;
  lineItems: PurchaseOrderLineItem[];
  deliveryDays?: number;
  expectedDeliveryAt: string;
  receivingLocation: string;
  invoiceTitle?: string;
  statusRemark?: string;
  confirmedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLineItem {
  id: string;
  productId?: string;
  skuId?: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  totalPrice: number;
  receivedQuantity: number;
  priceSourceType?: "pricing_report" | "supplier_quotation";
  priceSourceId?: string;
  priceSourceItemId?: string;
}

export type ReceiptExceptionType = "quantity_mismatch" | "quality_issue" | "delivery_delay" | "missing_documents" | "other";

export type ReceiptHandlingStatus = "none" | "pending_resolution" | "supplemented" | "rejected" | "closed";

export interface ReceiptRecord {
  id: string;
  purchaseOrderId: string;
  projectId: string;
  supplierId: string;
  receiptType: "partial" | "full" | "exception";
  exceptionType?: ReceiptExceptionType;
  acceptanceResult: "accepted" | "accepted_with_exception" | "rejected";
  status: "recorded";
  handlingStatus: ReceiptHandlingStatus;
  receivedItems: ReceiptLineItem[];
  summary: string;
  receiptAt: string;
  operatorId: string;
  handledBy?: string;
  handledAt?: string;
  handlingNote?: string;
  attachmentMetadata: ProcurementDocumentAttachment[];
  createdBy: string;
  createdAt: string;
}

export interface ReceiptLineItem {
  itemName: string;
  receivedQuantity: number;
  unit: string;
  accepted: boolean;
}

export type SettlementMaterialType = "invoice" | "delivery_note" | "acceptance_record" | "other";

export type SettlementMaterialStatus = "pending_verification" | "verified" | "rejected";

export interface SettlementMaterial {
  id: string;
  purchaseOrderId: string;
  projectId: string;
  supplierId: string;
  materialType: SettlementMaterialType;
  status: SettlementMaterialStatus;
  fileId?: string;
  fileName?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationOpinion?: string;
}

export interface ArchiveTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  versionNo: number;
  status: string;
  items: string[];
}

export interface ArchiveItem {
  id: string;
  projectId: string;
  itemName: string;
  requiredFlag: boolean;
  collectedFlag: boolean;
  sealed: boolean;
  status: ArchiveStatus;
  snapshotJson: Record<string, unknown>;
}

export interface ArchiveSupplementRequest {
  id: string;
  projectId: string;
  archiveItemId: string;
  reason: string;
  approvalStatus: "draft" | "submitted" | "approved" | "rejected";
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  appliedBy?: string;
  appliedAt?: string;
  auditLogId?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  roleId: RoleId;
  orgId: string;
  projectId?: string;
  action: string;
  objectType: string;
  objectId: string;
  result: "allowed" | "denied" | "recorded";
  reason?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface PermissionDenied {
  code: string;
  message: string;
  auditLogId: string;
}

export interface MallProduct {
  id: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  skuCode: string;
  specification: string;
  packingQuantity?: number;
  minOrderQty?: number;
  maxOrderQty?: number;
  taxRate?: number;
  invoiceName?: string;
  taxClassificationCode?: string;
  detailDescription?: string;
  acceptanceGuide?: string;
  installationRequirement?: string;
  tags?: string[];
  status: "draft" | "listed" | "delisted";
  supplierId: string;
  serviceRegions: string[];
  procurementCategory?: string;
  imageFileIds: string[];
  attachmentFileIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MallPrice {
  id: string;
  productId: string;
  supplierId: string;
  price: number;
  purchasePrice?: number;
  salePrice?: number;
  taxRate?: number;
  deliveryDays?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  approvalStatus: "draft" | "submitted" | "approved" | "rejected" | "expired";
  versionNo: number;
  createdBy: string;
  createdAt: string;
}

export interface MallCartItem {
  id: string;
  buyerId: string;
  productId: string;
  quantity: number;
  updatedAt: string;
}

export interface MallOrder {
  id: string;
  orderNo: string;
  buyerId: string;
  orgId: string;
  supplierId: string;
  status: "submitted" | "supplier_confirmed" | "shipped" | "received" | "return_requested" | "return_approved" | "return_rejected" | "closed";
  lineItems: MallOrderLineItem[];
  totalAmount: number;
  shippingAddress: string;
  invoiceTitle: string;
  sourceOrderId?: string;
  contractViewId?: string;
  paymentStatus?: "payment_reserved" | "paid" | "released" | "reversed";
  paymentReservedAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MallOrderLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface MallShipment {
  id: string;
  orderId: string;
  supplierId: string;
  carrier: string;
  trackingNo: string;
  status: "shipped" | "received";
  shippedAt: string;
  receivedAt?: string;
}

export interface MallReturnRequest {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  reason: string;
  status: "submitted" | "approved" | "rejected" | "processed";
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  refundAmount?: number;
  settlementImpact?: {
    originalOrderAmount: number;
    returnAmount: number;
    settlementAdjustmentType: "refund" | "offset" | "manual_review";
    financeLedgerStatus: "simulated_reversed" | "external_pending";
  };
}

export interface MallSettlementInvoice {
  id: string;
  orderId: string;
  supplierId: string;
  status: "pending_verification" | "verified" | "rejected";
  fileId?: string;
  fileName?: string;
  amount: number;
  uploadedBy: string;
  uploadedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  taxRate?: number;
  taxAmount?: number;
  rejectReason?: string;
  verificationAdapterBoundary?: string;
  reuploadOfInvoiceId?: string;
}

export interface MallQuestionnaireQuestion {
  id: string;
  prompt: string;
  type: "text" | "single_choice" | "multi_choice" | "number" | "score";
  options?: string[];
  maxScore?: number;
}

export interface MallQuestionnaireSubmission {
  id: string;
  questionnaireId: string;
  respondentUserId: string;
  supplierId?: string;
  answers: Array<{ questionId: string; answer: string | number | string[] }>;
  score: number;
  status: "submitted" | "scored" | "archived";
  submittedAt: string;
  scoredBy?: string;
  scoredAt?: string;
  archivedBy?: string;
  archivedAt?: string;
}

export interface MallQuestionnaire {
  id: string;
  title: string;
  scope: string;
  status: "draft" | "published" | "closed";
  questions: Array<string | MallQuestionnaireQuestion>;
  targetSupplierIds?: string[];
  submissions?: MallQuestionnaireSubmission[];
  createdBy: string;
  createdAt: string;
  archivedAt?: string;
}

export interface MallScenarioTemplate {
  id: string;
  templateType: "sample_room" | "opening_package" | "bulk_purchase_package";
  name: string;
  status: "draft" | "active" | "disabled";
  productIds: string[];
  packageItems?: Array<{ productId: string; quantity: number }>;
  applicableBrands?: string[];
  applicableHotelTypes?: string[];
  applicableHotelIds?: string[];
  roomCount?: number;
  budgetAmount?: number;
  description?: string;
  generatedOrderIds?: string[];
  attachmentFileIds: string[];
  createdBy: string;
  createdAt: string;
}

export interface MallFundAccountLedgerEntry {
  id: string;
  accountId: string;
  orgId: string;
  orderId?: string;
  returnId?: string;
  invoiceId?: string;
  direction: "inbound" | "outbound" | "occupy" | "release" | "reverse";
  entryType: "opening_balance" | "recharge" | "credit_grant" | "payment_reserve" | "payment_capture" | "return_refund" | "settlement_adjustment";
  amount: number;
  status: "simulated" | "reserved" | "released" | "reversed" | "paid";
  createdBy: string;
  createdAt: string;
  note?: string;
}

export interface MallFundAccount {
  id: string;
  orgId: string;
  balance: number;
  creditLimit: number;
  occupiedAmount: number;
  status: "active" | "frozen";
  ledgerEntries: MallFundAccountLedgerEntry[];
  adapterBoundary: string;
  updatedAt: string;
}
