-- Phase 5 award approval, result notification and internal publicity skeleton.
-- MVP scope only: OA/message delivery are mock adapters; no contract, performance, payment or archive closeout.

CREATE TABLE IF NOT EXISTS award_approvals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  recommended_supplier_id TEXT NOT NULL,
  selected_supplier_id TEXT NOT NULL,
  is_lowest_price INTEGER NOT NULL DEFAULT 0,
  non_lowest_price_reason TEXT,
  approval_status TEXT NOT NULL,
  approval_opinion TEXT,
  adapter_call_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  submitted_at TEXT,
  approved_at TEXT
);

CREATE TABLE IF NOT EXISTS result_notifications (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  status TEXT NOT NULL,
  visibility_config TEXT NOT NULL,
  content_summary TEXT NOT NULL,
  adapter_call_id TEXT,
  sent_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS internal_publicity_records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  award_approval_id TEXT NOT NULL,
  status TEXT NOT NULL,
  visibility_config TEXT NOT NULL,
  content_summary TEXT NOT NULL,
  published_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
