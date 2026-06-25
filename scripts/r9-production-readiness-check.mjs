import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const projectRoot = process.cwd();
const appEnv = process.env.APP_ENV || "local";
const dataRoot = path.resolve(process.env.APP_DATA_DIR || ".data");
const sqliteFile = path.resolve(process.env.SQLITE_FILE || path.join(dataRoot, "runtime.sqlite"));
const backupRoot = path.resolve(process.env.BACKUP_DIR || path.join(projectRoot, "output", "r9-backups"));
const shouldBackup = process.argv.includes("--backup");

const result = {
  appEnv,
  sqliteFileExists: fs.existsSync(sqliteFile),
  backupFile: null,
  sqliteIntegrity: "not_checked",
  walFilesPresent: {
    wal: fs.existsSync(`${sqliteFile}-wal`),
    shm: fs.existsSync(`${sqliteFile}-shm`)
  },
  tables: {},
  orphanStoredFiles: 0,
  warnings: []
};

fs.mkdirSync(backupRoot, { recursive: true });

if (!result.sqliteFileExists) {
  result.warnings.push("SQLite runtime database was not found. Run the app or migration baseline before backup validation.");
  printAndExit(result);
}

if (shouldBackup) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupRoot, `runtime-${stamp}.sqlite`);
  fs.copyFileSync(sqliteFile, backupFile);
  result.backupFile = backupFile;
}

const db = new DatabaseSync(sqliteFile, { readOnly: true });
try {
  const integrity = db.prepare("pragma integrity_check").get();
  result.sqliteIntegrity = String(integrity.integrity_check ?? Object.values(integrity)[0] ?? "unknown");
  if (result.sqliteIntegrity !== "ok") result.warnings.push(`SQLite integrity_check returned ${result.sqliteIntegrity}.`);

  const tableRows = db.prepare("select name from sqlite_master where type = 'table' order by name").all();
  const tableNames = tableRows.map((row) => row.name);
  for (const tableName of tableNames.filter((name) => name.startsWith("r2_") || ["stored_files", "integration_jobs", "audit_logs"].includes(name))) {
    const count = db.prepare(`select count(*) as count from ${tableName}`).get().count;
    result.tables[tableName] = count;
  }

  if (tableNames.includes("stored_files")) {
    const rows = db.prepare("select storage_path from stored_files where deleted_at is null").all();
    result.orphanStoredFiles = rows.filter((row) => !fs.existsSync(path.join(dataRoot, "files", row.storage_path))).length;
    if (result.orphanStoredFiles > 0) result.warnings.push(`${result.orphanStoredFiles} stored file metadata rows do not have matching local files.`);
  }

  if (!tableNames.includes("integration_jobs")) result.warnings.push("integration_jobs table is missing.");
  if (result.walFilesPresent.wal || result.walFilesPresent.shm) {
    result.warnings.push("SQLite WAL/SHM companion files are present; production backup should copy them consistently or use a database backup API.");
  }
  if (appEnv === "production" && (process.env.DISABLE_MOCK_AUTH !== "true" || process.env.ALLOW_LOCAL_PASSWORD_LOGIN !== "false")) {
    result.warnings.push("Production environment must disable mock auth and local password login.");
  }
} finally {
  db.close();
}

printAndExit(result);

function printAndExit(payload) {
  console.log(JSON.stringify(payload, null, 2));
  if (payload.warnings.length > 0 && process.argv.includes("--strict")) process.exitCode = 1;
}
