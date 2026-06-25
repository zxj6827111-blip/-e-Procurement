-- Phase 4 expert review, scoring summary and review report skeleton.
-- MVP scope only: no CA, e-signature, opening hall, decrypt ceremony or tamper-proof evidence.

CREATE TABLE IF NOT EXISTS expert_directory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  avoidance_tags_json TEXT NOT NULL DEFAULT '[]',
  maintained_at TEXT NOT NULL,
  maintenance_log TEXT
);

CREATE TABLE IF NOT EXISTS expert_assignment_records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  expert_id TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  replacement_reason TEXT,
  replaced_by_expert_id TEXT,
  avoidance_confirmed INTEGER NOT NULL DEFAULT 0,
  discipline_confirmed INTEGER NOT NULL DEFAULT 0,
  confidentiality_confirmed INTEGER NOT NULL DEFAULT 0,
  notified_at TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scoring_templates (
  id TEXT PRIMARY KEY,
  template_code TEXT NOT NULL,
  template_name TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  status TEXT NOT NULL,
  config_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scoring_sheets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  expert_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  technical REAL NOT NULL DEFAULT 0,
  service REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  opinion TEXT NOT NULL DEFAULT '',
  version_no INTEGER NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  submitted_at TEXT,
  locked_at TEXT
);

CREATE TABLE IF NOT EXISTS scoring_versions (
  id TEXT PRIMARY KEY,
  sheet_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  reason TEXT NOT NULL,
  approval_status TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  report_no TEXT NOT NULL,
  status TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  frozen_at TEXT,
  created_by TEXT NOT NULL
);
