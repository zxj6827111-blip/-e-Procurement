# Phase 3 Data Dictionary

Phase 3 covers supplier bidding, bid cutoff locking, pre-deadline confidentiality and abnormal bid-view approval. It remains metadata-only for response files and does not add CA, e-signature, bid-file encryption/decryption, trusted timestamps, opening hall, or real external platform integration.

## Bid Response

| Field | Meaning | Notes |
|---|---|---|
| bid_id | Supplier bid identifier | One active bid per supplier and project |
| project_id | Procurement project | External-trade projects cannot use internal bid paths |
| supplier_id | Bid owner supplier | Supplier role can only maintain its own bid |
| amount | Bid amount | Hidden from buyer/group/auditor/expert before cutoff by default |
| bid_status | draft / submitted / withdrawn / locked | Locked bids cannot be modified |
| response_file_metadata_json | Response file metadata | No encrypted file package in Phase 3 |
| version_no | Current version number | Submit, withdraw, resubmit and lock write versions |
| quote_deadline_at | Bid cutoff time | Modification is denied after cutoff |

## Bid Version

| Field | Meaning | Notes |
|---|---|---|
| version_no | Version sequence | Monotonic per bid |
| reason | submit / withdraw / resubmit / lock | Used for audit trace |
| snapshot_json | Bid snapshot | Records amount, status and response-file metadata |

## Abnormal Bid View Approval

| Field | Meaning | Notes |
|---|---|---|
| approval_id | Abnormal view approval identifier | Mock approval chain only |
| target_supplier_id | Supplier whose bid may be viewed | Scoped to one project supplier |
| view_content | amount / response_file_metadata / response_file_download | Content-scope control |
| allow_download | Download permission flag | Download requires this flag |
| valid_from / valid_until | View authorization window | Runtime validation enforces expiry |
| approval_status | draft / submitted / active / rejected | No real OA integration |

## Guardrails

| Control | Backend Result |
|---|---|
| Supplier reads another supplier bid | `SUPPLIER_BID_SCOPE_DENIED` |
| Buyer/group/auditor views amount before cutoff without approval | `BID_CONFIDENTIALITY_DENIED` |
| Expert views bid before cutoff | `EXPERT_BID_DENIED` |
| Admin views business bid data | `ADMIN_BUSINESS_DATA_DENIED` |
| Modify locked bid | `BID_LOCKED` |
| Bid after deadline | `BID_DEADLINE_PASSED` |
| Internal bid on external-trade project | `EXTERNAL_TRADE_INTERNAL_ACTION_BLOCKED` |

## Audit Points

| Action | Object Type | Result |
|---|---|---|
| bid.draft.create | bid | recorded |
| bid.submit | bid | recorded |
| bid.withdraw | bid | recorded |
| bid.resubmit | bid | recorded |
| bid.lock | project | recorded |
| bid.confidentiality.denied | bid | denied |
| bid_view_approval.create | bid_view_approval | recorded |
| bid_view_approval.approve | bid_view_approval | recorded |
| bid_file.download.allowed | bid_file | recorded |
