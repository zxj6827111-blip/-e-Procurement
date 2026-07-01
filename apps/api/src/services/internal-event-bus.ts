import type { InternalBusinessEvent, InternalBusinessEventRepository } from "../repositories/internal-business-event-repository.js";
import type { RoleId, User } from "../types.js";

export type InternalBusinessEventCode =
  | "ProcurementRequestCreated"
  | "ProcurementRequestSubmitted"
  | "ProcurementRequestApproved"
  | "ProcurementRequestRejected"
  | "ProcurementMethodDecided"
  | "SourcingProjectCreated"
  | "AnnouncementCreated"
  | "AnnouncementPublished"
  | "AnnouncementClosed"
  | "SupplierInvited"
  | "SupplierRegistered"
  | "SupplierRegistrationQualified"
  | "SupplierRegistrationRejected"
  | "QuoteDraftCreated"
  | "QuoteSubmitted"
  | "QuoteWithdrawn"
  | "QuoteResubmitted"
  | "BidLocked"
  | "ExpertAssignmentCreated"
  | "ExpertAssignmentConfirmed"
  | "ExpertAssignmentReplaced"
  | "AwardApprovalSubmitted"
  | "AwardApprovalCreated"
  | "AwardApproved"
  | "AwardRejected"
  | "BidCutoffCompleted"
  | "ComparisonReportGenerated"
  | "ExpertScoreSubmitted"
  | "ReviewReportGenerated"
  | "ReviewReportFrozen"
  | "PricingReportGenerated"
  | "ResultNotificationSent"
  | "InternalPublicityPublished"
  | "ContractLedgerCreated"
  | "PurchaseOrderCreated"
  | "SupplierOrderConfirmed"
  | "OrderShipped"
  | "OrderReceived"
  | "SupplierEvaluationSubmitted"
  | "SettlementBillGenerated"
  | "SettlementBillSubmitted"
  | "SettlementBillApproved"
  | "SettlementBillRejected"
  | "SettlementMaterialUploaded"
  | "SettlementMaterialApproved"
  | "SettlementMaterialRejected"
  | "InvoiceSubmitted"
  | "InvoiceApproved"
  | "InvoiceRejected"
  | "PaymentRequested"
  | "PaymentCaptured"
  | "ArchiveSnapshotCreated"
  | "ArchiveChecked"
  | "ArchiveSupplementRequested"
  | "ArchiveSupplementApproved"
  | "ArchiveSupplementRejected"
  | "ArchiveSupplementApplied"
  | "ArchiveSealed"
  | "ArchiveAuditViewed";

export interface EmitInternalBusinessEventArgs {
  eventCode: InternalBusinessEventCode;
  businessType: string;
  businessId: string;
  businessTitle?: string;
  processInstanceId?: string;
  actor?: User;
  actorId?: string;
  actorRoleId?: RoleId;
  orgId?: string;
  supplierId?: string;
  projectId?: string;
  eventTime?: string;
  payloadJson?: Record<string, unknown>;
  idempotencyKey?: string;
}

export type InternalEventHandler = (event: InternalBusinessEvent) => void;

interface RegisteredHandler {
  eventCode: InternalBusinessEventCode | "*";
  handlerName: string;
  handler: InternalEventHandler;
}

export class InternalEventBus {
  private handlers: RegisteredHandler[] = [];
  private fallbackFailures: Array<{ eventCode: string; businessType: string; businessId: string; errorMessage: string; createdAt: string }> = [];

  constructor(private readonly repository: InternalBusinessEventRepository) {}

  isAvailable() {
    return this.repository.isAvailable();
  }

  getFallbackFailures() {
    return [...this.fallbackFailures];
  }

  handle(eventCode: InternalBusinessEventCode | "*", handlerName: string, handler: InternalEventHandler) {
    this.handlers.push({ eventCode, handlerName, handler });
  }

  emit(args: EmitInternalBusinessEventArgs) {
    const idempotencyKey = args.idempotencyKey ?? `${args.eventCode}:${args.businessType}:${args.businessId}`;
    try {
      const { event, inserted } = this.repository.recordEvent({
        eventCode: args.eventCode,
        businessType: args.businessType,
        businessId: args.businessId,
        businessTitle: args.businessTitle,
        processInstanceId: args.processInstanceId,
        actorId: args.actorId ?? args.actor?.id,
        actorRoleId: args.actorRoleId ?? args.actor?.roleId,
        orgId: args.orgId,
        supplierId: args.supplierId,
        projectId: args.projectId,
        eventTime: args.eventTime,
        payloadJson: args.payloadJson,
        idempotencyKey
      });
      if (!inserted) return event;
      return this.dispatchRecordedEvent(event) ?? event;
    } catch (error) {
      this.recordFallbackFailure(args, error);
      return undefined;
    }
  }

  retryFailedEvents(filter: { eventCode?: InternalBusinessEventCode; businessType?: string; businessId?: string } = {}) {
    const events = this.repository
      .listEvents({ eventCode: filter.eventCode, businessType: filter.businessType, businessId: filter.businessId, status: "failed" })
      .map((event) => this.dispatchRecordedEvent(event))
      .filter((event): event is InternalBusinessEvent => Boolean(event));
    return events;
  }

  retryFailedEvent(eventId: string) {
    const event = this.repository.getEvent(eventId);
    if (!event || event.status !== "failed") return null;
    return this.dispatchRecordedEvent(event);
  }

  private handlersFor(eventCode: string) {
    return this.handlers.filter((handler) => handler.eventCode === "*" || handler.eventCode === eventCode);
  }

  private dispatchRecordedEvent(event: InternalBusinessEvent) {
    let failed = false;
    let lastErrorMessage: string | undefined;
    for (const registered of this.handlersFor(event.eventCode)) {
      if (this.repository.hasSuccessfulHandlerLog(event.id, registered.handlerName)) continue;
      try {
        registered.handler(event);
        this.repository.recordHandlerLog({ eventId: event.id, handlerName: registered.handlerName, status: "succeeded" });
      } catch (error) {
        failed = true;
        lastErrorMessage = error instanceof Error ? error.message : String(error);
        try {
          this.repository.recordHandlerLog({
            eventId: event.id,
            handlerName: registered.handlerName,
            status: "failed",
            errorMessage: lastErrorMessage
          });
        } catch (logError) {
          this.recordFallbackFailure(
            {
              eventCode: event.eventCode as InternalBusinessEventCode,
              businessType: event.businessType,
              businessId: event.businessId
            },
            logError
          );
        }
      }
    }
    return this.repository.markEventStatus(event.id, failed ? "failed" : "handled", lastErrorMessage);
  }

  private recordFallbackFailure(args: EmitInternalBusinessEventArgs, error: unknown) {
    this.fallbackFailures.push({
      eventCode: args.eventCode,
      businessType: args.businessType,
      businessId: args.businessId,
      errorMessage: error instanceof Error ? error.message : String(error),
      createdAt: new Date().toISOString()
    });
  }
}
