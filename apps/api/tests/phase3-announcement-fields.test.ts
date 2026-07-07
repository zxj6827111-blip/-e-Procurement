import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createIsolatedRuntime } from "./helpers/test-runtime.js";

function boot() {
  return createIsolatedRuntime("eproc-phase3-fields-");
}

describe("Phase 3 announcement method field persistence", () => {
  let runtime: ReturnType<typeof boot>;

  beforeEach(() => {
    runtime = boot();
  });

  it("persists comparison method fields submitted under methodFields", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-food/announcements")
      .set("x-mock-user-id", "u2")
      .send({
        documentId: "pd-food-1",
        title: "comparison-field-check",
        procurementMethod: "comparison",
        scope: "public_internal",
        methodFields: {
          priceRounds: 3,
          deliveryWindow: "daily before 05:00"
        }
      });

    expect(created.status).toBe(201);
    expect(created.body.announcement.methodFields.priceRounds).toBe(3);
    expect(created.body.announcement.methodFields.deliveryWindow).toBe("daily before 05:00");
  });

  it("persists internal open method fields submitted under methodFields", async () => {
    const created = await request(runtime.app)
      .post("/api/projects/p-pre/announcements")
      .set("x-mock-user-id", "u2")
      .send({
        documentId: "pd-pre-1",
        title: "open-field-check",
        procurementMethod: "internal_open",
        scope: "public_internal",
        methodFields: {
          bidBondRequired: true,
          openingLocation: "tower meeting room"
        }
      });

    expect(created.status).toBe(201);
    expect(created.body.announcement.methodFields.bidBondRequired).toBe(true);
    expect(created.body.announcement.methodFields.openingLocation).toBe("tower meeting room");
  });
});
