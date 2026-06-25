import os from "node:os";
import path from "node:path";

export type AppEnv = "local" | "test" | "production";
export type DatabaseDriver = "sqlite" | "postgres" | "mysql";
export type FileStorageMode = "local" | "mock" | "object";

export interface RuntimeConfigOverrides {
  appEnv?: string;
  dataRoot?: string;
  databaseDriver?: DatabaseDriver;
  databaseUrl?: string;
  sqliteFile?: string;
  filesRoot?: string;
  logsRoot?: string;
  seedOnBoot?: boolean;
  mockAuthEnabled?: boolean;
  sessionCookieName?: string;
  sessionTtlMs?: number;
  sessionSecret?: string;
  cookieSecure?: boolean;
  cookieSameSite?: "lax" | "strict" | "none";
  corsAllowedOrigins?: string[];
  fileUploadMaxBytes?: number;
  allowedUploadContentTypes?: string[];
  identityProviderMode?: "local" | "oidc" | "saml" | "adapter";
  identityProviderIssuer?: string;
  identityProviderLoginUrl?: string;
  allowLocalPasswordLogin?: boolean;
  integrationEndpoints?: Record<string, string>;
  integrationRequestTimeoutMs?: number;
  integrationMaxAttempts?: number;
  requiredIntegrationProviders?: string[];
  fileStorageMode?: FileStorageMode;
  objectStorageEndpoint?: string;
  objectStorageBucket?: string;
  objectStorageRegion?: string;
  objectStorageAccessKeyId?: string;
  objectStorageSecretAccessKey?: string;
  antivirusScanMode?: "disabled" | "mock" | "adapter";
  csrfStrategy?: "same-site-cookie" | "double-submit" | "reverse-proxy";
  buildVersion?: string;
}

function inferAppEnv(override?: string): AppEnv {
  const raw = override?.trim() || process.env.APP_ENV?.trim() || process.env.NODE_ENV?.trim() || (process.env.VITEST ? "test" : "local");
  if (raw === "production") return "production";
  if (raw === "test") return "test";
  return "local";
}

function resolveDataRoot(appEnv: AppEnv, override?: string) {
  const configured = override?.trim() || process.env.APP_DATA_DIR?.trim();
  if (configured) return path.resolve(configured);
  if (appEnv === "test") {
    return path.join(os.tmpdir(), "e-procurement-test", `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }
  return path.resolve(process.cwd(), ".data");
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseOrigins(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export interface RuntimeConfig {
  appEnv: AppEnv;
  dataRoot: string;
  databaseDriver: DatabaseDriver;
  databaseUrl: string | null;
  sqliteFile: string;
  filesRoot: string;
  logsRoot: string;
  seedOnBoot: boolean;
  mockAuthEnabled: boolean;
  sessionCookieName: string;
  sessionTtlMs: number;
  sessionSecret: string;
  cookieSecure: boolean;
  cookieSameSite: "lax" | "strict" | "none";
  corsAllowedOrigins: string[];
  fileUploadMaxBytes: number;
  allowedUploadContentTypes: string[];
  identityProviderMode: "local" | "oidc" | "saml" | "adapter";
  identityProviderIssuer: string | null;
  identityProviderLoginUrl: string | null;
  allowLocalPasswordLogin: boolean;
  integrationEndpoints: Record<string, string>;
  integrationRequestTimeoutMs: number;
  integrationMaxAttempts: number;
  requiredIntegrationProviders: string[];
  fileStorageMode: FileStorageMode;
  objectStorageEndpoint: string | null;
  objectStorageBucket: string | null;
  objectStorageRegion: string | null;
  objectStorageAccessKeyId: string | null;
  objectStorageSecretAccessKey: string | null;
  antivirusScanMode: "disabled" | "mock" | "adapter";
  csrfStrategy: "same-site-cookie" | "double-submit" | "reverse-proxy";
  buildVersion: string;
}

export function getRuntimeConfig(overrides: RuntimeConfigOverrides = {}): RuntimeConfig {
  const appEnv = inferAppEnv(overrides.appEnv);
  const dataRoot = resolveDataRoot(appEnv, overrides.dataRoot);
  const cookieSecure = overrides.cookieSecure ?? parseBoolean(process.env.SESSION_COOKIE_SECURE, appEnv === "production");
  const cookieSameSite = overrides.cookieSameSite ?? ((process.env.SESSION_COOKIE_SAMESITE?.trim().toLowerCase() as "lax" | "strict" | "none" | undefined) ?? "lax");
  const corsAllowedOrigins = overrides.corsAllowedOrigins ?? parseOrigins(process.env.CORS_ALLOWED_ORIGINS);
  const allowedUploadContentTypes =
    overrides.allowedUploadContentTypes ??
    parseCsv(process.env.FILE_ALLOWED_CONTENT_TYPES).concat([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.ms-excel",
      "text/plain"
    ]);
  return {
    appEnv,
    dataRoot,
    databaseDriver:
      overrides.databaseDriver ??
      ((process.env.DATABASE_DRIVER?.trim().toLowerCase() as DatabaseDriver | undefined) ?? "sqlite"),
    databaseUrl: overrides.databaseUrl ?? process.env.DATABASE_URL?.trim() ?? null,
    sqliteFile: overrides.sqliteFile ? path.resolve(overrides.sqliteFile) : path.join(dataRoot, "runtime.sqlite"),
    filesRoot: overrides.filesRoot ? path.resolve(overrides.filesRoot) : path.join(dataRoot, "files"),
    logsRoot: overrides.logsRoot ? path.resolve(overrides.logsRoot) : path.join(dataRoot, "logs"),
    seedOnBoot: overrides.seedOnBoot ?? (process.env.APP_SEED_ON_BOOT === "false" ? false : true),
    mockAuthEnabled: overrides.mockAuthEnabled ?? (["local", "test"].includes(appEnv) && process.env.DISABLE_MOCK_AUTH !== "true"),
    sessionCookieName: overrides.sessionCookieName ?? process.env.SESSION_COOKIE_NAME?.trim() ?? "eproc_session",
    sessionTtlMs: overrides.sessionTtlMs ?? Number(process.env.SESSION_TTL_MS ?? 1000 * 60 * 60 * 12),
    sessionSecret: overrides.sessionSecret ?? process.env.SESSION_SECRET?.trim() ?? `dev-only-${appEnv}-session-secret`,
    cookieSecure,
    cookieSameSite,
    corsAllowedOrigins,
    fileUploadMaxBytes: overrides.fileUploadMaxBytes ?? Number(process.env.FILE_UPLOAD_MAX_BYTES ?? 25 * 1024 * 1024),
    allowedUploadContentTypes: Array.from(new Set(allowedUploadContentTypes)),
    identityProviderMode:
      overrides.identityProviderMode ??
      ((process.env.IDENTITY_PROVIDER_MODE?.trim().toLowerCase() as "local" | "oidc" | "saml" | "adapter" | undefined) ?? (appEnv === "production" ? "adapter" : "local")),
    identityProviderIssuer: overrides.identityProviderIssuer ?? process.env.IDENTITY_PROVIDER_ISSUER?.trim() ?? null,
    identityProviderLoginUrl: overrides.identityProviderLoginUrl ?? process.env.IDENTITY_PROVIDER_LOGIN_URL?.trim() ?? null,
    allowLocalPasswordLogin: overrides.allowLocalPasswordLogin ?? parseBoolean(process.env.ALLOW_LOCAL_PASSWORD_LOGIN, appEnv !== "production"),
    integrationEndpoints: overrides.integrationEndpoints ?? parseIntegrationEndpoints(process.env.INTEGRATION_ENDPOINTS),
    integrationRequestTimeoutMs: overrides.integrationRequestTimeoutMs ?? Number(process.env.INTEGRATION_REQUEST_TIMEOUT_MS ?? 5000),
    integrationMaxAttempts: overrides.integrationMaxAttempts ?? Number(process.env.INTEGRATION_MAX_ATTEMPTS ?? 3),
    requiredIntegrationProviders: overrides.requiredIntegrationProviders ?? parseCsv(process.env.REQUIRED_INTEGRATION_PROVIDERS),
    fileStorageMode: overrides.fileStorageMode ?? ((process.env.FILE_STORAGE_MODE?.trim().toLowerCase() as FileStorageMode | undefined) ?? "local"),
    objectStorageEndpoint: overrides.objectStorageEndpoint ?? process.env.OBJECT_STORAGE_ENDPOINT?.trim() ?? null,
    objectStorageBucket: overrides.objectStorageBucket ?? process.env.OBJECT_STORAGE_BUCKET?.trim() ?? null,
    objectStorageRegion: overrides.objectStorageRegion ?? process.env.OBJECT_STORAGE_REGION?.trim() ?? null,
    objectStorageAccessKeyId: overrides.objectStorageAccessKeyId ?? process.env.OBJECT_STORAGE_ACCESS_KEY_ID?.trim() ?? null,
    objectStorageSecretAccessKey: overrides.objectStorageSecretAccessKey ?? process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY?.trim() ?? null,
    antivirusScanMode:
      overrides.antivirusScanMode ??
      ((process.env.ANTIVIRUS_SCAN_MODE?.trim().toLowerCase() as "disabled" | "mock" | "adapter" | undefined) ?? "disabled"),
    csrfStrategy:
      overrides.csrfStrategy ??
      ((process.env.CSRF_STRATEGY?.trim().toLowerCase() as "same-site-cookie" | "double-submit" | "reverse-proxy" | undefined) ?? "same-site-cookie"),
    buildVersion: overrides.buildVersion ?? process.env.BUILD_VERSION?.trim() ?? "local-build"
  };
}

function parseIntegrationEndpoints(value: string | undefined) {
  const result: Record<string, string> = {};
  for (const pair of (value ?? "").split(",")) {
    const [key, ...rest] = pair.split("=");
    const endpoint = rest.join("=").trim();
    if (key?.trim() && endpoint) result[key.trim()] = endpoint;
  }
  return result;
}

export interface RuntimeReadinessCheck {
  key: string;
  level: "pass" | "warning" | "failure";
  message: string;
}

export function validateRuntimeConfig(config: RuntimeConfig): RuntimeReadinessCheck[] {
  const checks: RuntimeReadinessCheck[] = [];
  const add = (key: string, level: RuntimeReadinessCheck["level"], message: string) => checks.push({ key, level, message });

  if (config.appEnv !== "production") {
    add("app_env", "warning", "Current environment is not production; this is suitable only for local, test or UAT use.");
  } else {
    add("app_env", "pass", "APP_ENV=production.");
  }

  if (config.appEnv === "production" && config.mockAuthEnabled) {
    add("mock_auth", "failure", "Mock authentication must be disabled in production.");
  } else {
    add("mock_auth", "pass", "Mock authentication is disabled for production or only enabled outside production.");
  }

  if (config.appEnv === "production" && config.allowLocalPasswordLogin) {
    add("local_password_login", "failure", "Local weak password accounts must be disabled in production.");
  } else {
    add("local_password_login", "pass", "Local password login is disabled for production or only enabled outside production.");
  }

  if (config.appEnv === "production" && config.identityProviderMode === "local") {
    add("identity_provider", "failure", "Production requires SSO/OIDC/SAML/adapter identity mode.");
  } else if (config.appEnv === "production" && ["oidc", "saml"].includes(config.identityProviderMode) && (!config.identityProviderIssuer || !config.identityProviderLoginUrl)) {
    add("identity_provider", "failure", "Production OIDC/SAML mode requires issuer and login URL.");
  } else if (config.appEnv === "production" && config.identityProviderMode === "adapter") {
    add(
      "identity_provider",
      "warning",
      configuredEndpointKeys(config).includes("sso")
        ? "Production SSO adapter endpoint is configured, but this build only provides the contract boundary; customer SSO token verification must be implemented in R10."
        : "Production SSO adapter is selected but no SSO integration endpoint is configured yet."
    );
  } else {
    add("identity_provider", "pass", "Identity provider boundary is configured for the current environment.");
  }

  if (config.appEnv === "production" && !config.cookieSecure) {
    add("cookie_secure", "failure", "Session cookies must use Secure in production.");
  } else {
    add("cookie_secure", "pass", "Session cookie Secure policy is acceptable for this environment.");
  }

  if (config.appEnv === "production" && config.cookieSameSite === "none" && !config.cookieSecure) {
    add("cookie_samesite", "failure", "SameSite=None requires Secure cookies.");
  } else {
    add("cookie_samesite", "pass", "Session cookie SameSite policy is configured.");
  }

  if (config.appEnv === "production" && config.corsAllowedOrigins.length === 0) {
    add("cors", "failure", "Production requires an explicit CORS_ALLOWED_ORIGINS whitelist.");
  } else {
    add("cors", "pass", "CORS policy is explicit or running outside production.");
  }

  if (config.appEnv === "production" && (config.sessionSecret.startsWith("dev-only-") || config.sessionSecret === "change-this-before-shared-uat")) {
    add("session_secret", "failure", "SESSION_SECRET must be replaced before production use.");
  } else {
    add("session_secret", "pass", "Session secret is not using the default local placeholder.");
  }

  if (config.databaseDriver === "sqlite") {
    add(
      "database",
      config.appEnv === "production" ? "warning" : "pass",
      "SQLite is configured; it remains a local/UAT transitional persistence option and must be replaced or formally accepted before production."
    );
  } else if (!config.databaseUrl) {
    add("database", "failure", "DATABASE_URL is required when DATABASE_DRIVER is postgres or mysql.");
  } else {
    add("database", "pass", `${config.databaseDriver} database URL is configured.`);
  }

  if (config.appEnv === "production" && config.fileStorageMode === "local") {
    add("file_storage", "warning", "Local file storage is configured; production should use object storage or an approved shared file service.");
  } else if (config.fileStorageMode === "object" && (!config.objectStorageEndpoint || !config.objectStorageBucket)) {
    add("file_storage", "failure", "Object storage mode requires OBJECT_STORAGE_ENDPOINT and OBJECT_STORAGE_BUCKET.");
  } else if (config.appEnv === "production" && config.fileStorageMode === "object") {
    add("file_storage", "warning", "Object storage contract is configured, but this build keeps local write-through until a real object storage adapter is connected in R10.");
  } else {
    add("file_storage", "pass", `File storage mode is ${config.fileStorageMode}.`);
  }

  for (const provider of config.requiredIntegrationProviders) {
    if (!configuredEndpointKeys(config).includes(provider)) {
      add(`integration_${provider}`, config.appEnv === "production" ? "failure" : "warning", `Required integration provider ${provider} is not configured.`);
    }
  }

  if (config.appEnv === "production" && config.antivirusScanMode === "disabled") {
    add("antivirus_scan", "warning", "Antivirus scanning is not connected; only the adapter boundary is available.");
  } else {
    add("antivirus_scan", "pass", `Antivirus scan mode is ${config.antivirusScanMode}.`);
  }

  return checks;
}

export function configuredEndpointKeys(config: RuntimeConfig) {
  const keys = new Set(Object.keys(config.integrationEndpoints));
  const envKeyMap: Record<string, string> = {
    sso: "SSO",
    oa: "OA",
    organizationUserSync: "ORG_USER",
    masterData: "MASTER_DATA",
    erp: "ERP",
    wms: "WMS",
    contractSystem: "CONTRACT",
    finance: "FINANCE",
    fileService: "FILE_SERVICE",
    messageNotification: "MESSAGE",
    auditExport: "AUDIT_EXPORT",
    eSignature: "E_SIGNATURE",
    ca: "CA",
    eInvoice: "E_INVOICE"
  };
  for (const [key, envKey] of Object.entries(envKeyMap)) {
    if (process.env[`INTEGRATION_${envKey}_ENDPOINT`]?.trim()) keys.add(key);
  }
  return Array.from(keys);
}
