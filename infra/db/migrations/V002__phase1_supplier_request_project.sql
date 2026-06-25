-- Phase 1 formal MVP schema extension.
-- This migration documents the persistence boundary for supplier admission,
-- procurement request lifecycle and project initiation. The current MVP runtime
-- still uses the TypeScript seed store; these tables are the contract for DB wiring.

CREATE TABLE supplier_admission_records (
  id VARCHAR(64) PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  admission_status VARCHAR(32) NOT NULL,
  category_code VARCHAR(128) NOT NULL,
  qualification_status VARCHAR(64) NOT NULL,
  restriction_reason TEXT,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE supplier_category_authorizations (
  id VARCHAR(64) PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  category_code VARCHAR(128) NOT NULL,
  authorization_status VARCHAR(32) NOT NULL,
  authorized_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NULL
);

CREATE TABLE supplier_qualification_attachments (
  id VARCHAR(64) PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  qualification_type VARCHAR(128) NOT NULL,
  valid_until DATE NULL,
  uploaded_at TIMESTAMP NOT NULL
);

CREATE TABLE procurement_request_lifecycle (
  id VARCHAR(64) PRIMARY KEY,
  request_code VARCHAR(64) NOT NULL,
  source_project_id VARCHAR(64) NULL,
  title VARCHAR(255) NOT NULL,
  org_id VARCHAR(64) NOT NULL,
  category_code VARCHAR(128) NOT NULL,
  budget_label VARCHAR(255) NOT NULL,
  method_rule_id VARCHAR(64) NULL,
  method_suggestion VARCHAR(128) NOT NULL,
  external_trade_flag BOOLEAN NOT NULL DEFAULT FALSE,
  request_status VARCHAR(32) NOT NULL,
  approval_status VARCHAR(64) NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE project_initiation_records (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  source_request_id VARCHAR(64) NOT NULL,
  project_code VARCHAR(64) NOT NULL,
  project_status VARCHAR(64) NOT NULL,
  external_trade_flag BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL
);
