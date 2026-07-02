import { Router } from "express";
import type { AppContext } from "../app-context.js";
import { buildAuthContext, clearSessionCookie, createSessionCookie } from "../auth.js";

const roleLabels: Record<string, string> = {
  group_manager: "集团采购管理人员",
  buyer: "采购经办人",
  hotel_buyer: "酒店采购",
  hotel_finance: "酒店财务",
  platform_operator: "平台运营",
  supplier: "供应商",
  supplier_admin: "供应商管理员",
  supplier_quotation: "供应商报价人员",
  expert: "专家",
  finance_reviewer: "财务审核",
  auditor: "纪检 / 审计",
  admin: "系统管理员"
};

function currentAccount(ctx: AppContext, userId: string) {
  return ctx.authStore.getAccountsByUserIds([userId])[0] ?? null;
}

export function authRoutes(ctx: AppContext) {
  const router = Router();
  const cookieOptions = {
    secure: ctx.config.cookieSecure,
    sameSite: ctx.config.cookieSameSite
  } as const;

  router.get("/auth/providers", (_req, res) => {
    return res.json({
      mode: ctx.config.identityProviderMode,
      issuer: ctx.config.identityProviderIssuer,
      loginUrl: ctx.config.identityProviderLoginUrl,
      localPasswordLoginEnabled: ctx.config.allowLocalPasswordLogin,
      mockAuthEnabled: ctx.config.mockAuthEnabled,
      ssoAdapter: {
        mode: ctx.ssoAdapter.mode,
        contract: ctx.ssoAdapter.contract()
      }
    });
  });

  router.get("/auth/session", (req, res) => {
    if (req.auth.roleId === "system") {
      return res.json({ authenticated: false, mockAuthEnabled: ctx.config.mockAuthEnabled, mode: ctx.config.appEnv });
    }
    return res.json({
      authenticated: true,
      user: req.auth.user,
      roleId: req.auth.roleId,
      orgScope: req.auth.orgScope,
      passwordChangeRequired: Boolean(currentAccount(ctx, req.auth.user.id)?.passwordChangeRequired),
      mockAuthEnabled: ctx.config.mockAuthEnabled,
      mode: ctx.config.appEnv
    });
  });

  router.post("/auth/sso/mock-callback", (req, res) => {
    if (ctx.config.appEnv === "production") {
      return res.status(403).json({ error: { code: "MOCK_SSO_DISABLED", message: "本地身份回调不允许在生产环境使用。" } });
    }
    try {
      const identity = ctx.ssoAdapter.mapIdentity({
        token: String(req.body?.token ?? ""),
        providerUserId: req.body?.providerUserId === undefined ? undefined : String(req.body.providerUserId),
        displayName: req.body?.displayName === undefined ? undefined : String(req.body.displayName),
        roleCode: req.body?.roleCode === undefined ? undefined : String(req.body.roleCode),
        orgCode: req.body?.orgCode === undefined ? undefined : String(req.body.orgCode),
        hotelCodes: Array.isArray(req.body?.hotelCodes) ? req.body.hotelCodes.map(String) : undefined,
        supplierId: req.body?.supplierId === undefined ? undefined : String(req.body.supplierId)
      });
      const session = ctx.authStore.createSession(identity.sessionUserId, ctx.config.sessionTtlMs);
      res.setHeader("set-cookie", createSessionCookie(session.sessionId, ctx.config.sessionCookieName, ctx.config.sessionTtlMs, cookieOptions));
      const auth = buildAuthContext(ctx, identity.sessionUserId);
      const log = ctx.policies.auditRequiredAction.recordSensitiveAction(auth, "auth.sso.mock_callback", "sso_subject", identity.subject, undefined, `mode=${identity.mode}`);
      return res.json({
        user: identity.user,
        roleId: identity.mappedRoleId,
        orgScope: identity.mappedOrgScope,
        mode: ctx.config.appEnv,
        provider: identity.provider,
        adapterMode: identity.mode,
        warnings: identity.warnings,
        auditLogId: log.id
      });
    } catch (error) {
      return res.status(400).json({ error: { code: "SSO_MAPPING_FAILED", message: error instanceof Error ? error.message : "SSO identity mapping failed." } });
    }
  });

  router.post("/auth/login", (req, res) => {
    if (!ctx.config.allowLocalPasswordLogin) {
      const auth = buildAuthContext(ctx, "system");
      const log = ctx.policies.auditRequiredAction.recordSensitiveAction(auth, "auth.login.local_disabled", "auth_provider", ctx.config.identityProviderMode, undefined, "local password login disabled");
      return res.status(403).json({
        error: {
          code: "LOCAL_PASSWORD_LOGIN_DISABLED",
          message: "Local password login is disabled. Use the configured enterprise identity provider.",
          auditLogId: log.id,
          provider: {
            mode: ctx.config.identityProviderMode,
            issuer: ctx.config.identityProviderIssuer,
            loginUrl: ctx.config.identityProviderLoginUrl
          }
        }
      });
    }

    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");
    if (!username || !password) {
      return res.status(400).json({ error: { code: "LOGIN_INVALID", message: "Username and password are required." } });
    }

    const account = ctx.authStore.verifyCredentials(username, password);
    if (!account) {
      const auth = buildAuthContext(ctx, "system");
      const log = ctx.policies.auditRequiredAction.recordSensitiveAction(auth, "auth.login.denied", "auth_account", username, undefined, "invalid credentials");
      return res.status(401).json({ error: { code: "LOGIN_DENIED", message: "Invalid username or password.", auditLogId: log.id } });
    }

    const session = ctx.authStore.createSession(account.user_id, ctx.config.sessionTtlMs);
    res.setHeader("set-cookie", createSessionCookie(session.sessionId, ctx.config.sessionCookieName, ctx.config.sessionTtlMs, cookieOptions));
    const auth = buildAuthContext(ctx, account.user_id);
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(auth, "auth.login", "user", auth.user.id);
    return res.json({
      user: auth.user,
      roleId: auth.roleId,
      orgScope: auth.orgScope,
      passwordChangeRequired: Boolean(account.password_change_required),
      mockAuthEnabled: ctx.config.mockAuthEnabled,
      mode: ctx.config.appEnv,
      auditLogId: log.id
    });
  });

  router.post("/auth/logout", (req, res) => {
    if (req.sessionId) ctx.authStore.deleteSession(req.sessionId);
    res.setHeader("set-cookie", clearSessionCookie(ctx.config.sessionCookieName, cookieOptions));
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "auth.logout", "user", req.auth.user.id);
    return res.json({ ok: true, auditLogId: log.id });
  });

  router.post("/me/change-password", (req, res) => {
    if (!ctx.config.allowLocalPasswordLogin) {
      return res.status(403).json({
        error: {
          code: "LOCAL_PASSWORD_LOGIN_DISABLED",
          message: "Local password login is disabled. Change password through the configured enterprise identity provider."
        }
      });
    }

    const currentPassword = String(req.body?.currentPassword ?? "");
    const newPassword = String(req.body?.newPassword ?? "");
    const confirmPassword = String(req.body?.confirmPassword ?? "");
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: { code: "PASSWORD_CHANGE_INVALID", message: "Current password, new password and confirmation are required." } });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: { code: "PASSWORD_CONFIRM_MISMATCH", message: "New password and confirmation do not match." } });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: { code: "PASSWORD_TOO_WEAK", message: "New password must be at least 8 characters." } });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: { code: "PASSWORD_UNCHANGED", message: "New password must be different from current password." } });
    }

    const result = ctx.authStore.changePassword(req.auth.user.id, currentPassword, newPassword);
    if (result.status === "not_found") {
      return res.status(404).json({ error: { code: "AUTH_ACCOUNT_NOT_FOUND", message: "Current login account was not found." } });
    }
    if (result.status === "current_password_invalid") {
      const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "auth.password.change.denied", "auth_account", req.auth.user.id, undefined, "current password invalid");
      return res.status(401).json({ error: { code: "CURRENT_PASSWORD_INVALID", message: "Current password is incorrect.", auditLogId: log.id } });
    }

    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "auth.password.change", "auth_account", req.auth.user.id, undefined, "self-service");
    return res.json({ account: result.account, passwordChangeRequired: false, auditLogId: log.id });
  });

  router.post("/auth/mock-login", (req, res) => {
    if (!ctx.config.mockAuthEnabled) {
      return res.status(403).json({ error: { code: "MOCK_LOGIN_DISABLED", message: "本地验证登录仅允许在 local/test 环境使用。" } });
    }
    const userId = String(req.body?.userId ?? "u2");
    const user = ctx.state.users.find((item) => item.id === userId && (item.status ?? "active") === "active");
    if (!user || user.roleId === "system") {
      return res.status(404).json({ error: { code: "MOCK_USER_NOT_FOUND", message: "试用账号不存在或已停用。" } });
    }
    const auth = buildAuthContext(ctx, userId);
    const session = ctx.authStore.createSession(auth.user.id, ctx.config.sessionTtlMs);
    res.setHeader("set-cookie", createSessionCookie(session.sessionId, ctx.config.sessionCookieName, ctx.config.sessionTtlMs, cookieOptions));
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(auth, "auth.mock_login", "user", auth.user.id, undefined, "local/test mock only");
    return res.json({
      token: `mock-token-${auth.user.id}`,
      user: auth.user,
      roleId: auth.roleId,
      orgScope: auth.orgScope,
      passwordChangeRequired: Boolean(currentAccount(ctx, auth.user.id)?.passwordChangeRequired),
      mockAuthEnabled: ctx.config.mockAuthEnabled,
      mode: ctx.config.appEnv,
      auditLogId: log.id
    });
  });

  router.get("/auth/mock-users", (_req, res) => {
    if (!ctx.config.mockAuthEnabled) {
      return res.status(403).json({ error: { code: "MOCK_USERS_DISABLED", message: "本地验证账号目录仅允许在 local/test 环境使用。" } });
    }
    const users = ctx.state.users
      .filter((user) => user.roleId !== "system" && (user.status ?? "active") === "active")
      .map((user) => {
        const supplier = user.supplierId ? ctx.state.suppliers.find((item) => item.id === user.supplierId) : undefined;
        return {
          id: user.id,
          name: user.name,
          roleId: user.roleId,
          roleLabel: roleLabels[user.roleId] ?? user.roleId,
          supplierId: user.supplierId,
          supplierName: supplier?.name,
          orgId: user.orgId
        };
      });
    return res.json({ users });
  });

  router.get("/me", (req, res) => {
    return res.json({
      user: req.auth.user,
      roleId: req.auth.roleId,
      orgScope: req.auth.orgScope,
      passwordChangeRequired: Boolean(currentAccount(ctx, req.auth.user.id)?.passwordChangeRequired),
      mockAuthEnabled: ctx.config.mockAuthEnabled,
      mode: ctx.config.appEnv
    });
  });

  router.post("/me/mock-role-switch", (req, res) => {
    if (!ctx.config.mockAuthEnabled) {
      return res.status(403).json({ error: { code: "MOCK_ROLE_SWITCH_DISABLED", message: "本地角色切换仅允许在 local/test 环境使用。" } });
    }
    const userId = req.body?.userId === undefined ? "" : String(req.body.userId);
    const roleId = req.body?.roleId === undefined ? "" : String(req.body.roleId);
    const user = userId ? ctx.state.users.find((item) => item.id === userId) : ctx.state.users.find((item) => item.roleId === roleId);
    if (!user) {
      return res.status(404).json({ error: { code: "MOCK_USER_NOT_FOUND", message: "账号或角色不存在。" } });
    }
    const auth = buildAuthContext(ctx, user.id);
    if (req.sessionId) ctx.authStore.deleteSession(req.sessionId);
    const session = ctx.authStore.createSession(auth.user.id, ctx.config.sessionTtlMs);
    res.setHeader("set-cookie", createSessionCookie(session.sessionId, ctx.config.sessionCookieName, ctx.config.sessionTtlMs, cookieOptions));
    const log = ctx.policies.auditRequiredAction.recordSensitiveAction(auth, "auth.mock_role_switch", "user", auth.user.id, undefined, "local/test mock only");
    return res.json({
      user: auth.user,
      roleId: auth.roleId,
      orgScope: auth.orgScope,
      passwordChangeRequired: Boolean(currentAccount(ctx, auth.user.id)?.passwordChangeRequired),
      mockAuthEnabled: ctx.config.mockAuthEnabled,
      mode: ctx.config.appEnv,
      auditLogId: log.id
    });
  });

  router.get("/me/org-scope", (req, res) => {
    return res.json({ orgScope: req.auth.orgScope });
  });

  router.get("/me/menus", (req, res) => {
    const permission = ctx.state.rolePermissions.find((item) => item.roleId === req.auth.roleId);
    return res.json({ menus: permission?.menus ?? [] });
  });

  router.get("/me/actions", (req, res) => {
    const permission = ctx.state.rolePermissions.find((item) => item.roleId === req.auth.roleId);
    return res.json({ actions: permission?.actions ?? [] });
  });

  return router;
}
