-- Phase 6 external-trade filing skeleton.
-- MVP scope only: record external platform metadata and filing materials; do not connect to real external exchanges.

CREATE TABLE IF NOT EXISTS external_trade_records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  external_platform_name TEXT NOT NULL DEFAULT '',
  external_project_code TEXT NOT NULL DEFAULT '',
  internal_approval_status TEXT NOT NULL,
  internal_approval_opinion TEXT,
  announcement_material_metadata_json TEXT NOT NULL DEFAULT '[]',
  result_material_metadata_json TEXT NOT NULL DEFAULT '[]',
  result_record_status TEXT NOT NULL,
  status TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
