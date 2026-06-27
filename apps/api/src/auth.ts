import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { AppContext } from "./app-context.js";
import type { AuthContext, User } from "./types.js";

declare global {
  namespace Express {
    interface Request {
      auth: AuthContext;
      sessionId?: string;
      auditMeta: {
        ip?: string;
        userAgent?: string;
      };
    }
  }
}

export function buildAuthContext(ctx: AppContext, userId?: string): AuthContext {
  const state = ctx.state;
  const user = state.users.find((item) => item.id === userId);
  if (!user || (user.status ?? "active") !== "active") {
    const anonymous = state.users.find((item) => item.id === "system");
    if (!anonymous) {
      throw new Error("Seed data missing system user");
    }
    return {
      user: anonymous as User,
      roleId: "system",
      orgScope: [anonymous.orgId]
    };
  }
  return {
    user: user as User,
    roleId: user.roleId,
    orgScope: user.orgScope ?? [user.orgId]
  };
}

function parseCookies(header: string | undefined) {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        if (index < 0) return [item, ""];
        return [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
      })
  );
}

export function authMiddleware(ctx: AppContext) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const cookies = parseCookies(req.header("cookie"));
    const sessionId = cookies[ctx.config.sessionCookieName];
    const fallbackUserId = ctx.config.mockAuthEnabled ? req.header("x-mock-user-id") ?? req.header("x-user-id") ?? undefined : undefined;
    const prefersMockHeader =
      ctx.config.mockAuthEnabled && (req.path === "/api/auth/mock-login" || (req.path === "/api/me/mock-role-switch" && Boolean(fallbackUserId)));
    const session = sessionId && !prefersMockHeader ? ctx.authStore.getSession(sessionId) : null;
    const userId = prefersMockHeader ? fallbackUserId : session?.user_id ?? fallbackUserId;
    req.sessionId = session?.session_id;
    req.auth = buildAuthContext(ctx, userId);
    next();
  };
}

export function auditContextMiddleware() {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.auditMeta = {
      ip: req.ip,
      userAgent: req.header("user-agent") ?? undefined
    };
    next();
  };
}

export interface SessionCookieOptions {
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
}

export function createSessionCookie(sessionId: string, cookieName: string, ttlMs: number, options: SessionCookieOptions) {
  const expires = new Date(Date.now() + ttlMs).toUTCString();
  const securePart = options.secure ? "; Secure" : "";
  return `${cookieName}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=${options.sameSite}; Expires=${expires}${securePart}`;
}

export function clearSessionCookie(cookieName: string, options: SessionCookieOptions) {
  const securePart = options.secure ? "; Secure" : "";
  return `${cookieName}=; Path=/; HttpOnly; SameSite=${options.sameSite}; Expires=Thu, 01 Jan 1970 00:00:00 GMT${securePart}`;
}

export function hashUploadPayload(body: Buffer) {
  return crypto.createHash("sha256").update(body).digest("hex");
}

export function requireAuthenticated(req: Request, res: Response) {
  if (req.auth.roleId !== "system") return true;
  res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Login is required." } });
  return false;
}
