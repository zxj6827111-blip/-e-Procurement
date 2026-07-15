import type { R7SettlementFinanceRepository } from "../repositories/r7-settlement-finance-repository.js";
import {
  WorkflowRuleError,
  type ApprovalActionArgs,
  type R8WorkflowTaskRepository
} from "../repositories/r8-workflow-task-repository.js";
import type { RuntimeDb } from "../runtime/index.js";
import type { SeedState } from "../seed/data.js";

export const settlementWorkflowBusinessTypes = new Set(["settlement_bill", "invoice", "payment_request"]);

export class SettlementWorkflowService {
  constructor(
    private readonly runtimeDb: RuntimeDb,
    private readonly state: SeedState,
    private readonly r7SettlementFinanceRepository: R7SettlementFinanceRepository,
    private readonly r8WorkflowTaskRepository: R8WorkflowTaskRepository
  ) {}

  recordApprovalAction(args: ApprovalActionArgs) {
    this.runtimeDb.db.exec("begin immediate transaction;");
    try {
      const result = this.r8WorkflowTaskRepository.recordApprovalAction(args);
      this.syncFinancialBusiness(result.approvalInstance.id, args);
      this.runtimeDb.db.exec("commit;");
      this.r7SettlementFinanceRepository.syncSettlementFinanceState(this.state);
      return result;
    } catch (error) {
      this.runtimeDb.db.exec("rollback;");
      throw error;
    }
  }

  private syncFinancialBusiness(instanceId: string, args: ApprovalActionArgs) {
    const instance = this.r8WorkflowTaskRepository.getApprovalInstance(instanceId);
    if (!instance || !settlementWorkflowBusinessTypes.has(instance.businessType)) {
      throw new WorkflowRuleError("Settlement workflow instance was not found.", "WORKFLOW_BUSINESS_NOT_FOUND", 404);
    }
    const workflowStatus = instance.approvalStatus;
    if (!["approved", "rejected", "returned", "cancelled"].includes(workflowStatus)) return;
    const businessStatus = workflowStatus === "returned" ? "rejected" : workflowStatus;

    if (instance.businessType === "settlement_bill") {
      const bill = this.r7SettlementFinanceRepository.getSettlementBill(instance.businessId);
      if (!bill) throw new WorkflowRuleError("Settlement bill does not exist.", "WORKFLOW_BUSINESS_NOT_FOUND", 404);
      const approved = businessStatus === "approved";
      const targetStatus = approved ? "approved" : "rejected";
      if (bill.status === targetStatus) return;
      if (bill.status !== "submitted") {
        throw new WorkflowRuleError(
          "Settlement bill state " + bill.status + " conflicts with the pending workflow.",
          "WORKFLOW_BUSINESS_STATE_CONFLICT",
          409
        );
      }
      this.r7SettlementFinanceRepository.reviewSettlementBill(bill.id, args.actor, approved, args.opinion);
      return;
    }

    if (instance.businessType === "invoice") {
      const invoice = this.r7SettlementFinanceRepository.getInvoice(instance.businessId);
      if (!invoice) throw new WorkflowRuleError("Invoice does not exist.", "WORKFLOW_BUSINESS_NOT_FOUND", 404);
      const approved = businessStatus === "approved";
      const targetStatus = approved ? "verified" : "rejected";
      if (invoice.status === targetStatus) return;
      if (invoice.status !== "pending_verification") {
        throw new WorkflowRuleError("Invoice state " + invoice.status + " conflicts with the pending workflow.", "WORKFLOW_BUSINESS_STATE_CONFLICT", 409);
      }
      this.r7SettlementFinanceRepository.reviewInvoice(invoice.id, args.actor, approved, args.opinion);
      return;
    }

    const nextStatus = businessStatus === "approved" ? "pending_payment" : businessStatus === "rejected" ? "rejected" : "cancelled";
    const note = businessStatus === "approved" ? "Payment request approved." : businessStatus === "rejected" ? "Payment request rejected." : "Payment request cancelled.";
    this.r7SettlementFinanceRepository.transitionFundLedgerEntry(instance.businessId, args.actor, nextStatus, note);
  }
}
