import fs from "node:fs";
import path from "node:path";
import { configuredEndpointKeys, validateRuntimeConfig, type RuntimeConfig } from "./config.js";
import { createFileStorageBackend } from "./file-store.js";

export interface HealthStatus {
  status: "ok";
  service: "e-procurement-api";
  mode: RuntimeConfig["appEnv"];
  mockAuthEnabled: boolean;
  persistence: {
    driver: RuntimeConfig["databaseDriver"];
    ready: boolean;
    note: string;
  };
  fileStorage: {
    ready: boolean;
    mode: RuntimeConfig["fileStorageMode"];
    finalStorage: boolean;
    note: string;
  };
  operations: {
    logsReady: boolean;
    buildVersion: string;
    cookieSecure: boolean;
    corsConfigured: boolean;
    integrationConfiguredCount: number;
    integrationConfiguredProviders: string[];
    integrationMaxAttempts: number;
    csrfStrategy: RuntimeConfig["csrfStrategy"];
    antivirusScanMode: RuntimeConfig["antivirusScanMode"];
  };
  readiness: {
    productionReady: boolean;
    failureCount: number;
    warningCount: number;
    checks: ReturnType<typeof validateRuntimeConfig>;
  };
}

function ensurePathReady(targetPath: string, kind: "file" | "directory") {
  try {
    if (kind === "directory") {
      fs.mkdirSync(targetPath, { recursive: true });
      return true;
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.accessSync(path.dirname(targetPath), fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function buildHealthStatus(config: RuntimeConfig): HealthStatus {
  const persistenceReady = ensurePathReady(config.sqliteFile, "file");
  const fileStorageStatus = createFileStorageBackend(config.filesRoot, config).describe();
  const logsReady = ensurePathReady(config.logsRoot, "directory");
  const checks = validateRuntimeConfig(config);
  const failureCount = checks.filter((check) => check.level === "failure").length;
  const warningCount = checks.filter((check) => check.level === "warning").length;
  const configuredProviders = configuredEndpointKeys(config);
  return {
    status: "ok",
    service: "e-procurement-api",
    mode: config.appEnv,
    mockAuthEnabled: config.mockAuthEnabled,
    persistence: {
      driver: config.databaseDriver,
      ready: config.databaseDriver === "sqlite" ? persistenceReady : Boolean(config.databaseUrl),
      note:
        config.databaseDriver === "sqlite"
          ? "SQLite is only the local or small-scale UAT transitional persistence option."
          : "Formal database driver is configured; migration validation must be completed before production cutover."
    },
    fileStorage: {
      ready: fileStorageStatus.ready,
      mode: fileStorageStatus.mode,
      finalStorage: fileStorageStatus.finalStorage,
      note: fileStorageStatus.note
    },
    operations: {
      logsReady,
      buildVersion: config.buildVersion,
      cookieSecure: config.cookieSecure,
      corsConfigured: config.corsAllowedOrigins.length > 0,
      integrationConfiguredCount: configuredProviders.length,
      integrationConfiguredProviders: configuredProviders,
      integrationMaxAttempts: config.integrationMaxAttempts,
      csrfStrategy: config.csrfStrategy,
      antivirusScanMode: config.antivirusScanMode
    },
    readiness: {
      productionReady: config.appEnv === "production" && failureCount === 0 && warningCount === 0,
      failureCount,
      warningCount,
      checks
    }
  };
}
