export type R2StateDomain =
  | "procurement_request"
  | "bid"
  | "procurement_document"
  | "expert_assignment"
  | "expert_score"
  | "comparison_report"
  | "award_decision"
  | "pricing_report"
  | "purchase_order"
  | "settlement_material"
  | "archive_item"
  | "supplier";

const transitionRules = {
  procurement_request: {
    draft: ["submitted", "cancelled"],
    submitted: ["method_decided"],
    method_decided: ["project_created"],
    project_created: [],
    cancelled: []
  },
  bid: {
    draft: ["submitted"],
    submitted: ["withdrawn", "locked"],
    withdrawn: ["resubmitted"],
    resubmitted: ["locked", "withdrawn"],
    locked: ["archived"],
    invalid: ["archived"],
    archived: []
  },
  procurement_document: {
    draft: ["reviewing", "voided"],
    reviewing: ["locked", "voided"],
    locked: ["voided"],
    voided: []
  },
  expert_assignment: {
    assigned: ["confirmed", "replaced", "archived"],
    confirmed: ["replaced", "archived"],
    submitted_locked: ["replaced", "archived"],
    replaced: ["archived"],
    archived: []
  },
  expert_score: {
    scoring: ["saved", "submitted_locked", "replaced"],
    saved: ["submitted_locked", "replaced"],
    submitted_locked: ["reevaluation_requested"],
    reevaluation_requested: ["reevaluation_approved"],
    reevaluation_approved: ["resubmitted_locked", "replaced"],
    resubmitted_locked: ["reevaluation_requested"],
    replaced: []
  },
  comparison_report: {
    draft: ["generated"],
    generated: ["frozen"],
    frozen: []
  },
  award_decision: {
    draft: ["submitted"],
    submitted: ["approved", "rejected"],
    approved: [],
    rejected: []
  },
  pricing_report: {
    draft: ["generated"],
    generated: ["approved", "voided"],
    approved: ["voided"],
    voided: []
  },
  purchase_order: {
    pending_confirmation: ["supplier_confirmed"],
    supplier_confirmed: ["performing", "exception"],
    performing: ["partially_received", "received", "exception", "closed"],
    partially_received: ["received", "exception", "closed"],
    received: ["closed"],
    exception: ["performing", "closed"],
    closed: []
  },
  settlement_material: {
    pending_verification: ["verified", "rejected"],
    verified: [],
    rejected: ["pending_verification"]
  },
  archive_item: {
    collecting: ["checking", "complete"],
    checking: ["incomplete", "complete"],
    incomplete: ["supplement_requested", "complete"],
    complete: ["sealed", "archived"],
    sealed: ["supplement_requested"],
    supplement_requested: ["supplement_approved", "supplement_rejected"],
    supplement_approved: ["supplemented"],
    supplement_rejected: ["sealed"],
    supplemented: ["sealed", "archived"],
    archived: []
  },
  supplier: {
    pending: ["admitted", "rejected", "inactive"],
    admitted: ["restricted", "inactive"],
    rejected: ["pending", "inactive"],
    restricted: ["admitted", "inactive"],
    inactive: []
  }
} as const satisfies Record<R2StateDomain, Record<string, readonly string[]>>;

export function canR2Transition(domain: R2StateDomain, fromStatus: string, toStatus: string) {
  const domainRules = transitionRules[domain] as Record<string, readonly string[]>;
  return domainRules[fromStatus]?.includes(toStatus) ?? false;
}

export function getR2TransitionRules(domain: R2StateDomain): Record<string, readonly string[]> {
  return transitionRules[domain] as Record<string, readonly string[]>;
}
