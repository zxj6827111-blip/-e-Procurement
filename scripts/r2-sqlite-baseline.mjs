import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.resolve(process.env.APP_DATA_DIR ?? path.join(workspaceRoot, ".data"));
const appContextPath = path.join(workspaceRoot, "apps", "api", "dist", "src", "app-context.js");

if (!fs.existsSync(appContextPath)) {
  console.error("apps/api/dist/src/app-context.js not found. Run `npm.cmd run build` before this script.");
  process.exit(1);
}

fs.mkdirSync(dataRoot, { recursive: true });

const { createAppContext } = await import(pathToFileURL(appContextPath).href);
const ctx = createAppContext({
  runtime: {
    appEnv: process.env.APP_ENV ?? "uat",
    dataRoot,
    mockAuthEnabled: process.env.MOCK_AUTH_ENABLED === "false" ? false : true
  }
});

ctx.stateStore.saveState(ctx.state);

const count = (tableName) => ctx.runtimeDb.db.prepare(`select count(*) as count from ${tableName}`).get().count;
const migration = ctx.runtimeDb.db.prepare("select id, status, executed_at from r2_migration_runs where id = ?").get("r2-baseline-v1");

console.log(
  JSON.stringify(
    {
      dataRoot,
      migration,
      counts: {
        r2Registry: count("r2_business_object_registry"),
        r2ProcurementRequests: count("r2_procurement_requests"),
        r2Suppliers: count("r2_suppliers"),
        r2Products: count("r2_products"),
        r2Orders: count("r2_purchase_orders"),
        r2SettlementMaterials: count("r2_settlement_materials"),
        auditLogs: count("audit_logs")
      }
    },
    null,
    2
  )
);
