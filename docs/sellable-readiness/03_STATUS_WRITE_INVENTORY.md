# Sprint 3 Status Write Inventory

- Generated at: 2026-07-03T03:09:27.276Z
- Scope: apps/api/src/routes only.
- Repository SQL persistence and runtime table sync are intentionally excluded.
- Direct route-level status writes found: 333

## Critical Action Status Write Summary

| Critical action | Route status writes counted | Decision | Sprint 3 convergence |
| --- | --- | --- | --- |
| supplier.submit_bid | apps/api/src/routes/bid-routes.ts (28) | PASS | Existing guard chain retained; no production execution source was changed. |
| bid.lock_or_close | apps/api/src/routes/bid-routes.ts (28) | PASS | Existing cutoff/lock guards retained; downstream expert review still requires locked bidding state. |
| expert.submit_score | apps/api/src/routes/expert-review-routes.ts (34) | PASS | Reevaluation request/approval roles were split from general review management so group approvers can approve without broadening all review actions. |
| award.submit_approval | apps/api/src/routes/award-routes.ts (28) | PASS | Existing R8 approval submission path retained. |
| award.publish_result | apps/api/src/routes/award-routes.ts (28) | PASS | Hardened with formal workflow/submitted approval check before result notifications can be sent. |
| archive.seal_project | apps/api/src/routes/archive-routes.ts (12)<br>apps/api/src/routes/project-workbench-routes.ts (36) | PASS | Hardened with fulfillment/evaluation closeout precondition before archive seal. |
| order.confirm_or_receive | apps/api/src/routes/mall-routes.ts (29)<br>apps/api/src/routes/project-workbench-routes.ts (36) | PASS | Existing mall/project-workbench order state guards retained. |
| settlement.submit_or_approve | apps/api/src/routes/settlement-finance-routes.ts (1) | PASS | Existing repository state preconditions retained; route-level audit and workflow hooks remain. |
| fulfillment.acceptance_confirm | apps/api/src/routes/contract-performance-routes.ts (19) | PASS | Hardened to reject acceptance/payment records before active contract performance exists. |

## Raw Route-Level Status Writes

| File | Line | Field | Value | Snippet |
| --- | --- | --- | --- | --- |
| apps/api/src/routes/archive-routes.ts | 62 | status | missing.length > 0 ? "incomplete" : "complete" | const status = missing.length > 0 ? "incomplete" : "complete"; |
| apps/api/src/routes/archive-routes.ts | 64 | entry.status | status | if (!entry.sealed) entry.status = status; |
| apps/api/src/routes/archive-routes.ts | 72 | entry.status | == "submitted_locked") | const hasEvaluation = ctx.state.supplierEvaluations.some((entry) => entry.projectId === project.id && entry.status === "submitted_locked"); |
| apps/api/src/routes/archive-routes.ts | 187 | status | ${project.status}` | `status=${project.status}` |
| apps/api/src/routes/archive-routes.ts | 194 | entry.status | "sealed" | entry.status = "sealed"; |
| apps/api/src/routes/archive-routes.ts | 197 | project.status | project.externalTradeFlag ? "external_archived" : "archived" | project.status = project.externalTradeFlag ? "external_archived" : "archived"; |
| apps/api/src/routes/archive-routes.ts | 198 | project.displayStatus | "档案已封存" | project.displayStatus = "档案已封存"; |
| apps/api/src/routes/archive-routes.ts | 227 | item.status | item.collectedFlag ? "complete" : "collecting" | item.status = item.collectedFlag ? "complete" : "collecting"; |
| apps/api/src/routes/archive-routes.ts | 251 | item.status | "supplement_requested" | item.status = "supplement_requested"; |
| apps/api/src/routes/archive-routes.ts | 278 | supplementRequest.approvalStatus | approved ? "approved" : "rejected" | supplementRequest.approvalStatus = approved ? "approved" : "rejected"; |
| apps/api/src/routes/archive-routes.ts | 282 | item.status | approved ? "supplement_approved" : "supplement_rejected" | item.status = approved ? "supplement_approved" : "supplement_rejected"; |
| apps/api/src/routes/archive-routes.ts | 326 | item.status | "supplemented" | item.status = "supplemented"; |
| apps/api/src/routes/auth-routes.ts | 173 | result.status | == "not_found") { | if (result.status === "not_found") { |
| apps/api/src/routes/auth-routes.ts | 176 | result.status | == "current_password_invalid") { | if (result.status === "current_password_invalid") { |
| apps/api/src/routes/award-routes.ts | 78 | item.status | == "frozen") | const report = [...ctx.state.reviewReports].reverse().find((item) => item.projectId === projectId && item.status === "frozen"); |
| apps/api/src/routes/award-routes.ts | 79 | item.status | == "frozen") | const comparison = [...ctx.state.comparisonReports].reverse().find((item) => item.projectId === projectId && item.status === "frozen"); |
| apps/api/src/routes/award-routes.ts | 122 | supplier.status | == "restricted" \|\| supplier.admissionStatus === "restricted" \|\| supplier.restrictionReason \|\| supplier.risk.includes("黑名单")) { | if (supplier.status === "restricted" \|\| supplier.admissionStatus === "restricted" \|\| supplier.restrictionReason \|\| supplier.risk.includes("黑名单")) { |
| apps/api/src/routes/award-routes.ts | 130 | project.status | "award_approving" satisfies InternalProjectStatus | project.status = "award_approving" satisfies InternalProjectStatus; |
| apps/api/src/routes/award-routes.ts | 131 | project.displayStatus | "award approving" | project.displayStatus = "award approving"; |
| apps/api/src/routes/award-routes.ts | 136 | project.status | "result_notified" satisfies InternalProjectStatus | project.status = "result_notified" satisfies InternalProjectStatus; |
| apps/api/src/routes/award-routes.ts | 137 | project.displayStatus | "result notified" | project.displayStatus = "result notified"; |
| apps/api/src/routes/award-routes.ts | 142 | project.status | "awarded_pending_order" satisfies InternalProjectStatus | project.status = "awarded_pending_order" satisfies InternalProjectStatus; |
| apps/api/src/routes/award-routes.ts | 143 | project.displayStatus | "awarded pending order" | project.displayStatus = "awarded pending order"; |
| apps/api/src/routes/award-routes.ts | 227 | item.approvalStatus | == "approved") | const approval = ctx.state.awardApprovals.find((item) => item.id === notification.awardApprovalId && item.approvalStatus === "approved"); |
| apps/api/src/routes/award-routes.ts | 242 | item.approvalStatus | == "approved") | return [...ctx.state.awardApprovals].reverse().find((item) => item.projectId === projectId && item.approvalStatus === "approved"); |
| apps/api/src/routes/award-routes.ts | 247 | instance.approvalStatus | == "approved" | if (instance) return instance.approvalStatus === "approved"; |
| apps/api/src/routes/award-routes.ts | 248 | approval.approvalStatus | == "approved") | return Boolean(approval.submittedAt && approval.approvedAt && approval.approvalStatus === "approved"); |
| apps/api/src/routes/award-routes.ts | 309 | item.status | == "sent") | const supplierSelfSent = ctx.state.resultNotifications.some((item) => item.projectId === project.id && item.awardApprovalId === approval.id && item.scope === "supplier_self" && item.status === "sent"); |
| apps/api/src/routes/award-routes.ts | 311 | item.status | == "sent") | const hasAnyResultNotification = ctx.state.resultNotifications.some((item) => item.projectId === project.id && item.awardApprovalId === approval.id && item.status === "sent"); |
| apps/api/src/routes/award-routes.ts | 312 | project.status | == "result_notified" && !hasAnyResultNotification | return project.status === "result_notified" && !hasAnyResultNotification; |
| apps/api/src/routes/award-routes.ts | 336 | item.status | == "sent") | return ctx.state.resultNotifications.filter((item) => item.projectId === projectId && item.awardApprovalId === approvalId && item.scope === scope && item.status === "sent"); |
| apps/api/src/routes/award-routes.ts | 376 | price.approvalStatus | == "approved") | const existing = ctx.state.mallPrices.find((price) => price.productId === product.id && price.supplierId === product.supplierId && price.approvalStatus === "approved"); |
| apps/api/src/routes/award-routes.ts | 400 | price.approvalStatus | "approved" | price.approvalStatus = "approved"; |
| apps/api/src/routes/award-routes.ts | 457 | product.status | "listed" | product.status = "listed"; |
| apps/api/src/routes/award-routes.ts | 552 | status | ${approval.approvalStatus}`) | return denyResponse(ctx, req, res, 400, "AWARD_APPROVAL_STATUS_DENIED", "Only draft award approvals can be submitted.", "award_approval.status.denied", "award_approval", approval.id, project.id, `status=${approval.approvalStatus}`); |
| apps/api/src/routes/award-routes.ts | 571 | approval.approvalStatus | "submitted" | approval.approvalStatus = "submitted"; |
| apps/api/src/routes/award-routes.ts | 587 | status | ${approval.approvalStatus}`) | return denyResponse(ctx, req, res, 400, "AWARD_APPROVAL_STATUS_DENIED", "Only submitted award approvals can be mock-approved.", "award_approval.status.denied", "award_approval", approval.id, project.id, `status=${approval.approvalStatus}`); |
| apps/api/src/routes/award-routes.ts | 589 | approval.approvalStatus | Boolean(req.body?.approved ?? true) ? "approved" : "rejected" | approval.approvalStatus = Boolean(req.body?.approved ?? true) ? "approved" : "rejected"; |
| apps/api/src/routes/award-routes.ts | 592 | approval.approvalStatus | == "approved") { | if (approval.approvalStatus === "approved") { |
| apps/api/src/routes/award-routes.ts | 600 | approval.approvalStatus | == "approved" ? "approve" : "reject", | action: approval.approvalStatus === "approved" ? "approve" : "reject", |
| apps/api/src/routes/award-routes.ts | 622 | item.approvalStatus | == "approved") | [...ctx.state.awardApprovals].reverse().find((item) => item.projectId === project.id && item.approvalStatus === "approved"); |
| apps/api/src/routes/award-routes.ts | 816 | item.status | == "published") | const existing = [...ctx.state.internalPublicityRecords].reverse().find((item) => item.projectId === project.id && item.awardApprovalId === approval.id && item.status === "published"); |
| apps/api/src/routes/bid-routes.ts | 77 | item.status | == "qualified") | return ctx.state.supplierRegistrations.some((item) => item.projectId === project.id && item.supplierId === supplierId && item.status === "qualified"); |
| apps/api/src/routes/bid-routes.ts | 84 | admissionStatus | supplier.admissionStatus ?? (supplier.id === "sup-4" ? "restricted" : "admitted") | const admissionStatus = supplier.admissionStatus ?? (supplier.id === "sup-4" ? "restricted" : "admitted"); |
| apps/api/src/routes/bid-routes.ts | 94 | item.status | == "active" && (item.expiresAt === undefined \|\| new Date(item.expiresAt).getTime() >= now)) | return authorizations.some((item) => item.category === category && item.status === "active" && (item.expiresAt === undefined \|\| new Date(item.expiresAt).getTime() >= now)); |
| apps/api/src/routes/bid-routes.ts | 130 | item.status | == "draft").length | const draftCount = projectBids.filter((item) => item.status === "draft").length; |
| apps/api/src/routes/bid-routes.ts | 131 | item.status | == "submitted" \|\| item.status === "resubmitted").length | const submittedCount = projectBids.filter((item) => item.status === "submitted" \|\| item.status === "resubmitted").length; |
| apps/api/src/routes/bid-routes.ts | 132 | item.status | == "locked").length | const lockedCount = projectBids.filter((item) => item.status === "locked").length; |
| apps/api/src/routes/bid-routes.ts | 133 | item.status | == "withdrawn").length | const withdrawnCount = projectBids.filter((item) => item.status === "withdrawn").length; |
| apps/api/src/routes/bid-routes.ts | 364 | project.status | "bidding_locked" satisfies InternalProjectStatus | project.status = "bidding_locked" satisfies InternalProjectStatus; |
| apps/api/src/routes/bid-routes.ts | 365 | project.displayStatus | "bidding locked" | project.displayStatus = "bidding locked"; |
| apps/api/src/routes/bid-routes.ts | 371 | project.status | "bidding_open" satisfies InternalProjectStatus | project.status = "bidding_open" satisfies InternalProjectStatus; |
| apps/api/src/routes/bid-routes.ts | 372 | project.displayStatus | "bidding open" | project.displayStatus = "bidding open"; |
| apps/api/src/routes/bid-routes.ts | 378 | item.status | == "locked") | .filter((item) => item.projectId === projectId && item.status === "locked") |
| apps/api/src/routes/bid-routes.ts | 411 | item.status | == "frozen") | .find((item) => item.status === "frozen"); |
| apps/api/src/routes/bid-routes.ts | 438 | bid.status | == "locked" \|\| project.status === "bidding_locked") { | if (bid.status === "locked" \|\| project.status === "bidding_locked") { |
| apps/api/src/routes/bid-routes.ts | 654 | status | ${bid.status}`) | return denyResponse(ctx, req, res, 400, "BID_STATUS_DENIED", "Only draft or withdrawn bids can be edited.", "bid.update.denied", "bid", bid.id, project.id, `status=${bid.status}`); |
| apps/api/src/routes/bid-routes.ts | 702 | status | ${bid.status}`) | return denyResponse(ctx, req, res, 400, "BID_STATUS_DENIED", "Only draft or withdrawn bids can be submitted.", "bid.submit.denied", "bid", bid.id, project.id, `status=${bid.status}`); |
| apps/api/src/routes/bid-routes.ts | 704 | bid.status | "submitted" | bid.status = "submitted"; |
| apps/api/src/routes/bid-routes.ts | 734 | status | ${bid.status}`) | return denyResponse(ctx, req, res, 400, "BID_STATUS_DENIED", "Only submitted bids can be withdrawn.", "bid.withdraw.denied", "bid", bid.id, project.id, `status=${bid.status}`); |
| apps/api/src/routes/bid-routes.ts | 736 | bid.status | "withdrawn" | bid.status = "withdrawn"; |
| apps/api/src/routes/bid-routes.ts | 767 | status | ${bid.status}`) | return denyResponse(ctx, req, res, 400, "BID_STATUS_DENIED", "Only withdrawn bids can be resubmitted.", "bid.resubmit.denied", "bid", bid.id, project.id, `status=${bid.status}`); |
| apps/api/src/routes/bid-routes.ts | 782 | bid.status | "submitted" | bid.status = "submitted"; |
| apps/api/src/routes/bid-routes.ts | 831 | item.status | == "submitted") | const bids = ctx.state.bids.filter((item) => item.projectId === project.id && item.status === "submitted"); |
| apps/api/src/routes/bid-routes.ts | 833 | bid.status | "locked" | bid.status = "locked"; |
| apps/api/src/routes/bid-routes.ts | 872 | project.status | "bidding_open" | project.status = "bidding_open"; |
| apps/api/src/routes/bid-routes.ts | 873 | project.displayStatus | action === "early_cutoff" ? "early bid cutoff completed" : "bid cutoff completed" | project.displayStatus = action === "early_cutoff" ? "early bid cutoff completed" : "bid cutoff completed"; |
| apps/api/src/routes/bid-routes.ts | 954 | item.status | == "generated") | const existingGenerated = ctx.state.comparisonReports.find((item) => item.projectId === project.id && item.status === "generated"); |
| apps/api/src/routes/bid-routes.ts | 982 | item.status | == "generated") | const report = [...ctx.state.comparisonReports].reverse().find((item) => item.projectId === project.id && item.status === "generated"); |
| apps/api/src/routes/bid-routes.ts | 986 | report.status | "frozen" | report.status = "frozen"; |
| apps/api/src/routes/bid-view-routes.ts | 55 | item.status | == "qualified") \|\| | ctx.state.supplierRegistrations.some((item) => item.projectId === projectId && item.supplierId === supplierId && item.status === "qualified") \|\| |
| apps/api/src/routes/bid-view-routes.ts | 127 | approval.approvalStatus | "submitted" | approval.approvalStatus = "submitted"; |
| apps/api/src/routes/bid-view-routes.ts | 143 | status | ${approval.approvalStatus}`) | return denyResponse(ctx, req, res, 400, "BID_VIEW_APPROVAL_STATUS_DENIED", "Only submitted abnormal bid view requests can be approved.", "bid_view_approval.status.denied", "bid_view_approval", approval.id, approval.projectId, `status=${approval.approvalStatus}`); |
| apps/api/src/routes/bid-view-routes.ts | 145 | approval.approvalStatus | Boolean(req.body?.approved ?? true) ? "active" : "rejected" | approval.approvalStatus = Boolean(req.body?.approved ?? true) ? "active" : "rejected"; |
| apps/api/src/routes/bid-view-routes.ts | 153 | item.approvalStatus | == "active" && new Date(item.validFrom).getTime() <= now && new Date(item.validUntil).getTime() >= now | (item) => item.applicantId === req.auth.user.id && item.approvalStatus === "active" && new Date(item.validFrom).getTime() <= now && new Date(item.validUntil).getTime() >= now |
| apps/api/src/routes/bpmn-definition-routes.ts | 81 | status | == undefined ? undefined : String(req.body.status) as never, | status: req.body?.status === undefined ? undefined : String(req.body.status) as never, |
| apps/api/src/routes/bpmn-definition-routes.ts | 99 | status | == undefined ? undefined : String(req.body.status) as never, | status: req.body?.status === undefined ? undefined : String(req.body.status) as never, |
| apps/api/src/routes/contract-performance-routes.ts | 48 | item.approvalStatus | == "approved") \|\| | ctx.state.awardApprovals.some((item) => item.projectId === project.id && item.selectedSupplierId === supplierId && item.approvalStatus === "approved") \|\| |
| apps/api/src/routes/contract-performance-routes.ts | 49 | item.status | == "sent") \|\| | ctx.state.resultNotifications.some((item) => item.projectId === project.id && item.supplierId === supplierId && item.status === "sent") \|\| |
| apps/api/src/routes/contract-performance-routes.ts | 114 | item.approvalStatus | == "approved") | return [...ctx.state.awardApprovals].reverse().find((item) => item.projectId === projectId && item.approvalStatus === "approved"); |
| apps/api/src/routes/contract-performance-routes.ts | 273 | project.status | project.externalTradeFlag ? "external_contract_registered" : "contract_registered" | project.status = project.externalTradeFlag ? "external_contract_registered" : "contract_registered"; |
| apps/api/src/routes/contract-performance-routes.ts | 274 | project.displayStatus | "contract registered" | project.displayStatus = "contract registered"; |
| apps/api/src/routes/contract-performance-routes.ts | 304 | contract.status | == "cancelled") { | if (contract.status === "cancelled") { |
| apps/api/src/routes/contract-performance-routes.ts | 315 | contract.status | "registered" | contract.status = "registered"; |
| apps/api/src/routes/contract-performance-routes.ts | 317 | project.status | project.externalTradeFlag ? "external_contract_registered" : "contract_registered" | project.status = project.externalTradeFlag ? "external_contract_registered" : "contract_registered"; |
| apps/api/src/routes/contract-performance-routes.ts | 318 | project.displayStatus | "contract registered" | project.displayStatus = "contract registered"; |
| apps/api/src/routes/contract-performance-routes.ts | 343 | contract.status | "performing" | contract.status = "performing"; |
| apps/api/src/routes/contract-performance-routes.ts | 345 | project.status | project.externalTradeFlag ? "external_performing" : "performing" | project.status = project.externalTradeFlag ? "external_performing" : "performing"; |
| apps/api/src/routes/contract-performance-routes.ts | 346 | project.displayStatus | "performing" | project.displayStatus = "performing"; |
| apps/api/src/routes/contract-performance-routes.ts | 357 | status | String(req.body?.status ?? node.status) | const status = String(req.body?.status ?? node.status); |
| apps/api/src/routes/contract-performance-routes.ts | 361 | node.status | status as PerformanceNode["status"] | node.status = status as PerformanceNode["status"]; |
| apps/api/src/routes/contract-performance-routes.ts | 367 | status | ${node.status}`) | const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "performance_node.update", "performance_node", node.id, node.projectId, `status=${node.status}`); |
| apps/api/src/routes/contract-performance-routes.ts | 394 | contract.status | == "cancelled" \|\| !["performing", "completed"].includes(contract.status) \|\| !hasPerformanceNode) { | if (contract.status === "cancelled" \|\| !["performing", "completed"].includes(contract.status) \|\| !hasPerformanceNode) { |
| apps/api/src/routes/contract-performance-routes.ts | 406 | contractStatus | ${contract.status} | `contractStatus=${contract.status};hasPerformanceNode=${hasPerformanceNode}` |
| apps/api/src/routes/contract-performance-routes.ts | 474 | project.status | project.externalTradeFlag ? "external_evaluated" : "evaluated" | project.status = project.externalTradeFlag ? "external_evaluated" : "evaluated"; |
| apps/api/src/routes/contract-performance-routes.ts | 475 | project.displayStatus | "supplier evaluated" | project.displayStatus = "supplier evaluated"; |
| apps/api/src/routes/expert-review-routes.ts | 114 | user.status | == "disabled" \|\| user.status === "offboarded" | return !user \|\| user.roleId !== "expert" \|\| user.status === "disabled" \|\| user.status === "offboarded"; |
| apps/api/src/routes/expert-review-routes.ts | 152 | status | String(body.status ?? existing?.status ?? (active ? "可抽取" : "停用")).trim() \|\| (active ? "可抽取" : "停用") | const status = String(body.status ?? existing?.status ?? (active ? "可抽取" : "停用")).trim() \|\| (active ? "可抽取" : "停用"); |
| apps/api/src/routes/expert-review-routes.ts | 278 | status | ${project.status}`) | denyResponse(ctx, req, res, 400, "BID_NOT_LOCKED", "Expert review is allowed only after bids are locked.", action, "project", objectId, project.id, `status=${project.status}`); |
| apps/api/src/routes/expert-review-routes.ts | 300 | status | ${project.status}`) | denyResponse(ctx, req, res, 400, "EXPERT_ASSIGNMENT_STAGE_DENIED", "Expert assignment is allowed only before the review report is frozen.", action, "project", project.id, project.id, `status=${project.status}`); |
| apps/api/src/routes/expert-review-routes.ts | 340 | item.status | == "frozen") \|\| project.status === "review_report_frozen" | const frozen = ctx.state.reviewReports.some((item) => item.projectId === project.id && item.status === "frozen") \|\| project.status === "review_report_frozen"; |
| apps/api/src/routes/expert-review-routes.ts | 416 | template.status | == "enabled") ?? ctx.state.scoringTemplates[0] ?? null | return ctx.state.scoringTemplates.find((template) => template.id === sheet.templateId) ?? ctx.state.scoringTemplates.find((template) => template.status === "enabled") ?? ctx.state.scoringTemplates[0] ?? null; |
| apps/api/src/routes/expert-review-routes.ts | 513 | status | statusInput === "enabled" ? "enabled" : statusInput === "disabled" ? "disabled" : "draft" | const status = statusInput === "enabled" ? "enabled" : statusInput === "disabled" ? "disabled" : "draft"; |
| apps/api/src/routes/expert-review-routes.ts | 531 | template.status | == "enabled") { | if (template.status === "enabled") { |
| apps/api/src/routes/expert-review-routes.ts | 533 | item.status | == "enabled") { | if (item.id !== template.id && item.status === "enabled") { |
| apps/api/src/routes/expert-review-routes.ts | 534 | item.status | "disabled" | item.status = "disabled"; |
| apps/api/src/routes/expert-review-routes.ts | 714 | item.status | == "submitted_locked" \|\| item.status === "resubmitted_locked") | const submittedSheets = sheets.filter((item) => item.status === "submitted_locked" \|\| item.status === "resubmitted_locked"); |
| apps/api/src/routes/expert-review-routes.ts | 734 | item.status | == "submitted_locked" \|\| item.status === "resubmitted_locked") | const allSubmitted = sheets.length > 0 && sheets.every((item) => item.status === "submitted_locked" \|\| item.status === "resubmitted_locked"); |
| apps/api/src/routes/expert-review-routes.ts | 759 | item.status | == "submitted_locked" \|\| item.status === "resubmitted_locked") | const submittedSheets = sheets.filter((item) => item.status === "submitted_locked" \|\| item.status === "resubmitted_locked"); |
| apps/api/src/routes/expert-review-routes.ts | 761 | item.status | == "enabled") ?? null | const template = ctx.state.scoringTemplates.find((item) => item.id === submittedSheets[0]?.templateId) ?? ctx.state.scoringTemplates.find((item) => item.status === "enabled") ?? null; |
| apps/api/src/routes/expert-review-routes.ts | 829 | project.status | "expert_reviewing" satisfies InternalProjectStatus | project.status = "expert_reviewing" satisfies InternalProjectStatus; |
| apps/api/src/routes/expert-review-routes.ts | 830 | project.displayStatus | "expert reviewing" | project.displayStatus = "expert reviewing"; |
| apps/api/src/routes/expert-review-routes.ts | 834 | template.status | == "enabled")?.id ?? ctx.state.scoringTemplates[0]?.id ?? "st-1" | return ctx.state.scoringTemplates.find((template) => template.status === "enabled")?.id ?? ctx.state.scoringTemplates[0]?.id ?? "st-1"; |
| apps/api/src/routes/expert-review-routes.ts | 1006 | template.status | "enabled" | template.status = "enabled"; |
| apps/api/src/routes/expert-review-routes.ts | 1203 | assignment.status | "replaced" | assignment.status = "replaced"; |
| apps/api/src/routes/expert-review-routes.ts | 1208 | sheet.status | "replaced" | sheet.status = "replaced"; |
| apps/api/src/routes/expert-review-routes.ts | 1271 | assignment.status | assignment.avoidanceConfirmed && assignment.disciplineConfirmed && assignment.confidentialityConfirmed ? "confirmed" : "assigned" | assignment.status = assignment.avoidanceConfirmed && assignment.disciplineConfirmed && assignment.confidentialityConfirmed ? "confirmed" : "assigned"; |
| apps/api/src/routes/expert-review-routes.ts | 1274 | assignment.status | == "confirmed") { | if (assignment.status === "confirmed") { |
| apps/api/src/routes/expert-review-routes.ts | 1344 | sheet.status | == "submitted_locked" \|\| sheet.status === "resubmitted_locked") { | if (sheet.status === "submitted_locked" \|\| sheet.status === "resubmitted_locked") { |
| apps/api/src/routes/expert-review-routes.ts | 1350 | sheet.status | "saved" | sheet.status = "saved"; |
| apps/api/src/routes/expert-review-routes.ts | 1364 | sheet.status | == "submitted_locked" \|\| sheet.status === "resubmitted_locked") { | if (sheet.status === "submitted_locked" \|\| sheet.status === "resubmitted_locked") { |
| apps/api/src/routes/expert-review-routes.ts | 1371 | sheet.status | sheet.versionNo > 1 ? "resubmitted_locked" : "submitted_locked" | sheet.status = sheet.versionNo > 1 ? "resubmitted_locked" : "submitted_locked"; |
| apps/api/src/routes/expert-review-routes.ts | 1418 | status | ${sheet.status}`) | return denyResponse(ctx, req, res, 400, "REEVALUATION_SOURCE_NOT_LOCKED", "Reevaluation can only be requested for submitted locked scoring sheets.", "scoring_sheet.reevaluation_request.status.denied", "scoring_sheet", sheet.id, sheet.projectId, `status=${sheet.status}`); |
| apps/api/src/routes/expert-review-routes.ts | 1424 | sheet.status | "reevaluation_requested" | sheet.status = "reevaluation_requested"; |
| apps/api/src/routes/expert-review-routes.ts | 1448 | status | ${sheet.status}`) | return denyResponse(ctx, req, res, 400, "REEVALUATION_STATUS_DENIED", "Only requested reevaluations can be approved.", "scoring_sheet.reevaluation_approve.status.denied", "scoring_sheet", sheet.id, sheet.projectId, `status=${sheet.status}`); |
| apps/api/src/routes/expert-review-routes.ts | 1462 | sheet.status | "reevaluation_approved" | sheet.status = "reevaluation_approved"; |
| apps/api/src/routes/expert-review-routes.ts | 1568 | item.status | == "generated") | const report = ctx.state.reviewReports.find((item) => item.projectId === project.id && item.status === "generated"); |
| apps/api/src/routes/expert-review-routes.ts | 1570 | report.status | "frozen" | report.status = "frozen"; |
| apps/api/src/routes/expert-review-routes.ts | 1572 | project.status | "review_report_frozen" | project.status = "review_report_frozen"; |
| apps/api/src/routes/expert-review-routes.ts | 1573 | project.displayStatus | "review report frozen" | project.displayStatus = "review report frozen"; |
| apps/api/src/routes/external-trade-routes.ts | 109 | project.status | status | project.status = status; |
| apps/api/src/routes/external-trade-routes.ts | 110 | project.displayStatus | displayStatus | project.displayStatus = displayStatus; |
| apps/api/src/routes/external-trade-routes.ts | 111 | record.status | status | record.status = status; |
| apps/api/src/routes/external-trade-routes.ts | 163 | record.internalApprovalStatus | "recorded" | record.internalApprovalStatus = "recorded"; |
| apps/api/src/routes/external-trade-routes.ts | 184 | record.internalApprovalStatus | "recorded" | record.internalApprovalStatus = "recorded"; |
| apps/api/src/routes/external-trade-routes.ts | 242 | record.resultRecordStatus | "recorded" | record.resultRecordStatus = "recorded"; |
| apps/api/src/routes/file-routes.ts | 188 | procurementRequest.approvalStatus | == "approved" | return procurementRequest.approvalStatus === "approved"; |
| apps/api/src/routes/file-routes.ts | 338 | product.status | == "listed" \|\| isProcurementMaintainerRole(req.auth.roleId)) | return isOrgReaderRole(req.auth.roleId) && (product.status === "listed" \|\| isProcurementMaintainerRole(req.auth.roleId)); |
| apps/api/src/routes/file-routes.ts | 344 | template.status | == "active" | return isOrgReaderRole(req.auth.roleId) && template.status === "active"; |
| apps/api/src/routes/mall-routes.ts | 62 | product.status | == "listed" | if (isFinanceRole(req.auth.roleId)) return product.status === "listed"; |
| apps/api/src/routes/mall-routes.ts | 63 | product.status | == "listed" \|\| product.createdBy === req.auth.user.id | if (isProcurementBuyerRole(req.auth.roleId)) return product.status === "listed" \|\| product.createdBy === req.auth.user.id; |
| apps/api/src/routes/mall-routes.ts | 79 | admissionStatus | supplier.admissionStatus ?? supplier.status | const admissionStatus = supplier.admissionStatus ?? supplier.status; |
| apps/api/src/routes/mall-routes.ts | 80 | admissionStatus | == "admitted" && supplier.status !== "restricted" | return admissionStatus === "admitted" && supplier.status !== "restricted"; |
| apps/api/src/routes/mall-routes.ts | 238 | item.approvalStatus | == "approved") | ? [...ctx.state.awardApprovals].reverse().find((item) => item.projectId === product.sourceProjectId && item.selectedSupplierId === product.supplierId && item.approvalStatus === "approved") |
| apps/api/src/routes/mall-routes.ts | 421 | item.status | == "reserved") | const hasReserve = account.ledgerEntries.some((item) => item.orderId === order.id && item.entryType === "payment_reserve" && item.status === "reserved"); |
| apps/api/src/routes/mall-routes.ts | 434 | order.paymentStatus | "payment_reserved" | order.paymentStatus = "payment_reserved"; |
| apps/api/src/routes/mall-routes.ts | 530 | status | String(req.body?.status ?? "") | const status = String(req.body?.status ?? ""); |
| apps/api/src/routes/mall-routes.ts | 543 | status | == "listed") { | if (status === "listed") { |
| apps/api/src/routes/mall-routes.ts | 550 | product.status | status as MallProduct["status"] | product.status = status as MallProduct["status"]; |
| apps/api/src/routes/mall-routes.ts | 555 | status | ${status} | const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "mall_product.bulk-status.update", "mall_product", "bulk", undefined, `status=${status};updated=${updated.length};blocked=${blocked.length}`); |
| apps/api/src/routes/mall-routes.ts | 564 | status | String(req.body?.status ?? "") | const status = String(req.body?.status ?? ""); |
| apps/api/src/routes/mall-routes.ts | 568 | status | == "listed") { | if (status === "listed") { |
| apps/api/src/routes/mall-routes.ts | 582 | product.status | status as MallProduct["status"] | product.status = status as MallProduct["status"]; |
| apps/api/src/routes/mall-routes.ts | 583 | status | == "listed" ? now() : product.listedAt ?? null | product.listedAt = status === "listed" ? now() : product.listedAt ?? null; |
| apps/api/src/routes/mall-routes.ts | 627 | price.approvalStatus | req.body?.approved === false ? "rejected" : "approved" | price.approvalStatus = req.body?.approved === false ? "rejected" : "approved"; |
| apps/api/src/routes/mall-routes.ts | 655 | item.status | == "listed") | const product = ctx.state.mallProducts.find((item) => item.id === String(req.body?.productId ?? "") && item.status === "listed"); |
| apps/api/src/routes/mall-routes.ts | 788 | item.status | == "listed") | const product = ctx.state.mallProducts.find((item) => item.id === line.productId && item.status === "listed"); |
| apps/api/src/routes/mall-routes.ts | 897 | order.paymentStatus | action === "release" ? "released" : "reversed" | order.paymentStatus = action === "release" ? "released" : "reversed"; |
| apps/api/src/routes/mall-routes.ts | 912 | order.paymentStatus | "paid" | order.paymentStatus = "paid"; |
| apps/api/src/routes/mall-routes.ts | 1108 | order.status | returnRequest.status === "approved" ? "return_approved" : "return_rejected" | order.status = returnRequest.status === "approved" ? "return_approved" : "return_rejected"; |
| apps/api/src/routes/mall-routes.ts | 1111 | returnRequest.status | == "approved") { | if (returnRequest.status === "approved") { |
| apps/api/src/routes/mall-routes.ts | 1133 | order.paymentStatus | "reversed" | order.paymentStatus = "reversed"; |
| apps/api/src/routes/mall-routes.ts | 1293 | invoice.status | reviewed.status | invoice.status = reviewed.status; |
| apps/api/src/routes/mall-routes.ts | 1319 | invoice.status | reviewed.status | invoice.status = reviewed.status; |
| apps/api/src/routes/mall-routes.ts | 1322 | reviewed.status | == "rejected" ? reviewed.verificationOpinion : undefined | invoice.rejectReason = reviewed.status === "rejected" ? reviewed.verificationOpinion : undefined; |
| apps/api/src/routes/mall-routes.ts | 1427 | questionnaire.status | "closed" | questionnaire.status = "closed"; |
| apps/api/src/routes/mall-routes.ts | 1487 | item.status | == "listed") | const product = ctx.state.mallProducts.find((item) => item.id === packageItem.productId && item.status === "listed"); |
| apps/api/src/routes/mall-routes.ts | 1510 | item.status | == "listed") | const product = ctx.state.mallProducts.find((item) => item.id === packageItem.productId && item.status === "listed"); |
| apps/api/src/routes/organization-routes.ts | 88 | status | String(req.body?.status ?? "") | const status = String(req.body?.status ?? ""); |
| apps/api/src/routes/organization-routes.ts | 92 | organization.status | status as "active" \| "disabled" | organization.status = status as "active" \| "disabled"; |
| apps/api/src/routes/organization-routes.ts | 108 | status | String(req.body?.status ?? "") | const status = String(req.body?.status ?? ""); |
| apps/api/src/routes/organization-routes.ts | 112 | user.status | status | user.status = status; |
| apps/api/src/routes/organization-routes.ts | 212 | rule.status | String(req.body.status) as ApprovalRule["status"] | if (req.body?.status !== undefined && ["enabled", "disabled"].includes(String(req.body.status))) rule.status = String(req.body.status) as ApprovalRule["status"]; |
| apps/api/src/routes/procurement-participation-routes.ts | 138 | admissionStatus | supplier.admissionStatus ?? (supplier.id === "sup-4" ? "restricted" : "admitted") | const admissionStatus = supplier.admissionStatus ?? (supplier.id === "sup-4" ? "restricted" : "admitted"); |
| apps/api/src/routes/procurement-participation-routes.ts | 143 | admissionStatus | == "restricted" ? ("suspended" as const) : ("active" as const), | status: admissionStatus === "restricted" ? ("suspended" as const) : ("active" as const), |
| apps/api/src/routes/procurement-participation-routes.ts | 171 | normalized.admissionStatus | == "restricted") { | if (normalized.admissionStatus === "restricted") { |
| apps/api/src/routes/procurement-participation-routes.ts | 179 | normalized.admissionStatus | == "inactive") { | if (normalized.admissionStatus === "inactive") { |
| apps/api/src/routes/procurement-participation-routes.ts | 192 | admissionStatus | ${normalized.admissionStatus}` | reason: `admissionStatus=${normalized.admissionStatus}` |
| apps/api/src/routes/procurement-participation-routes.ts | 342 | project.status | targetStatus | project.status = targetStatus; |
| apps/api/src/routes/procurement-participation-routes.ts | 343 | project.displayStatus | displayStatus | project.displayStatus = displayStatus; |
| apps/api/src/routes/procurement-participation-routes.ts | 411 | item.status | == "locked") | .filter((item) => item.projectId === projectId && item.status === "locked") |
| apps/api/src/routes/procurement-participation-routes.ts | 437 | announcement_status | excluded.announcement_status, | announcement_status = excluded.announcement_status, |
| apps/api/src/routes/procurement-participation-routes.ts | 575 | document.status | == "voided") return false | if (document.status === "voided") return false; |
| apps/api/src/routes/procurement-participation-routes.ts | 581 | document.status | == "locked" && (project.participantSupplierIds.includes(supplierId) \|\| hasVisibleAnnouncement) | return document.status === "locked" && (project.participantSupplierIds.includes(supplierId) \|\| hasVisibleAnnouncement); |
| apps/api/src/routes/procurement-participation-routes.ts | 634 | document.status | == "voided") { | if (document.status === "voided") { |
| apps/api/src/routes/procurement-participation-routes.ts | 637 | document.status | == "reviewing") { | if (document.status === "reviewing") { |
| apps/api/src/routes/procurement-participation-routes.ts | 640 | document.status | == "locked") { | if (document.status === "locked") { |
| apps/api/src/routes/procurement-participation-routes.ts | 674 | document.status | == "voided") { | if (document.status === "voided") { |
| apps/api/src/routes/procurement-participation-routes.ts | 677 | document.status | "voided" | document.status = "voided"; |
| apps/api/src/routes/procurement-participation-routes.ts | 678 | document.reviewStatus | "voided" | document.reviewStatus = "voided"; |
| apps/api/src/routes/procurement-participation-routes.ts | 716 | document.status | == "voided") { | if (document.status === "voided") { |
| apps/api/src/routes/procurement-participation-routes.ts | 719 | document.status | == "locked") { | if (document.status === "locked") { |
| apps/api/src/routes/procurement-participation-routes.ts | 723 | document.status | "locked" | document.status = "locked"; |
| apps/api/src/routes/procurement-participation-routes.ts | 724 | document.reviewStatus | "approved" | document.reviewStatus = "approved"; |
| apps/api/src/routes/procurement-participation-routes.ts | 802 | inquiry.status | "published" | inquiry.status = "published"; |
| apps/api/src/routes/procurement-participation-routes.ts | 825 | inquiry.status | "round_open" | inquiry.status = "round_open"; |
| apps/api/src/routes/procurement-participation-routes.ts | 857 | inquiry.status | "priced" | inquiry.status = "priced"; |
| apps/api/src/routes/procurement-participation-routes.ts | 960 | announcement.status | == "closed") { | if (announcement.status === "closed") { |
| apps/api/src/routes/procurement-participation-routes.ts | 976 | announcement.status | == "published" | const alreadyPublished = announcement.status === "published"; |
| apps/api/src/routes/procurement-participation-routes.ts | 979 | announcement.status | "published" | announcement.status = "published"; |
| apps/api/src/routes/procurement-participation-routes.ts | 1041 | status | ${announcement.status}` | `status=${announcement.status}` |
| apps/api/src/routes/procurement-participation-routes.ts | 1071 | announcement.status | == "draft") { | if (announcement.status === "draft") { |
| apps/api/src/routes/procurement-participation-routes.ts | 1086 | announcement.status | == "closed") { | if (announcement.status === "closed") { |
| apps/api/src/routes/procurement-participation-routes.ts | 1105 | announcement.status | "closed" | announcement.status = "closed"; |
| apps/api/src/routes/procurement-participation-routes.ts | 1109 | project.status | == "registration_open" && | project.status === "registration_open" && |
| apps/api/src/routes/procurement-participation-routes.ts | 1110 | item.status | == "published") | !ctx.state.procurementAnnouncements.some((item) => item.projectId === project.id && item.id !== announcement.id && item.status === "published") |
| apps/api/src/routes/procurement-participation-routes.ts | 1112 | project.status | "document_published" | project.status = "document_published"; |
| apps/api/src/routes/procurement-participation-routes.ts | 1113 | project.displayStatus | "announcement closed" | project.displayStatus = "announcement closed"; |
| apps/api/src/routes/procurement-participation-routes.ts | 1150 | status | ${announcement.status}` | `status=${announcement.status}` |
| apps/api/src/routes/procurement-participation-routes.ts | 1224 | status | ${announcement.status}`) | return denyResponse(ctx, req, res, 400, "ANNOUNCEMENT_NOT_PUBLISHED", "Registration requires a published announcement.", "registration.submit.denied", "announcement", announcement.id, project.id, `status=${announcement.status}`); |
| apps/api/src/routes/procurement-participation-routes.ts | 1270 | invitation.status | "registered" | invitation.status = "registered"; |
| apps/api/src/routes/procurement-participation-routes.ts | 1299 | status | == "rejected" ? "rejected" : "qualified" | const decision = req.body?.status === "rejected" ? "rejected" : "qualified"; |
| apps/api/src/routes/procurement-participation-routes.ts | 1300 | registration.status | decision | registration.status = decision; |
| apps/api/src/routes/procurement-participation-routes.ts | 1305 | status | ${decision}`) | const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "registration.qualify", "registration", registration.id, project.id, `status=${decision}`); |
| apps/api/src/routes/procurement-participation-routes.ts | 1333 | project.status | == "cancelled" \|\| project.status === "closed") { | if (project.status === "cancelled" \|\| project.status === "closed") { |
| apps/api/src/routes/procurement-participation-routes.ts | 1454 | clarification.status | "answered" | clarification.status = "answered"; |
| apps/api/src/routes/procurement-participation-routes.ts | 1547 | sample.status | req.body?.discarded === true ? "discarded" : "returned" | sample.status = req.body?.discarded === true ? "discarded" : "returned"; |
| apps/api/src/routes/project-routes.ts | 140 | item.status | == "published" && item.scope === "public_internal") \|\| | ctx.state.procurementAnnouncements.some((item) => item.projectId === project.id && item.status === "published" && item.scope === "public_internal") \|\| |
| apps/api/src/routes/project-routes.ts | 184 | normalized.approvalStatus | == "approved" | normalized.approvalStatus === "approved" |
| apps/api/src/routes/project-routes.ts | 199 | status | request.status ?? (request.projectId ? "project_created" : "draft") | const status = request.status ?? (request.projectId ? "project_created" : "draft"); |
| apps/api/src/routes/project-routes.ts | 440 | nextStatus | == project.status) return true | if (nextStatus === project.status) return true; |
| apps/api/src/routes/project-routes.ts | 451 | task.status | == "pending") | .some((task) => task.businessType === "procurement_request" && task.businessId === requestId && task.status === "pending"); |
| apps/api/src/routes/project-routes.ts | 459 | maybe.status | == "number" ? maybe.status : 400, | status: typeof maybe.status === "number" ? maybe.status : 400, |
| apps/api/src/routes/project-routes.ts | 465 | maybe.status | == "number" ? maybe.status : 400, | status: typeof maybe.status === "number" ? maybe.status : 400, |
| apps/api/src/routes/project-routes.ts | 508 | status | ${normalizedRequest.status}, approvalStatus=${normalizedRequest.approvalStatus}` | reason: `request status=${normalizedRequest.status}, approvalStatus=${normalizedRequest.approvalStatus}` |
| apps/api/src/routes/project-routes.ts | 550 | sourceRequest.status | "project_created" | sourceRequest.status = "project_created"; |
| apps/api/src/routes/project-routes.ts | 606 | nextStatus | String(req.body?.status ?? "") | const nextStatus = String(req.body?.status ?? ""); |
| apps/api/src/routes/project-routes.ts | 616 | status | ${nextStatus}` | reason: `invalid status=${nextStatus}` |
| apps/api/src/routes/project-routes.ts | 638 | project.status | validation.status | project.status = validation.status; |
| apps/api/src/routes/project-routes.ts | 639 | project.displayStatus | nextStatus | project.displayStatus = nextStatus; |
| apps/api/src/routes/project-routes.ts | 773 | status | ${normalized.status}` | reason: `request status=${normalized.status}` |
| apps/api/src/routes/project-routes.ts | 796 | normalized.status | == "project_created") { | if (normalized.status === "project_created") { |
| apps/api/src/routes/project-routes.ts | 814 | procurementRequest.status | "cancelled" | procurementRequest.status = "cancelled"; |
| apps/api/src/routes/project-routes.ts | 815 | procurementRequest.approvalStatus | "cancelled" | procurementRequest.approvalStatus = "cancelled"; |
| apps/api/src/routes/project-routes.ts | 870 | procurementRequest.status | "submitted" | procurementRequest.status = "submitted"; |
| apps/api/src/routes/project-routes.ts | 871 | procurementRequest.approvalStatus | "submitted" | procurementRequest.approvalStatus = "submitted"; |
| apps/api/src/routes/project-routes.ts | 924 | procurementRequest.approvalStatus | workflow.approvalInstance.approvalStatus === "approved" ? "approved" : "rejected" | procurementRequest.approvalStatus = workflow.approvalInstance.approvalStatus === "approved" ? "approved" : "rejected"; |
| apps/api/src/routes/project-routes.ts | 964 | procurementRequest.status | "method_decided" | procurementRequest.status = "method_decided"; |
| apps/api/src/routes/project-routes.ts | 965 | procurementRequest.approvalStatus | "approved" | procurementRequest.approvalStatus = "approved"; |
| apps/api/src/routes/project-workbench-routes.ts | 308 | item.status | == "sealed") | const hasSealedArchive = ctx.state.archiveItems.some((item) => item.projectId === project.id && item.status === "sealed"); |
| apps/api/src/routes/project-workbench-routes.ts | 310 | project.status | project.externalTradeFlag ? "external_archived" : "archived" | project.status = project.externalTradeFlag ? "external_archived" : "archived"; |
| apps/api/src/routes/project-workbench-routes.ts | 311 | project.displayStatus | "档案已封存" | project.displayStatus = "档案已封存"; |
| apps/api/src/routes/project-workbench-routes.ts | 314 | item.status | == "submitted_locked") | const hasLockedEvaluation = ctx.state.supplierEvaluations.some((item) => item.projectId === project.id && item.status === "submitted_locked"); |
| apps/api/src/routes/project-workbench-routes.ts | 316 | project.status | project.externalTradeFlag ? "external_evaluated" : "evaluated" | project.status = project.externalTradeFlag ? "external_evaluated" : "evaluated"; |
| apps/api/src/routes/project-workbench-routes.ts | 317 | project.displayStatus | "供应商已评价" | project.displayStatus = "供应商已评价"; |
| apps/api/src/routes/project-workbench-routes.ts | 323 | project.status | project.externalTradeFlag ? "external_performing" : "performing" | project.status = project.externalTradeFlag ? "external_performing" : "performing"; |
| apps/api/src/routes/project-workbench-routes.ts | 324 | project.displayStatus | "履约中" | project.displayStatus = "履约中"; |
| apps/api/src/routes/project-workbench-routes.ts | 328 | project.status | project.externalTradeFlag ? "external_contract_registered" : "contract_registered" | project.status = project.externalTradeFlag ? "external_contract_registered" : "contract_registered"; |
| apps/api/src/routes/project-workbench-routes.ts | 329 | project.displayStatus | "采购订单已生成" | project.displayStatus = "采购订单已生成"; |
| apps/api/src/routes/project-workbench-routes.ts | 339 | item.approvalStatus | == "approved") ?? null | return [...ctx.state.awardApprovals].reverse().find((item) => item.projectId === projectId && item.approvalStatus === "approved") ?? null; |
| apps/api/src/routes/project-workbench-routes.ts | 354 | approvalStatus | == "approved"), snapshotJson: { sourceId: request?.id, approvalStatus: request?.approvalStatus } } | return { collectedFlag: Boolean(request?.approvalStatus === "approved"), snapshotJson: { sourceId: request?.id, approvalStatus: request?.approvalStatus } }; |
| apps/api/src/routes/project-workbench-routes.ts | 366 | entry.status | == "qualified") | const qualified = registrations.filter((entry) => entry.status === "qualified"); |
| apps/api/src/routes/project-workbench-routes.ts | 391 | entry.status | == "submitted_locked") | const evaluations = ctx.state.supplierEvaluations.filter((entry) => entry.projectId === project.id && entry.status === "submitted_locked"); |
| apps/api/src/routes/project-workbench-routes.ts | 396 | entry.status | == "verified") | const verified = materials.filter((entry) => entry.status === "verified"); |
| apps/api/src/routes/project-workbench-routes.ts | 416 | existing.status | derived.collectedFlag ? "complete" : "collecting" | existing.status = derived.collectedFlag ? "complete" : "collecting"; |
| apps/api/src/routes/project-workbench-routes.ts | 435 | entry.status | == "sealed") | const sealed = ctx.state.archiveItems.some((entry) => entry.projectId === projectId && entry.status === "sealed"); |
| apps/api/src/routes/project-workbench-routes.ts | 442 | item.status | == "submitted_locked") | const active = ctx.state.supplierEvaluations.filter((item) => item.supplierId === supplierId && item.status === "submitted_locked"); |
| apps/api/src/routes/project-workbench-routes.ts | 612 | order.status | "supplier_confirmed" | order.status = "supplier_confirmed"; |
| apps/api/src/routes/project-workbench-routes.ts | 651 | order.status | == "closed") { | if (order.status === "closed") { |
| apps/api/src/routes/project-workbench-routes.ts | 654 | order.status | "closed" | order.status = "closed"; |
| apps/api/src/routes/project-workbench-routes.ts | 724 | order.status | deriveOrderStatus(order, receipt.receiptType) | order.status = deriveOrderStatus(order, receipt.receiptType); |
| apps/api/src/routes/project-workbench-routes.ts | 743 | handlingStatus | String(req.body?.handlingStatus ?? "supplemented") as ReceiptHandlingStatus | const handlingStatus = String(req.body?.handlingStatus ?? "supplemented") as ReceiptHandlingStatus; |
| apps/api/src/routes/project-workbench-routes.ts | 747 | receipt.handlingStatus | handlingStatus | receipt.handlingStatus = handlingStatus; |
| apps/api/src/routes/project-workbench-routes.ts | 753 | handlingStatus | == "supplemented") { | if (handlingStatus === "supplemented") { |
| apps/api/src/routes/project-workbench-routes.ts | 754 | order.status | deriveOrderStatus(order) | order.status = deriveOrderStatus(order); |
| apps/api/src/routes/project-workbench-routes.ts | 755 | order.status | == "supplier_confirmed") order.status = "performing" | if (order.status === "supplier_confirmed") order.status = "performing"; |
| apps/api/src/routes/project-workbench-routes.ts | 757 | handlingStatus | == "rejected") { | } else if (handlingStatus === "rejected") { |
| apps/api/src/routes/project-workbench-routes.ts | 758 | order.status | "exception" | order.status = "exception"; |
| apps/api/src/routes/project-workbench-routes.ts | 760 | handlingStatus | == "closed") { | } else if (handlingStatus === "closed") { |
| apps/api/src/routes/project-workbench-routes.ts | 761 | order.status | "closed" | order.status = "closed"; |
| apps/api/src/routes/project-workbench-routes.ts | 768 | status | ${handlingStatus}`) | const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "receipt.handle", "receipt_record", receipt.id, project.id, `status=${handlingStatus}`); |
| apps/api/src/routes/project-workbench-routes.ts | 857 | item.status | == "submitted_locked") | const active = ctx.state.supplierEvaluations.filter((item) => item.purchaseOrderId === order.id && item.status === "submitted_locked"); |
| apps/api/src/routes/project-workbench-routes.ts | 859 | item.status | "superseded" | item.status = "superseded"; |
| apps/api/src/routes/project-workbench-routes.ts | 899 | item.status | == "sealed") { | if (item.sealed \|\| item.status === "sealed") { |
| apps/api/src/routes/project-workbench-routes.ts | 903 | item.status | item.collectedFlag ? "complete" : "collecting" | item.status = item.collectedFlag ? "complete" : "collecting"; |
| apps/api/src/routes/settlement-finance-routes.ts | 358 | status | req.body?.status === undefined ? "payment_requested" : String(req.body.status) | const status = req.body?.status === undefined ? "payment_requested" : String(req.body.status); |
| apps/api/src/routes/supplier-routes.ts | 111 | admissionStatus | supplier.admissionStatus ?? (supplier.id === "sup-4" ? "restricted" : "admitted") | const admissionStatus = supplier.admissionStatus ?? (supplier.id === "sup-4" ? "restricted" : "admitted"); |
| apps/api/src/routes/supplier-routes.ts | 116 | admissionStatus | == "restricted" ? ("suspended" as const) : ("active" as const), | status: admissionStatus === "restricted" ? ("suspended" as const) : ("active" as const), |
| apps/api/src/routes/supplier-routes.ts | 126 | admissionStatus | == "restricted" ? "blacklisted" : admissionStatus === "pending" ? "trial" : "regular"), | admissionLevel: supplier.admissionLevel ?? (admissionStatus === "restricted" ? "blacklisted" : admissionStatus === "pending" ? "trial" : "regular"), |
| apps/api/src/routes/supplier-routes.ts | 135 | admissionStatus | == "restricted" ? "blacklisted" : admissionStatus === "admitted" ? "passed" : "pending" | latestResult: admissionStatus === "restricted" ? "blacklisted" : admissionStatus === "admitted" ? "passed" : "pending" |
| apps/api/src/routes/supplier-routes.ts | 141 | admissionStatus | == "restricted" ? supplier.risk : undefined) | restrictionReason: supplier.restrictionReason ?? (admissionStatus === "restricted" ? supplier.risk : undefined) |
| apps/api/src/routes/supplier-routes.ts | 307 | review.status | == "passed") | (supplier.admissionReviews ?? []).some((review) => review.reviewType === "qualification_initial_review" && review.status === "passed") |
| apps/api/src/routes/supplier-routes.ts | 466 | status | == "rejected") return "blacklisted" as const | if (status === "rejected") return "blacklisted" as const; |
| apps/api/src/routes/supplier-routes.ts | 470 | status | == "passed" ? ("regular" as const) : ("trial" as const) | return status === "passed" ? ("regular" as const) : ("trial" as const); |
| apps/api/src/routes/supplier-routes.ts | 516 | existing.status | "active" | existing.status = "active"; |
| apps/api/src/routes/supplier-routes.ts | 1092 | authorizationStatus | supplier.admissionStatus === "admitted" ? "active" : "suspended" | const authorizationStatus = supplier.admissionStatus === "admitted" ? "active" : "suspended"; |
| apps/api/src/routes/supplier-routes.ts | 1094 | existing.status | authorizationStatus | existing.status = authorizationStatus; |
| apps/api/src/routes/supplier-routes.ts | 1110 | supplier.admissionStatus | == "admitted" ? "activated" : "category_authorized", | action: supplier.admissionStatus === "admitted" ? "activated" : "category_authorized", |
| apps/api/src/routes/supplier-routes.ts | 1120 | supplier.admissionStatus | "restricted" | supplier.admissionStatus = "restricted"; |
| apps/api/src/routes/supplier-routes.ts | 1121 | supplier.status | "restricted" | supplier.status = "restricted"; |
| apps/api/src/routes/supplier-routes.ts | 1142 | status | String(req.body?.admissionStatus ?? "") | const status = String(req.body?.admissionStatus ?? ""); |
| apps/api/src/routes/supplier-routes.ts | 1147 | status | == "inactive" && !reason) { | if (status === "inactive" && !reason) { |
| apps/api/src/routes/supplier-routes.ts | 1150 | supplier.admissionStatus | status as Supplier["admissionStatus"] | supplier.admissionStatus = status as Supplier["admissionStatus"]; |
| apps/api/src/routes/supplier-routes.ts | 1151 | supplier.status | status | supplier.status = status; |
| apps/api/src/routes/supplier-routes.ts | 1152 | status | == "admitted") { | if (status === "admitted") { |
| apps/api/src/routes/supplier-routes.ts | 1161 | status | == "restricted") { | if (status === "restricted") { |
| apps/api/src/routes/supplier-routes.ts | 1165 | status | == "inactive") { | if (status === "inactive") { |
| apps/api/src/routes/supplier-routes.ts | 1177 | status | ${status} | const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.status.update", "supplier", supplier.id, undefined, reason ? `status=${status};reason=${reason}` : `status=${status}`); |
| apps/api/src/routes/supplier-routes.ts | 1177 | status | ${status}`) | const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "supplier.status.update", "supplier", supplier.id, undefined, reason ? `status=${status};reason=${reason}` : `status=${status}`); |
| apps/api/src/routes/supplier-routes.ts | 1178 | status | == "admitted") { | if (status === "admitted") { |
| apps/api/src/routes/supplier-routes.ts | 1185 | status | == "rejected") { | } else if (status === "rejected") { |
| apps/api/src/routes/supplier-routes.ts | 1192 | status | == "restricted") { | } else if (status === "restricted") { |
| apps/api/src/routes/supplier-routes.ts | 1224 | status | String(req.body?.status ?? "pending") as "pending" \| "passed" \| "rejected" | const status = String(req.body?.status ?? "pending") as "pending" \| "passed" \| "rejected"; |
| apps/api/src/routes/supplier-routes.ts | 1247 | review.status | == "passed" ? "initial_review_passed" : review.status === "rejected" ? "initial_review_rejected" : supplier.qualification | supplier.qualification = review.status === "passed" ? "initial_review_passed" : review.status === "rejected" ? "initial_review_rejected" : supplier.qualification; |
| apps/api/src/routes/supplier-routes.ts | 1250 | supplier.admissionStatus | review.status === "passed" ? (review.regularizationDecision === "blacklisted" ? "restricted" : "admitted") : review.status === "rejected" ? "rejected" : supplier.admissionStatus | supplier.admissionStatus = review.status === "passed" ? (review.regularizationDecision === "blacklisted" ? "restricted" : "admitted") : review.status === "rejected" ? "rejected" : supplier.admissionStatus; |
| apps/api/src/routes/supplier-routes.ts | 1251 | supplier.status | supplier.admissionStatus ?? supplier.status | supplier.status = supplier.admissionStatus ?? supplier.status; |
| apps/api/src/routes/supplier-routes.ts | 1256 | supplier.admissionStatus | == "admitted") { | if (supplier.admissionStatus === "admitted") { |
| apps/api/src/routes/supplier-routes.ts | 1260 | supplier.admissionStatus | == "restricted") { | if (supplier.admissionStatus === "restricted") { |
| apps/api/src/routes/supplier-routes.ts | 1270 | supplier.admissionStatus | == "restricted" ? "blacklisted" : review.status === "passed" ? "passed" : "pending" | latestResult: supplier.admissionStatus === "restricted" ? "blacklisted" : review.status === "passed" ? "passed" : "pending" |
| apps/api/src/routes/supplier-routes.ts | 1275 | supplier.admissionStatus | review.regularizationDecision === "blacklisted" ? "restricted" : review.status === "passed" ? "admitted" : supplier.admissionStatus | supplier.admissionStatus = review.regularizationDecision === "blacklisted" ? "restricted" : review.status === "passed" ? "admitted" : supplier.admissionStatus; |
| apps/api/src/routes/supplier-routes.ts | 1276 | supplier.status | supplier.admissionStatus ?? supplier.status | supplier.status = supplier.admissionStatus ?? supplier.status; |
| apps/api/src/routes/supplier-routes.ts | 1277 | review.status | == "passed" && review.regularizationDecision !== "blacklisted" ? review.reviewedAt : supplier.regularizedAt | supplier.regularizedAt = review.status === "passed" && review.regularizationDecision !== "blacklisted" ? review.reviewedAt : supplier.regularizedAt; |
| apps/api/src/routes/supplier-routes.ts | 1287 | review.status | == "passed" ? "passed" : "warning" | latestResult: review.regularizationDecision === "blacklisted" ? "blacklisted" : review.status === "passed" ? "passed" : "warning" |
| apps/api/src/routes/supplier-routes.ts | 1290 | supplier.admissionStatus | "restricted" | supplier.admissionStatus = "restricted"; |
| apps/api/src/routes/supplier-routes.ts | 1291 | supplier.status | "restricted" | supplier.status = "restricted"; |
| apps/api/src/routes/supplier-routes.ts | 1312 | review.status | == "passed" ? "qualification_passed" : review.status === "rejected" ? "qualification_rejected" : "profile_submitted", | action: review.status === "passed" ? "qualification_passed" : review.status === "rejected" ? "qualification_rejected" : "profile_submitted", |
| apps/api/src/routes/supplier-routes.ts | 1320 | supplier.admissionStatus | == "admitted" ? "admission_approved" : supplier.admissionStatus === "rejected" ? "admission_rejected" : supplier.admissionStatus === "restricted" ? "restricted" : "profile_submitted", | action: supplier.admissionStatus === "admitted" ? "admission_approved" : supplier.admissionStatus === "rejected" ? "admission_rejected" : supplier.admissionStatus === "restricted" ? "restricted" : "profile_submitted", |
| apps/api/src/routes/supplier-routes.ts | 1323 | supplier.admissionStatus | == "admitted") { | if (supplier.admissionStatus === "admitted") { |
| apps/api/src/routes/supplier-routes.ts | 1332 | supplier.admissionStatus | == "restricted") { | if (review.reviewType === "periodic_assessment" && supplier.admissionStatus === "restricted") { |
| apps/api/src/routes/workflow-task-routes.ts | 74 | workflowStatus | instance.approvalStatus | const workflowStatus = instance.approvalStatus; |
| apps/api/src/routes/workflow-task-routes.ts | 76 | businessApprovalStatus | workflowStatus === "returned" ? "rejected" : workflowStatus | const businessApprovalStatus = workflowStatus === "returned" ? "rejected" : workflowStatus; |
| apps/api/src/routes/workflow-task-routes.ts | 80 | procurementRequest.approvalStatus | businessApprovalStatus as typeof procurementRequest.approvalStatus | procurementRequest.approvalStatus = businessApprovalStatus as typeof procurementRequest.approvalStatus; |
| apps/api/src/routes/workflow-task-routes.ts | 89 | approval.approvalStatus | businessApprovalStatus as typeof approval.approvalStatus | approval.approvalStatus = businessApprovalStatus as typeof approval.approvalStatus; |
| apps/api/src/routes/workflow-task-routes.ts | 92 | businessApprovalStatus | == "approved") { | if (businessApprovalStatus === "approved") { |
| apps/api/src/routes/workflow-task-routes.ts | 95 | project.status | "awarded_pending_order" | project.status = "awarded_pending_order"; |
| apps/api/src/routes/workflow-task-routes.ts | 96 | project.displayStatus | "awarded pending order" | project.displayStatus = "awarded pending order"; |
| apps/api/src/routes/workflow-task-routes.ts | 104 | businessApprovalStatus | == "approved") { | if (businessApprovalStatus === "approved") { |
| apps/api/src/routes/workflow-task-routes.ts | 105 | document.reviewStatus | "approved" | document.reviewStatus = "approved"; |
| apps/api/src/routes/workflow-task-routes.ts | 106 | document.status | "reviewing" | document.status = "reviewing"; |
| apps/api/src/routes/workflow-task-routes.ts | 108 | document.reviewStatus | "rejected" | document.reviewStatus = "rejected"; |
| apps/api/src/routes/workflow-task-routes.ts | 109 | document.status | "draft" | document.status = "draft"; |
| apps/api/src/routes/workflow-task-routes.ts | 236 | status | == "disabled" ? "disabled" : "enabled", | status: req.body?.status === "disabled" ? "disabled" : "enabled", |
| apps/api/src/routes/workflow-task-routes.ts | 259 | patch.status | String(req.body.status) as ApprovalRule["status"] | if (req.body?.status !== undefined && ["enabled", "disabled"].includes(String(req.body.status))) patch.status = String(req.body.status) as ApprovalRule["status"]; |

## Interpretation

Direct route-level status writes are not automatically defects. They need review when they bypass role guards, data scope checks, status preconditions, audit logging or R8 workflow approval. Repository persistence writes are normal storage behavior and are not counted here.
