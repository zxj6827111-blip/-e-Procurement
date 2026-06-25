import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-stage5-"));
}

function boot(options: {
  appEnv?: "local" | "test" | "production";
  dataRoot: string;
  mockAuthEnabled?: boolean;
  fileUploadMaxBytes?: number;
  cookieSecure?: boolean;
  corsAllowedOrigins?: string[];
  allowLocalPasswordLogin?: boolean;
}) {
  const ctx = createAppContext({
    runtime: {
      appEnv: options.appEnv ?? "test",
      dataRoot: options.dataRoot,
      mockAuthEnabled: options.mockAuthEnabled,
      fileUploadMaxBytes: options.fileUploadMaxBytes,
      cookieSecure: options.cookieSecure,
      corsAllowedOrigins: options.corsAllowedOrigins,
      allowLocalPasswordLogin: options.allowLocalPasswordLogin
    }
  });
  return { ctx, app: createApp(ctx) };
}

describe("Stage 5 production readiness baseline", () => {
  let dataRoot: string;

  beforeEach(() => {
    dataRoot = makeDataRoot();
  });

  it("reports mode, persistence readiness and file storage readiness from health without leaking sensitive paths", async () => {
    const runtime = boot({ appEnv: "production", dataRoot, mockAuthEnabled: false });
    const response = await request(runtime.app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.mode).toBe("production");
    expect(response.body.mockAuthEnabled).toBe(false);
    expect(response.body.persistence.driver).toBe("sqlite");
    expect(response.body.persistence.ready).toBe(true);
    expect(response.body.fileStorage.ready).toBe(true);
    expect(response.text).not.toContain("runtime.sqlite");
    expect(response.text).not.toContain(dataRoot);
  });

  it("disables mock login and x-mock-user-id fallback in production mode", async () => {
    const runtime = boot({ appEnv: "production", dataRoot, mockAuthEnabled: false });

    const mockLogin = await request(runtime.app).post("/api/auth/mock-login").send({ userId: "u2" });
    expect(mockLogin.status).toBe(403);
    expect(mockLogin.body.error.code).toBe("MOCK_LOGIN_DISABLED");

    const meByHeader = await request(runtime.app).get("/api/me").set("x-mock-user-id", "u2");
    expect(meByHeader.status).toBe(401);
    expect(meByHeader.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("sets secure-capable cookie attributes from runtime config", async () => {
    const runtime = boot({ appEnv: "production", dataRoot, mockAuthEnabled: false, cookieSecure: true, allowLocalPasswordLogin: true });
    const login = await request(runtime.app).post("/api/auth/login").send({ username: "u2", password: "pass-u2" });
    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(login.headers["set-cookie"]?.[0]).toContain("SameSite=lax");
    expect(login.headers["set-cookie"]?.[0]).toContain("Secure");
  });

  it("rejects oversized and disallowed uploads", async () => {
    const runtime = boot({ appEnv: "test", dataRoot, mockAuthEnabled: true, fileUploadMaxBytes: 8 });

    const tooLarge = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u3")
      .send({
        originalName: "invoice.pdf",
        contentType: "application/pdf",
        contentBase64: Buffer.from("0123456789", "utf8").toString("base64"),
        attachmentKind: "settlement_material",
        objectType: "settlement_material",
        objectId: "sm-large",
        projectId: "p-award",
        supplierId: "sup-1"
      });
    expect(tooLarge.status).toBe(400);
    expect(tooLarge.body.error.code).toBe("FILE_TOO_LARGE");

    const badType = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u3")
      .send({
        originalName: "payload.exe",
        contentType: "application/x-msdownload",
        contentBase64: Buffer.from("demo", "utf8").toString("base64"),
        attachmentKind: "settlement_material",
        objectType: "settlement_material",
        objectId: "sm-exe",
        projectId: "p-award",
        supplierId: "sup-1"
      });
    expect(badType.status).toBe(400);
    expect(["FILE_TYPE_NOT_ALLOWED", "FILE_EXTENSION_NOT_ALLOWED"]).toContain(badType.body.error.code);
  });
});
