import type { SeedState } from "../seed/data.js";
import type { RuntimeDb } from "./runtime-db.js";

type SqlValue = string | number | bigint | null | Uint8Array;

export class BusinessTableStore {
  constructor(private readonly runtimeDb: RuntimeDb) {
    this.migrate();
  }

  syncState(state: SeedState) {
    const db = this.runtimeDb.db;
    const uniqueById = <T extends { id: string }>(rows: T[]) => Array.from(new Map(rows.map((row) => [row.id, row])).values());
    db.exec("begin immediate transaction;");
    try {
      this.replaceRows("business_organizations", state.organizations, (item) => [
        item.id,
        item.name,
        item.level,
        item.parentId,
        item.status ?? "active"
      ]);
      this.replaceRows("business_users", uniqueById(state.users), (item) => [
        item.id,
        item.name,
        item.roleId,
        item.orgId,
        item.status ?? "active",
        item.departmentId ?? null,
        item.position ?? null,
        item.supplierId ?? null,
        item.expertId ?? null,
        JSON.stringify(item.orgScope ?? []),
        JSON.stringify(item.managedProjectIds ?? [])
      ]);
      this.replaceRows("business_approval_rules", state.approvalRules ?? [], (item) => [
        item.id,
        item.ruleCode,
        item.ruleName,
        item.businessType,
        item.amountMin ?? null,
        item.amountMax ?? null,
        JSON.stringify(item.methodTypes ?? []),
        JSON.stringify(item.nodeRoleIds ?? []),
        JSON.stringify(item.actions ?? []),
        item.status,
        item.versionNo,
        item.updatedAt
      ]);
      this.replaceRows("business_suppliers", state.suppliers, (item) => [
        item.id,
        item.name,
        item.admissionStatus ?? item.status,
        item.qualification,
        item.risk,
        JSON.stringify(item.categoryAuth ?? []),
        JSON.stringify(item.qualificationAttachments ?? []),
        item.evaluationScore ?? null,
        new Date().toISOString()
      ]);
      this.replaceRows("business_supplier_seal_samples", state.suppliers.flatMap((supplier) => (supplier.sealSamples ?? []).map((sample) => ({ ...sample, supplierId: supplier.id }))), (item) => [
        item.id,
        item.supplierId,
        item.sampleName,
        item.specification,
        item.fileId ?? null,
        item.fileName ?? null,
        item.contentType ?? null,
        item.uploadedAt ?? null
      ]);
      this.replaceRows("business_procurement_requests", state.procurementRequests, (item) => [
        item.id,
        item.code ?? null,
        item.projectId,
        item.title,
        item.orgId,
        item.category ?? null,
        item.status ?? "draft",
        item.approvalStatus,
        item.methodRuleId ?? null,
        item.methodSuggestion,
        item.externalTradeFlag ? 1 : 0,
        item.budgetAmount ?? null,
        JSON.stringify(item.lineItems ?? []),
        JSON.stringify(item.attachments ?? []),
        item.createdAt ?? null,
        item.updatedAt ?? null
      ]);
      this.replaceRows("business_projects", state.projects, (item) => [
        item.id,
        item.code,
        item.sourceRequestId ?? null,
        item.name,
        item.orgId,
        item.orgName,
        item.type,
        item.status,
        item.displayStatus,
        item.category,
        item.externalTradeFlag ? 1 : 0,
        item.quoteDeadlineAt,
        item.beforeDeadline ? 1 : 0,
        JSON.stringify(item.participantSupplierIds ?? []),
        JSON.stringify(item.assignedExpertIds ?? []),
        JSON.stringify(item.sourceLineItems ?? []),
        JSON.stringify(item.attachments ?? [])
      ]);
      this.replaceRows("business_procurement_documents", state.procurementDocuments, (item) => [
        item.id,
        item.projectId,
        item.title,
        item.versionNo,
        item.status,
        item.reviewStatus,
        item.contentSummary,
        JSON.stringify(item.attachmentMetadata ?? []),
        item.previousDocumentId ?? null,
        item.createdBy,
        item.createdAt,
        item.updatedAt,
        item.publishedAt,
        item.lockedAt
      ]);
      this.replaceRows("business_announcements", state.procurementAnnouncements, (item) => [
        item.id,
        item.projectId,
        item.documentId,
        item.title,
        item.procurementMethod ?? state.projects.find((project) => project.id === item.projectId)?.type ?? "internal_open",
        item.scope ?? "invited_suppliers",
        item.status ?? "published",
        item.registrationDeadlineAt ?? state.projects.find((project) => project.id === item.projectId)?.quoteDeadlineAt ?? item.createdAt,
        item.quoteDeadlineAt ?? state.projects.find((project) => project.id === item.projectId)?.quoteDeadlineAt ?? item.createdAt,
        item.publishedAt
      ]);
      this.replaceRows("business_inquiry_sheets", state.inquirySheets ?? [], (item) => [
        item.id,
        item.projectId,
        item.inquiryNo,
        item.title,
        JSON.stringify(item.supplierIds ?? []),
        item.currentRound,
        item.maxRounds,
        JSON.stringify(item.quoteRuleConfig ?? {}),
        JSON.stringify(item.pricingDecision ?? null),
        item.status,
        item.deadlineAt,
        item.createdBy,
        item.createdAt,
        item.updatedAt
      ]);
      this.replaceRows("business_project_samples", state.projectSampleReceipts ?? [], (item) => [
        item.id,
        item.projectId,
        item.supplierId,
        item.sampleName,
        item.quantity,
        item.status,
        item.receivedBy,
        item.receivedAt,
        item.returnRequired ? 1 : 0,
        item.returnedBy ?? null,
        item.returnedAt ?? null,
        JSON.stringify(item.attachmentMetadata ?? []),
        item.handlingNote ?? null
      ]);
      this.replaceRows("business_registrations", state.supplierRegistrations, (item) => [
        item.id,
        item.projectId,
        item.announcementId,
        item.supplierId,
        item.status,
        JSON.stringify(item.materialMetadata ?? []),
        JSON.stringify(item.supplementMaterialMetadata ?? []),
        item.submittedAt,
        item.qualifiedAt ?? null,
        item.qualificationReason ?? null
      ]);
      this.replaceRows("business_bids", state.bids, (item) => [
        item.id,
        item.projectId,
        item.supplierId,
        item.amount,
        item.status,
        item.submittedAt,
        item.quoteDeadlineAt,
        item.lockedAt,
        item.versionNo ?? 1,
        item.fileId,
        item.fileName,
        JSON.stringify(item.responseFileMetadata ?? [])
      ]);
      this.replaceRows("business_award_approvals", state.awardApprovals, (item) => [
        item.id,
        item.projectId,
        item.selectedSupplierId,
        item.recommendedSupplierId,
        item.approvalStatus,
        item.nonLowestPriceReason ?? null,
        item.createdBy,
        item.createdAt,
        item.submittedAt,
        item.approvedAt
      ]);
      this.replaceRows("business_purchase_orders", state.purchaseOrders, (item) => [
        item.id,
        item.projectId,
        item.supplierId,
        item.orderNo,
        item.status,
        item.totalAmount,
        JSON.stringify(item.lineItems ?? []),
        item.expectedDeliveryAt,
        item.receivingLocation,
        item.confirmedAt,
        item.createdBy,
        item.createdAt,
        item.updatedAt
      ]);
      this.replaceRows("business_receipts", state.receiptRecords, (item) => [
        item.id,
        item.purchaseOrderId,
        item.projectId,
        item.supplierId,
        item.receiptType ?? (item.exceptionType ? "exception" : "full"),
        item.exceptionType ?? null,
        item.acceptanceResult ?? (item.exceptionType ? "accepted_with_exception" : "accepted"),
        item.handlingStatus ?? (item.exceptionType ? "pending_resolution" : "none"),
        JSON.stringify(item.receivedItems ?? []),
        item.summary ?? "验收记录",
        JSON.stringify(item.attachmentMetadata ?? []),
        item.createdAt ?? item.receiptAt ?? new Date().toISOString()
      ]);
      this.replaceRows("business_settlement_materials", state.settlementMaterials, (item) => [
        item.id,
        item.purchaseOrderId,
        item.projectId,
        item.supplierId,
        item.materialType,
        item.status,
        item.fileId ?? null,
        item.fileName ?? null,
        item.uploadedBy ?? null,
        item.uploadedAt ?? null,
        item.verifiedBy ?? null,
        item.verifiedAt ?? null,
        item.verificationOpinion ?? null
      ]);
      this.replaceRows("business_archive_items", state.archiveItems, (item) => [
        item.id,
        item.projectId,
        item.itemName,
        item.requiredFlag ? 1 : 0,
        item.collectedFlag ? 1 : 0,
        item.sealed ? 1 : 0,
        item.status,
        JSON.stringify(item.snapshotJson ?? {})
      ]);
      this.replaceRowsWithColumns(
        "business_mall_products",
        [
          "id",
          "name",
          "category",
          "brand",
          "unit",
          "sku_code",
          "specification",
          "product_status",
          "supplier_id",
          "service_regions_json",
          "procurement_category",
          "image_file_ids_json",
          "attachment_file_ids_json",
          "tags_json",
          "created_by",
          "created_at",
          "updated_at"
        ],
        state.mallProducts ?? [],
        (item) => [
        item.id,
        item.name,
        item.category,
        item.brand,
        item.unit,
        item.skuCode,
        item.specification,
        item.status,
        item.supplierId,
        JSON.stringify(item.serviceRegions ?? []),
        item.procurementCategory ?? null,
        JSON.stringify(item.imageFileIds ?? []),
        JSON.stringify(item.attachmentFileIds ?? []),
        JSON.stringify(item.tags ?? []),
        item.createdBy,
        item.createdAt,
        item.updatedAt
      ]);
      this.replaceRows("business_mall_prices", state.mallPrices ?? [], (item) => [
        item.id,
        item.productId,
        item.supplierId,
        item.price,
        item.effectiveFrom,
        item.effectiveTo ?? null,
        item.approvalStatus,
        item.versionNo,
        item.createdBy,
        item.createdAt
      ]);
      this.replaceRows("business_mall_orders", state.mallOrders ?? [], (item) => [
        item.id,
        item.orderNo,
        item.buyerId,
        item.orgId,
        item.supplierId,
        item.status,
        item.totalAmount,
        JSON.stringify(item.lineItems ?? []),
        item.shippingAddress,
        item.invoiceTitle,
        item.createdAt,
        item.updatedAt
      ]);
      this.replaceRows("business_mall_shipments", state.mallShipments ?? [], (item) => [
        item.id,
        item.orderId,
        item.supplierId,
        item.carrier,
        item.trackingNo,
        item.status,
        item.shippedAt,
        item.receivedAt ?? null
      ]);
      this.replaceRows("business_mall_returns", state.mallReturnRequests ?? [], (item) => [
        item.id,
        item.orderId,
        item.productId,
        item.quantity,
        item.reason,
        item.status,
        item.createdBy,
        item.createdAt,
        item.reviewedBy ?? null,
        item.reviewedAt ?? null
      ]);
      this.replaceRows("business_mall_invoices", state.mallSettlementInvoices ?? [], (item) => [
        item.id,
        item.orderId,
        item.supplierId,
        item.status,
        item.fileId ?? null,
        item.fileName ?? null,
        item.amount,
        item.uploadedBy,
        item.uploadedAt,
        item.verifiedBy ?? null,
        item.verifiedAt ?? null
      ]);
      this.replaceRowsWithColumns(
        "business_mall_questionnaires",
        [
          "id",
          "title",
          "scope",
          "questionnaire_status",
          "questions_json",
          "target_supplier_ids_json",
          "submissions_json",
          "archived_at",
          "created_by",
          "created_at"
        ],
        state.mallQuestionnaires ?? [],
        (item) => [
        item.id,
        item.title,
        item.scope,
        item.status,
        JSON.stringify(item.questions ?? []),
        JSON.stringify(item.targetSupplierIds ?? []),
        JSON.stringify(item.submissions ?? []),
        item.archivedAt ?? null,
        item.createdBy,
        item.createdAt
      ]);
      this.replaceRowsWithColumns(
        "business_mall_scenario_templates",
        [
          "id",
          "template_type",
          "name",
          "template_status",
          "product_ids_json",
          "package_items_json",
          "applicable_brands_json",
          "applicable_hotel_types_json",
          "applicable_hotel_ids_json",
          "room_count",
          "budget_amount",
          "description",
          "generated_order_ids_json",
          "attachment_file_ids_json",
          "created_by",
          "created_at"
        ],
        state.mallScenarioTemplates ?? [],
        (item) => [
        item.id,
        item.templateType,
        item.name,
        item.status,
        JSON.stringify(item.productIds ?? []),
        JSON.stringify(item.packageItems ?? []),
        JSON.stringify(item.applicableBrands ?? []),
        JSON.stringify(item.applicableHotelTypes ?? []),
        JSON.stringify(item.applicableHotelIds ?? []),
        item.roomCount ?? null,
        item.budgetAmount ?? null,
        item.description ?? null,
        JSON.stringify(item.generatedOrderIds ?? []),
        JSON.stringify(item.attachmentFileIds ?? []),
        item.createdBy,
        item.createdAt
      ]);
      this.replaceRows("business_mall_fund_accounts", state.mallFundAccounts ?? [], (item) => [
        item.id,
        item.orgId,
        item.balance,
        item.creditLimit,
        item.occupiedAmount,
        item.status,
        JSON.stringify(item.ledgerEntries ?? []),
        item.adapterBoundary,
        item.updatedAt
      ]);
      this.syncR2BaselineState(state);
      db.exec("commit;");
    } catch (error) {
      db.exec("rollback;");
      throw error;
    }
  }

  countRows(tableName: string) {
    return (this.runtimeDb.db.prepare(`select count(*) as count from ${tableName}`).get() as { count: number }).count;
  }

  private replaceRows<T>(tableName: string, rows: T[], mapper: (row: T) => SqlValue[]) {
    this.runtimeDb.db.prepare(`delete from ${tableName}`).run();
    if (rows.length === 0) return;
    const mappedRows = rows.map((row) => this.normalizeSqlValues(mapper(row)));
    const placeholders = mappedRows.map((row) => `(${row.map(() => "?").join(", ")})`).join(", ");
    const values = mappedRows.flat();
    this.runtimeDb.db.prepare(`insert into ${tableName} values ${placeholders}`).run(...values);
  }

  private replaceRowsWithColumns<T>(tableName: string, columns: string[], rows: T[], mapper: (row: T) => SqlValue[]) {
    this.runtimeDb.db.prepare(`delete from ${tableName}`).run();
    if (rows.length === 0) return;
    const mappedRows = rows.map((row) => this.normalizeSqlValues(mapper(row)));
    const placeholders = mappedRows.map((row) => `(${row.map(() => "?").join(", ")})`).join(", ");
    const values = mappedRows.flat();
    this.runtimeDb.db.prepare(`insert into ${tableName} (${columns.join(", ")}) values ${placeholders}`).run(...values);
  }

  private upsertRows<T>(tableName: string, columns: string[], conflictColumns: string[], rows: T[], mapper: (row: T) => SqlValue[]) {
    if (rows.length === 0) return;
    const placeholders = columns.map(() => "?").join(", ");
    const updateColumns = columns.filter((column) => !conflictColumns.includes(column));
    const conflictTarget = conflictColumns.join(", ");
    const updateClause = updateColumns.length === 0 ? "do nothing" : `do update set ${updateColumns.map((column) => `${column} = excluded.${column}`).join(", ")}`;
    const statement = this.runtimeDb.db.prepare(
      `insert into ${tableName} (${columns.join(", ")}) values (${placeholders}) on conflict(${conflictTarget}) ${updateClause}`
    );
    for (const row of rows) statement.run(...this.normalizeSqlValues(mapper(row)));
  }

  private syncR2BaselineState(state: SeedState) {
    const syncedAt = new Date().toISOString();
    this.syncAuditLogs(state);
    this.syncR2Metadata(state, syncedAt);
    this.syncR2OrganizationAndIdentity(state, syncedAt);
    this.syncR2SupplierDomain(state, syncedAt);
    this.syncR2ProductAndQuotationDomain(state, syncedAt);
    this.syncR2SourcingDomain(state, syncedAt);
    this.syncR2ReviewAwardDomain(state, syncedAt);
    this.syncR2OrderSettlementDomain(state, syncedAt);
    this.syncR2ApprovalAndAuditDomain(state, syncedAt);
  }

  private syncAuditLogs(state: SeedState) {
    this.upsertRows(
      "audit_logs",
      ["id", "actor_id", "role_id", "org_id", "project_id", "action", "object_type", "object_id", "result", "reason", "ip", "user_agent", "created_at"],
      ["id"],
      state.auditLogs ?? [],
      (item) => [
        item.id,
        item.actorId,
        item.roleId,
        item.orgId,
        item.projectId ?? null,
        item.action,
        item.objectType,
        item.objectId,
        item.result,
        item.reason ?? null,
        item.ip ?? null,
        item.userAgent ?? null,
        item.createdAt
      ]
    );
  }

  private syncR2Metadata(state: SeedState, syncedAt: string) {
    const objectRows = [
      ["organization", "r2_organizations", "formal", "R2", "组织/酒店主数据"],
      ["user", "r2_users", "formal", "R2", "用户主数据"],
      ["role", "r2_roles", "formal", "R2", "角色主数据"],
      ["supplier", "r2_suppliers", "formal", "R2/R3", "供应商基础资料和状态"],
      ["supplier_qualification", "r2_supplier_qualifications", "formal", "R2/R3", "供应商资质文件"],
      ["product", "r2_products", "formal", "R2/R3", "商品主数据"],
      ["sku", "r2_skus", "formal", "R2/R3", "SKU/规格"],
      ["supplier_quotation", "r2_supplier_quotations", "formal", "R2/R3", "供应商报价单基线"],
      ["procurement_request", "r2_procurement_requests", "formal", "R2/R4", "采购申请"],
      ["sourcing_project", "r2_sourcing_projects", "formal", "R2/R4", "询价/招标项目"],
      ["bid", "r2_bids", "formal", "R2/R5", "供应商报价/应标"],
      ["expert_score", "r2_expert_scores", "formal", "R2/R5", "专家评分"],
      ["award_decision", "r2_award_decisions", "formal", "R2/R5", "定标记录"],
      ["purchase_order", "r2_purchase_orders", "formal", "R2/R6", "采购订单"],
      ["cart_item", "r2_cart_items", "formal", "R6", "shopping cart item"],
      ["receipt", "r2_receipts", "formal", "R2/R6", "收货验收"],
      ["settlement_material", "r2_settlement_materials", "formal", "R2/R7", "结算资料/发票过渡"],
      ["approval_rule", "r2_approval_rules", "formal", "R2/R8", "审批规则"],
      ["workflow_task", "r2_task_items", "formal", "R8", "任务中心主源"],
      ["workflow_notification", "r2_notifications", "formal", "R8", "站内消息主源"],
      ["audit_log", "audit_logs", "formal", "R2/R8", "操作审计日志"],
      ["file", "stored_files", "formal", "R2/R10", "本地文件元数据"]
    ].map(([objectType, tableName, sourceKind, ownerStage, note]) => ({ objectType, tableName, sourceKind, ownerStage, note }));
    const supplementalObjectRows = [
      ["department_or_hotel", "r2_departments_hotels", "formal", "R2", "department or hotel baseline"],
      ["supplier_account", "r2_supplier_accounts", "formal", "R2/R3", "supplier account binding"],
      ["supplier_admission_review", "r2_supplier_admission_reviews", "formal", "R2/R3", "supplier admission review"],
      ["supplier_seal_sample", "r2_supplier_seal_samples", "formal", "R2/R3", "supplier sealed sample"],
      ["supplier_restriction", "r2_supplier_restrictions", "formal", "R2/R3", "supplier blacklist or restriction"],
      ["supplier_evaluation", "r2_supplier_evaluations", "formal", "R2/R6", "supplier performance evaluation"],
      ["product_image", "r2_product_images", "formal", "R2/R3", "product image"],
      ["supplier_quotation_item", "r2_supplier_quotation_items", "formal", "R2/R3", "supplier quotation item"],
      ["procurement_request_item", "r2_procurement_request_items", "formal", "R2/R4", "procurement request line item"],
      ["sourcing_project_item", "r2_sourcing_project_items", "formal", "R2/R4", "sourcing project line item"],
      ["supplier_invitation", "r2_supplier_invitations", "formal", "R2/R4", "supplier invitation"],
      ["supplier_participation", "r2_supplier_participations", "formal", "R2/R4", "supplier participation"],
      ["bid_line_item", "r2_bid_line_items", "formal", "R2/R5", "bid line item"],
      ["response_file", "r2_response_files", "formal", "R2/R5", "response file"],
      ["clarification", "r2_clarifications", "formal", "R2/R4", "clarification"],
      ["expert", "r2_experts", "formal", "R2/R5", "expert"],
      ["expert_assignment", "r2_expert_assignments", "formal", "R2/R5", "expert assignment"],
      ["scoring_template", "r2_scoring_templates", "formal", "R2/R5", "scoring template"],
      ["comparison_report", "r2_comparison_reports", "formal", "R2/R5", "comparison report"],
      ["pricing_report", "r2_pricing_reports", "formal", "R2/R5", "pricing report"],
      ["pricing_report_item", "r2_pricing_report_items", "formal", "R2/R5", "pricing report item"],
      ["order_line_item", "r2_order_line_items", "formal", "R2/R6", "order line item"],
      ["shipment", "r2_shipments", "formal", "R2/R6", "shipment"],
      ["receipt_line_item", "r2_receipt_line_items", "formal", "R2/R6", "receipt line item"],
      ["return", "r2_returns", "formal", "R2/R6", "return request"],
      ["settlement_bill", "r2_settlement_bills", "formal", "R2/R7", "settlement bill"],
      ["settlement_bill_item", "r2_settlement_bill_items", "formal", "R7", "settlement bill item"],
      ["invoice", "r2_invoices", "formal", "R2/R7", "invoice"],
      ["amount_reconciliation", "r2_amount_reconciliation_lines", "formal", "R2/R7", "amount reconciliation"],
      ["fund_ledger_entry", "r2_fund_ledger_entries", "formal", "R7", "fund ledger entry"],
      ["approval_instance", "r2_approval_instances", "formal", "R2/R8", "approval instance"],
      ["approval_action", "r2_approval_actions", "formal", "R2/R8", "approval action"],
      ["file_access_log", "r2_file_access_logs", "formal", "R2/R10", "file access log"]
    ].map(([objectType, tableName, sourceKind, ownerStage, note]) => ({ objectType, tableName, sourceKind, ownerStage, note }));
    const registryRows = [...objectRows, ...supplementalObjectRows];
    this.upsertRows(
      "r2_business_object_registry",
      ["object_type", "source_table", "source_kind", "owner_stage", "r2_note", "updated_at"],
      ["object_type"],
      registryRows,
      (item) => [item.objectType, item.tableName, item.sourceKind, item.ownerStage, item.note, syncedAt]
    );

    const transitionRows = [
      ["procurement_request", "draft", "submitted", "requester_submit", 1],
      ["procurement_request", "submitted", "method_decided", "method_decision_after_approval", 1],
      ["procurement_request", "method_decided", "project_created", "create_project", 1],
      ["procurement_request", "draft", "cancelled", "cancel_draft", 1],
      ["bid", "draft", "submitted", "supplier_submit", 1],
      ["bid", "submitted", "withdrawn", "supplier_withdraw", 1],
      ["bid", "withdrawn", "resubmitted", "supplier_resubmit", 1],
      ["bid", "submitted", "locked", "deadline_lock", 1],
      ["procurement_document", "draft", "reviewing", "submit_review", 1],
      ["procurement_document", "reviewing", "locked", "publish_lock", 1],
      ["procurement_document", "draft", "voided", "void", 1],
      ["procurement_document", "locked", "voided", "void", 1],
      ["purchase_order", "pending_confirmation", "supplier_confirmed", "supplier_confirm", 1],
      ["purchase_order", "supplier_confirmed", "performing", "start_fulfillment", 1],
      ["purchase_order", "performing", "partially_received", "partial_receipt", 1],
      ["purchase_order", "partially_received", "received", "full_receipt", 1],
      ["purchase_order", "supplier_confirmed", "exception", "exception_receipt", 1],
      ["purchase_order", "exception", "closed", "close_exception", 1],
      ["purchase_order", "received", "closed", "close_order", 1],
      ["settlement_material", "pending_verification", "verified", "verify_pass", 1],
      ["settlement_material", "pending_verification", "rejected", "verify_reject", 1],
      ["archive_item", "complete", "sealed", "seal_archive", 1],
      ["archive_item", "sealed", "supplement_requested", "request_supplement", 0],
      ["supplier", "admitted", "restricted", "restrict_supplier", 1],
      ["supplier", "restricted", "admitted", "restore_supplier", 1]
    ].map(([objectType, fromStatus, toStatus, action, allowed]) => ({
      id: `${objectType}:${fromStatus}->${toStatus}`,
      objectType,
      fromStatus,
      toStatus,
      action,
      allowed: Number(allowed)
    }));
    this.upsertRows(
      "r2_state_transition_rules",
      ["id", "object_type", "from_status", "to_status", "action_code", "allowed_flag", "updated_at"],
      ["id"],
      transitionRows,
      (item) => [item.id, item.objectType, item.fromStatus, item.toStatus, item.action, item.allowed, syncedAt]
    );

    const counts = {
      organizations: state.organizations.length,
      users: state.users.length,
      suppliers: state.suppliers.length,
      procurementRequests: state.procurementRequests.length,
      projects: state.projects.length,
      bids: state.bids.length,
      purchaseOrders: state.purchaseOrders.length,
      settlementMaterials: state.settlementMaterials.length,
      mallProducts: state.mallProducts.length,
      auditLogs: state.auditLogs.length
    };
    this.upsertRows(
      "r2_migration_runs",
      ["id", "source_key", "status", "object_counts_json", "executed_at"],
      ["id"],
      [{ id: "r2-baseline-v1", sourceKey: "runtime_state.seed_state", status: "applied", counts }],
      (item) => [item.id, item.sourceKey, item.status, JSON.stringify(item.counts), syncedAt]
    );
  }

  private syncR2OrganizationAndIdentity(state: SeedState, syncedAt: string) {
    this.upsertRows(
      "r2_organizations",
      ["id", "name", "org_level", "parent_id", "org_status", "updated_at"],
      ["id"],
      state.organizations,
      (item) => [item.id, item.name, item.level, item.parentId, item.status ?? "active", syncedAt]
    );
    this.upsertRows(
      "r2_departments_hotels",
      ["id", "organization_id", "name", "unit_type", "parent_id", "unit_status", "updated_at"],
      ["id"],
      state.organizations,
      (item) => [item.id, item.id, item.name, item.level.includes("酒店") ? "hotel" : "department_or_org", item.parentId, item.status ?? "active", syncedAt]
    );
    this.upsertRows("r2_roles", ["id", "role_name", "role_hint", "updated_at"], ["id"], state.roles, (item) => [item.id, item.name, item.hint, syncedAt]);
    this.upsertRows(
      "r2_users",
      [
        "id",
        "display_name",
        "role_id",
        "org_id",
        "department_id",
        "position_name",
        "supplier_id",
        "expert_id",
        "user_status",
        "org_scope_json",
        "managed_project_ids_json",
        "updated_at"
      ],
      ["id"],
      state.users,
      (item) => [
        item.id,
        item.name,
        item.roleId,
        item.orgId,
        item.departmentId ?? null,
        item.position ?? null,
        item.supplierId ?? null,
        item.expertId ?? null,
        item.status ?? "active",
        JSON.stringify(item.orgScope ?? []),
        JSON.stringify(item.managedProjectIds ?? []),
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_supplier_accounts",
      ["id", "supplier_id", "user_id", "account_status", "updated_at"],
      ["id"],
      state.users.filter((item) => Boolean(item.supplierId)),
      (item) => [`supplier-account:${item.id}`, item.supplierId ?? "", item.id, item.status ?? "active", syncedAt]
    );
  }

  private syncR2SupplierDomain(state: SeedState, syncedAt: string) {
    this.upsertRows(
      "r2_suppliers",
      [
        "id",
        "supplier_name",
        "admission_status",
        "supplier_status",
        "contact_name",
        "contact_phone",
        "contact_email",
        "supplier_type",
        "supplier_source",
        "social_credit_code",
        "business_license_no",
        "legal_representative",
        "registered_address",
        "business_scope",
        "qualification_status",
        "risk_note",
        "restriction_reason",
        "restricted_at",
        "evaluation_score",
        "admission_level",
        "admission_rule_code",
        "admission_rule_snapshot_json",
        "regularized_at",
        "periodic_assessment_json",
        "registration_trace_json",
        "onboarding_profile_json",
        "category_auth_json",
        "updated_at"
      ],
      ["id"],
      state.suppliers,
      (item) => [
        item.id,
        item.name,
        item.admissionStatus ?? item.status,
        item.status,
        item.contactName ?? null,
        item.contactPhone ?? null,
        item.contactEmail ?? null,
        item.supplierType ?? null,
        item.supplierSource ?? null,
        item.socialCreditCode ?? null,
        item.businessLicenseNo ?? null,
        item.legalRepresentative ?? null,
        item.registeredAddress ?? null,
        item.businessScope ?? null,
        item.qualification,
        item.risk,
        item.restrictionReason ?? null,
        item.restrictedAt ?? null,
        item.evaluationScore ?? null,
        item.admissionLevel ?? null,
        item.admissionRuleCode ?? null,
        item.admissionRuleSnapshot ? JSON.stringify(item.admissionRuleSnapshot) : null,
        item.regularizedAt ?? null,
        item.periodicAssessment ? JSON.stringify(item.periodicAssessment) : null,
        item.registrationTrace ? JSON.stringify(item.registrationTrace) : null,
        item.onboardingProfile ? JSON.stringify(item.onboardingProfile) : null,
        JSON.stringify(item.categoryAuth ?? []),
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_supplier_qualifications",
      ["id", "supplier_id", "qualification_type", "file_id", "file_name", "valid_until", "qualification_status", "uploaded_at", "updated_at"],
      ["id"],
      state.suppliers.flatMap((supplier) =>
        (supplier.qualificationAttachments ?? []).map((attachment) => ({
          ...attachment,
          supplierId: supplier.id,
          qualificationStatus: supplier.qualification
        }))
      ),
      (item) => [item.id, item.supplierId, item.qualificationType, item.id, item.fileName, item.validUntil ?? null, item.qualificationStatus, item.uploadedAt, syncedAt]
    );
    this.upsertRows(
      "r2_supplier_admission_reviews",
      ["id", "supplier_id", "review_type", "review_status", "score", "reviewer_name", "opinion", "reviewed_at", "score_template_code", "score_items_json", "regularization_decision", "updated_at"],
      ["id"],
      state.suppliers.flatMap((supplier) => (supplier.admissionReviews ?? []).map((review) => ({ ...review, supplierId: supplier.id }))),
      (item) => [
        item.id,
        item.supplierId,
        item.reviewType,
        item.status,
        item.score ?? null,
        item.reviewer,
        item.opinion,
        item.reviewedAt,
        item.scoreTemplateCode ?? null,
        item.scoreItems ? JSON.stringify(item.scoreItems) : null,
        item.regularizationDecision ?? null,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_supplier_seal_samples",
      ["id", "supplier_id", "sample_name", "specification", "confirmed_by", "confirmed_at", "file_id", "file_name", "content_type", "uploaded_at", "updated_at"],
      ["id"],
      state.suppliers.flatMap((supplier) => (supplier.sealSamples ?? []).map((sample) => ({ ...sample, supplierId: supplier.id }))),
      (item) => [
        item.id,
        item.supplierId,
        item.sampleName,
        item.specification,
        item.confirmedBy,
        item.confirmedAt,
        item.fileId ?? null,
        item.fileName ?? item.imageFileName ?? null,
        item.contentType ?? null,
        item.uploadedAt ?? null,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_supplier_service_regions",
      ["id", "supplier_id", "region_name", "hotel_name", "category", "region_status", "updated_at"],
      ["id"],
      state.suppliers.flatMap((supplier) => (supplier.serviceRegions ?? []).map((region) => ({ ...region, supplierId: supplier.id }))),
      (item) => [item.id, item.supplierId, item.region, item.storeName, item.category, item.status, syncedAt]
    );
    this.upsertRows(
      "r2_supplier_category_authorizations",
      ["id", "supplier_id", "category", "authorization_status", "authorized_at", "expires_at", "updated_at"],
      ["id"],
      state.suppliers.flatMap((supplier) =>
        (supplier.categoryAuthorizations ?? []).map((authorization) => ({
          ...authorization,
          id: `${supplier.id}:${authorization.category}`,
          supplierId: supplier.id
        }))
      ),
      (item) => [item.id, item.supplierId, item.category, item.status, item.authorizedAt, item.expiresAt ?? null, syncedAt]
    );
    this.upsertRows(
      "r2_supplier_restrictions",
      ["id", "supplier_id", "restriction_status", "reason", "restricted_at", "updated_at"],
      ["id"],
      state.suppliers.filter((supplier) => supplier.admissionStatus === "restricted" || supplier.status === "restricted" || supplier.status === "限制名单"),
      (item) => [`restriction:${item.id}`, item.id, "active", item.restrictionReason ?? item.risk, item.restrictedAt ?? syncedAt, syncedAt]
    );
    this.upsertRows(
      "r2_supplier_evaluations",
      [
        "id",
        "supplier_id",
        "project_id",
        "purchase_order_id",
        "score",
        "dimensions_json",
        "description",
        "improvement_suggestion",
        "evaluation_status",
        "locked_at",
        "created_by",
        "created_at",
        "updated_at"
      ],
      ["id"],
      state.supplierEvaluations ?? [],
      (item) => [
        item.id,
        item.supplierId,
        item.projectId,
        item.purchaseOrderId ?? null,
        item.score ?? 0,
        JSON.stringify(item.dimensions ?? {}),
        item.description ?? "",
        item.improvementSuggestion ?? null,
        item.status ?? "submitted_locked",
        item.lockedAt ?? item.createdAt ?? syncedAt,
        item.createdBy ?? "system",
        item.createdAt ?? item.lockedAt ?? syncedAt,
        syncedAt
      ]
    );
  }

  private syncR2ProductAndQuotationDomain(state: SeedState, syncedAt: string) {
    this.upsertRows(
      "r2_products",
      [
        "id",
        "product_name",
        "category",
        "brand",
        "unit",
        "packing_quantity",
        "min_order_qty",
        "max_order_qty",
        "tax_rate",
        "invoice_name",
        "tax_classification_code",
        "detail_description",
        "acceptance_guide",
        "installation_requirement",
        "tags_json",
        "product_status",
        "supplier_id",
        "service_regions_json",
        "procurement_category",
        "source_type",
        "source_project_id",
        "source_agreement_no",
        "source_pricing_report_id",
        "source_pricing_report_item_id",
        "listed_at",
        "created_by",
        "created_at",
        "updated_at",
        "synced_at"
      ],
      ["id"],
      state.mallProducts ?? [],
      (item) => [
        item.id,
        item.name,
        item.category,
        item.brand,
        item.unit,
        item.packingQuantity ?? null,
        item.minOrderQty ?? null,
        item.maxOrderQty ?? null,
        item.taxRate ?? null,
        item.invoiceName ?? null,
        item.taxClassificationCode ?? null,
        item.detailDescription ?? null,
        item.acceptanceGuide ?? null,
        item.installationRequirement ?? null,
        JSON.stringify(item.tags ?? []),
        item.status,
        item.supplierId,
        JSON.stringify(item.serviceRegions ?? []),
        item.procurementCategory ?? null,
        item.sourceType ?? null,
        item.sourceProjectId ?? null,
        item.sourceAgreementNo ?? null,
        item.sourcePricingReportId ?? null,
        item.sourcePricingReportItemId ?? null,
        item.listedAt ?? null,
        item.createdBy,
        item.createdAt,
        item.updatedAt,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_skus",
      ["id", "product_id", "sku_code", "specification", "unit", "sku_status", "min_order_qty", "max_order_qty", "updated_at"],
      ["id"],
      state.mallProducts ?? [],
      (item) => [`sku:${item.id}`, item.id, item.skuCode, item.specification, item.unit, item.status, item.minOrderQty ?? null, item.maxOrderQty ?? null, syncedAt]
    );
    this.upsertRows(
      "r2_product_images",
      ["id", "product_id", "file_id", "image_role", "sort_no", "updated_at"],
      ["id"],
      (state.mallProducts ?? []).flatMap((product) => product.imageFileIds.map((fileId, index) => ({ id: `${product.id}:image:${index + 1}`, productId: product.id, fileId, index }))),
      (item) => [item.id, item.productId, item.fileId, "main_or_detail", item.index + 1, syncedAt]
    );
    this.upsertRows(
      "r2_supplier_quotations",
      ["id", "supplier_id", "product_id", "quotation_type", "quotation_status", "effective_from", "effective_to", "version_no", "created_by", "created_at", "updated_at"],
      ["id"],
      state.mallPrices ?? [],
      (item) => [item.id, item.supplierId, item.productId, "supplier_price_baseline", item.approvalStatus, item.effectiveFrom, item.effectiveTo ?? null, item.versionNo, item.createdBy, item.createdAt, syncedAt]
    );
    this.upsertRows(
      "r2_supplier_quotation_items",
      ["id", "quotation_id", "product_id", "sku_id", "purchase_price", "sale_price", "tax_rate", "delivery_days", "updated_at"],
      ["id"],
      state.mallPrices ?? [],
      (item) => [
        `${item.id}:line:1`,
        item.id,
        item.productId,
        `sku:${item.productId}`,
        item.purchasePrice ?? item.price,
        item.salePrice ?? item.price,
        item.taxRate ?? null,
        item.deliveryDays ?? null,
        syncedAt
      ]
    );
  }

  private syncR2SourcingDomain(state: SeedState, syncedAt: string) {
    this.upsertRows(
      "r2_procurement_requests",
      [
        "id",
        "request_code",
        "project_id",
        "title",
        "org_id",
        "request_department",
        "requester_name",
        "category",
        "description",
        "request_status",
        "approval_status",
        "approval_opinion",
        "approval_by",
        "approved_at",
        "budget_label",
        "budget_amount",
        "purpose",
        "expected_arrival_at",
        "receiving_location",
        "method_suggestion",
        "method_rule_id",
        "external_trade_flag",
        "attachments_json",
        "created_by",
        "created_at",
        "updated_at",
        "synced_at"
      ],
      ["id"],
      state.procurementRequests,
      (item) => [
        item.id,
        item.code ?? null,
        item.projectId ?? null,
        item.title,
        item.orgId,
        item.requestDepartment ?? null,
        item.requesterName ?? null,
        item.category ?? null,
        item.description ?? null,
        item.status ?? "draft",
        item.approvalStatus,
        item.approvalOpinion ?? null,
        item.approvalBy ?? null,
        item.approvedAt ?? null,
        item.budgetLabel ?? null,
        item.budgetAmount ?? null,
        item.purpose ?? null,
        item.expectedArrivalAt ?? null,
        item.receivingLocation ?? null,
        item.methodSuggestion,
        item.methodRuleId ?? null,
        item.externalTradeFlag ? 1 : 0,
        JSON.stringify(item.attachments ?? []),
        item.createdBy ?? null,
        item.createdAt ?? null,
        item.updatedAt ?? null,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_procurement_request_items",
      ["id", "request_id", "item_name", "category", "specification", "quantity", "unit", "estimated_unit_price", "budget_amount", "required_by_date", "remark", "updated_at"],
      ["id"],
      state.procurementRequests.flatMap((request) => (request.lineItems ?? []).map((line) => ({ ...line, requestId: request.id }))),
      (item) => [
        item.id,
        item.requestId,
        item.itemName,
        item.category ?? null,
        item.specification,
        item.quantity,
        item.unit,
        item.estimatedUnitPrice ?? null,
        item.budgetAmount ?? null,
        item.requiredByDate ?? null,
        item.remark ?? null,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_sourcing_projects",
      [
        "id",
        "project_code",
        "source_request_id",
        "project_name",
        "org_id",
        "org_name",
        "method_type",
        "project_status",
        "display_status",
        "category",
        "quote_deadline_at",
        "before_deadline",
        "external_trade_flag",
        "budget_label",
        "budget_amount",
        "request_department",
        "requester_name",
        "receiving_location",
        "expected_arrival_at",
        "buyer_name",
        "qualification_requirements_json",
        "quote_requirements_json",
        "delivery_requirements_json",
        "attachments_json",
        "participant_supplier_ids_json",
        "assigned_expert_ids_json",
        "updated_at"
      ],
      ["id"],
      state.projects,
      (item) => [
        item.id,
        item.code,
        item.sourceRequestId ?? null,
        item.name,
        item.orgId,
        item.orgName,
        item.type,
        item.status,
        item.displayStatus,
        item.category,
        item.quoteDeadlineAt,
        item.beforeDeadline ? 1 : 0,
        item.externalTradeFlag ? 1 : 0,
        item.budgetLabel ?? null,
        item.budgetAmount ?? null,
        item.requestDepartment ?? null,
        item.requesterName ?? null,
        item.receivingLocation ?? null,
        item.expectedArrivalAt ?? null,
        item.buyer,
        JSON.stringify(item.qualificationRequirements ?? []),
        JSON.stringify(item.quoteRequirements ?? []),
        JSON.stringify(item.deliveryRequirements ?? []),
        JSON.stringify(item.attachments ?? []),
        JSON.stringify(item.participantSupplierIds ?? []),
        JSON.stringify(item.assignedExpertIds ?? []),
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_sourcing_project_items",
      [
        "id",
        "project_id",
        "source_request_item_id",
        "item_name",
        "category",
        "specification",
        "quantity",
        "unit",
        "estimated_unit_price",
        "budget_amount",
        "required_by_date",
        "remark",
        "updated_at"
      ],
      ["id"],
      state.projects.flatMap((project) =>
        (project.sourceLineItems ?? []).map((line) => ({ ...line, projectId: project.id, sourceRequestItemId: line.id }))
      ),
      (item) => [
        `${item.projectId}:${item.id}`,
        item.projectId,
        item.sourceRequestItemId,
        item.itemName,
        item.category ?? null,
        item.specification,
        item.quantity,
        item.unit,
        item.estimatedUnitPrice ?? null,
        item.budgetAmount ?? null,
        item.requiredByDate ?? null,
        item.remark ?? null,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_supplier_invitations",
      ["id", "project_id", "announcement_id", "supplier_id", "invitation_status", "notification_status", "notified_at", "created_at", "updated_at"],
      ["id"],
      state.supplierInvitations ?? [],
      (item) => [item.id, item.projectId, item.announcementId, item.supplierId, item.status, item.notificationStatus, item.notifiedAt, item.createdAt, syncedAt]
    );
    this.upsertRows(
      "r2_supplier_participations",
      [
        "id",
        "project_id",
        "announcement_id",
        "supplier_id",
        "participation_status",
        "material_metadata_json",
        "supplement_material_metadata_json",
        "submitted_at",
        "qualified_at",
        "qualification_reason",
        "updated_at"
      ],
      ["id"],
      state.supplierRegistrations ?? [],
      (item) => [
        item.id,
        item.projectId,
        item.announcementId,
        item.supplierId,
        item.status,
        JSON.stringify(item.materialMetadata ?? []),
        JSON.stringify(item.supplementMaterialMetadata ?? []),
        item.submittedAt,
        item.qualifiedAt ?? null,
        item.qualificationReason ?? null,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_bids",
      [
        "id",
        "project_id",
        "supplier_id",
        "amount",
        "tax_rate",
        "tax_inclusive",
        "tax_note",
        "delivery_days",
        "response_summary",
        "service_commitment",
        "bid_status",
        "submitted_at",
        "quote_deadline_at",
        "locked_at",
        "withdrawn_at",
        "withdrawal_reason",
        "abandoned_at",
        "abandonment_reason",
        "version_no",
        "file_id",
        "file_name",
        "updated_at"
      ],
      ["id"],
      state.bids ?? [],
      (item) => [
        item.id,
        item.projectId,
        item.supplierId,
        item.amount,
        item.taxRate ?? null,
        item.taxInclusive ? 1 : 0,
        item.taxNote ?? null,
        item.deliveryDays ?? null,
        item.responseSummary ?? null,
        item.serviceCommitment ?? null,
        item.status,
        item.submittedAt,
        item.quoteDeadlineAt,
        item.lockedAt,
        item.withdrawnAt ?? null,
        item.withdrawalReason ?? null,
        item.abandonedAt ?? null,
        item.abandonmentReason ?? null,
        item.versionNo ?? 1,
        item.fileId,
        item.fileName,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_bid_line_items",
      ["id", "bid_id", "project_id", "supplier_id", "item_name", "quantity", "unit", "unit_price", "tax_rate", "total_price", "delivery_days", "updated_at"],
      ["id"],
      state.bids.flatMap((bid) => (bid.lineItems ?? []).map((line) => ({ ...line, bidId: bid.id, projectId: bid.projectId, supplierId: bid.supplierId }))),
      (item) => [item.id, item.bidId, item.projectId, item.supplierId, item.itemName, item.quantity, item.unit, item.unitPrice, item.taxRate, item.totalPrice, item.deliveryDays, syncedAt]
    );
    this.upsertRows(
      "r2_response_files",
      ["id", "bid_id", "project_id", "supplier_id", "file_id", "file_name", "content_type", "size_bytes", "uploaded_at", "updated_at"],
      ["id"],
      state.bids.flatMap((bid) =>
        (bid.responseFileMetadata ?? [
          {
            id: bid.fileId,
            fileName: bid.fileName,
            contentType: "application/pdf",
            sizeBytes: 0,
            uploadedAt: bid.submittedAt ?? new Date().toISOString()
          }
        ]).map((file) => ({
          ...file,
          bidId: bid.id,
          projectId: bid.projectId,
          supplierId: bid.supplierId,
          fileId: file.id
        }))
      ),
      (item) => [item.id, item.bidId, item.projectId, item.supplierId, item.fileId, item.fileName, item.contentType, item.sizeBytes ?? 0, item.uploadedAt, syncedAt]
    );
    this.upsertRows(
      "r2_clarifications",
      [
        "id",
        "project_id",
        "supplier_id",
        "question",
        "answer",
        "visibility",
        "clarification_status",
        "asked_at",
        "answered_by",
        "answered_at",
        "question_attachments_json",
        "answer_attachments_json",
        "notification_trace_json",
        "updated_at"
      ],
      ["id"],
      state.projects.flatMap((project) => (project.clarificationRecords ?? []).map((record) => ({ ...record, projectId: project.id }))),
      (item) => [
        item.id,
        item.projectId,
        item.supplierId ?? null,
        item.question,
        item.answer,
        item.visibility,
        item.status ?? (item.answer ? "answered" : "open"),
        item.askedAt ?? item.answeredAt,
        item.answeredBy,
        item.answeredAt,
        JSON.stringify(item.questionAttachments ?? []),
        JSON.stringify(item.answerAttachments ?? []),
        item.notificationTrace === undefined ? null : JSON.stringify(item.notificationTrace),
        syncedAt
      ]
    );
  }

  private syncR2ReviewAwardDomain(state: SeedState, syncedAt: string) {
    this.upsertRows(
      "r2_experts",
      [
        "id",
        "expert_name",
        "category",
        "expert_status",
        "account_user_ids_json",
        "owner_org_id",
        "branch_org_id",
        "review_scopes_json",
        "supplier_assessment_scopes_json",
        "shared_account",
        "active_flag",
        "avoidance_tags_json",
        "maintained_at",
        "maintenance_log",
        "updated_at"
      ],
      ["id"],
      state.experts ?? [],
      (item) => {
        const seededAccountIds = (state.users ?? []).filter((user) => user.expertId === item.id).map((user) => user.id);
        return [
          item.id,
          item.name,
          item.category,
          item.status,
          JSON.stringify(Array.from(new Set([...(item.accountUserIds ?? []), ...seededAccountIds]))),
          item.ownerOrgId ?? null,
          item.branchOrgId ?? null,
          JSON.stringify(item.reviewScopes ?? []),
          JSON.stringify(item.supplierAssessmentScopes ?? []),
          item.sharedAccount ? 1 : 0,
          item.active === false ? 0 : 1,
          JSON.stringify(item.avoidanceTags ?? []),
          item.maintainedAt ?? syncedAt,
          item.maintenanceLog ?? null,
          syncedAt
        ];
      }
    );
    this.upsertRows(
      "r2_expert_assignments",
      [
        "id",
        "project_id",
        "expert_id",
        "assignment_method",
        "assignment_status",
        "avoidance_confirmed",
        "discipline_confirmed",
        "confidentiality_confirmed",
        "reason",
        "replaced_by_expert_id",
        "replacement_reason",
        "notified_at",
        "created_at",
        "confirmed_at",
        "updated_at"
      ],
      ["id"],
      state.expertAssignments ?? [],
      (item) => [
        item.id,
        item.projectId,
        item.expertId,
        item.method,
        item.status,
        item.avoidanceConfirmed ? 1 : 0,
        item.disciplineConfirmed ? 1 : 0,
        item.confidentialityConfirmed ? 1 : 0,
        item.reason ?? null,
        item.replacedByExpertId ?? null,
        item.replacementReason ?? null,
        item.notifiedAt ?? null,
        item.createdAt ?? syncedAt,
        item.confirmedAt ?? null,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_scoring_templates",
      ["id", "template_code", "template_name", "version_no", "template_status", "config_json", "updated_at"],
      ["id"],
      state.scoringTemplates ?? [],
      (item) => [item.id, item.templateCode, item.templateName, item.versionNo, item.status, JSON.stringify(item.configJson), syncedAt]
    );
    this.upsertRows(
      "r2_expert_scores",
      [
        "id",
        "project_id",
        "expert_id",
        "supplier_id",
        "template_id",
        "technical_score",
        "service_score",
        "price_score",
        "total_score",
        "score_status",
        "opinion",
        "details_json",
        "version_no",
        "submitted_at",
        "locked_at",
        "updated_at"
      ],
      ["id"],
      state.scoringSheets ?? [],
      (item) => [
        item.id,
        item.projectId,
        item.expertId,
        item.supplierId,
        item.templateId,
        item.technical,
        item.service,
        item.price,
        item.total,
        item.status,
        item.opinion,
        JSON.stringify(item.details ?? { technical: item.technical, service: item.service, price: item.price }),
        item.versionNo,
        item.submittedAt,
        item.lockedAt,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_comparison_reports",
      ["id", "project_id", "report_no", "report_status", "recommended_supplier_id", "award_reason", "non_lowest_price_reason", "generated_by", "generated_at", "frozen_at", "comparison_rows_json", "updated_at"],
      ["id"],
      state.comparisonReports ?? [],
      (item) => [
        item.id,
        item.projectId,
        item.reportNo,
        item.status,
        item.recommendedSupplierId,
        item.awardReason,
        item.nonLowestPriceReason ?? null,
        item.generatedBy,
        item.generatedAt,
        item.frozenAt,
        JSON.stringify(item.comparisonRows),
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_award_decisions",
      [
        "id",
        "project_id",
        "recommended_supplier_id",
        "selected_supplier_id",
        "is_lowest_price",
        "approval_status",
        "non_lowest_price_reason",
        "approval_opinion",
        "adapter_call_id",
        "created_by",
        "created_at",
        "submitted_at",
        "approved_at",
        "updated_at"
      ],
      ["id"],
      state.awardApprovals ?? [],
      (item) => [
        item.id,
        item.projectId,
        item.recommendedSupplierId,
        item.selectedSupplierId,
        item.isLowestPrice ? 1 : 0,
        item.approvalStatus,
        item.nonLowestPriceReason ?? null,
        item.approvalOpinion ?? null,
        item.adapterCallId ?? null,
        item.createdBy,
        item.createdAt,
        item.submittedAt,
        item.approvedAt,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_pricing_reports",
      ["id", "project_id", "award_approval_id", "source_report_id", "report_no", "report_status", "selected_supplier_id", "pricing_basis_json", "created_by", "created_at", "approved_at", "updated_at"],
      ["id"],
      state.pricingReports ?? [],
      (item) => [
        item.id,
        item.projectId,
        item.awardApprovalId,
        item.sourceReportId,
        item.reportNo,
        item.status,
        item.selectedSupplierId,
        JSON.stringify(item.basisJson),
        item.createdBy,
        item.createdAt,
        item.approvedAt ?? null,
        item.updatedAt ?? syncedAt
      ]
    );
    this.upsertRows(
      "r2_pricing_report_items",
      [
        "id",
        "pricing_report_id",
        "project_id",
        "supplier_id",
        "product_id",
        "item_name",
        "specification",
        "quantity",
        "unit",
        "purchase_price",
        "sale_price",
        "service_fee_rate",
        "gross_margin_rate",
        "tax_rate",
        "delivery_days",
        "effective_from",
        "effective_to",
        "updated_at"
      ],
      ["id"],
      (state.pricingReports ?? []).flatMap((report) => report.items.map((item) => ({ report, item }))),
      ({ report, item }) => [
        item.id,
        report.id,
        report.projectId,
        report.selectedSupplierId,
        item.productId ?? null,
        item.itemName,
        item.specification ?? null,
        item.quantity,
        item.unit,
        item.purchasePrice,
        item.salePrice,
        item.serviceFeeRate,
        item.grossMarginRate,
        item.taxRate ?? null,
        item.deliveryDays ?? null,
        item.effectiveFrom,
        item.effectiveTo ?? null,
        syncedAt
      ]
    );
  }

  private syncR2OrderSettlementDomain(state: SeedState, syncedAt: string) {
    this.upsertRows(
      "r2_purchase_orders",
      [
        "id",
        "project_id",
        "supplier_id",
        "contract_id",
        "source_request_id",
        "award_approval_id",
        "selected_bid_id",
        "order_no",
        "order_status",
        "payment_status",
        "buyer_id",
        "org_id",
        "department_id",
        "total_amount",
        "expected_delivery_at",
        "receiving_location",
        "invoice_title",
        "confirmed_at",
        "created_by",
        "created_at",
        "updated_at",
        "synced_at"
      ],
      ["id"],
      state.purchaseOrders ?? [],
      (item) => [
        item.id,
        item.projectId,
        item.supplierId,
        item.contractId ?? null,
        item.sourceRequestId ?? null,
        item.awardApprovalId ?? null,
        item.selectedBidId ?? null,
        item.orderNo,
        item.status,
        item.paymentStatus ?? "payment_reserved",
        item.buyerId ?? item.createdBy,
        item.orgId ?? null,
        item.departmentId ?? null,
        item.totalAmount,
        item.expectedDeliveryAt,
        item.receivingLocation,
        item.invoiceTitle ?? null,
        item.confirmedAt,
        item.createdBy,
        item.createdAt,
        item.updatedAt,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_order_line_items",
      [
        "id",
        "order_id",
        "product_id",
        "sku_id",
        "item_name",
        "specification",
        "quantity",
        "unit",
        "unit_price",
        "tax_rate",
        "total_price",
        "received_quantity",
        "price_source_type",
        "price_source_id",
        "price_source_item_id",
        "updated_at"
      ],
      ["id"],
      state.purchaseOrders.flatMap((order) => order.lineItems.map((line) => ({ ...line, orderId: order.id }))),
      (item) => [
        item.id,
        item.orderId,
        item.productId ?? null,
        item.skuId ?? null,
        item.itemName,
        item.specification,
        item.quantity,
        item.unit,
        item.unitPrice,
        item.taxRate,
        item.totalPrice,
        item.receivedQuantity,
        item.priceSourceType ?? null,
        item.priceSourceId ?? null,
        item.priceSourceItemId ?? null,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_receipts",
      ["id", "purchase_order_id", "project_id", "supplier_id", "receipt_type", "exception_type", "acceptance_result", "handling_status", "summary", "receipt_at", "operator_id", "created_by", "created_at", "updated_at"],
      ["id"],
      state.receiptRecords ?? [],
      (item) => [
        item.id,
        item.purchaseOrderId,
        item.projectId,
        item.supplierId,
        item.receiptType ?? (item.exceptionType ? "exception" : "full"),
        item.exceptionType ?? null,
        item.acceptanceResult ?? (item.exceptionType ? "accepted_with_exception" : "accepted"),
        item.handlingStatus ?? (item.exceptionType ? "pending_resolution" : "none"),
        item.summary ?? "验收记录",
        item.receiptAt ?? item.createdAt,
        item.operatorId ?? item.createdBy,
        item.createdBy,
        item.createdAt ?? item.receiptAt,
        syncedAt
      ]
    );
    this.upsertRows(
      "r2_receipt_line_items",
      ["id", "receipt_id", "order_line_item_id", "item_name", "received_quantity", "unit", "accepted_flag", "updated_at"],
      ["id"],
      state.receiptRecords.flatMap((receipt) => receipt.receivedItems.map((line, index) => ({ ...line, id: `${receipt.id}:line:${index + 1}`, receiptId: receipt.id }))),
      (item) => [item.id, item.receiptId, null, item.itemName, item.receivedQuantity, item.unit, item.accepted ? 1 : 0, syncedAt]
    );
    this.upsertRows(
      "r2_shipments",
      ["id", "order_id", "supplier_id", "carrier", "tracking_no", "shipment_status", "shipped_at", "received_at", "updated_at"],
      ["id"],
      state.mallShipments ?? [],
      (item) => [item.id, item.orderId, item.supplierId, item.carrier, item.trackingNo, item.status, item.shippedAt, item.receivedAt ?? null, syncedAt]
    );
    this.upsertRows(
      "r2_returns",
      ["id", "order_id", "product_id", "quantity", "reason", "return_status", "created_by", "created_at", "reviewed_by", "reviewed_at", "updated_at"],
      ["id"],
      state.mallReturnRequests ?? [],
      (item) => [item.id, item.orderId, item.productId, item.quantity, item.reason, item.status, item.createdBy, item.createdAt, item.reviewedBy ?? null, item.reviewedAt ?? null, syncedAt]
    );
    this.upsertRows(
      "r2_settlement_materials",
      ["id", "purchase_order_id", "project_id", "supplier_id", "material_type", "material_status", "file_id", "file_name", "uploaded_by", "uploaded_at", "verified_by", "verified_at", "verification_opinion", "updated_at"],
      ["id"],
      state.settlementMaterials ?? [],
      (item) => [
        item.id,
        item.purchaseOrderId,
        item.projectId,
        item.supplierId,
        item.materialType,
        item.status,
        item.fileId ?? null,
        item.fileName ?? null,
        item.uploadedBy ?? null,
        item.uploadedAt ?? null,
        item.verifiedBy ?? null,
        item.verifiedAt ?? null,
        item.verificationOpinion ?? null,
        syncedAt
      ]
    );
    // R7 财务对象以 r2_* 表为主源，不能再由 runtime JSON 按订单派生影子结算单、发票和对账行。
  }

  private syncR2ApprovalAndAuditDomain(state: SeedState, syncedAt: string) {
    this.upsertRows(
      "r2_approval_rules",
      [
        "id",
        "rule_code",
        "rule_name",
        "business_type",
        "amount_min",
        "amount_max",
        "method_types_json",
        "node_role_ids_json",
        "actions_json",
        "org_scope_json",
        "hotel_scope_json",
        "approval_order_json",
        "default_strategy",
        "rule_status",
        "version_no",
        "updated_at"
      ],
      ["id"],
      state.approvalRules ?? [],
      (item) => [
        item.id,
        item.ruleCode,
        item.ruleName,
        item.businessType,
        item.amountMin ?? null,
        item.amountMax ?? null,
        JSON.stringify(item.methodTypes ?? []),
        JSON.stringify(item.nodeRoleIds ?? []),
        JSON.stringify(item.actions ?? []),
        JSON.stringify(item.orgScope ?? []),
        JSON.stringify(item.hotelScope ?? []),
        JSON.stringify(item.approvalOrder ?? item.nodeRoleIds ?? []),
        item.defaultStrategy ?? "manual_review_required",
        item.status,
        item.versionNo,
        item.updatedAt
      ]
    );
    const approvalInstances = [
      ...(state.procurementRequests ?? []).map((item) => ({
        id: `approval:request:${item.id}`,
        businessType: "procurement_request",
        businessId: item.id,
        status: item.approvalStatus,
        startedBy: item.createdBy,
        startedAt: item.createdAt,
        completedAt: item.approvedAt
      })),
      ...(state.awardApprovals ?? []).map((item) => ({
        id: `approval:award:${item.id}`,
        businessType: "award_approval",
        businessId: item.id,
        status: item.approvalStatus,
        startedBy: item.createdBy,
        startedAt: item.submittedAt ?? item.createdAt,
        completedAt: item.approvedAt
      }))
    ];
    this.upsertRows(
      "r2_approval_instances",
      ["id", "business_type", "business_id", "approval_status", "started_by", "started_at", "completed_at", "updated_at"],
      ["id"],
      approvalInstances,
      (item) => [item.id, item.businessType, item.businessId, item.status, item.startedBy ?? null, item.startedAt ?? null, item.completedAt ?? null, syncedAt]
    );
    this.upsertRows(
      "r2_approval_actions",
      ["id", "approval_instance_id", "actor_id", "action_code", "opinion", "acted_at", "updated_at"],
      ["id"],
      state.procurementRequests
        .filter((item) => Boolean(item.approvalBy || item.approvalOpinion || item.approvedAt))
        .map((item) => ({
          id: `approval-action:request:${item.id}`,
          approvalInstanceId: `approval:request:${item.id}`,
          actorId: item.approvalBy,
          actionCode: item.approvalStatus,
          opinion: item.approvalOpinion,
          actedAt: item.approvedAt
        })),
      (item) => [item.id, item.approvalInstanceId, item.actorId ?? null, item.actionCode, item.opinion ?? null, item.actedAt ?? null, syncedAt]
    );
    this.upsertRows(
      "r2_file_access_logs",
      ["id", "audit_log_id", "actor_id", "file_id", "object_type", "object_id", "access_result", "accessed_at", "updated_at"],
      ["id"],
      (state.auditLogs ?? []).filter((item) => item.objectType.includes("file") || item.action.includes("file")),
      (item) => [`file-access:${item.id}`, item.id, item.actorId, item.objectId, item.objectType, item.objectId, item.result, item.createdAt, syncedAt]
    );
  }

  private migrate() {
    this.runtimeDb.db.exec(`
      create table if not exists business_suppliers (
        id text primary key,
        name text not null,
        admission_status text not null,
        qualification text not null,
        risk text not null,
        category_auth_json text not null,
        qualification_attachments_json text not null,
        evaluation_score real null,
        synced_at text not null
      );

      create table if not exists business_organizations (
        id text primary key,
        name text not null,
        org_level text not null,
        parent_id text null,
        org_status text not null
      );

      create table if not exists business_users (
        id text primary key,
        name text not null,
        role_id text not null,
        org_id text not null,
        user_status text not null,
        department_id text null,
        position_name text null,
        supplier_id text null,
        expert_id text null,
        org_scope_json text not null,
        managed_project_ids_json text not null
      );

      create table if not exists business_approval_rules (
        id text primary key,
        rule_code text not null unique,
        rule_name text not null,
        business_type text not null,
        amount_min real null,
        amount_max real null,
        method_types_json text not null,
        node_role_ids_json text not null,
        actions_json text not null,
        rule_status text not null,
        version_no integer not null,
        updated_at text not null
      );

      create table if not exists business_supplier_seal_samples (
        id text primary key,
        supplier_id text not null,
        sample_name text not null,
        specification text not null,
        file_id text null,
        file_name text null,
        content_type text null,
        uploaded_at text null
      );

      create table if not exists business_procurement_requests (
        id text primary key,
        code text null,
        project_id text null,
        title text not null,
        org_id text not null,
        category text null,
        request_status text not null,
        approval_status text not null,
        method_rule_id text null,
        method_suggestion text not null,
        external_trade_flag integer not null,
        budget_amount real null,
        line_items_json text not null,
        attachments_json text not null,
        created_at text null,
        updated_at text null
      );

      create table if not exists business_projects (
        id text primary key,
        code text not null,
        source_request_id text null,
        name text not null,
        org_id text not null,
        org_name text not null,
        method_type text not null,
        project_status text not null,
        display_status text not null,
        category text not null,
        external_trade_flag integer not null,
        quote_deadline_at text null,
        before_deadline integer not null,
        participant_supplier_ids_json text not null,
        assigned_expert_ids_json text not null,
        source_line_items_json text not null,
        attachments_json text not null
      );

      create table if not exists business_procurement_documents (
        id text primary key,
        project_id text not null,
        title text not null,
        version_no integer not null,
        document_status text not null,
        review_status text not null,
        content_summary text not null,
        attachment_metadata_json text not null,
        previous_document_id text null,
        created_by text not null,
        created_at text not null,
        updated_at text not null,
        published_at text null,
        locked_at text null
      );

      create table if not exists business_announcements (
        id text primary key,
        project_id text not null,
        document_id text not null,
        title text not null,
        procurement_method text not null,
        announcement_scope text not null,
        announcement_status text not null,
        registration_deadline_at text not null,
        quote_deadline_at text not null,
        published_at text null
      );

      create table if not exists business_inquiry_sheets (
        id text primary key,
        project_id text not null,
        inquiry_no text not null,
        title text not null,
        supplier_ids_json text not null,
        current_round integer not null,
        max_rounds integer not null,
        quote_rule_config_json text not null,
        pricing_decision_json text null,
        inquiry_status text not null,
        deadline_at text not null,
        created_by text not null,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists business_project_samples (
        id text primary key,
        project_id text not null,
        supplier_id text not null,
        sample_name text not null,
        quantity real not null,
        sample_status text not null,
        received_by text not null,
        received_at text not null,
        return_required integer not null,
        returned_by text null,
        returned_at text null,
        attachment_metadata_json text not null,
        handling_note text null
      );

      create table if not exists business_registrations (
        id text primary key,
        project_id text not null,
        announcement_id text not null,
        supplier_id text not null,
        registration_status text not null,
        material_metadata_json text not null,
        supplement_material_metadata_json text not null,
        submitted_at text not null,
        qualified_at text null,
        qualification_reason text null
      );

      create table if not exists business_bids (
        id text primary key,
        project_id text not null,
        supplier_id text not null,
        amount real not null,
        bid_status text not null,
        submitted_at text null,
        quote_deadline_at text not null,
        locked_at text null,
        version_no integer not null,
        file_id text not null,
        file_name text not null,
        response_file_metadata_json text not null
      );

      create table if not exists business_award_approvals (
        id text primary key,
        project_id text not null,
        selected_supplier_id text not null,
        recommended_supplier_id text not null,
        approval_status text not null,
        non_lowest_price_reason text null,
        created_by text not null,
        created_at text not null,
        submitted_at text null,
        approved_at text null
      );

      create table if not exists business_purchase_orders (
        id text primary key,
        project_id text not null,
        supplier_id text not null,
        order_no text not null unique,
        order_status text not null,
        total_amount real not null,
        line_items_json text not null,
        expected_delivery_at text not null,
        receiving_location text not null,
        confirmed_at text null,
        created_by text not null,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists business_receipts (
        id text primary key,
        purchase_order_id text not null,
        project_id text not null,
        supplier_id text not null,
        receipt_type text not null,
        exception_type text null,
        acceptance_result text not null,
        handling_status text not null,
        received_items_json text not null,
        summary text not null,
        attachment_metadata_json text not null,
        created_at text not null
      );

      create table if not exists business_settlement_materials (
        id text primary key,
        purchase_order_id text not null,
        project_id text not null,
        supplier_id text not null,
        material_type text not null,
        material_status text not null,
        file_id text null,
        file_name text null,
        uploaded_by text null,
        uploaded_at text null,
        verified_by text null,
        verified_at text null,
        verification_opinion text null
      );

      create table if not exists business_archive_items (
        id text primary key,
        project_id text not null,
        item_name text not null,
        required_flag integer not null,
        collected_flag integer not null,
        sealed integer not null,
        archive_status text not null,
        snapshot_json text not null
      );

      create table if not exists business_mall_products (
        id text primary key,
        name text not null,
        category text not null,
        brand text not null,
        unit text not null,
        sku_code text not null,
        specification text not null,
        product_status text not null,
        supplier_id text not null,
        service_regions_json text not null,
        procurement_category text null,
        image_file_ids_json text not null,
        attachment_file_ids_json text not null,
        tags_json text not null default '[]',
        created_by text not null,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists business_mall_prices (
        id text primary key,
        product_id text not null,
        supplier_id text not null,
        price real not null,
        effective_from text not null,
        effective_to text null,
        approval_status text not null,
        version_no integer not null,
        created_by text not null,
        created_at text not null
      );

      create table if not exists business_mall_orders (
        id text primary key,
        order_no text not null unique,
        buyer_id text not null,
        org_id text not null,
        supplier_id text not null,
        order_status text not null,
        total_amount real not null,
        line_items_json text not null,
        shipping_address text not null,
        invoice_title text not null,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists business_mall_shipments (
        id text primary key,
        order_id text not null,
        supplier_id text not null,
        carrier text not null,
        tracking_no text not null,
        shipment_status text not null,
        shipped_at text not null,
        received_at text null
      );

      create table if not exists business_mall_returns (
        id text primary key,
        order_id text not null,
        product_id text not null,
        quantity real not null,
        reason text not null,
        return_status text not null,
        created_by text not null,
        created_at text not null,
        reviewed_by text null,
        reviewed_at text null
      );

      create table if not exists business_mall_invoices (
        id text primary key,
        order_id text not null,
        supplier_id text not null,
        invoice_status text not null,
        file_id text null,
        file_name text null,
        amount real not null,
        uploaded_by text not null,
        uploaded_at text not null,
        verified_by text null,
        verified_at text null
      );

      create table if not exists business_mall_questionnaires (
        id text primary key,
        title text not null,
        scope text not null,
        questionnaire_status text not null,
        questions_json text not null,
        target_supplier_ids_json text not null default '[]',
        submissions_json text not null default '[]',
        archived_at text null,
        created_by text not null,
        created_at text not null
      );

      create table if not exists business_mall_scenario_templates (
        id text primary key,
        template_type text not null,
        name text not null,
        template_status text not null,
        product_ids_json text not null,
        package_items_json text not null default '[]',
        applicable_brands_json text not null default '[]',
        applicable_hotel_types_json text not null default '[]',
        applicable_hotel_ids_json text not null default '[]',
        room_count real null,
        budget_amount real null,
        description text null,
        generated_order_ids_json text not null default '[]',
        attachment_file_ids_json text not null,
        created_by text not null,
        created_at text not null
      );

      create table if not exists business_mall_fund_accounts (
        id text primary key,
        org_id text not null,
        balance real not null,
        credit_limit real not null,
        occupied_amount real not null,
        account_status text not null,
        ledger_entries_json text not null,
        adapter_boundary text not null,
        updated_at text not null
      );

      create table if not exists r2_migration_runs (
        id text primary key,
        source_key text not null,
        status text not null,
        object_counts_json text not null,
        executed_at text not null
      );

      create table if not exists r2_business_object_registry (
        object_type text primary key,
        source_table text not null,
        source_kind text not null,
        owner_stage text not null,
        r2_note text not null,
        updated_at text not null
      );

      create table if not exists r2_state_transition_rules (
        id text primary key,
        object_type text not null,
        from_status text not null,
        to_status text not null,
        action_code text not null,
        allowed_flag integer not null,
        updated_at text not null,
        unique(object_type, from_status, to_status, action_code)
      );

      create table if not exists r2_organizations (
        id text primary key,
        name text not null,
        org_level text not null,
        parent_id text null,
        org_status text not null,
        updated_at text not null
      );

      create table if not exists r2_departments_hotels (
        id text primary key,
        organization_id text not null,
        name text not null,
        unit_type text not null,
        parent_id text null,
        unit_status text not null,
        updated_at text not null
      );

      create table if not exists r2_roles (
        id text primary key,
        role_name text not null,
        role_hint text not null,
        updated_at text not null
      );

      create table if not exists r2_users (
        id text primary key,
        display_name text not null,
        role_id text not null,
        org_id text not null,
        department_id text null,
        position_name text null,
        supplier_id text null,
        expert_id text null,
        user_status text not null,
        org_scope_json text not null,
        managed_project_ids_json text not null,
        updated_at text not null
      );

      create table if not exists r2_supplier_accounts (
        id text primary key,
        supplier_id text not null,
        user_id text not null,
        account_status text not null,
        updated_at text not null
      );

      create table if not exists r2_suppliers (
        id text primary key,
        supplier_name text not null,
        admission_status text not null,
        supplier_status text not null,
        contact_name text null,
        contact_phone text null,
        contact_email text null,
        supplier_type text null,
        supplier_source text null,
        social_credit_code text null,
        business_license_no text null,
        legal_representative text null,
        registered_address text null,
        business_scope text null,
        qualification_status text not null,
        risk_note text not null,
        restriction_reason text null,
        restricted_at text null,
        evaluation_score real null,
        admission_level text null,
        admission_rule_code text null,
        admission_rule_snapshot_json text null,
        regularized_at text null,
        periodic_assessment_json text null,
        registration_trace_json text null,
        onboarding_profile_json text null,
        category_auth_json text not null,
        updated_at text not null
      );

      create table if not exists r2_supplier_qualifications (
        id text primary key,
        supplier_id text not null,
        qualification_type text not null,
        file_id text null,
        file_name text not null,
        valid_until text null,
        qualification_status text not null,
        uploaded_at text not null,
        updated_at text not null
      );

      create table if not exists r2_supplier_admission_reviews (
        id text primary key,
        supplier_id text not null,
        review_type text not null,
        review_status text not null,
        score real null,
        reviewer_name text not null,
        opinion text not null,
        reviewed_at text not null,
        score_template_code text null,
        score_items_json text null,
        regularization_decision text null,
        updated_at text not null
      );

      create table if not exists r2_supplier_seal_samples (
        id text primary key,
        supplier_id text not null,
        sample_name text not null,
        specification text not null,
        confirmed_by text not null,
        confirmed_at text not null,
        file_id text null,
        file_name text null,
        content_type text null,
        uploaded_at text null,
        updated_at text not null
      );

      create table if not exists r2_supplier_service_regions (
        id text primary key,
        supplier_id text not null,
        region_name text not null,
        hotel_name text not null,
        category text not null,
        region_status text not null,
        updated_at text not null
      );

      create table if not exists r2_supplier_category_authorizations (
        id text primary key,
        supplier_id text not null,
        category text not null,
        authorization_status text not null,
        authorized_at text not null,
        expires_at text null,
        updated_at text not null
      );

      create table if not exists r2_supplier_restrictions (
        id text primary key,
        supplier_id text not null,
        restriction_status text not null,
        reason text not null,
        restricted_at text not null,
        updated_at text not null
      );

      create table if not exists r2_supplier_evaluations (
        id text primary key,
        supplier_id text not null,
        project_id text not null,
        purchase_order_id text null,
        score real not null,
        dimensions_json text not null,
        description text not null default '',
        improvement_suggestion text null,
        evaluation_status text not null,
        locked_at text not null,
        created_by text not null,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists r2_products (
        id text primary key,
        product_name text not null,
        category text not null,
        brand text not null,
        unit text not null,
        packing_quantity real null,
        min_order_qty real null,
        max_order_qty real null,
        tax_rate real null,
        invoice_name text null,
        tax_classification_code text null,
        detail_description text null,
        acceptance_guide text null,
        installation_requirement text null,
        tags_json text not null default '[]',
        product_status text not null,
        supplier_id text not null,
        service_regions_json text not null default '[]',
        procurement_category text null,
        source_type text null,
        source_project_id text null,
        source_agreement_no text null,
        source_pricing_report_id text null,
        source_pricing_report_item_id text null,
        listed_at text null,
        created_by text not null,
        created_at text not null,
        updated_at text not null,
        synced_at text not null
      );

      create table if not exists r2_skus (
        id text primary key,
        product_id text not null,
        sku_code text not null,
        specification text not null,
        unit text not null,
        sku_status text not null,
        min_order_qty real null,
        max_order_qty real null,
        updated_at text not null
      );

      create table if not exists r2_product_images (
        id text primary key,
        product_id text not null,
        file_id text not null,
        image_role text not null,
        sort_no integer not null,
        updated_at text not null
      );

      create table if not exists r2_supplier_quotations (
        id text primary key,
        supplier_id text not null,
        product_id text not null,
        quotation_type text not null,
        quotation_status text not null,
        effective_from text not null,
        effective_to text null,
        version_no integer not null,
        created_by text not null,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists r2_supplier_quotation_items (
        id text primary key,
        quotation_id text not null,
        product_id text not null,
        sku_id text not null,
        purchase_price real null,
        sale_price real null,
        tax_rate real null,
        delivery_days integer null,
        updated_at text not null
      );

      create table if not exists r2_procurement_requests (
        id text primary key,
        request_code text null,
        project_id text null,
        title text not null,
        org_id text not null,
        request_department text null,
        requester_name text null,
        category text null,
        description text null,
        request_status text not null,
        approval_status text not null,
        approval_opinion text null,
        approval_by text null,
        approved_at text null,
        budget_label text null,
        budget_amount real null,
        purpose text null,
        expected_arrival_at text null,
        receiving_location text null,
        method_suggestion text null,
        method_rule_id text null,
        external_trade_flag integer not null default 0,
        attachments_json text not null default '[]',
        created_by text null,
        created_at text null,
        updated_at text null,
        synced_at text not null
      );

      create table if not exists r2_procurement_request_items (
        id text primary key,
        request_id text not null,
        item_name text not null,
        category text null,
        specification text not null,
        quantity real not null,
        unit text not null,
        estimated_unit_price real null,
        budget_amount real null,
        required_by_date text null,
        remark text null,
        updated_at text not null
      );

      create table if not exists r2_sourcing_projects (
        id text primary key,
        project_code text not null,
        source_request_id text null,
        project_name text not null,
        org_id text not null,
        org_name text null,
        method_type text not null,
        project_status text not null,
        display_status text null,
        category text not null,
        quote_deadline_at text null,
        before_deadline integer not null default 0,
        external_trade_flag integer not null,
        budget_label text null,
        budget_amount real null,
        request_department text null,
        requester_name text null,
        receiving_location text null,
        expected_arrival_at text null,
        buyer_name text not null,
        qualification_requirements_json text not null default '[]',
        quote_requirements_json text not null default '[]',
        delivery_requirements_json text not null default '[]',
        attachments_json text not null default '[]',
        participant_supplier_ids_json text not null default '[]',
        assigned_expert_ids_json text not null default '[]',
        updated_at text not null
      );

      create table if not exists r2_sourcing_project_items (
        id text primary key,
        project_id text not null,
        source_request_item_id text null,
        item_name text not null,
        category text null,
        specification text not null,
        quantity real not null,
        unit text not null,
        estimated_unit_price real null,
        budget_amount real null,
        required_by_date text null,
        remark text null,
        updated_at text not null
      );

      create table if not exists r2_supplier_invitations (
        id text primary key,
        project_id text not null,
        announcement_id text not null,
        supplier_id text not null,
        invitation_status text not null,
        notification_status text not null,
        notified_at text null,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists r2_supplier_participations (
        id text primary key,
        project_id text not null,
        announcement_id text not null,
        supplier_id text not null,
        participation_status text not null,
        material_metadata_json text not null default '[]',
        supplement_material_metadata_json text not null default '[]',
        submitted_at text not null,
        qualified_at text null,
        qualification_reason text null,
        updated_at text not null
      );

      create table if not exists r2_bids (
        id text primary key,
        project_id text not null,
        supplier_id text not null,
        amount real not null,
        tax_rate real null,
        tax_inclusive integer not null default 0,
        tax_note text null,
        delivery_days integer null,
        response_summary text null,
        service_commitment text null,
        bid_status text not null,
        submitted_at text null,
        quote_deadline_at text not null,
        locked_at text null,
        withdrawn_at text null,
        withdrawal_reason text null,
        abandoned_at text null,
        abandonment_reason text null,
        version_no integer not null,
        file_id text not null,
        file_name text not null,
        updated_at text not null
      );

      create table if not exists r2_bid_line_items (
        id text primary key,
        bid_id text not null,
        project_id text not null,
        supplier_id text not null,
        item_name text not null,
        quantity real not null,
        unit text not null,
        unit_price real not null,
        tax_rate real not null,
        total_price real not null,
        delivery_days integer not null,
        updated_at text not null
      );

      create table if not exists r2_response_files (
        id text primary key,
        bid_id text not null,
        project_id text not null,
        supplier_id text not null,
        file_id text not null,
        file_name text not null,
        content_type text not null,
        size_bytes integer not null default 0,
        uploaded_at text not null,
        updated_at text not null
      );

      create table if not exists r2_clarifications (
        id text primary key,
        project_id text not null,
        supplier_id text null,
        question text not null,
        answer text not null,
        visibility text not null,
        clarification_status text not null default 'answered',
        asked_at text null,
        answered_by text not null,
        answered_at text not null,
        question_attachments_json text not null default '[]',
        answer_attachments_json text not null default '[]',
        notification_trace_json text null,
        updated_at text not null
      );

      create table if not exists r2_experts (
        id text primary key,
        expert_name text not null,
        category text not null,
        expert_status text not null,
        account_user_ids_json text not null default '[]',
        owner_org_id text null,
        branch_org_id text null,
        review_scopes_json text not null default '[]',
        supplier_assessment_scopes_json text not null default '[]',
        shared_account integer not null default 0,
        active_flag integer not null default 1,
        avoidance_tags_json text not null default '[]',
        maintained_at text null,
        maintenance_log text null,
        updated_at text not null
      );

      create table if not exists r2_expert_assignments (
        id text primary key,
        project_id text not null,
        expert_id text not null,
        assignment_method text not null,
        assignment_status text not null,
        avoidance_confirmed integer not null default 0,
        discipline_confirmed integer not null default 0,
        confidentiality_confirmed integer not null default 0,
        reason text null,
        replaced_by_expert_id text null,
        replacement_reason text null,
        notified_at text null,
        created_at text not null,
        confirmed_at text null,
        updated_at text not null
      );

      create table if not exists r2_scoring_templates (
        id text primary key,
        template_code text not null,
        template_name text not null,
        version_no integer not null,
        template_status text not null,
        config_json text not null,
        updated_at text not null
      );

      create table if not exists r2_expert_scores (
        id text primary key,
        project_id text not null,
        expert_id text not null,
        supplier_id text not null,
        template_id text not null,
        technical_score real not null,
        service_score real not null,
        price_score real not null,
        total_score real not null,
        score_status text not null,
        opinion text not null default '',
        details_json text not null default '{}',
        version_no integer not null,
        submitted_at text null,
        locked_at text null,
        updated_at text not null
      );

      create table if not exists r2_comparison_reports (
        id text primary key,
        project_id text not null,
        report_no text not null,
        report_status text not null,
        recommended_supplier_id text not null,
        award_reason text not null,
        non_lowest_price_reason text null,
        generated_by text not null,
        generated_at text not null,
        frozen_at text null,
        comparison_rows_json text not null,
        updated_at text not null
      );

      create table if not exists r2_award_decisions (
        id text primary key,
        project_id text not null,
        recommended_supplier_id text not null,
        selected_supplier_id text not null,
        is_lowest_price integer not null,
        approval_status text not null,
        non_lowest_price_reason text null,
        approval_opinion text null,
        adapter_call_id text null,
        created_by text not null,
        created_at text not null,
        submitted_at text null,
        approved_at text null,
        updated_at text not null
      );

      create table if not exists r2_pricing_reports (
        id text primary key,
        project_id text not null,
        award_approval_id text null,
        source_report_id text not null,
        report_no text null,
        report_status text not null,
        selected_supplier_id text not null,
        pricing_basis_json text not null,
        created_by text null,
        created_at text not null,
        approved_at text null,
        updated_at text not null
      );

      create table if not exists r2_pricing_report_items (
        id text primary key,
        pricing_report_id text not null,
        project_id text not null,
        supplier_id text not null,
        product_id text null,
        item_name text not null,
        specification text null,
        quantity real not null,
        unit text not null,
        purchase_price real not null,
        sale_price real not null,
        service_fee_rate real not null,
        gross_margin_rate real not null,
        tax_rate real null,
        delivery_days integer null,
        effective_from text not null,
        effective_to text null,
        updated_at text not null
      );

      create table if not exists r2_purchase_orders (
        id text primary key,
        project_id text not null,
        supplier_id text not null,
        contract_id text null,
        source_request_id text null,
        award_approval_id text null,
        selected_bid_id text null,
        order_no text not null,
        order_status text not null,
        payment_status text not null default 'payment_reserved',
        buyer_id text null,
        org_id text null,
        department_id text null,
        total_amount real not null,
        expected_delivery_at text not null,
        receiving_location text not null,
        invoice_title text null,
        confirmed_at text null,
        created_by text not null,
        created_at text not null,
        updated_at text not null,
        synced_at text not null
      );

      create table if not exists r2_order_line_items (
        id text primary key,
        order_id text not null,
        product_id text null,
        sku_id text null,
        item_name text not null,
        specification text not null,
        quantity real not null,
        unit text not null,
        unit_price real not null,
        tax_rate real not null,
        total_price real not null,
        received_quantity real not null,
        price_source_type text null,
        price_source_id text null,
        price_source_item_id text null,
        updated_at text not null
      );

      create table if not exists r2_cart_items (
        id text primary key,
        buyer_id text not null,
        org_id text not null,
        product_id text not null,
        supplier_id text not null,
        quantity real not null,
        unit_price real not null,
        price_source_type text not null,
        price_source_id text not null,
        price_source_item_id text null,
        updated_at text not null
      );

      create table if not exists r2_shipments (
        id text primary key,
        order_id text not null,
        supplier_id text not null,
        carrier text not null,
        tracking_no text not null,
        contact_name text null,
        contact_phone text null,
        estimated_arrival_at text null,
        shipped_quantity real null,
        shipment_status text not null,
        shipped_at text not null,
        received_at text null,
        updated_at text not null
      );

      create table if not exists r2_receipts (
        id text primary key,
        purchase_order_id text not null,
        project_id text not null,
        supplier_id text not null,
        receipt_type text not null,
        exception_type text null,
        acceptance_result text not null,
        handling_status text not null,
        summary text not null,
        attachment_file_ids_json text not null default '[]',
        receipt_at text not null,
        operator_id text not null,
        created_by text not null,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists r2_receipt_line_items (
        id text primary key,
        receipt_id text not null,
        order_line_item_id text null,
        item_name text not null,
        received_quantity real not null,
        unit text not null,
        accepted_flag integer not null,
        updated_at text not null
      );

      create table if not exists r2_returns (
        id text primary key,
        order_id text not null,
        product_id text not null,
        order_line_item_id text null,
        quantity real not null,
        reason text not null,
        handling_note text null,
        return_status text not null,
        created_by text not null,
        created_at text not null,
        reviewed_by text null,
        reviewed_at text null,
        updated_at text not null
      );

      create table if not exists r2_settlement_bills (
        id text primary key,
        bill_no text null,
        purchase_order_id text not null,
        project_id text not null,
        supplier_id text not null,
        org_id text null,
        department_id text null,
        settlement_period text null,
        bill_status text not null,
        order_amount real not null default 0,
        received_amount real not null default 0,
        return_amount real not null default 0,
        service_fee real not null default 0,
        settlement_amount real not null,
        source_json text not null,
        created_by text null,
        created_at text null,
        submitted_by text null,
        submitted_at text null,
        approved_by text null,
        approved_at text null,
        approval_opinion text null,
        updated_at text not null
      );

      create table if not exists r2_settlement_bill_items (
        id text primary key,
        settlement_bill_id text not null,
        purchase_order_id text not null,
        order_line_item_id text not null,
        receipt_id text null,
        return_id text null,
        item_name text not null,
        ordered_quantity real not null,
        received_quantity real not null,
        returned_quantity real not null,
        unit_price real not null,
        order_amount real not null,
        received_amount real not null,
        return_amount real not null,
        payable_amount real not null,
        source_json text not null default '{}',
        updated_at text not null
      );

      create table if not exists r2_settlement_materials (
        id text primary key,
        settlement_bill_id text null,
        purchase_order_id text not null,
        project_id text not null,
        supplier_id text not null,
        material_type text not null,
        material_status text not null,
        file_id text null,
        file_name text null,
        uploaded_by text null,
        uploaded_at text null,
        verified_by text null,
        verified_at text null,
        verification_opinion text null,
        updated_at text not null
      );

      create table if not exists r2_invoices (
        id text primary key,
        settlement_bill_id text null,
        order_id text not null,
        supplier_id text not null,
        invoice_no text null,
        invoice_type text null,
        issue_date text null,
        invoice_status text not null,
        file_id text null,
        file_name text null,
        amount real null,
        tax_rate real null,
        tax_amount real null,
        uploaded_by text null,
        uploaded_at text null,
        verified_by text null,
        verified_at text null,
        verification_opinion text null,
        updated_at text not null
      );

      create table if not exists r2_amount_reconciliation_lines (
        id text primary key,
        source_type text not null,
        source_id text not null,
        project_id text null,
        supplier_id text null,
        order_amount real not null default 0,
        received_amount real not null default 0,
        return_amount real not null default 0,
        service_fee real not null default 0,
        expected_amount real not null,
        actual_amount real not null,
        reconciliation_status text not null,
        reconciliation_reason text null,
        handled_by text null,
        handled_at text null,
        updated_at text not null
      );

      create table if not exists r2_fund_ledger_entries (
        id text primary key,
        ledger_no text not null,
        settlement_bill_id text not null,
        supplier_id text not null,
        org_id text null,
        department_id text null,
        amount real not null,
        direction text not null,
        entry_type text not null,
        ledger_status text not null,
        created_by text not null,
        created_at text not null,
        operated_by text null,
        operated_at text null,
        note text null,
        updated_at text not null
      );

      create table if not exists r2_approval_rules (
        id text primary key,
        rule_code text not null,
        rule_name text not null,
        business_type text not null,
        amount_min real null,
        amount_max real null,
        method_types_json text not null,
        node_role_ids_json text not null,
        actions_json text not null,
        org_scope_json text not null default '[]',
        hotel_scope_json text not null default '[]',
        approval_order_json text not null default '[]',
        default_strategy text not null default 'manual_review_required',
        rule_status text not null,
        version_no integer not null,
        updated_at text not null
      );

      create table if not exists r2_approval_instances (
        id text primary key,
        business_type text not null,
        business_id text not null,
        approval_status text not null,
        started_by text null,
        started_at text null,
        completed_at text null,
        rule_id text null,
        rule_code text null,
        project_id text null,
        org_id text null,
        supplier_id text null,
        business_title text not null default '',
        business_amount real null,
        current_node_index integer not null default 0,
        current_role_id text null,
        current_user_id text null,
        completed_by text null,
        source_json text not null default '{}',
        updated_at text not null
      );

      create table if not exists r2_approval_actions (
        id text primary key,
        approval_instance_id text not null,
        actor_id text null,
        action_code text not null,
        opinion text null,
        acted_at text null,
        business_type text null,
        business_id text null,
        actor_role_id text null,
        from_status text null,
        to_status text null,
        project_id text null,
        source_json text not null default '{}',
        updated_at text not null
      );

      create table if not exists r2_task_items (
        id text primary key,
        task_code text not null,
        task_type text not null,
        business_type text not null,
        business_id text not null,
        project_id text null,
        title text not null,
        assignee_role_id text null,
        assignee_user_id text null,
        supplier_id text null,
        org_id text null,
        approval_instance_id text null,
        task_status text not null,
        due_at text null,
        created_at text not null,
        completed_at text null,
        completed_by text null,
        source_json text not null default '{}',
        updated_at text not null
      );

      create table if not exists r2_notifications (
        id text primary key,
        message_code text not null,
        recipient_user_id text null,
        recipient_role_id text null,
        supplier_id text null,
        org_id text null,
        business_type text not null,
        business_id text not null,
        project_id text null,
        title text not null,
        content_summary text not null,
        read_flag integer not null default 0,
        created_at text not null,
        read_at text null,
        event_type text not null,
        delivery_channels_json text not null default '["in_app"]',
        external_event_status text not null default 'not_dispatched',
        source_json text not null default '{}',
        updated_at text not null
      );

      create table if not exists r2_file_access_logs (
        id text primary key,
        audit_log_id text not null,
        actor_id text not null,
        file_id text not null,
        object_type text not null,
        object_id text not null,
        access_result text not null,
        accessed_at text not null,
        updated_at text not null
      );
    `);
    this.ensureApprovalInstanceColumns();
    this.runtimeDb.db.exec(`
      create index if not exists idx_business_requests_project on business_procurement_requests(project_id);
      create index if not exists idx_business_projects_status on business_projects(project_status);
      create index if not exists idx_business_bids_project_supplier on business_bids(project_id, supplier_id);
      create index if not exists idx_business_orders_project on business_purchase_orders(project_id);
      create index if not exists idx_business_files_settlement on business_settlement_materials(project_id, supplier_id);
      create index if not exists idx_business_mall_products_supplier on business_mall_products(supplier_id, product_status);
      create index if not exists idx_business_mall_orders_supplier on business_mall_orders(supplier_id, order_status);
      create index if not exists idx_r2_users_role_org on r2_users(role_id, org_id);
      create index if not exists idx_r2_suppliers_status on r2_suppliers(admission_status, supplier_status);
      create index if not exists idx_r2_supplier_qualifications_supplier on r2_supplier_qualifications(supplier_id);
      create index if not exists idx_r2_supplier_seal_samples_supplier on r2_supplier_seal_samples(supplier_id);
      create index if not exists idx_r2_products_supplier_status on r2_products(supplier_id, product_status);
      create index if not exists idx_r2_requests_org_status on r2_procurement_requests(org_id, request_status, approval_status);
      create index if not exists idx_r2_request_items_request on r2_procurement_request_items(request_id);
      create index if not exists idx_r2_projects_status on r2_sourcing_projects(project_status);
      create index if not exists idx_r2_project_items_project on r2_sourcing_project_items(project_id);
      create index if not exists idx_r2_invitations_supplier on r2_supplier_invitations(supplier_id, project_id);
      create index if not exists idx_r2_participations_supplier on r2_supplier_participations(supplier_id, project_id);
      create index if not exists idx_r2_bids_project_supplier on r2_bids(project_id, supplier_id);
      create index if not exists idx_r2_response_files_bid on r2_response_files(bid_id);
      create index if not exists idx_r2_clarifications_project on r2_clarifications(project_id, supplier_id);
      create index if not exists idx_r2_expert_assignments_project on r2_expert_assignments(project_id, expert_id);
      create index if not exists idx_r2_expert_scores_project on r2_expert_scores(project_id, expert_id, supplier_id);
      create index if not exists idx_r2_comparison_reports_project on r2_comparison_reports(project_id, report_status);
      create index if not exists idx_r2_award_decisions_project on r2_award_decisions(project_id, approval_status);
      create index if not exists idx_r2_pricing_reports_project on r2_pricing_reports(project_id, selected_supplier_id);
      create index if not exists idx_r2_pricing_report_items_report on r2_pricing_report_items(pricing_report_id);
      create index if not exists idx_r2_orders_project_supplier on r2_purchase_orders(project_id, supplier_id);
      create index if not exists idx_r2_cart_buyer on r2_cart_items(buyer_id, product_id);
      create index if not exists idx_r2_receipts_order on r2_receipts(purchase_order_id);
      create index if not exists idx_r2_settlement_materials_order on r2_settlement_materials(purchase_order_id, material_status);
      create index if not exists idx_r2_settlement_bill_items_bill on r2_settlement_bill_items(settlement_bill_id, purchase_order_id);
      create index if not exists idx_r2_invoices_order on r2_invoices(order_id, invoice_status);
      create index if not exists idx_r2_fund_ledger_bill on r2_fund_ledger_entries(settlement_bill_id, ledger_status);
      create index if not exists idx_r2_approval_instances_business on r2_approval_instances(business_type, business_id);
      create index if not exists idx_r2_approval_instances_role on r2_approval_instances(current_role_id, approval_status);
      create index if not exists idx_r2_task_items_assignee on r2_task_items(assignee_role_id, assignee_user_id, task_status);
      create index if not exists idx_r2_task_items_business on r2_task_items(business_type, business_id);
      create index if not exists idx_r2_notifications_recipient on r2_notifications(recipient_role_id, recipient_user_id, read_flag);
      create index if not exists idx_r2_notifications_business on r2_notifications(business_type, business_id);
    `);
    this.addColumnIfMissing("r2_approval_rules", "org_scope_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_approval_rules", "hotel_scope_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_approval_rules", "approval_order_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_approval_rules", "default_strategy", "text not null default 'manual_review_required'");
    this.addColumnIfMissing("r2_approval_actions", "business_type", "text null");
    this.addColumnIfMissing("r2_approval_actions", "business_id", "text null");
    this.addColumnIfMissing("r2_approval_actions", "actor_role_id", "text null");
    this.addColumnIfMissing("r2_approval_actions", "from_status", "text null");
    this.addColumnIfMissing("r2_approval_actions", "to_status", "text null");
    this.addColumnIfMissing("r2_approval_actions", "project_id", "text null");
    this.addColumnIfMissing("r2_approval_actions", "source_json", "text not null default '{}'");
    this.addColumnIfMissing("r2_suppliers", "supplier_type", "text null");
    this.addColumnIfMissing("r2_suppliers", "supplier_source", "text null");
    this.addColumnIfMissing("r2_suppliers", "social_credit_code", "text null");
    this.addColumnIfMissing("r2_suppliers", "business_license_no", "text null");
    this.addColumnIfMissing("r2_suppliers", "legal_representative", "text null");
    this.addColumnIfMissing("r2_suppliers", "registered_address", "text null");
    this.addColumnIfMissing("r2_suppliers", "business_scope", "text null");
    this.addColumnIfMissing("r2_suppliers", "admission_level", "text null");
    this.addColumnIfMissing("r2_suppliers", "admission_rule_code", "text null");
    this.addColumnIfMissing("r2_suppliers", "admission_rule_snapshot_json", "text null");
    this.addColumnIfMissing("r2_suppliers", "regularized_at", "text null");
    this.addColumnIfMissing("r2_suppliers", "periodic_assessment_json", "text null");
    this.addColumnIfMissing("r2_suppliers", "registration_trace_json", "text null");
    this.addColumnIfMissing("r2_suppliers", "onboarding_profile_json", "text null");
    this.addColumnIfMissing("r2_supplier_admission_reviews", "score_template_code", "text null");
    this.addColumnIfMissing("r2_supplier_admission_reviews", "score_items_json", "text null");
    this.addColumnIfMissing("r2_supplier_admission_reviews", "regularization_decision", "text null");
    this.addColumnIfMissing("r2_products", "packing_quantity", "real null");
    this.addColumnIfMissing("r2_products", "min_order_qty", "real null");
    this.addColumnIfMissing("r2_products", "max_order_qty", "real null");
    this.addColumnIfMissing("r2_products", "tax_rate", "real null");
    this.addColumnIfMissing("r2_products", "invoice_name", "text null");
    this.addColumnIfMissing("r2_products", "tax_classification_code", "text null");
    this.addColumnIfMissing("r2_products", "detail_description", "text null");
    this.addColumnIfMissing("r2_products", "acceptance_guide", "text null");
    this.addColumnIfMissing("r2_products", "installation_requirement", "text null");
    this.addColumnIfMissing("r2_products", "tags_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_products", "service_regions_json", "text not null default '[]'");
    this.addColumnIfMissing("business_mall_products", "tags_json", "text not null default '[]'");
    this.addColumnIfMissing("business_mall_questionnaires", "target_supplier_ids_json", "text not null default '[]'");
    this.addColumnIfMissing("business_mall_questionnaires", "submissions_json", "text not null default '[]'");
    this.addColumnIfMissing("business_mall_questionnaires", "archived_at", "text null");
    this.addColumnIfMissing("business_mall_scenario_templates", "package_items_json", "text not null default '[]'");
    this.addColumnIfMissing("business_mall_scenario_templates", "applicable_brands_json", "text not null default '[]'");
    this.addColumnIfMissing("business_mall_scenario_templates", "applicable_hotel_types_json", "text not null default '[]'");
    this.addColumnIfMissing("business_mall_scenario_templates", "applicable_hotel_ids_json", "text not null default '[]'");
    this.addColumnIfMissing("business_mall_scenario_templates", "room_count", "real null");
    this.addColumnIfMissing("business_mall_scenario_templates", "budget_amount", "real null");
    this.addColumnIfMissing("business_mall_scenario_templates", "description", "text null");
    this.addColumnIfMissing("business_mall_scenario_templates", "generated_order_ids_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_procurement_requests", "description", "text null");
    this.addColumnIfMissing("r2_procurement_requests", "approval_opinion", "text null");
    this.addColumnIfMissing("r2_procurement_requests", "approval_by", "text null");
    this.addColumnIfMissing("r2_procurement_requests", "approved_at", "text null");
    this.addColumnIfMissing("r2_procurement_requests", "budget_label", "text null");
    this.addColumnIfMissing("r2_procurement_requests", "method_suggestion", "text null");
    this.addColumnIfMissing("r2_procurement_requests", "method_rule_id", "text null");
    this.addColumnIfMissing("r2_procurement_requests", "external_trade_flag", "integer not null default 0");
    this.addColumnIfMissing("r2_procurement_requests", "attachments_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_procurement_request_items", "remark", "text null");
    this.addColumnIfMissing("r2_sourcing_projects", "org_name", "text null");
    this.addColumnIfMissing("r2_sourcing_projects", "display_status", "text null");
    this.addColumnIfMissing("r2_sourcing_projects", "before_deadline", "integer not null default 0");
    this.addColumnIfMissing("r2_sourcing_projects", "budget_label", "text null");
    this.addColumnIfMissing("r2_sourcing_projects", "request_department", "text null");
    this.addColumnIfMissing("r2_sourcing_projects", "requester_name", "text null");
    this.addColumnIfMissing("r2_sourcing_projects", "receiving_location", "text null");
    this.addColumnIfMissing("r2_sourcing_projects", "expected_arrival_at", "text null");
    this.addColumnIfMissing("r2_sourcing_projects", "qualification_requirements_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_sourcing_projects", "quote_requirements_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_sourcing_projects", "delivery_requirements_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_sourcing_projects", "attachments_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_sourcing_projects", "participant_supplier_ids_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_sourcing_projects", "assigned_expert_ids_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_supplier_participations", "material_metadata_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_supplier_participations", "supplement_material_metadata_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_bids", "tax_rate", "real null");
    this.addColumnIfMissing("r2_bids", "tax_inclusive", "integer not null default 0");
    this.addColumnIfMissing("r2_bids", "tax_note", "text null");
    this.addColumnIfMissing("r2_bids", "delivery_days", "integer null");
    this.addColumnIfMissing("r2_bids", "response_summary", "text null");
    this.addColumnIfMissing("r2_bids", "service_commitment", "text null");
    this.addColumnIfMissing("r2_bids", "withdrawn_at", "text null");
    this.addColumnIfMissing("r2_bids", "withdrawal_reason", "text null");
    this.addColumnIfMissing("r2_bids", "abandoned_at", "text null");
    this.addColumnIfMissing("r2_bids", "abandonment_reason", "text null");
    this.addColumnIfMissing("r2_response_files", "size_bytes", "integer not null default 0");
    this.addColumnIfMissing("r2_clarifications", "clarification_status", "text not null default 'answered'");
    this.addColumnIfMissing("r2_clarifications", "asked_at", "text null");
    this.addColumnIfMissing("r2_clarifications", "question_attachments_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_clarifications", "answer_attachments_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_clarifications", "notification_trace_json", "text null");
    this.addColumnIfMissing("r2_experts", "account_user_ids_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_experts", "owner_org_id", "text null");
    this.addColumnIfMissing("r2_experts", "branch_org_id", "text null");
    this.addColumnIfMissing("r2_experts", "review_scopes_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_experts", "supplier_assessment_scopes_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_experts", "shared_account", "integer not null default 0");
    this.addColumnIfMissing("r2_experts", "active_flag", "integer not null default 1");
    this.addColumnIfMissing("r2_experts", "avoidance_tags_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_experts", "maintained_at", "text null");
    this.addColumnIfMissing("r2_experts", "maintenance_log", "text null");
    this.addColumnIfMissing("r2_expert_scores", "opinion", "text not null default ''");
    this.addColumnIfMissing("r2_expert_scores", "details_json", "text not null default '{}'");
    this.addColumnIfMissing("r2_award_decisions", "approval_opinion", "text null");
    this.addColumnIfMissing("r2_award_decisions", "adapter_call_id", "text null");
    this.addColumnIfMissing("r2_pricing_reports", "award_approval_id", "text null");
    this.addColumnIfMissing("r2_pricing_reports", "report_no", "text null");
    this.addColumnIfMissing("r2_pricing_reports", "created_by", "text null");
    this.addColumnIfMissing("r2_pricing_reports", "approved_at", "text null");
    this.addColumnIfMissing("r2_pricing_report_items", "tax_rate", "real null");
    this.addColumnIfMissing("r2_pricing_report_items", "delivery_days", "integer null");
    this.addColumnIfMissing("r2_products", "source_type", "text null");
    this.addColumnIfMissing("r2_products", "source_project_id", "text null");
    this.addColumnIfMissing("r2_products", "source_agreement_no", "text null");
    this.addColumnIfMissing("r2_products", "source_pricing_report_id", "text null");
    this.addColumnIfMissing("r2_products", "source_pricing_report_item_id", "text null");
    this.addColumnIfMissing("r2_products", "listed_at", "text null");
    this.addColumnIfMissing("r2_supplier_evaluations", "description", "text not null default ''");
    this.addColumnIfMissing("r2_supplier_evaluations", "improvement_suggestion", "text null");
    this.addColumnIfMissing("r2_purchase_orders", "payment_status", "text not null default 'payment_reserved'");
    this.addColumnIfMissing("r2_purchase_orders", "buyer_id", "text null");
    this.addColumnIfMissing("r2_purchase_orders", "org_id", "text null");
    this.addColumnIfMissing("r2_purchase_orders", "department_id", "text null");
    this.addColumnIfMissing("r2_purchase_orders", "invoice_title", "text null");
    this.addColumnIfMissing("r2_order_line_items", "product_id", "text null");
    this.addColumnIfMissing("r2_order_line_items", "sku_id", "text null");
    this.addColumnIfMissing("r2_order_line_items", "price_source_type", "text null");
    this.addColumnIfMissing("r2_order_line_items", "price_source_id", "text null");
    this.addColumnIfMissing("r2_order_line_items", "price_source_item_id", "text null");
    this.addColumnIfMissing("r2_shipments", "contact_name", "text null");
    this.addColumnIfMissing("r2_shipments", "contact_phone", "text null");
    this.addColumnIfMissing("r2_shipments", "estimated_arrival_at", "text null");
    this.addColumnIfMissing("r2_shipments", "shipped_quantity", "real null");
    this.addColumnIfMissing("r2_receipts", "attachment_file_ids_json", "text not null default '[]'");
    this.addColumnIfMissing("r2_receipt_line_items", "order_line_item_id", "text null");
    this.addColumnIfMissing("r2_returns", "order_line_item_id", "text null");
    this.addColumnIfMissing("r2_returns", "handling_note", "text null");
    this.addColumnIfMissing("r2_settlement_bills", "bill_no", "text null");
    this.addColumnIfMissing("r2_settlement_bills", "org_id", "text null");
    this.addColumnIfMissing("r2_settlement_bills", "department_id", "text null");
    this.addColumnIfMissing("r2_settlement_bills", "settlement_period", "text null");
    this.addColumnIfMissing("r2_settlement_bills", "order_amount", "real not null default 0");
    this.addColumnIfMissing("r2_settlement_bills", "received_amount", "real not null default 0");
    this.addColumnIfMissing("r2_settlement_bills", "return_amount", "real not null default 0");
    this.addColumnIfMissing("r2_settlement_bills", "service_fee", "real not null default 0");
    this.addColumnIfMissing("r2_settlement_bills", "created_by", "text null");
    this.addColumnIfMissing("r2_settlement_bills", "created_at", "text null");
    this.addColumnIfMissing("r2_settlement_bills", "submitted_by", "text null");
    this.addColumnIfMissing("r2_settlement_bills", "submitted_at", "text null");
    this.addColumnIfMissing("r2_settlement_bills", "approved_by", "text null");
    this.addColumnIfMissing("r2_settlement_bills", "approved_at", "text null");
    this.addColumnIfMissing("r2_settlement_bills", "approval_opinion", "text null");
    this.addColumnIfMissing("r2_settlement_materials", "settlement_bill_id", "text null");
    this.addColumnIfMissing("r2_invoices", "settlement_bill_id", "text null");
    this.addColumnIfMissing("r2_invoices", "invoice_no", "text null");
    this.addColumnIfMissing("r2_invoices", "invoice_type", "text null");
    this.addColumnIfMissing("r2_invoices", "issue_date", "text null");
    this.addColumnIfMissing("r2_invoices", "tax_rate", "real null");
    this.addColumnIfMissing("r2_invoices", "tax_amount", "real null");
    this.addColumnIfMissing("r2_invoices", "verification_opinion", "text null");
    this.addColumnIfMissing("r2_amount_reconciliation_lines", "order_amount", "real not null default 0");
    this.addColumnIfMissing("r2_amount_reconciliation_lines", "received_amount", "real not null default 0");
    this.addColumnIfMissing("r2_amount_reconciliation_lines", "return_amount", "real not null default 0");
    this.addColumnIfMissing("r2_amount_reconciliation_lines", "service_fee", "real not null default 0");
    this.addColumnIfMissing("r2_amount_reconciliation_lines", "reconciliation_reason", "text null");
    this.addColumnIfMissing("r2_amount_reconciliation_lines", "handled_by", "text null");
    this.addColumnIfMissing("r2_amount_reconciliation_lines", "handled_at", "text null");
  }

  private addColumnIfMissing(tableName: string, columnName: string, definition: string) {
    const columns = this.runtimeDb.db.prepare(`pragma table_info(${tableName})`).all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === columnName)) {
      this.runtimeDb.db.exec(`alter table ${tableName} add column ${columnName} ${definition};`);
    }
  }

  private normalizeSqlValues(values: unknown[]): SqlValue[] {
    return values.map((value) => (value === undefined ? null : value)) as SqlValue[];
  }

  private ensureApprovalInstanceColumns() {
    this.addColumnIfMissing("r2_approval_instances", "rule_id", "text null");
    this.addColumnIfMissing("r2_approval_instances", "rule_code", "text null");
    this.addColumnIfMissing("r2_approval_instances", "project_id", "text null");
    this.addColumnIfMissing("r2_approval_instances", "org_id", "text null");
    this.addColumnIfMissing("r2_approval_instances", "supplier_id", "text null");
    this.addColumnIfMissing("r2_approval_instances", "business_title", "text not null default ''");
    this.addColumnIfMissing("r2_approval_instances", "business_amount", "real null");
    this.addColumnIfMissing("r2_approval_instances", "current_node_index", "integer not null default 0");
    this.addColumnIfMissing("r2_approval_instances", "current_role_id", "text null");
    this.addColumnIfMissing("r2_approval_instances", "current_user_id", "text null");
    this.addColumnIfMissing("r2_approval_instances", "completed_by", "text null");
    this.addColumnIfMissing("r2_approval_instances", "source_json", "text not null default '{}'");
  }
}
