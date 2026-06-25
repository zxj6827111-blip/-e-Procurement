import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { RuntimeConfig } from "./config.js";

export class RuntimeDb {
  readonly db: DatabaseSync;

  constructor(private readonly config: RuntimeConfig) {
    fs.mkdirSync(path.dirname(config.sqliteFile), { recursive: true });
    this.db = new DatabaseSync(config.sqliteFile);
    this.db.exec("pragma journal_mode = wal;");
    this.db.exec("pragma foreign_keys = on;");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      create table if not exists runtime_state (
        state_key text primary key,
        payload_json text not null,
        updated_at text not null
      );

      create table if not exists auth_accounts (
        user_id text primary key,
        username text not null unique,
        password_hash text not null,
        status text not null default 'active',
        last_login_at text null,
        created_at text not null,
        updated_at text not null
      );

      create table if not exists auth_sessions (
        session_id text primary key,
        user_id text not null,
        created_at text not null,
        expires_at text not null,
        last_seen_at text not null
      );

      create table if not exists stored_files (
        file_id text primary key,
        storage_path text not null,
        original_name text not null,
        content_type text not null,
        size_bytes integer not null,
        sha256 text not null,
        attachment_kind text not null,
        object_type text not null,
        object_id text not null,
        project_id text null,
        supplier_id text null,
        uploaded_by text not null,
        created_at text not null,
        replaced_by_file_id text null,
        version_no integer not null default 1,
        deleted_by text null,
        deleted_reason text null,
        deleted_at text null
      );

      create table if not exists audit_logs (
        id text primary key,
        actor_id text not null,
        role_id text not null,
        org_id text not null,
        project_id text null,
        action text not null,
        object_type text not null,
        object_id text not null,
        result text not null,
        reason text null,
        ip text null,
        user_agent text null,
        created_at text not null
      );

      create table if not exists integration_jobs (
        job_id text primary key,
        adapter_key text not null,
        adapter_name text not null,
        operation text not null,
        mode text not null,
        endpoint text null,
        business_type text not null default 'integration',
        business_id text not null default 'n/a',
        request_id text not null default 'n/a',
        request_payload_json text not null,
        response_payload_json text null,
        status text not null,
        attempt_count integer not null,
        idempotency_key text not null unique,
        next_retry_at text null,
        error_message text null,
        created_at text not null,
        updated_at text not null
      );

      create index if not exists idx_integration_jobs_adapter on integration_jobs(adapter_key, status);
    `);
    this.addColumnIfMissing("stored_files", "replaced_by_file_id", "text null");
    this.addColumnIfMissing("stored_files", "version_no", "integer not null default 1");
    this.addColumnIfMissing("stored_files", "deleted_by", "text null");
    this.addColumnIfMissing("stored_files", "deleted_reason", "text null");
    this.addColumnIfMissing("stored_files", "deleted_at", "text null");
    this.addColumnIfMissing("integration_jobs", "business_type", "text not null default 'integration'");
    this.addColumnIfMissing("integration_jobs", "business_id", "text not null default 'n/a'");
    this.addColumnIfMissing("integration_jobs", "request_id", "text not null default 'n/a'");
  }

  private addColumnIfMissing(tableName: string, columnName: string, definition: string) {
    const columns = this.db.prepare(`pragma table_info(${tableName})`).all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === columnName)) {
      this.db.exec(`alter table ${tableName} add column ${columnName} ${definition};`);
    }
  }
}
