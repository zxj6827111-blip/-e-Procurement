-- Phase 7 contract ledger, performance node, acceptance/payment and supplier evaluation skeleton.
-- MVP scope only: ledger and metadata records; no contract body editing, approval, signing or e-signature.

CREATE TABLE IF NOT EXISTS contract_ledgers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  contract_no TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  contract_system_link TEXT,
  attachment_metadata_json TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS performance_nodes (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  node_name TEXT NOT NULL,
  plan_date TEXT NOT NULL,
  status TEXT NOT NULL,
  acceptance_record TEXT,
  payment_record TEXT,
  exception_note TEXT,
  attachment_metadata_json TEXT NOT NULL DEFAULT '[]',
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS acceptance_payment_records (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  status TEXT NOT NULL,
  amount REAL,
  summary TEXT NOT NULL,
  attachment_metadata_json TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supplier_evaluations (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  contract_id TEXT,
  dimensions_json TEXT NOT NULL,
  score REAL NOT NULL,
  description TEXT NOT NULL,
  improvement_suggestion TEXT,
  performance_exception_ref TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
