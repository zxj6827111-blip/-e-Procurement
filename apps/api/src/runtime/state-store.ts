import type { SeedState } from "../seed/data.js";
import { createSeedState, enrichSeedState } from "../seed/data.js";
import type { BusinessTableStore } from "./business-table-store.js";
import type { RuntimeDb } from "./runtime-db.js";

const STATE_KEY = "seed_state";

export class RuntimeStateStore {
  constructor(
    private readonly runtimeDb: RuntimeDb,
    private readonly businessTableStore?: BusinessTableStore
  ) {}

  loadState(seedOnBoot: boolean): SeedState {
    const row = this.runtimeDb.db.prepare("select payload_json from runtime_state where state_key = ?").get(STATE_KEY) as { payload_json: string } | undefined;
    if (!row) {
      const seed = createSeedState();
      enrichSeedState(seed);
      if (seedOnBoot) this.saveState(seed);
      else this.businessTableStore?.syncState(seed);
      return seed;
    }
    const state = JSON.parse(row.payload_json) as SeedState;
    enrichSeedState(state);
    this.businessTableStore?.syncState(state);
    return state;
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
}
