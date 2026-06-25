import crypto from "node:crypto";
import type { RuntimeConfig } from "../runtime/index.js";
import type { SeedState } from "../seed/data.js";
import type { RoleId, User } from "../types.js";

export interface SsoIdentityInput {
  token: string;
  providerUserId?: string;
  displayName?: string;
  roleCode?: string;
  orgCode?: string;
  hotelCodes?: string[];
  supplierId?: string;
}

export interface SsoIdentityResult {
  mode: "mock" | "test" | "http";
  provider: "sso";
  subject: string;
  user: User;
  mappedRoleId: RoleId;
  mappedOrgScope: string[];
  sessionUserId: string;
  warnings: string[];
}

export interface SsoAdapter {
  readonly mode: "mock" | "test" | "http";
  mapIdentity(input: SsoIdentityInput): SsoIdentityResult;
  contract(): SsoAdapterContract;
}

export interface SsoAdapterContract {
  provider: "sso";
  supportedModes: Array<"mock" | "test" | "http">;
  requiredClaims: string[];
  optionalClaims: string[];
  roleMapping: Record<string, RoleId>;
  orgMapping: string;
  failureCodes: string[];
}

const roleMapping: Record<string, RoleId> = {
  group_manager: "group_manager",
  groupmanager: "group_manager",
  buyer: "buyer",
  purchaser: "buyer",
  supplier: "supplier",
  vendor: "supplier",
  expert: "expert",
  auditor: "auditor",
  audit: "auditor",
  admin: "admin",
  system_admin: "admin"
};

export class MockSsoAdapter implements SsoAdapter {
  readonly mode: "mock" | "test" | "http";

  constructor(
    private readonly state: SeedState,
    private readonly config: RuntimeConfig
  ) {
    this.mode = config.appEnv === "production" ? "http" : config.appEnv === "test" ? "test" : "mock";
  }

  mapIdentity(input: SsoIdentityInput): SsoIdentityResult {
    if (this.config.appEnv === "production" && this.mode !== "http") {
      throw new Error("Mock SSO adapter cannot authenticate production users.");
    }
    const tokenSubject = parseTokenSubject(input.token);
    const requestedUserId = input.providerUserId || tokenSubject;
    const seededUser = this.state.users.find((user) => user.id === requestedUserId || user.name === input.displayName);
    const mappedRoleId = mapRole(input.roleCode, seededUser?.roleId);
    const orgScope = mapOrgScope(this.state, input.orgCode, input.hotelCodes, seededUser);
    const user: User =
      seededUser ??
      ({
        id: `sso-${stableId(input.providerUserId || tokenSubject || input.displayName || "unknown")}`,
        name: input.displayName || input.providerUserId || tokenSubject || "SSO 用户",
        roleId: mappedRoleId,
        orgId: orgScope[0] ?? "org-group",
        orgScope,
        supplierId: input.supplierId
      } satisfies User);
    return {
      mode: this.mode,
      provider: "sso",
      subject: input.providerUserId || tokenSubject || user.id,
      user: { ...user, roleId: mappedRoleId, orgScope },
      mappedRoleId,
      mappedOrgScope: orgScope,
      sessionUserId: seededUser?.id ?? user.id,
      warnings: seededUser ? [] : ["SSO user is mapped through adapter contract only and is not persisted as a local account."]
    };
  }

  contract(): SsoAdapterContract {
    return {
      provider: "sso",
      supportedModes: ["mock", "test", "http"],
      requiredClaims: ["subject/providerUserId", "displayName", "roleCode", "orgCode"],
      optionalClaims: ["hotelCodes", "supplierId", "departmentId", "position"],
      roleMapping,
      orgMapping: "orgCode and hotelCodes must map to local organization ids or approved external organization codes.",
      failureCodes: ["SSO_TOKEN_INVALID", "SSO_ROLE_UNMAPPED", "SSO_ORG_UNMAPPED", "SSO_ADAPTER_UNAVAILABLE"]
    };
  }
}

export function createSsoAdapter(state: SeedState, config: RuntimeConfig): SsoAdapter {
  return new MockSsoAdapter(state, config);
}

function parseTokenSubject(token: string) {
  if (!token.trim()) throw new Error("SSO token is required.");
  const mockPrefix = "mock-sso:";
  const testPrefix = "test-sso:";
  if (token.startsWith(mockPrefix)) return token.slice(mockPrefix.length);
  if (token.startsWith(testPrefix)) return token.slice(testPrefix.length);
  return token.includes(".") ? "external-subject" : token;
}

function mapRole(roleCode: string | undefined, fallback?: string): RoleId {
  const normalized = String(roleCode || fallback || "buyer")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const mapped = roleMapping[normalized];
  if (!mapped) throw new Error(`SSO role is not mapped: ${normalized}`);
  return mapped;
}

function mapOrgScope(state: SeedState, orgCode?: string, hotelCodes: string[] = [], seededUser?: User) {
  const candidates = [orgCode, ...hotelCodes].filter(Boolean) as string[];
  const mapped = candidates
    .map((code) => state.organizations.find((org) => org.id === code || org.name === code)?.id ?? code)
    .filter(Boolean);
  if (mapped.length > 0) return Array.from(new Set(mapped));
  return seededUser?.orgScope ?? [seededUser?.orgId ?? "org-group"];
}

function stableId(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}
