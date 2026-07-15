import crypto from "node:crypto";
import type { User } from "../types.js";
import type { RuntimeDb } from "./runtime-db.js";

interface AuthAccountRow {
  user_id: string;
  username: string;
  password_hash: string;
  status: string;
  status_source: string | null;
  password_change_required: number;
  last_login_at: string | null;
}

interface SessionRow {
  session_id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
}

function derivePasswordHash(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export interface AuthAccountSummary {
  userId: string;
  username: string;
  status: string;
  statusSource: string | null;
  passwordChangeRequired: boolean;
  lastLoginAt: string | null;
}

export type ManagedAccountStatus = "active" | "disabled" | "suspended" | "offboarded";

export function generateTemporaryPassword(prefix: "Init" | "Reset" = "Init") {
  const token = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${prefix}@${new Date().getUTCFullYear()}-${token}`;
}

function toAccountSummary(row: AuthAccountRow): AuthAccountSummary {
  return {
    userId: row.user_id,
    username: row.username,
    status: row.status,
    statusSource: row.status_source,
    passwordChangeRequired: Boolean(row.password_change_required),
    lastLoginAt: row.last_login_at
  };
}

export class AuthStore {
  constructor(private readonly runtimeDb: RuntimeDb) {}

  seedAccounts(users: User[], allowWeakAccounts: boolean) {
    if (!allowWeakAccounts) return;
    const now = new Date().toISOString();
    const statement = this.runtimeDb.db.prepare(
      `insert into auth_accounts (user_id, username, password_hash, status, created_at, updated_at)
       values (?, ?, ?, 'active', ?, ?)
       on conflict(user_id) do nothing`
    );
    for (const user of users.filter((item) => item.roleId !== "system" && (item.status ?? "active") === "active")) {
      statement.run(user.id, user.id, derivePasswordHash(`pass-${user.id}`), now, now);
    }
  }

  resetAccounts(users: User[], allowWeakAccounts: boolean) {
    if (!allowWeakAccounts) return;
    const activeUsers = users.filter((item) => item.roleId !== "system" && (item.status ?? "active") === "active");
    const userIds = activeUsers.map((user) => user.id);
    const placeholders = userIds.map(() => "?").join(", ");
    const now = new Date().toISOString();
    this.runtimeDb.db.exec("begin immediate transaction;");
    try {
      if (userIds.length > 0) {
        this.runtimeDb.db.prepare(`delete from auth_sessions where user_id not in (${placeholders})`).run(...userIds);
        this.runtimeDb.db.prepare(`delete from auth_accounts where user_id not in (${placeholders})`).run(...userIds);
      } else {
        this.runtimeDb.db.prepare("delete from auth_sessions").run();
        this.runtimeDb.db.prepare("delete from auth_accounts").run();
      }
      const statement = this.runtimeDb.db.prepare(
        `insert into auth_accounts (user_id, username, password_hash, status, status_source, password_change_required, created_at, updated_at)
         values (?, ?, ?, 'active', null, 0, ?, ?)
         on conflict(user_id) do update set
           username = excluded.username,
           password_hash = excluded.password_hash,
           status = 'active',
           status_source = null,
           password_change_required = 0,
           updated_at = excluded.updated_at`
      );
      for (const user of activeUsers) {
        statement.run(user.id, user.id, derivePasswordHash(`pass-${user.id}`), now, now);
      }
      this.runtimeDb.db.exec("commit;");
    } catch (error) {
      this.runtimeDb.db.exec("rollback;");
      throw error;
    }
  }

  requirePasswordChange(userId: string) {
    this.runtimeDb.db.prepare("update auth_accounts set password_change_required = 1, updated_at = ? where user_id = ?").run(new Date().toISOString(), userId);
  }

  createAccount(input: { userId: string; username: string; temporaryPassword: string; statusSource?: string | null }) {
    const now = new Date().toISOString();
    this.runtimeDb.db
      .prepare(
        `insert into auth_accounts
         (user_id, username, password_hash, status, status_source, password_change_required, created_at, updated_at)
         values (?, ?, ?, 'active', ?, 1, ?, ?)`
      )
      .run(input.userId, input.username, derivePasswordHash(input.temporaryPassword), input.statusSource ?? null, now, now);
    return this.getAccountsByUserIds([input.userId])[0] ?? null;
  }

  getAccountByUsername(username: string) {
    const row = this.runtimeDb.db.prepare("select * from auth_accounts where username = ?").get(username) as AuthAccountRow | undefined;
    return row ? toAccountSummary(row) : null;
  }

  updateUsername(userId: string, username: string) {
    const now = new Date().toISOString();
    const result = this.runtimeDb.db.prepare("update auth_accounts set username = ?, updated_at = ? where user_id = ?").run(username, now, userId);
    if (result.changes === 0) return null;
    return this.getAccountsByUserIds([userId])[0] ?? null;
  }

  setAccountStatus(userId: string, status: ManagedAccountStatus, statusSource: string | null = null) {
    this.runtimeDb.db
      .prepare("update auth_accounts set status = ?, status_source = ?, updated_at = ? where user_id = ?")
      .run(status, status === "active" ? null : statusSource, new Date().toISOString(), userId);
    if (status !== "active") this.deleteSessionsForUser(userId);
  }

  getAccountsByUserIds(userIds: string[]) {
    if (userIds.length === 0) return [];
    const placeholders = userIds.map(() => "?").join(", ");
    const rows = this.runtimeDb.db.prepare(`select * from auth_accounts where user_id in (${placeholders})`).all(...userIds) as unknown as AuthAccountRow[];
    return rows.map(toAccountSummary);
  }

  resetPassword(userId: string, temporaryPassword: string) {
    const now = new Date().toISOString();
    const result = this.runtimeDb.db
      .prepare("update auth_accounts set password_hash = ?, password_change_required = 1, updated_at = ? where user_id = ?")
      .run(derivePasswordHash(temporaryPassword), now, userId);
    if (result.changes === 0) return null;
    this.deleteSessionsForUser(userId);
    const row = this.runtimeDb.db.prepare("select * from auth_accounts where user_id = ?").get(userId) as AuthAccountRow | undefined;
    return row ? toAccountSummary(row) : null;
  }

  changePassword(userId: string, currentPassword: string, newPassword: string) {
    const row = this.runtimeDb.db.prepare("select * from auth_accounts where user_id = ? and status = 'active'").get(userId) as AuthAccountRow | undefined;
    if (!row) return { status: "not_found" as const };
    if (row.password_hash !== derivePasswordHash(currentPassword)) return { status: "current_password_invalid" as const };
    const now = new Date().toISOString();
    this.runtimeDb.db.prepare("update auth_accounts set password_hash = ?, password_change_required = 0, updated_at = ? where user_id = ?").run(derivePasswordHash(newPassword), now, userId);
    const updated = this.runtimeDb.db.prepare("select * from auth_accounts where user_id = ?").get(userId) as unknown as AuthAccountRow;
    return { status: "changed" as const, account: toAccountSummary(updated) };
  }

  verifyCredentials(username: string, password: string) {
    const row = this.runtimeDb.db.prepare("select * from auth_accounts where username = ? and status = 'active'").get(username) as AuthAccountRow | undefined;
    if (!row) return null;
    if (row.password_hash !== derivePasswordHash(password)) return null;
    this.runtimeDb.db.prepare("update auth_accounts set last_login_at = ?, updated_at = ? where user_id = ?").run(new Date().toISOString(), new Date().toISOString(), row.user_id);
    return row;
  }

  createSession(userId: string, ttlMs: number) {
    const now = new Date();
    const sessionId = crypto.randomUUID();
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
    this.runtimeDb.db
      .prepare("insert into auth_sessions (session_id, user_id, created_at, expires_at, last_seen_at) values (?, ?, ?, ?, ?)")
      .run(sessionId, userId, createdAt, expiresAt, createdAt);
    return { sessionId, userId, createdAt, expiresAt };
  }

  getSession(sessionId: string) {
    const row = this.runtimeDb.db.prepare("select * from auth_sessions where session_id = ?").get(sessionId) as SessionRow | undefined;
    if (!row) return null;
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      this.deleteSession(sessionId);
      return null;
    }
    this.runtimeDb.db.prepare("update auth_sessions set last_seen_at = ? where session_id = ?").run(new Date().toISOString(), sessionId);
    return row;
  }

  deleteSession(sessionId: string) {
    this.runtimeDb.db.prepare("delete from auth_sessions where session_id = ?").run(sessionId);
  }

  deleteSessionsForUser(userId: string) {
    this.runtimeDb.db.prepare("delete from auth_sessions where user_id = ?").run(userId);
  }
}
