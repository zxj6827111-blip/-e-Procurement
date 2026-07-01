import fs from "node:fs";
import path from "node:path";
import { buildIntegrationAdapterContract, integrationAdapterContractDefinitions, type IntegrationLiveStatus } from "../adapters/integration-contracts.js";
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
    integrationContractSummary: {
      total: number;
      endpointConfigured: number;
      verifiedIntegration: number;
      liveStatusCounts: Record<IntegrationLiveStatus, number>;
      productionBoundary: string;
    };
    integrationMaxAttempts: number;
    csrfStrategy: RuntimeConfig["csrfStrategy"];
    antivirusScanMode: RuntimeConfig["antivirusScanMode"];
  };
  workflow: {
    executionSource: RuntimeConfig["workflowExecutionSource"];
    processLayerMode: RuntimeConfig["processLayerMode"];
    bpmnPilotMode: RuntimeConfig["bpmnPilotMode"];
    note: string;
  };
  readiness: {
    productionReady: boolean;
    failureCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
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
  const infoCount = checks.filter((check) => check.level === "info").length;
  const configuredProviders = configuredEndpointKeys(config);
  const integrationContracts = integrationAdapterContractDefinitions.map((definition) => buildIntegrationAdapterContract(definition, configuredProviders.includes(definition.key)));
  const liveStatusCounts = {
    contract_boundary: integrationContracts.filter((contract) => contract.liveStatus === "contract_boundary").length,
    configured_endpoint_unverified: integrationContracts.filter((contract) => contract.liveStatus === "configured_endpoint_unverified").length,
    verified_integration: integrationContracts.filter((contract) => contract.liveStatus === "verified_integration").length
  };
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
      integrationContractSummary: {
        total: integrationContracts.length,
        endpointConfigured: integrationContracts.filter((contract) => contract.endpointConfigured).length,
        verifiedIntegration: integrationContracts.filter((contract) => contract.verifiedIntegration).length,
        liveStatusCounts,
        productionBoundary: "M6-B records adapter contracts and configured endpoints only; production Go still requires real customer-system evidence."
      },
      integrationMaxAttempts: config.integrationMaxAttempts,
      csrfStrategy: config.csrfStrategy,
      antivirusScanMode: config.antivirusScanMode
    },
    workflow: {
      executionSource: config.workflowExecutionSource,
      processLayerMode: config.processLayerMode,
      bpmnPilotMode: config.bpmnPilotMode,
      note: "R8 Workflow remains the primary execution source; Process Layer and BPMN are not production execution engines in M6-A."
    },
    readiness: {
      productionReady: config.appEnv === "production" && failureCount === 0 && warningCount === 0,
      failureCount,
      errorCount: failureCount,
      warningCount,
      infoCount,
      checks
    }
  };
}
