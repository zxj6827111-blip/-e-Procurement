-- Phase 3 formal MVP schema extension.
-- Bid response data is metadata-only. The MVP still excludes encrypted bid
-- packages, opening hall, decryption ceremony, CA, e-signature and trusted
-- timestamp services.

CREATE TABLE bid_response_records (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  supplier_id VARCHAR(64) NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  bid_status VARCHAR(32) NOT NULL,
  submitted_at TIMESTAMP NULL,
  quote_deadline_at TIMESTAMP NOT NULL,
  locked_at TIMESTAMP NULL,
  response_file_metadata_json TEXT NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 0,
  withdrawn_at TIMESTAMP NULL
);

CREATE TABLE bid_response_versions (
  id VARCHAR(64) PRIMARY KEY,
  bid_id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  supplier_id VARCHAR(64) NOT NULL,
  version_no INTEGER NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  bid_status VARCHAR(32) NOT NULL,
  response_file_metadata_json TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  reason VARCHAR(64) NOT NULL
);

CREATE TABLE bid_lock_records (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  locked_count INTEGER NOT NULL,
  locked_by VARCHAR(64) NOT NULL,
  locked_at TIMESTAMP NOT NULL,
  audit_log_id VARCHAR(64) NOT NULL
);

CREATE TABLE abnormal_bid_view_approvals (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  applicant_id VARCHAR(64) NOT NULL,
  target_supplier_id VARCHAR(64) NOT NULL,
  view_content VARCHAR(64) NOT NULL,
  allow_download BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  approval_status VARCHAR(32) NOT NULL
);

CREATE TABLE abnormal_bid_view_logs (
  id VARCHAR(64) PRIMARY KEY,
  approval_id VARCHAR(64) NULL,
  actor_id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  supplier_id VARCHAR(64) NOT NULL,
  content VARCHAR(64) NOT NULL,
  download_flag BOOLEAN NOT NULL DEFAULT FALSE,
  view_result VARCHAR(32) NOT NULL,
  out_of_scope_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL
);
