import type { SeedState } from "../seed/data.js";
import { createCleanBusinessSeedState, createSeedState, enrichSeedState } from "../seed/data.js";
import type { BusinessTableStore } from "./business-table-store.js";
import type { RuntimeDb } from "./runtime-db.js";

const STATE_KEY = "seed_state";

export class RuntimeStateStore {
  constructor(
    private readonly runtimeDb: RuntimeDb,
    private readonly businessTableStore?: BusinessTableStore
  ) {}

  loadState(seedOnBoot: boolean, options: { cleanBusinessData?: boolean } = {}): SeedState {
    const row = this.runtimeDb.db.prepare("select payload_json from runtime_state where state_key = ?").get(STATE_KEY) as { payload_json: string } | undefined;
    if (!row) {
      const seed = this.createInitialState(options);
      if (seedOnBoot) this.saveState(seed);
      else this.businessTableStore?.syncState(seed);
      return seed;
    }
    const state = JSON.parse(row.payload_json) as SeedState;
    enrichSeedState(state, options);
    this.businessTableStore?.syncState(state);
    return state;
  }

  resetState(target: SeedState, options: { cleanBusinessData?: boolean } = {}): SeedState {
    const seed = this.createInitialState(options);
    const mutableTarget = target as unknown as Record<string, unknown>;
    for (const key of Object.keys(mutableTarget)) delete mutableTarget[key];
    Object.assign(mutableTarget, seed);
    this.clearRuntimeBusinessTables();
    this.saveState(target);
    return target;
  }

  saveState(state: SeedState) {
    const now = new Date().toISOString();
    this.runtimeDb.db
      .prepare(
        `insert into runtime_state (state_key, payload_json, updated_at)
         values (?, ?, ?)
         on conflict(state_key) do update set payload_json = excluded.payload_json, updated_at = excluded.updated_at`
      )
      .run(STATE_KEY, JSON.stringify(state), now);
    this.businessTableStore?.syncState(state);
  }

  private createInitialState(options: { cleanBusinessData?: boolean }) {
    const seed = options.cleanBusinessData ? createCleanBusinessSeedState() : createSeedState();
    enrichSeedState(seed, options);
    return seed;
  }

  private clearRuntimeBusinessTables() {
    const rows = this.runtimeDb.db
      .prepare("select name from sqlite_master where type = 'table' and (name like 'business_%' or name like 'r2_%')")
      .all() as Array<{ name: string }>;
    const tables = [
      ...rows.map((row) => row.name),
      "audit_logs",
      "stored_files",
      "integration_jobs",
      "internal_event_handler_logs",
      "internal_business_events",
      "process_audit_logs",
      "business_process_bindings",
      "process_events",
      "process_task_instances",
      "process_instances",
      "bpmn_pilot_runs"
    ];
    const uniqueTables = Array.from(new Set(tables));
    this.runtimeDb.db.exec("begin immediate transaction;");
    try {
      for (const tableName of uniqueTables) {
        if (!this.tableExists(tableName)) continue;
        this.runtimeDb.db.prepare(`delete from ${tableName}`).run();
      }
      this.runtimeDb.db.exec("commit;");
    } catch (error) {
      this.runtimeDb.db.exec("rollback;");
      throw error;
    }
  }

  private tableExists(tableName: string) {
    const row = this.runtimeDb.db.prepare("select name from sqlite_master where type = 'table' and name = ?").get(tableName);
    return Boolean(row);
  }
}
