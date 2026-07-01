import type { RuntimeDb } from "../runtime/index.js";
import type {
  AwardApproval,
  ComparisonReport,
  ComparisonReportRow,
  Expert,
  ExpertAssignment,
  PricingReport,
  PricingReportItem,
  ScoringDetailValue,
  ScoringSheet,
  ScoringTemplate,
  User
} from "../types.js";

type SqlValue = string | number | bigint | null | Uint8Array;
type Row = Record<string, SqlValue | undefined>;
type RunnableStatement = { run: (...values: SqlValue[]) => unknown };

function run(statement: RunnableStatement, values: SqlValue[]) {
  statement.run(...values);
}

function boolFromSql(value: SqlValue | undefined) {
  return value === 1 || value === "1";
}

function optionalString(value: SqlValue | undefined) {
  return value === null || value === undefined ? undefined : String(value);
}

function nullableString(value: SqlValue | undefined) {
  return value === null || value === undefined ? null : String(value);
}

function json<T>(value: SqlValue | undefined, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function mergeById<T extends { id: string }>(target: T[], source: T[]) {
  const byId = new Map(target.map((item) => [item.id, item]));
  for (const item of source) {
    const existing = byId.get(item.id);
    if (existing) Object.assign(existing, { ...existing, ...item });
    else target.push(item);
  }
}

export class R5ReviewAwardRepository {
  constructor(private readonly runtimeDb: RuntimeDb) {}

  syncReviewAwardState(state: {
    users: User[];
    experts: Expert[];
    expertAssignments: ExpertAssignment[];
    scoringTemplates: ScoringTemplate[];
    scoringSheets: ScoringSheet[];
    comparisonReports: ComparisonReport[];
    awardApprovals: AwardApproval[];
    pricingReports: PricingReport[];
  }) {
    mergeById(state.experts, this.listExperts());
    mergeById(state.expertAssignments, this.listExpertAssignments());
    mergeById(state.scoringTemplates, this.listScoringTemplates());
    mergeById(state.scoringSheets, this.listScoringSheets());
    mergeById(state.comparisonReports, this.listComparisonReports());
    mergeById(state.awardApprovals, this.listAwardApprovals());
    mergeById(state.pricingReports, this.listPricingReports());
    for (const expert of state.experts) {
      const accountUserIds = state.users.filter((user) => user.expertId === expert.id).map((user) => user.id);
      expert.accountUserIds = Array.from(new Set([...(expert.accountUserIds ?? []), ...accountUserIds]));
    }
  }

  listExperts(): Expert[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_experts order by id").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.expert_name),
      category: String(row.category),
      status: String(row.expert_status),
      accountUserIds: json<string[]>(row.account_user_ids_json, []),
      ownerOrgId: optionalString(row.owner_org_id),
      branchOrgId: optionalString(row.branch_org_id),
      reviewScopes: json<string[]>(row.review_scopes_json, []),
      supplierAssessmentScopes: json<string[]>(row.supplier_assessment_scopes_json, []),
      sharedAccount: boolFromSql(row.shared_account),
      active: boolFromSql(row.active_flag ?? 1),
      avoidanceTags: json<string[]>(row.avoidance_tags_json, []),
      maintainedAt: optionalString(row.maintained_at),
      maintenanceLog: optionalString(row.maintenance_log)
    }));
  }

  upsertExpert(expert: Expert, accountUserIds = expert.accountUserIds ?? []) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_experts (
           id, expert_name, category, expert_status, account_user_ids_json, owner_org_id,
           branch_org_id, review_scopes_json, supplier_assessment_scopes_json, shared_account,
           active_flag, avoidance_tags_json, maintained_at, maintenance_log, updated_at
         )
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           expert_name = excluded.expert_name,
           category = excluded.category,
           expert_status = excluded.expert_status,
           account_user_ids_json = excluded.account_user_ids_json,
           owner_org_id = excluded.owner_org_id,
           branch_org_id = excluded.branch_org_id,
           review_scopes_json = excluded.review_scopes_json,
           supplier_assessment_scopes_json = excluded.supplier_assessment_scopes_json,
           shared_account = excluded.shared_account,
           active_flag = excluded.active_flag,
           avoidance_tags_json = excluded.avoidance_tags_json,
           maintained_at = excluded.maintained_at,
           maintenance_log = excluded.maintenance_log,
           updated_at = excluded.updated_at`
      ),
      [
        expert.id,
        expert.name,
        expert.category,
        expert.status,
        JSON.stringify(accountUserIds),
        expert.ownerOrgId ?? null,
        expert.branchOrgId ?? null,
        JSON.stringify(expert.reviewScopes ?? []),
        JSON.stringify(expert.supplierAssessmentScopes ?? []),
        expert.sharedAccount ? 1 : 0,
        expert.active === false ? 0 : 1,
        JSON.stringify(expert.avoidanceTags ?? []),
        expert.maintainedAt ?? now,
        expert.maintenanceLog ?? null,
        now
      ]
    );
  }

  listExpertAssignments(): ExpertAssignment[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_expert_assignments order by id").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      expertId: String(row.expert_id),
      method: String(row.assignment_method),
      status: String(row.assignment_status),
      avoidanceConfirmed: boolFromSql(row.avoidance_confirmed),
      disciplineConfirmed: boolFromSql(row.discipline_confirmed),
      confidentialityConfirmed: boolFromSql(row.confidentiality_confirmed),
      reason: optionalString(row.reason),
      replacedByExpertId: optionalString(row.replaced_by_expert_id),
      replacementReason: optionalString(row.replacement_reason),
      notifiedAt: nullableString(row.notified_at),
      createdAt: optionalString(row.created_at),
      confirmedAt: nullableString(row.confirmed_at)
    }));
  }

  upsertExpertAssignment(assignment: ExpertAssignment) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_expert_assignments (
          id, project_id, expert_id, assignment_method, assignment_status, avoidance_confirmed,
          discipline_confirmed, confidentiality_confirmed, reason, replaced_by_expert_id,
          replacement_reason, notified_at, created_at, confirmed_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          project_id = excluded.project_id,
          expert_id = excluded.expert_id,
          assignment_method = excluded.assignment_method,
          assignment_status = excluded.assignment_status,
          avoidance_confirmed = excluded.avoidance_confirmed,
          discipline_confirmed = excluded.discipline_confirmed,
          confidentiality_confirmed = excluded.confidentiality_confirmed,
          reason = excluded.reason,
          replaced_by_expert_id = excluded.replaced_by_expert_id,
          replacement_reason = excluded.replacement_reason,
          notified_at = excluded.notified_at,
          created_at = excluded.created_at,
          confirmed_at = excluded.confirmed_at,
          updated_at = excluded.updated_at`
      ),
      [
        assignment.id,
        assignment.projectId,
        assignment.expertId,
        assignment.method,
        assignment.status,
        assignment.avoidanceConfirmed ? 1 : 0,
        assignment.disciplineConfirmed ? 1 : 0,
        assignment.confidentialityConfirmed ? 1 : 0,
        assignment.reason ?? null,
        assignment.replacedByExpertId ?? null,
        assignment.replacementReason ?? null,
        assignment.notifiedAt ?? null,
        assignment.createdAt ?? now,
        assignment.confirmedAt ?? null,
        now
      ]
    );
  }

  listScoringTemplates(): ScoringTemplate[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_scoring_templates order by id").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      templateCode: String(row.template_code),
      templateName: String(row.template_name),
      versionNo: Number(row.version_no),
      status: String(row.template_status),
      configJson: json<Record<string, unknown>>(row.config_json, {})
    }));
  }

  upsertScoringTemplate(template: ScoringTemplate) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_scoring_templates (id, template_code, template_name, version_no, template_status, config_json, updated_at)
         values (?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           template_code = excluded.template_code,
           template_name = excluded.template_name,
           version_no = excluded.version_no,
           template_status = excluded.template_status,
           config_json = excluded.config_json,
           updated_at = excluded.updated_at`
      ),
      [template.id, template.templateCode, template.templateName, template.versionNo, template.status, JSON.stringify(template.configJson), now]
    );
  }

  listScoringSheets(): ScoringSheet[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_expert_scores order by id").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      expertId: String(row.expert_id),
      supplierId: String(row.supplier_id),
      templateId: String(row.template_id),
      technical: Number(row.technical_score),
      service: Number(row.service_score),
      price: Number(row.price_score),
      total: Number(row.total_score),
      status: String(row.score_status) as ScoringSheet["status"],
      opinion: String(row.opinion ?? ""),
      versionNo: Number(row.version_no),
      submittedAt: nullableString(row.submitted_at),
      lockedAt: nullableString(row.locked_at),
      details: json<Record<string, number | ScoringDetailValue>>(row.details_json, {})
    }));
  }

  upsertScoringSheet(sheet: ScoringSheet) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_expert_scores (
          id, project_id, expert_id, supplier_id, template_id, technical_score, service_score,
          price_score, total_score, score_status, opinion, details_json, version_no,
          submitted_at, locked_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          project_id = excluded.project_id,
          expert_id = excluded.expert_id,
          supplier_id = excluded.supplier_id,
          template_id = excluded.template_id,
          technical_score = excluded.technical_score,
          service_score = excluded.service_score,
          price_score = excluded.price_score,
          total_score = excluded.total_score,
          score_status = excluded.score_status,
          opinion = excluded.opinion,
          details_json = excluded.details_json,
          version_no = excluded.version_no,
          submitted_at = excluded.submitted_at,
          locked_at = excluded.locked_at,
          updated_at = excluded.updated_at`
      ),
      [
        sheet.id,
        sheet.projectId,
        sheet.expertId,
        sheet.supplierId,
        sheet.templateId,
        sheet.technical,
        sheet.service,
        sheet.price,
        sheet.total,
        sheet.status,
        sheet.opinion,
        JSON.stringify(sheet.details ?? { technical: sheet.technical, service: sheet.service, price: sheet.price }),
        sheet.versionNo,
        sheet.submittedAt,
        sheet.lockedAt,
        now
      ]
    );
  }

  listComparisonReports(): ComparisonReport[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_comparison_reports order by id").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      reportNo: String(row.report_no),
      status: String(row.report_status) as ComparisonReport["status"],
      comparisonRows: json<ComparisonReportRow[]>(row.comparison_rows_json, []),
      recommendedSupplierId: String(row.recommended_supplier_id),
      awardReason: String(row.award_reason),
      nonLowestPriceReason: optionalString(row.non_lowest_price_reason),
      generatedBy: String(row.generated_by),
      generatedAt: String(row.generated_at),
      frozenAt: nullableString(row.frozen_at)
    }));
  }

  upsertComparisonReport(report: ComparisonReport) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_comparison_reports (
          id, project_id, report_no, report_status, recommended_supplier_id, award_reason,
          non_lowest_price_reason, generated_by, generated_at, frozen_at, comparison_rows_json, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          project_id = excluded.project_id,
          report_no = excluded.report_no,
          report_status = excluded.report_status,
          recommended_supplier_id = excluded.recommended_supplier_id,
          award_reason = excluded.award_reason,
          non_lowest_price_reason = excluded.non_lowest_price_reason,
          generated_by = excluded.generated_by,
          generated_at = excluded.generated_at,
          frozen_at = excluded.frozen_at,
          comparison_rows_json = excluded.comparison_rows_json,
          updated_at = excluded.updated_at`
      ),
      [
        report.id,
        report.projectId,
        report.reportNo,
        report.status,
        report.recommendedSupplierId,
        report.awardReason,
        report.nonLowestPriceReason ?? null,
        report.generatedBy,
        report.generatedAt,
        report.frozenAt,
        JSON.stringify(report.comparisonRows),
        now
      ]
    );
  }

  listAwardApprovals(): AwardApproval[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_award_decisions order by id").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      recommendedSupplierId: String(row.recommended_supplier_id),
      selectedSupplierId: String(row.selected_supplier_id),
      isLowestPrice: boolFromSql(row.is_lowest_price),
      nonLowestPriceReason: optionalString(row.non_lowest_price_reason),
      approvalStatus: String(row.approval_status) as AwardApproval["approvalStatus"],
      approvalOpinion: optionalString(row.approval_opinion),
      adapterCallId: optionalString(row.adapter_call_id),
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      submittedAt: nullableString(row.submitted_at),
      approvedAt: nullableString(row.approved_at)
    }));
  }

  upsertAwardApproval(approval: AwardApproval) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_award_decisions (
          id, project_id, recommended_supplier_id, selected_supplier_id, is_lowest_price,
          approval_status, non_lowest_price_reason, approval_opinion, adapter_call_id,
          created_by, created_at, submitted_at, approved_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          project_id = excluded.project_id,
          recommended_supplier_id = excluded.recommended_supplier_id,
          selected_supplier_id = excluded.selected_supplier_id,
          is_lowest_price = excluded.is_lowest_price,
          approval_status = excluded.approval_status,
          non_lowest_price_reason = excluded.non_lowest_price_reason,
          approval_opinion = excluded.approval_opinion,
          adapter_call_id = excluded.adapter_call_id,
          created_by = excluded.created_by,
          created_at = excluded.created_at,
          submitted_at = excluded.submitted_at,
          approved_at = excluded.approved_at,
          updated_at = excluded.updated_at`
      ),
      [
        approval.id,
        approval.projectId,
        approval.recommendedSupplierId,
        approval.selectedSupplierId,
        approval.isLowestPrice ? 1 : 0,
        approval.approvalStatus,
        approval.nonLowestPriceReason ?? null,
        approval.approvalOpinion ?? null,
        approval.adapterCallId ?? null,
        approval.createdBy,
        approval.createdAt,
        approval.submittedAt,
        approval.approvedAt,
        now
      ]
    );
  }

  listPricingReports(): PricingReport[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_pricing_reports order by id").all() as Row[];
    return rows.map((row) => this.pricingReportFromRow(row));
  }

  upsertPricingReport(report: PricingReport) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_pricing_reports (
          id, project_id, award_approval_id, source_report_id, report_no, report_status,
          selected_supplier_id, pricing_basis_json, created_by, created_at, approved_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          project_id = excluded.project_id,
          award_approval_id = excluded.award_approval_id,
          source_report_id = excluded.source_report_id,
          report_no = excluded.report_no,
          report_status = excluded.report_status,
          selected_supplier_id = excluded.selected_supplier_id,
          pricing_basis_json = excluded.pricing_basis_json,
          created_by = excluded.created_by,
          created_at = excluded.created_at,
          approved_at = excluded.approved_at,
          updated_at = excluded.updated_at`
      ),
      [
        report.id,
        report.projectId,
        report.awardApprovalId,
        report.sourceReportId,
        report.reportNo,
        report.status,
        report.selectedSupplierId,
        JSON.stringify(report.basisJson),
        report.createdBy,
        report.createdAt,
        report.approvedAt ?? null,
        now
      ]
    );
    this.replacePricingReportItems(report);
  }

  private replacePricingReportItems(report: PricingReport) {
    const now = new Date().toISOString();
    this.runtimeDb.db.prepare("delete from r2_pricing_report_items where pricing_report_id = ?").run(report.id);
    const statement = this.runtimeDb.db.prepare(
      `insert into r2_pricing_report_items (
        id, pricing_report_id, project_id, supplier_id, product_id, item_name, specification,
        quantity, unit, purchase_price, sale_price, service_fee_rate, gross_margin_rate,
        tax_rate, delivery_days, effective_from, effective_to, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const item of report.items) {
      run(statement, [
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
        now
      ]);
    }
  }

  private pricingReportFromRow(row: Row): PricingReport {
    const reportId = String(row.id);
    const itemRows = this.runtimeDb.db.prepare("select * from r2_pricing_report_items where pricing_report_id = ? order by id").all(reportId) as Row[];
    return {
      id: reportId,
      projectId: String(row.project_id),
      awardApprovalId: String(row.award_approval_id ?? ""),
      sourceReportId: String(row.source_report_id),
      reportNo: String(row.report_no ?? reportId),
      status: String(row.report_status) as PricingReport["status"],
      selectedSupplierId: String(row.selected_supplier_id),
      basisJson: json<Record<string, unknown>>(row.pricing_basis_json, {}),
      createdBy: String(row.created_by ?? "system"),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      approvedAt: nullableString(row.approved_at),
      items: itemRows.map((item) => this.pricingReportItemFromRow(item))
    };
  }

  private pricingReportItemFromRow(row: Row): PricingReportItem {
    return {
      id: String(row.id),
      productId: optionalString(row.product_id),
      itemName: String(row.item_name),
      specification: optionalString(row.specification),
      quantity: Number(row.quantity),
      unit: String(row.unit),
      purchasePrice: Number(row.purchase_price),
      salePrice: Number(row.sale_price),
      serviceFeeRate: Number(row.service_fee_rate),
      grossMarginRate: Number(row.gross_margin_rate),
      taxRate: optionalNumber(row.tax_rate),
      deliveryDays: optionalNumber(row.delivery_days),
      effectiveFrom: String(row.effective_from),
      effectiveTo: optionalString(row.effective_to)
    };
  }
}

function optionalNumber(value: SqlValue | undefined) {
  return value === null || value === undefined ? undefined : Number(value);
}
