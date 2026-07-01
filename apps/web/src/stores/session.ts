import { defineStore } from "pinia";
import { apiGet, apiPost, setCurrentMockUserId } from "../api/http";

interface CurrentUserResponse {
  user: {
    id: string;
    name: string;
    roleId: string;
    orgId?: string;
    supplierId?: string;
    expertId?: string;
  };
  roleId: string;
  orgScope: string[];
  passwordChangeRequired?: boolean;
  mockAuthEnabled?: boolean;
  mode?: string;
}

interface SessionProbeResponse extends Partial<CurrentUserResponse> {
  authenticated: boolean;
  mockAuthEnabled?: boolean;
  mode?: string;
}

export const useSessionStore = defineStore("session", {
  state: () => ({
    user: null as CurrentUserResponse["user"] | null,
    roleId: "",
    orgScope: [] as string[],
    passwordChangeRequired: false,
    mockAuthEnabled: false,
    mode: ""
  }),
  actions: {
    applySession<T extends CurrentUserResponse>(data: T, options: { demo?: boolean } = {}) {
      if (options.demo) {
        sessionStorage.setItem("demoAuthActive", "true");
        sessionStorage.setItem("demoUserId", data.user.id);
        localStorage.setItem("mockUserId", data.user.id);
      } else {
        sessionStorage.removeItem("demoAuthActive");
      }
      localStorage.setItem("mockAuthEnabled", String(Boolean(data.mockAuthEnabled)));
      setCurrentMockUserId(data.user.id);
      this.user = data.user;
      this.roleId = data.roleId;
      this.orgScope = data.orgScope;
      this.passwordChangeRequired = Boolean(data.passwordChangeRequired);
      this.mockAuthEnabled = Boolean(data.mockAuthEnabled);
      this.mode = data.mode ?? "";
      return data;
    },
    async loadAuthProviders() {
      const data = await apiGet<{
        mode: string;
        mockAuthEnabled: boolean;
        localPasswordLoginEnabled: boolean;
      }>("/api/auth/providers");
      this.mockAuthEnabled = Boolean(data.mockAuthEnabled);
      this.mode = data.mode;
      localStorage.setItem("mockAuthEnabled", String(Boolean(data.mockAuthEnabled)));
      return data;
    },
    async loadMe(userId = sessionStorage.getItem("demoUserId") || localStorage.getItem("mockUserId") || undefined) {
      if (userId) setCurrentMockUserId(userId);
      const data = await apiGet<SessionProbeResponse>("/api/auth/session", userId);
      this.mockAuthEnabled = Boolean(data.mockAuthEnabled);
      this.mode = data.mode ?? "";
      localStorage.setItem("mockAuthEnabled", String(Boolean(data.mockAuthEnabled)));
      if (!data.authenticated || !data.user || !data.roleId || !data.orgScope) {
        this.user = null;
        this.roleId = "";
        this.orgScope = [];
        this.passwordChangeRequired = false;
        sessionStorage.removeItem("demoAuthActive");
        return null;
      }
      return this.applySession(data as CurrentUserResponse, { demo: sessionStorage.getItem("demoAuthActive") === "true" });
    },
    async login(username: string, password: string) {
      const data = await apiPost<CurrentUserResponse & { auditLogId?: string }>("/api/auth/login", { username, password });
      return this.applySession(data);
    },
    async demoLogin(userId: string) {
      const data = await apiPost<CurrentUserResponse & { auditLogId?: string }>("/api/auth/mock-login", { userId }, userId);
      return this.applySession(data, { demo: true });
    },
    async logout() {
      await apiPost<{ ok: true; auditLogId?: string }>("/api/auth/logout", {});
      this.user = null;
      this.roleId = "";
      this.orgScope = [];
      this.passwordChangeRequired = false;
      this.mode = "";
      sessionStorage.removeItem("demoAuthActive");
      sessionStorage.removeItem("demoUserId");
      localStorage.removeItem("mockUserId");
      setCurrentMockUserId("u2");
    }
  }
});
