import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../../src/app.js";
import { createAppContext } from "../../src/app-context.js";

export function makeIsolatedDataRoot(prefix: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function createIsolatedRuntime(prefix: string) {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot: makeIsolatedDataRoot(prefix),
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}
