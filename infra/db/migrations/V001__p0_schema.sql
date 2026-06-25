-- P0 PostgreSQL-compatible schema for the second engineering-skeleton batch.
-- It is intentionally limited to internal sunshine procurement governance, expert review,
-- audit, mock seed and adapter bookkeeping. It does not implement CA, e-signature,
-- bid-file encryption/decryption, trusted timestamp, tamper-proof evidence, or real integrations.

create table organizations (
  id varchar primary key,
  parent_id varchar null,
  name varchar not null,
  level varchar not null,
  status varchar not null default 'active',
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table roles (
  id varchar primary key,
  role_code varchar not null unique,
  name varchar not null,
  permission_scope varchar not null,
  status varchar not null default 'active',
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table users (
  id varchar primary key,
  org_id varchar not null,
  role_id varchar not null,
  supplier_id varchar null,
  expert_id varchar null,
  name varchar not null,
  status varchar not null default 'active',
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table role_permissions (
  id varchar primary key,
  role_id varchar not null,
  resource_type varchar not null,
  resource_code varchar not null,
  action_code varchar not null,
  effect varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table system_dictionaries (
  id varchar primary key,
  dict_type varchar not null,
  dict_code varchar not null,
  dict_name varchar not null,
  dict_value text not null,
  status varchar not null default 'enabled',
  version_no integer not null default 1,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table suppliers (
  id varchar primary key,
  org_id varchar not null,
  name varchar not null,
  status varchar not null,
  category_auth_json text not null,
  risk_level varchar null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table supplier_qualifications (
  id varchar primary key,
  org_id varchar not null,
  supplier_id varchar not null,
  qualification_type varchar not null,
  status varchar not null,
  valid_until timestamp null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table supplier_category_authorizations (
  id varchar primary key,
  org_id varchar not null,
  supplier_id varchar not null,
  category_code varchar not null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table supplier_restrictions (
  id varchar primary key,
  org_id varchar not null,
  supplier_id varchar not null,
  restriction_type varchar not null,
  reason text null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table supplier_evaluations (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar null,
  supplier_id varchar not null,
  score numeric(8,2) null,
  evaluation_content text null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table procurement_requests (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar null,
  title varchar not null,
  budget_label varchar not null,
  method_suggestion varchar not null,
  external_trade_flag boolean not null default false,
  approval_status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table procurement_method_rules (
  id varchar primary key,
  rule_code varchar not null unique,
  rule_name varchar not null,
  condition_json text not null,
  result_method varchar not null,
  status varchar not null,
  version_no integer not null default 1,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table procurement_projects (
  id varchar primary key,
  org_id varchar not null,
  project_code varchar not null,
  name varchar not null,
  method_type varchar not null,
  status varchar not null,
  external_trade_flag boolean not null default false,
  before_deadline boolean not null default false,
  quote_deadline_at timestamp null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table procurement_project_packages (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  package_code varchar not null,
  package_name varchar not null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table bids (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  supplier_id varchar not null,
  amount numeric(18, 2) null,
  status varchar not null,
  submitted_at timestamp null,
  locked_at timestamp null,
  version_no integer not null default 1,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table bid_files (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  supplier_id varchar not null,
  bid_id varchar not null,
  file_name varchar not null,
  file_service_ref varchar not null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table bid_locks (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  lock_reason varchar not null,
  locked_at timestamp not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table bid_view_approvals (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  applicant_id varchar not null,
  target_supplier_id varchar not null,
  view_content varchar not null,
  allow_download boolean not null default false,
  valid_from timestamp not null,
  valid_until timestamp not null,
  approval_status varchar not null,
  audit_log_id varchar null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table bid_view_logs (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  supplier_id varchar not null,
  approval_id varchar null,
  actor_id varchar not null,
  content varchar not null,
  download_flag boolean not null default false,
  result varchar not null,
  out_of_scope_reason text null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table experts (
  id varchar primary key,
  org_id varchar not null,
  name varchar not null,
  category varchar not null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table expert_categories (
  id varchar primary key,
  category_code varchar not null,
  category_name varchar not null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table expert_assignments (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  expert_id varchar not null,
  method varchar not null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table expert_avoidance_confirmations (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  expert_id varchar not null,
  confirmed_flag boolean not null default false,
  confirmed_at timestamp null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table expert_discipline_confirmations (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  expert_id varchar not null,
  confirmed_flag boolean not null default false,
  confirmed_at timestamp null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table expert_confidentiality_confirmations (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  expert_id varchar not null,
  confirmed_flag boolean not null default false,
  confirmed_at timestamp null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table scoring_templates (
  id varchar primary key,
  org_id varchar not null,
  template_code varchar not null,
  template_name varchar not null,
  config_json text not null,
  status varchar not null,
  version_no integer not null default 1,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table scoring_sheets (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  expert_id varchar not null,
  supplier_id varchar not null,
  template_id varchar not null,
  version_no integer not null,
  status varchar not null,
  total numeric(8,2) null,
  opinion text null,
  submitted_at timestamp null,
  locked_at timestamp null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null,
  unique(project_id, expert_id, supplier_id, version_no)
);

create table scoring_sheet_items (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  expert_id varchar not null,
  supplier_id varchar not null,
  scoring_sheet_id varchar not null,
  item_code varchar not null,
  score numeric(8,2) null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table scoring_versions (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  expert_id varchar not null,
  supplier_id varchar not null,
  sheet_id varchar not null,
  version_no integer not null,
  reason varchar not null,
  approval_status varchar not null,
  snapshot_json text not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table supplier_score_summaries (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  supplier_id varchar not null,
  total_score numeric(8,2) null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table review_reports (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  status varchar not null,
  frozen_at timestamp null,
  snapshot_json text not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table award_approvals (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  supplier_id varchar null,
  approval_status varchar not null,
  reason text null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table result_notices (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  supplier_id varchar null,
  notice_status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table external_trade_records (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  external_project_no varchar null,
  record_type varchar not null,
  record_status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table contracts (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  supplier_id varchar not null,
  contract_no varchar null,
  contract_system_ref varchar null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table performance_nodes (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  supplier_id varchar not null,
  contract_id varchar null,
  node_name varchar not null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table acceptance_payment_records (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  supplier_id varchar not null,
  contract_id varchar null,
  record_type varchar not null,
  status varchar not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table archive_templates (
  id varchar primary key,
  org_id varchar not null,
  template_code varchar not null,
  template_name varchar not null,
  version_no integer not null default 1,
  status varchar not null,
  item_config_json text not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table archive_items (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  supplier_id varchar null,
  expert_id varchar null,
  item_name varchar not null,
  required_flag boolean not null,
  collected_flag boolean not null,
  status varchar not null,
  sealed boolean not null default false,
  snapshot_json text not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table archive_seal_records (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  archive_item_id varchar null,
  sealed_by varchar not null,
  sealed_at timestamp not null,
  snapshot_json text not null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table archive_supplement_requests (
  id varchar primary key,
  org_id varchar not null,
  project_id varchar not null,
  archive_item_id varchar not null,
  reason text not null,
  approval_status varchar not null,
  audit_log_id varchar null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);

create table audit_logs (
  id varchar primary key,
  actor_id varchar not null,
  role_id varchar not null,
  org_id varchar not null,
  project_id varchar null,
  action varchar not null,
  object_type varchar not null,
  object_id varchar not null,
  result varchar not null,
  reason varchar null,
  ip varchar null,
  user_agent varchar null,
  created_at timestamp not null default current_timestamp
);

create table integration_jobs (
  id varchar primary key,
  adapter_key varchar not null,
  mode varchar not null,
  operation varchar not null,
  status varchar not null,
  request_json text null,
  response_json text null,
  created_by varchar null,
  created_at timestamp not null default current_timestamp,
  updated_by varchar null,
  updated_at timestamp not null default current_timestamp,
  deleted_at timestamp null
);
