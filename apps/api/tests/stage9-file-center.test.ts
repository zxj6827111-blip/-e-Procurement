import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-stage9-files-"));
}

function boot() {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot: makeDataRoot(),
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

function tinyPng() {
  return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
}

describe("Stage 9 file and image center", () => {
  it("lists, previews, replaces, versions and discards project image files with audit protection", async () => {
    const runtime = boot();

    const uploaded = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u2")
      .send({
        originalName: "acceptance-photo.png",
        contentType: "image/png",
        contentBase64: tinyPng().toString("base64"),
        attachmentKind: "acceptance_image",
        objectType: "receipt_record",
        objectId: "rr-stage9-1",
        projectId: "p-award",
        supplierId: "sup-1"
      });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.file.versionNo).toBe(1);

    const list = await request(runtime.app).get("/api/files?projectId=p-award").set("x-mock-user-id", "u2");
    expect(list.status).toBe(200);
    expect(list.body.files.some((file: { id: string; previewable: boolean }) => file.id === uploaded.body.file.id && file.previewable)).toBe(true);

    const preview = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u2");
    expect(preview.status).toBe(200);
    expect(preview.headers["content-type"]).toContain("image/png");
    expect(preview.headers["x-audit-log-id"]).toMatch(/^audit-/);

    const replacement = await request(runtime.app)
      .post(`/api/files/${uploaded.body.file.id}/replace`)
      .set("x-mock-user-id", "u2")
      .field("objectId", "rr-stage9-1")
      .attach("file", Buffer.from("stage9 replacement", "utf8"), { filename: "acceptance-photo-v2.txt", contentType: "text/plain" });
    expect(replacement.status).toBe(201);
    expect(replacement.body.previousFileId).toBe(uploaded.body.file.id);
    expect(replacement.body.file.versionNo).toBe(2);

    const oldDownload = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u2");
    expect(oldDownload.status).toBe(404);

    const versions = await request(runtime.app).get(`/api/files/${replacement.body.file.id}/versions`).set("x-mock-user-id", "u2");
    expect(versions.status).toBe(200);
    expect(versions.body.versions.map((file: { versionNo: number }) => file.versionNo)).toEqual([1, 2]);

    const discard = await request(runtime.app).post(`/api/files/${replacement.body.file.id}/discard`).set("x-mock-user-id", "u2").send({ reason: "验收图片重传后作废" });
    expect(discard.status).toBe(200);
    expect(discard.body.file.deletedReason).toBe("验收图片重传后作废");

    const discardedDownload = await request(runtime.app).get(`/api/files/${replacement.body.file.id}/download`).set("x-mock-user-id", "u2");
    expect(discardedDownload.status).toBe(404);
  });

  it("blocks unauthorized supplier download while allowing own supplier file access", async () => {
    const runtime = boot();
    runtime.ctx.state.users.push({
      id: "u-other-supplier",
      name: "Other Supplier User",
      roleId: "supplier",
      orgId: "org-hotel",
      supplierId: "sup-2"
    });

    const uploaded = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u3")
      .send({
        originalName: "qualification.png",
        contentType: "image/png",
        contentBase64: tinyPng().toString("base64"),
        attachmentKind: "supplier_qualification_image",
        objectType: "supplier",
        objectId: "sup-1",
        supplierId: "sup-1"
      });
    expect(uploaded.status).toBe(201);

    const own = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u3");
    expect(own.status).toBe(200);

    const denied = await request(runtime.app).get(`/api/files/${uploaded.body.file.id}/download`).set("x-mock-user-id", "u-other-supplier");
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("SUPPLIER_FILE_DOWNLOAD_DENIED");
  });
});
