-- Phase 8 archive closeout, supplement application and audit supervision skeleton.
-- Extends archive/audit metadata only; no tamper-proof evidence, trusted timestamp or e-signature.

ALTER TABLE archive_items ADD COLUMN supplement_metadata_json TEXT DEFAULT '{}';

CREATE TABLE IF NOT EXISTS archive_audit_views (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  view_type TEXT NOT NULL,
  filter_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
