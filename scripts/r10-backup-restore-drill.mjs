import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const projectRoot = process.cwd();
const dataRoot = path.resolve(process.env.APP_DATA_DIR || path.join(projectRoot, "output", "stage5-uat-data"));
const sqliteFile = path.resolve(process.env.SQLITE_FILE || path.join(dataRoot, "runtime.sqlite"));
const filesRoot = path.resolve(process.env.FILES_ROOT || path.join(dataRoot, "files"));
const drillRoot = path.resolve(process.env.R10_DRILL_DIR || path.join(projectRoot, "output", "r10-backup-restore"));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(drillRoot, `backup-${stamp}`);
const restoreRoot = path.join(drillRoot, `restore-${stamp}`);
const backupDb = path.join(backupRoot, "runtime.sqlite");
const restoreDb = path.join(restoreRoot, "runtime.sqlite");
const backupFiles = path.join(backupRoot, "files");
const restoreFiles = path.join(restoreRoot, "files");

const result = {
  generatedAt: new Date().toISOString(),
  source: {
    dataRoot,
    sqliteFile,
    filesRoot
  },
  backup: {
    backupRoot,
    sqliteFile: backupDb,
    filesRoot: backupFiles,
    copiedCompanionFiles: []
  },
  restore: {
    restoreRoot,
    sqliteFile: restoreDb,
    filesRoot: restoreFiles
  },
  checks: {
    sourceSqliteExists: fs.existsSync(sqliteFile),
    sourceFilesRootExists: fs.existsSync(filesRoot),
    sqliteIntegrity: "not_checked",
    sourceCounts: {},
    restoredCounts: {},
    restoredFileCount: 0,
    missingRestoredStoredFiles: 0,
    countMatch: false
  },
  warnings: []
};

if (!result.checks.sourceSqliteExists) {
  result.warnings.push("Source SQLite database does not exist; run the app or seed a UAT data directory before R10 backup drill.");
  printAndExit(result, 1);
}

fs.mkdirSync(backupRoot, { recursive: true });
fs.mkdirSync(restoreRoot, { recursive: true });

copyFile(sqliteFile, backupDb);
for (const suffix of ["-wal", "-shm"]) {
  const companion = `${sqliteFile}${suffix}`;
  if (fs.existsSync(companion)) {
    const target = `${backupDb}${suffix}`;
    copyFile(companion, target);
    result.backup.copiedCompanionFiles.push(path.basename(target));
  }
}
if (result.backup.copiedCompanionFiles.length > 0) {
  result.warnings.push("SQLite WAL/SHM files were present and copied for this local drill; formal production backup should use a database-native consistent snapshot while the app is stopped or quiesced.");
}

if (fs.existsSync(filesRoot)) {
  copyDirectory(filesRoot, backupFiles);
} else {
  result.warnings.push("Source files directory does not exist; file attachment restore could not be exercised.");
}

copyFile(backupDb, restoreDb);
for (const suffix of ["-wal", "-shm"]) {
  const companion = `${backupDb}${suffix}`;
  if (fs.existsSync(companion)) copyFile(companion, `${restoreDb}${suffix}`);
}
if (fs.existsSync(backupFiles)) copyDirectory(backupFiles, restoreFiles);

const keyTables = [
  "r2_suppliers",
  "r2_products",
  "r2_procurement_requests",
  "r2_sourcing_projects",
  "r2_purchase_orders",
  "r2_settlement_bills",
  "r2_invoices",
  "r2_task_items",
  "r2_notifications",
  "stored_files",
  "audit_logs",
  "integration_jobs"
];

const source = inspectDatabase(sqliteFile);
const restored = inspectDatabase(restoreDb);
result.checks.sourceCounts = source.counts;
result.checks.sqliteIntegrity = restored.integrity;
result.checks.restoredCounts = restored.counts;
result.checks.restoredFileCount = fs.existsSync(restoreFiles) ? countFiles(restoreFiles) : 0;
result.checks.missingRestoredStoredFiles = countMissingStoredFiles(restoreDb, restoreFiles);
result.checks.countMatch = JSON.stringify(result.checks.sourceCounts) === JSON.stringify(result.checks.restoredCounts);

if (result.checks.sqliteIntegrity !== "ok") result.warnings.push(`Restored SQLite integrity_check returned ${result.checks.sqliteIntegrity}.`);
if (!result.checks.countMatch) result.warnings.push("Restored table counts do not match source table counts.");
if (result.checks.missingRestoredStoredFiles > 0) result.warnings.push(`${result.checks.missingRestoredStoredFiles} stored file metadata rows do not have matching restored files.`);
result.warnings.push("This is a local/UAT SQLite restore drill. Formal production database restore and object storage restore still require customer-provided infrastructure.");

const evidenceFile = path.join(drillRoot, "r10-backup-restore-drill-latest.json");
fs.mkdirSync(drillRoot, { recursive: true });
fs.writeFileSync(evidenceFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
result.evidenceFile = evidenceFile;

printAndExit(result, result.checks.sqliteIntegrity === "ok" && result.checks.countMatch ? 0 : 1);

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else if (entry.isFile()) copyFile(from, to);
  }
}

function inspectDatabase(dbFile) {
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    const integrityRow = db.prepare("pragma integrity_check").get();
    const integrity = String(integrityRow.integrity_check ?? Object.values(integrityRow)[0] ?? "unknown");
    const tables = new Set(db.prepare("select name from sqlite_master where type = 'table'").all().map((row) => row.name));
    const counts = {};
    for (const table of keyTables) {
      counts[table] = tables.has(table) ? Number(db.prepare(`select count(*) as count from ${table}`).get().count) : null;
    }
    return { integrity, counts };
  } finally {
    db.close();
  }
}

function countFiles(root) {
  let total = 0;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const item = path.join(root, entry.name);
    if (entry.isDirectory()) total += countFiles(item);
    else if (entry.isFile()) total += 1;
  }
  return total;
}

function countMissingStoredFiles(dbFile, restoredFilesRoot) {
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    const tables = new Set(db.prepare("select name from sqlite_master where type = 'table'").all().map((row) => row.name));
    if (!tables.has("stored_files")) return 0;
    const rows = db.prepare("select storage_path from stored_files where deleted_at is null").all();
    return rows.filter((row) => !fs.existsSync(path.join(restoredFilesRoot, row.storage_path))).length;
  } finally {
    db.close();
  }
}

function printAndExit(payload, exitCode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exitCode = exitCode;
}
