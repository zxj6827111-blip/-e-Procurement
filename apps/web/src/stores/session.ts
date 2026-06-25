import { defineStore } from "pinia";
import { apiGet, apiPost, setCurrentMockUserId } from "../api/http";

interface CurrentUserResponse {
  user: {
    id: string;
    name: string;
    roleId: string;
    supplierId?: string;
    expertId?: string;
  };
  roleId: string;
  orgScope: string[];
  mockAuthEnabled?: boolean;
  mode?: string;
}

export const useSessionStore = defineStore("session", {
  state: () => ({
    user: null as CurrentUserResponse["user"] | null,
    roleId: "",
    orgScope: [] as string[],
    mockAuthEnabled: false
  }),
  actions: {
    async loadMe(userId = localStorage.getItem("mockUserId") || "u2") {
      try {
        setCurrentMockUserId(userId);
        const data = await apiGet<CurrentUserResponse>("/api/me", userId);
        localStorage.setItem("mockUserId", data.user.id);
        localStorage.setItem("mockAuthEnabled", String(Boolean(data.mockAuthEnabled)));
        setCurrentMockUserId(data.user.id);
        this.user = data.user;
        this.roleId = data.roleId;
        this.orgScope = data.orgScope;
        this.mockAuthEnabled = Boolean(data.mockAuthEnabled);
        return data;
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 401) {
          this.user = null;
          this.roleId = "";
          this.orgScope = [];
          this.mockAuthEnabled = localStorage.getItem("mockAuthEnabled") === "true";
          return null;
        }
        throw error;
      }
    },
    async login(username: string, password: string) {
      const data = await apiPost<CurrentUserResponse & { auditLogId?: string }>("/api/auth/login", { username, password });
      localStorage.setItem("mockUserId", data.user.id);
      localStorage.setItem("mockAuthEnabled", String(Boolean(data.mockAuthEnabled)));
      setCurrentMockUserId(data.user.id);
      this.user = data.user;
      this.roleId = data.roleId;
      this.orgScope = data.orgScope;
      this.mockAuthEnabled = Boolean(data.mockAuthEnabled);
      return data;
    },
    async logout() {
      await apiPost<{ ok: true; auditLogId?: string }>("/api/auth/logout", {});
      this.user = null;
      this.roleId = "";
      this.orgScope = [];
    }
  }
});
