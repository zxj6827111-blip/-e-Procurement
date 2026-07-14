import type { RuntimeDb } from "../runtime/index.js";
import type {
  Bid,
  BidLineItem,
  ProcurementDocument,
  ProcurementDocumentAttachment,
  ProcurementProject,
  ProcurementRequest,
  ProcurementRequestApprovalStatus,
  ProcurementRequestLineItem,
  ProcurementRequestStatus,
  ProjectClarificationRecord,
  SupplierInvitation,
  SupplierRegistration
} from "../types.js";

type SqlValue = string | number | bigint | null | Uint8Array;
type Row = Record<string, SqlValue | undefined>;
type RunnableStatement = { run: (...values: SqlValue[]) => unknown };

function run(statement: RunnableStatement, values: SqlValue[]) {
  statement.run(...values);
}

function optionalString(value: SqlValue | undefined) {
  return value === null || value === undefined ? undefined : String(value);
}

function optionalNumber(value: SqlValue | undefined) {
  return value === null || value === undefined ? undefined : Number(value);
}

function requiredString(value: SqlValue | undefined, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function boolFromSql(value: SqlValue | undefined) {
  return value === 1 || value === "1";
}

function json<T>(value: SqlValue | undefined, fallback: T): T {
  if (value === null || value === undefined) return fallback;
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

export class R4SourcingRepository {
  constructor(private readonly runtimeDb: RuntimeDb) {
    this.migrate();
  }

  syncSourcingState(state: {
    procurementRequests: ProcurementRequest[];
    procurementDocuments: ProcurementDocument[];
    projects: ProcurementProject[];
    supplierInvitations: SupplierInvitation[];
    supplierRegistrations: SupplierRegistration[];
    bids: Bid[];
  }) {
    mergeById(state.procurementRequests, this.listProcurementRequests());
    mergeById(state.procurementDocuments, this.listProcurementDocuments());
    mergeById(state.projects, this.listProjects());
    mergeById(state.supplierInvitations, this.listSupplierInvitations());
    mergeById(state.supplierRegistrations, this.listSupplierParticipations());
    mergeById(state.bids, this.listBids());
  }

  listProcurementRequests(): ProcurementRequest[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_procurement_requests order by id").all() as Row[];
    return rows.map((row) => this.requestFromRow(row));
  }

  getProcurementRequest(requestId: string): ProcurementRequest | null {
    const row = this.runtimeDb.db.prepare("select * from r2_procurement_requests where id = ?").get(requestId) as Row | undefined;
    return row ? this.requestFromRow(row) : null;
  }

  upsertProcurementRequest(request: ProcurementRequest) {
    const now = new Date().toISOString();
    const db = this.runtimeDb.db;
    db.exec("begin immediate transaction;");
    try {
      run(
        db.prepare(
        `insert into r2_procurement_requests (
          id, request_code, project_id, title, org_id, request_department, requester_name, category,
          description, request_status, approval_status, approval_opinion, approval_by, approved_at,
          budget_label, budget_amount, purpose, expected_arrival_at, receiving_location, method_suggestion,
          method_rule_id, external_trade_flag, attachments_json, created_by, created_at, updated_at, synced_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          request_code = excluded.request_code,
          project_id = excluded.project_id,
          title = excluded.title,
          org_id = excluded.org_id,
          request_department = excluded.request_department,
          requester_name = excluded.requester_name,
          category = excluded.category,
          description = excluded.description,
          request_status = excluded.request_status,
          approval_status = excluded.approval_status,
          approval_opinion = excluded.approval_opinion,
          approval_by = excluded.approval_by,
          approved_at = excluded.approved_at,
          budget_label = excluded.budget_label,
          budget_amount = excluded.budget_amount,
          purpose = excluded.purpose,
          expected_arrival_at = excluded.expected_arrival_at,
          receiving_location = excluded.receiving_location,
          method_suggestion = excluded.method_suggestion,
          method_rule_id = excluded.method_rule_id,
          external_trade_flag = excluded.external_trade_flag,
          attachments_json = excluded.attachments_json,
          updated_at = excluded.updated_at,
          synced_at = excluded.synced_at`
      ),
        [
          request.id,
          request.code ?? null,
          request.projectId ?? null,
          request.title,
          request.orgId,
          request.requestDepartment ?? null,
          request.requesterName ?? null,
          request.category ?? null,
          request.description ?? null,
          request.status ?? (request.projectId ? "project_created" : "draft"),
          request.approvalStatus,
          request.approvalOpinion ?? null,
          request.approvalBy ?? null,
          request.approvedAt ?? null,
          request.budgetLabel ?? null,
          request.budgetAmount ?? null,
          request.purpose ?? null,
          request.expectedArrivalAt ?? null,
          request.receivingLocation ?? null,
          request.methodSuggestion,
          request.methodRuleId ?? null,
          request.externalTradeFlag ? 1 : 0,
          JSON.stringify(request.attachments ?? []),
          request.createdBy ?? null,
          request.createdAt ?? now,
          request.updatedAt ?? now,
          now
        ]
      );
      this.replaceRequestItems(request.id, request.lineItems ?? []);
      db.exec("commit;");
    } catch (error) {
      db.exec("rollback;");
      throw error;
    }
  }

  deleteProcurementRequest(requestId: string) {
    this.runtimeDb.db.prepare("delete from r2_procurement_request_items where request_id = ?").run(requestId);
    this.runtimeDb.db.prepare("delete from r2_procurement_requests where id = ?").run(requestId);
  }

  listProcurementDocuments(): ProcurementDocument[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_procurement_documents order by id").all() as Row[];
    return rows.map((row) => this.procurementDocumentFromRow(row));
  }

  upsertProcurementDocument(document: ProcurementDocument) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_procurement_documents (
          id, project_id, title, version_no, document_status, review_status, content_summary,
          attachment_metadata_json, previous_document_id, created_by, created_at, updated_at,
          published_at, locked_at, synced_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          project_id = excluded.project_id,
          title = excluded.title,
          version_no = excluded.version_no,
          document_status = excluded.document_status,
          review_status = excluded.review_status,
          content_summary = excluded.content_summary,
          attachment_metadata_json = excluded.attachment_metadata_json,
          previous_document_id = excluded.previous_document_id,
          created_by = excluded.created_by,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          published_at = excluded.published_at,
          locked_at = excluded.locked_at,
          synced_at = excluded.synced_at`
      ),
      [
        document.id,
        document.projectId,
        document.title,
        document.versionNo,
        document.status,
        document.reviewStatus,
        document.contentSummary,
        JSON.stringify(document.attachmentMetadata ?? []),
        document.previousDocumentId ?? null,
        document.createdBy,
        document.createdAt,
        document.updatedAt,
        document.publishedAt,
        document.lockedAt,
        now
      ]
    );
  }

  listProjects(): ProcurementProject[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_sourcing_projects order by id").all() as Row[];
    return rows.map((row) => this.projectFromRow(row));
  }

  getProject(projectId: string): ProcurementProject | null {
    const row = this.runtimeDb.db.prepare("select * from r2_sourcing_projects where id = ?").get(projectId) as Row | undefined;
    return row ? this.projectFromRow(row) : null;
  }

  upsertProject(project: ProcurementProject) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_sourcing_projects (
          id, project_code, source_request_id, project_name, org_id, org_name, method_type, project_status,
          display_status, category, quote_deadline_at, before_deadline, external_trade_flag, budget_label,
          budget_amount, request_department, requester_name, receiving_location, expected_arrival_at,
          buyer_name, qualification_requirements_json, quote_requirements_json, delivery_requirements_json,
          attachments_json, participant_supplier_ids_json, assigned_expert_ids_json, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          project_code = excluded.project_code,
          source_request_id = excluded.source_request_id,
          project_name = excluded.project_name,
          org_id = excluded.org_id,
          org_name = excluded.org_name,
          method_type = excluded.method_type,
          project_status = excluded.project_status,
          display_status = excluded.display_status,
          category = excluded.category,
          quote_deadline_at = excluded.quote_deadline_at,
          before_deadline = excluded.before_deadline,
          external_trade_flag = excluded.external_trade_flag,
          budget_label = excluded.budget_label,
          budget_amount = excluded.budget_amount,
          request_department = excluded.request_department,
          requester_name = excluded.requester_name,
          receiving_location = excluded.receiving_location,
          expected_arrival_at = excluded.expected_arrival_at,
          buyer_name = excluded.buyer_name,
          qualification_requirements_json = excluded.qualification_requirements_json,
          quote_requirements_json = excluded.quote_requirements_json,
          delivery_requirements_json = excluded.delivery_requirements_json,
          attachments_json = excluded.attachments_json,
          participant_supplier_ids_json = excluded.participant_supplier_ids_json,
          assigned_expert_ids_json = excluded.assigned_expert_ids_json,
          updated_at = excluded.updated_at`
      ),
      [
        project.id,
        project.code,
        project.sourceRequestId ?? null,
        project.name,
        project.orgId,
        project.orgName,
        project.type,
        project.status,
        project.displayStatus,
        project.category,
        project.quoteDeadlineAt,
        project.beforeDeadline ? 1 : 0,
        project.externalTradeFlag ? 1 : 0,
        project.budgetLabel ?? null,
        project.budgetAmount ?? null,
        project.requestDepartment ?? null,
        project.requesterName ?? null,
        project.receivingLocation ?? null,
        project.expectedArrivalAt ?? null,
        project.buyer,
        JSON.stringify(project.qualificationRequirements ?? []),
        JSON.stringify(project.quoteRequirements ?? []),
        JSON.stringify(project.deliveryRequirements ?? []),
        JSON.stringify(project.attachments ?? []),
        JSON.stringify(project.participantSupplierIds ?? []),
        JSON.stringify(project.assignedExpertIds ?? []),
        now
      ]
    );
    this.replaceProjectItems(project.id, project.sourceLineItems ?? []);
    this.replaceClarifications(project.id, project.clarificationRecords ?? []);
  }

  upsertSupplierInvitation(invitation: SupplierInvitation) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_supplier_invitations
         (id, project_id, announcement_id, supplier_id, invitation_status, notification_status, notified_at, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           project_id = excluded.project_id,
           announcement_id = excluded.announcement_id,
           supplier_id = excluded.supplier_id,
           invitation_status = excluded.invitation_status,
           notification_status = excluded.notification_status,
           notified_at = excluded.notified_at,
           updated_at = excluded.updated_at`
      ),
      [
        invitation.id,
        invitation.projectId,
        invitation.announcementId,
        invitation.supplierId,
        invitation.status,
        invitation.notificationStatus,
        invitation.notifiedAt,
        invitation.createdAt,
        now
      ]
    );
  }

  upsertSupplierParticipation(registration: SupplierRegistration) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_supplier_participations (
          id, project_id, announcement_id, supplier_id, participation_status, material_metadata_json,
          supplement_material_metadata_json, submitted_at, qualified_at, qualification_reason, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          project_id = excluded.project_id,
          announcement_id = excluded.announcement_id,
          supplier_id = excluded.supplier_id,
          participation_status = excluded.participation_status,
          material_metadata_json = excluded.material_metadata_json,
          supplement_material_metadata_json = excluded.supplement_material_metadata_json,
          submitted_at = excluded.submitted_at,
          qualified_at = excluded.qualified_at,
          qualification_reason = excluded.qualification_reason,
          updated_at = excluded.updated_at`
      ),
      [
        registration.id,
        registration.projectId,
        registration.announcementId,
        registration.supplierId,
        registration.status,
        JSON.stringify(registration.materialMetadata ?? []),
        JSON.stringify(registration.supplementMaterialMetadata ?? []),
        registration.submittedAt,
        registration.qualifiedAt ?? null,
        registration.qualificationReason ?? null,
        now
      ]
    );
  }

  listSupplierInvitations(): SupplierInvitation[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_supplier_invitations order by id").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      announcementId: String(row.announcement_id),
      supplierId: String(row.supplier_id),
      status: String(row.invitation_status) as SupplierInvitation["status"],
      notificationStatus: String(row.notification_status) as SupplierInvitation["notificationStatus"],
      notifiedAt: row.notified_at === null || row.notified_at === undefined ? null : String(row.notified_at),
      createdAt: String(row.created_at)
    }));
  }

  listSupplierParticipations(): SupplierRegistration[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_supplier_participations order by id").all() as Row[];
    return rows.map((row) => ({
      id: String(row.id),
      projectId: String(row.project_id),
      announcementId: String(row.announcement_id),
      supplierId: String(row.supplier_id),
      status: String(row.participation_status) as SupplierRegistration["status"],
      materialMetadata: json<ProcurementDocumentAttachment[]>(row.material_metadata_json, []),
      supplementMaterialMetadata: json<ProcurementDocumentAttachment[]>(row.supplement_material_metadata_json, []),
      submittedAt: String(row.submitted_at),
      qualifiedAt: optionalString(row.qualified_at),
      qualificationReason: optionalString(row.qualification_reason)
    }));
  }

  upsertBid(bid: Bid) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_bids (
          id, project_id, supplier_id, amount, tax_rate, tax_inclusive, tax_note, delivery_days,
          response_summary, service_commitment, bid_status, submitted_at, quote_deadline_at, locked_at,
          withdrawn_at, withdrawal_reason, abandoned_at, abandonment_reason, version_no, file_id, file_name, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          project_id = excluded.project_id,
          supplier_id = excluded.supplier_id,
          amount = excluded.amount,
          tax_rate = excluded.tax_rate,
          tax_inclusive = excluded.tax_inclusive,
          tax_note = excluded.tax_note,
          delivery_days = excluded.delivery_days,
          response_summary = excluded.response_summary,
          service_commitment = excluded.service_commitment,
          bid_status = excluded.bid_status,
          submitted_at = excluded.submitted_at,
          quote_deadline_at = excluded.quote_deadline_at,
          locked_at = excluded.locked_at,
          withdrawn_at = excluded.withdrawn_at,
          withdrawal_reason = excluded.withdrawal_reason,
          abandoned_at = excluded.abandoned_at,
          abandonment_reason = excluded.abandonment_reason,
          version_no = excluded.version_no,
          file_id = excluded.file_id,
          file_name = excluded.file_name,
          updated_at = excluded.updated_at`
      ),
      [
        bid.id,
        bid.projectId,
        bid.supplierId,
        bid.amount,
        bid.taxRate ?? null,
        bid.taxInclusive ? 1 : 0,
        bid.taxNote ?? null,
        bid.deliveryDays ?? null,
        bid.responseSummary ?? null,
        bid.serviceCommitment ?? null,
        bid.status,
        bid.submittedAt,
        bid.quoteDeadlineAt,
        bid.lockedAt,
        bid.withdrawnAt ?? null,
        bid.withdrawalReason ?? null,
        bid.abandonedAt ?? null,
        bid.abandonmentReason ?? null,
        bid.versionNo ?? 1,
        bid.fileId,
        bid.fileName,
        now
      ]
    );
    this.replaceBidLineItems(bid);
    this.replaceResponseFiles(bid);
  }

  listBids(): Bid[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_bids order by id").all() as Row[];
    return rows.map((row) => this.bidFromRow(row));
  }

  upsertClarification(projectId: string, record: ProjectClarificationRecord) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_clarifications
         (id, project_id, supplier_id, question, answer, visibility, clarification_status, asked_at, answered_by, answered_at,
          question_attachments_json, answer_attachments_json, notification_trace_json, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           supplier_id = excluded.supplier_id,
           question = excluded.question,
           answer = excluded.answer,
           visibility = excluded.visibility,
           clarification_status = excluded.clarification_status,
           asked_at = excluded.asked_at,
           answered_by = excluded.answered_by,
           answered_at = excluded.answered_at,
           question_attachments_json = excluded.question_attachments_json,
           answer_attachments_json = excluded.answer_attachments_json,
           notification_trace_json = excluded.notification_trace_json,
           updated_at = excluded.updated_at`
      ),
      [
        record.id,
        projectId,
        record.supplierId ?? null,
        record.question,
        record.answer,
        record.visibility,
        record.status ?? (record.answer ? "answered" : "open"),
        record.askedAt ?? record.answeredAt,
        record.answeredBy,
        record.answeredAt,
        JSON.stringify(record.questionAttachments ?? []),
        JSON.stringify(record.answerAttachments ?? []),
        record.notificationTrace === undefined ? null : JSON.stringify(record.notificationTrace),
        now
      ]
    );
  }

  private replaceRequestItems(requestId: string, items: ProcurementRequestLineItem[]) {
    const now = new Date().toISOString();
    this.runtimeDb.db.prepare("delete from r2_procurement_request_items where request_id = ?").run(requestId);
    const statement = this.runtimeDb.db.prepare(
      `insert into r2_procurement_request_items
       (id, request_id, item_name, category, specification, quantity, unit, estimated_unit_price, budget_amount, required_by_date, remark, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const item of items) {
      run(statement, [
        item.id,
        requestId,
        item.itemName,
        item.category ?? null,
        item.specification,
        item.quantity,
        item.unit,
        item.estimatedUnitPrice ?? null,
        item.budgetAmount ?? null,
        item.requiredByDate ?? null,
        item.remark ?? null,
        now
      ]);
    }
  }

  private replaceProjectItems(projectId: string, items: ProcurementRequestLineItem[]) {
    const now = new Date().toISOString();
    this.runtimeDb.db.prepare("delete from r2_sourcing_project_items where project_id = ?").run(projectId);
    const statement = this.runtimeDb.db.prepare(
      `insert into r2_sourcing_project_items
       (id, project_id, source_request_item_id, item_name, category, specification, quantity, unit, estimated_unit_price, budget_amount, required_by_date, remark, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const item of items) {
      run(statement, [
        `${projectId}:${item.id}`,
        projectId,
        item.id,
        item.itemName,
        item.category ?? null,
        item.specification,
        item.quantity,
        item.unit,
        item.estimatedUnitPrice ?? null,
        item.budgetAmount ?? null,
        item.requiredByDate ?? null,
        item.remark ?? null,
        now
      ]);
    }
  }

  private replaceBidLineItems(bid: Bid) {
    const now = new Date().toISOString();
    this.runtimeDb.db.prepare("delete from r2_bid_line_items where bid_id = ?").run(bid.id);
    const statement = this.runtimeDb.db.prepare(
      `insert into r2_bid_line_items
       (id, bid_id, project_id, supplier_id, item_name, quantity, unit, unit_price, tax_rate, total_price, delivery_days, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const line of bid.lineItems ?? []) {
      run(statement, [
        line.id,
        bid.id,
        bid.projectId,
        bid.supplierId,
        line.itemName,
        line.quantity,
        line.unit,
        line.unitPrice,
        line.taxRate,
        line.totalPrice,
        line.deliveryDays,
        now
      ]);
    }
  }

  private replaceResponseFiles(bid: Bid) {
    const now = new Date().toISOString();
    this.runtimeDb.db.prepare("delete from r2_response_files where bid_id = ?").run(bid.id);
    const files = bid.responseFileMetadata ?? [
      {
        id: bid.fileId,
        fileName: bid.fileName,
        contentType: "application/pdf",
        sizeBytes: 0,
        uploadedAt: bid.submittedAt ?? now
      }
    ];
    const statement = this.runtimeDb.db.prepare(
      `insert into r2_response_files
       (id, bid_id, project_id, supplier_id, file_id, file_name, content_type, size_bytes, uploaded_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const file of files) {
      run(statement, [
        file.id,
        bid.id,
        bid.projectId,
        bid.supplierId,
        file.id,
        file.fileName,
        file.contentType,
        file.sizeBytes,
        file.uploadedAt,
        now
      ]);
    }
  }

  private replaceClarifications(projectId: string, records: ProjectClarificationRecord[]) {
    this.runtimeDb.db.prepare("delete from r2_clarifications where project_id = ?").run(projectId);
    for (const record of records) this.upsertClarification(projectId, record);
  }

  private migrate() {
    this.runtimeDb.db.exec(`
      create table if not exists r2_procurement_documents (
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
        locked_at text null,
        synced_at text not null
      );
      create index if not exists idx_r2_procurement_documents_project on r2_procurement_documents(project_id, document_status, review_status);
    `);
  }

  private requestFromRow(row: Row): ProcurementRequest {
    const requestId = String(row.id);
    const lineRows = this.runtimeDb.db.prepare("select * from r2_procurement_request_items where request_id = ? order by id").all(requestId) as Row[];
    return {
      id: requestId,
      code: optionalString(row.request_code),
      projectId: row.project_id === null || row.project_id === undefined ? null : String(row.project_id),
      title: String(row.title),
      orgId: String(row.org_id),
      requestDepartment: optionalString(row.request_department),
      requesterName: optionalString(row.requester_name),
      category: optionalString(row.category),
      description: optionalString(row.description),
      budgetLabel: requiredString(row.budget_label, "configured by customer policy"),
      budgetAmount: optionalNumber(row.budget_amount),
      purpose: optionalString(row.purpose),
      expectedArrivalAt: optionalString(row.expected_arrival_at),
      receivingLocation: optionalString(row.receiving_location),
      lineItems: lineRows.map((item) => this.requestLineFromRow(item)),
      attachments: json<ProcurementDocumentAttachment[]>(row.attachments_json, []),
      methodSuggestion: requiredString(row.method_suggestion, "pending"),
      methodRuleId: optionalString(row.method_rule_id),
      externalTradeFlag: boolFromSql(row.external_trade_flag),
      status: String(row.request_status) as ProcurementRequestStatus,
      approvalStatus: String(row.approval_status) as ProcurementRequestApprovalStatus,
      approvalOpinion: optionalString(row.approval_opinion),
      approvalBy: optionalString(row.approval_by),
      approvedAt: optionalString(row.approved_at),
      createdBy: optionalString(row.created_by),
      createdAt: optionalString(row.created_at),
      updatedAt: optionalString(row.updated_at)
    };
  }

  private procurementDocumentFromRow(row: Row): ProcurementDocument {
    return {
      id: String(row.id),
      projectId: String(row.project_id),
      title: String(row.title),
      versionNo: Number(row.version_no),
      status: String(row.document_status) as ProcurementDocument["status"],
      reviewStatus: String(row.review_status) as ProcurementDocument["reviewStatus"],
      contentSummary: String(row.content_summary ?? ""),
      attachmentMetadata: json<ProcurementDocumentAttachment[]>(row.attachment_metadata_json, []),
      previousDocumentId: optionalString(row.previous_document_id),
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      publishedAt: row.published_at === null || row.published_at === undefined ? null : String(row.published_at),
      lockedAt: row.locked_at === null || row.locked_at === undefined ? null : String(row.locked_at)
    };
  }

  private projectFromRow(row: Row): ProcurementProject {
    const projectId = String(row.id);
    const itemRows = this.runtimeDb.db.prepare("select * from r2_sourcing_project_items where project_id = ? order by id").all(projectId) as Row[];
    const clarifications = this.runtimeDb.db.prepare("select * from r2_clarifications where project_id = ? order by id").all(projectId) as Row[];
    return {
      id: projectId,
      code: String(row.project_code),
      sourceRequestId: optionalString(row.source_request_id),
      name: String(row.project_name),
      orgId: String(row.org_id),
      orgName: requiredString(row.org_name, String(row.org_id)),
      type: String(row.method_type),
      status: String(row.project_status) as ProcurementProject["status"],
      displayStatus: requiredString(row.display_status, String(row.project_status)),
      category: String(row.category),
      budgetLabel: optionalString(row.budget_label),
      budgetAmount: optionalNumber(row.budget_amount),
      requestDepartment: optionalString(row.request_department),
      requesterName: optionalString(row.requester_name),
      receivingLocation: optionalString(row.receiving_location),
      expectedArrivalAt: optionalString(row.expected_arrival_at),
      buyer: String(row.buyer_name),
      attachments: json<ProcurementDocumentAttachment[]>(row.attachments_json, []),
      sourceLineItems: itemRows.map((item) => this.projectLineFromRow(item)),
      quoteDeadlineAt: row.quote_deadline_at === null || row.quote_deadline_at === undefined ? null : String(row.quote_deadline_at),
      beforeDeadline: boolFromSql(row.before_deadline),
      qualificationRequirements: json<string[]>(row.qualification_requirements_json, []),
      quoteRequirements: json<string[]>(row.quote_requirements_json, []),
      deliveryRequirements: json<string[]>(row.delivery_requirements_json, []),
      clarificationRecords: clarifications.map((item) => this.clarificationFromRow(item)),
      externalTradeFlag: boolFromSql(row.external_trade_flag),
      participantSupplierIds: json<string[]>(row.participant_supplier_ids_json, []),
      assignedExpertIds: json<string[]>(row.assigned_expert_ids_json, [])
    };
  }

  private bidFromRow(row: Row): Bid {
    const bidId = String(row.id);
    const lineRows = this.runtimeDb.db.prepare("select * from r2_bid_line_items where bid_id = ? order by id").all(bidId) as Row[];
    const fileRows = this.runtimeDb.db.prepare("select * from r2_response_files where bid_id = ? order by id").all(bidId) as Row[];
    return {
      id: bidId,
      projectId: String(row.project_id),
      supplierId: String(row.supplier_id),
      amount: Number(row.amount),
      taxRate: optionalNumber(row.tax_rate) ?? null,
      taxInclusive: boolFromSql(row.tax_inclusive),
      taxNote: optionalString(row.tax_note),
      lineItems: lineRows.map((item) => this.bidLineFromRow(item)),
      deliveryDays: optionalNumber(row.delivery_days),
      responseSummary: optionalString(row.response_summary),
      serviceCommitment: optionalString(row.service_commitment),
      status: String(row.bid_status) as Bid["status"],
      submittedAt: row.submitted_at === null || row.submitted_at === undefined ? null : String(row.submitted_at),
      quoteDeadlineAt: String(row.quote_deadline_at),
      lockedAt: row.locked_at === null || row.locked_at === undefined ? null : String(row.locked_at),
      fileId: String(row.file_id),
      fileName: String(row.file_name),
      versionNo: Number(row.version_no),
      withdrawnAt: row.withdrawn_at === null || row.withdrawn_at === undefined ? null : String(row.withdrawn_at),
      withdrawalReason: optionalString(row.withdrawal_reason),
      abandonedAt: row.abandoned_at === null || row.abandoned_at === undefined ? null : String(row.abandoned_at),
      abandonmentReason: optionalString(row.abandonment_reason),
      responseFileMetadata: fileRows.map((item) => this.responseFileFromRow(item))
    };
  }

  private requestLineFromRow(row: Row): ProcurementRequestLineItem {
    return {
      id: String(row.id),
      itemName: String(row.item_name),
      category: optionalString(row.category),
      specification: String(row.specification),
      quantity: Number(row.quantity),
      unit: String(row.unit),
      estimatedUnitPrice: optionalNumber(row.estimated_unit_price),
      budgetAmount: optionalNumber(row.budget_amount),
      requiredByDate: optionalString(row.required_by_date),
      remark: optionalString(row.remark)
    };
  }

  private projectLineFromRow(row: Row): ProcurementRequestLineItem {
    return {
      id: requiredString(row.source_request_item_id, String(row.id)),
      itemName: String(row.item_name),
      category: optionalString(row.category),
      specification: String(row.specification),
      quantity: Number(row.quantity),
      unit: String(row.unit),
      estimatedUnitPrice: optionalNumber(row.estimated_unit_price),
      budgetAmount: optionalNumber(row.budget_amount),
      requiredByDate: optionalString(row.required_by_date),
      remark: optionalString(row.remark)
    };
  }

  private bidLineFromRow(row: Row): BidLineItem {
    return {
      id: String(row.id),
      itemName: String(row.item_name),
      quantity: Number(row.quantity),
      unit: String(row.unit),
      unitPrice: Number(row.unit_price),
      taxRate: Number(row.tax_rate),
      totalPrice: Number(row.total_price),
      deliveryDays: Number(row.delivery_days)
    };
  }

  private responseFileFromRow(row: Row): ProcurementDocumentAttachment {
    return {
      id: String(row.file_id),
      fileName: String(row.file_name),
      contentType: String(row.content_type),
      sizeBytes: Number(row.size_bytes ?? 0),
      uploadedAt: String(row.uploaded_at)
    };
  }

  private clarificationFromRow(row: Row): ProjectClarificationRecord {
    return {
      id: String(row.id),
      question: String(row.question),
      answer: String(row.answer),
      supplierId: optionalString(row.supplier_id),
      visibility: String(row.visibility) as ProjectClarificationRecord["visibility"],
      status: String(row.clarification_status) as ProjectClarificationRecord["status"],
      askedAt: optionalString(row.asked_at),
      answeredBy: String(row.answered_by),
      answeredAt: String(row.answered_at),
      questionAttachments: json<ProcurementDocumentAttachment[]>(row.question_attachments_json, []),
      answerAttachments: json<ProcurementDocumentAttachment[]>(row.answer_attachments_json, []),
      notificationTrace: json<ProjectClarificationRecord["notificationTrace"]>(row.notification_trace_json, undefined)
    };
  }
}
