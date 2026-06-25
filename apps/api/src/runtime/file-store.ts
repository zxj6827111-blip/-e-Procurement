import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { RuntimeConfig } from "./config.js";
import type { RuntimeDb } from "./runtime-db.js";

export interface StoredFileRecord {
  fileId: string;
  storagePath: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  attachmentKind: string;
  objectType: string;
  objectId: string;
  projectId?: string;
  supplierId?: string;
  uploadedBy: string;
  createdAt: string;
  replacedByFileId?: string;
  versionNo: number;
  deletedBy?: string;
  deletedReason?: string;
  deletedAt?: string;
}

export interface SaveFileInput {
  fileId?: string;
  originalName: string;
  contentType: string;
  body: Buffer;
  attachmentKind: string;
  objectType: string;
  objectId: string;
  projectId?: string;
  supplierId?: string;
  uploadedBy: string;
  versionNo?: number;
}

export interface ListFilesFilter {
  objectType?: string;
  objectId?: string;
  projectId?: string;
  supplierId?: string;
  includeDeleted?: boolean;
}

export interface FileStorageBackend {
  readonly mode: "local" | "mock" | "object";
  readonly finalStorage: boolean;
  describe(): {
    mode: "local" | "mock" | "object";
    finalStorage: boolean;
    ready: boolean;
    note: string;
  };
  write(relativePath: string, body: Buffer): void;
  absolutePath(relativePath: string): string;
}

class LocalFileStorageBackend implements FileStorageBackend {
  readonly mode: "local" | "mock" | "object" = "local";
  readonly finalStorage: boolean = false;

  constructor(private readonly filesRoot: string) {
    fs.mkdirSync(filesRoot, { recursive: true });
  }

  describe() {
    return {
      mode: this.mode,
      finalStorage: this.finalStorage,
      ready: ensureDirectory(this.filesRoot),
      note: "Application-managed local file storage is enabled; production should use object storage or an approved shared file service."
    };
  }

  write(relativePath: string, body: Buffer) {
    const absolutePath = this.absolutePath(relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, body);
  }

  absolutePath(relativePath: string) {
    return path.join(this.filesRoot, relativePath);
  }
}

class MockObjectStorageBackend extends LocalFileStorageBackend {
  override readonly mode: "local" | "mock" | "object" = "mock";

  override describe() {
    const base = super.describe();
    return {
      ...base,
      mode: this.mode,
      note: "Mock object storage stores bytes locally while preserving the object-storage adapter boundary."
    };
  }
}

class ObjectStorageContractBackend extends LocalFileStorageBackend {
  override readonly mode: "local" | "mock" | "object" = "object";
  override readonly finalStorage = false;

  constructor(
    filesRoot: string,
    private readonly config: RuntimeConfig
  ) {
    super(filesRoot);
  }

  override describe() {
    const base = super.describe();
    return {
      ...base,
      mode: this.mode,
      finalStorage: this.finalStorage,
      ready: base.ready && Boolean(this.config.objectStorageEndpoint && this.config.objectStorageBucket),
      note: this.config.objectStorageEndpoint && this.config.objectStorageBucket
        ? "Object storage contract is configured, but this build still writes through local storage until the real adapter is connected."
        : "Object storage mode requires endpoint and bucket before it can be production-ready."
    };
  }
}

export class FileStore {
  private readonly backend: FileStorageBackend;

  constructor(
    private readonly runtimeDb: RuntimeDb,
    private readonly filesRoot: string,
    config?: RuntimeConfig
  ) {
    this.backend = createFileStorageBackend(filesRoot, config);
  }

  save(input: SaveFileInput): StoredFileRecord {
    const fileId = input.fileId ?? `file-${crypto.randomUUID()}`;
    const sanitizedName = sanitizeOriginalName(input.originalName);
    const ext = path.extname(sanitizedName) || ".bin";
    const relativePath = path.join(new Date().toISOString().slice(0, 10), `${fileId}${ext}`);
    this.backend.write(relativePath, input.body);
    const now = new Date().toISOString();
    const sha256 = crypto.createHash("sha256").update(input.body).digest("hex");
    this.runtimeDb.db
      .prepare(
        `insert into stored_files
         (file_id, storage_path, original_name, content_type, size_bytes, sha256, attachment_kind, object_type, object_id, project_id, supplier_id, uploaded_by, created_at, version_no)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        fileId,
        relativePath,
        sanitizedName,
        input.contentType,
        input.body.byteLength,
        sha256,
        input.attachmentKind,
        input.objectType,
        input.objectId,
        input.projectId ?? null,
        input.supplierId ?? null,
        input.uploadedBy,
        now,
        input.versionNo ?? 1
      );
    return {
      fileId,
      storagePath: relativePath,
      originalName: sanitizedName,
      contentType: input.contentType,
      sizeBytes: input.body.byteLength,
      sha256,
      attachmentKind: input.attachmentKind,
      objectType: input.objectType,
      objectId: input.objectId,
      projectId: input.projectId,
      supplierId: input.supplierId,
      uploadedBy: input.uploadedBy,
      createdAt: now,
      versionNo: input.versionNo ?? 1
    };
  }

  get(fileId: string): (StoredFileRecord & { absolutePath: string }) | null {
    const row = this.runtimeDb.db.prepare("select * from stored_files where file_id = ? and deleted_at is null").get(fileId) as StoredFileRow | undefined;
    if (!row) return null;
    return this.fromRow(row);
  }

  list(filter: ListFilesFilter = {}) {
    const clauses: string[] = [];
    const values: Array<string | number> = [];
    if (!filter.includeDeleted) clauses.push("deleted_at is null");
    if (filter.objectType) {
      clauses.push("object_type = ?");
      values.push(filter.objectType);
    }
    if (filter.objectId) {
      clauses.push("object_id = ?");
      values.push(filter.objectId);
    }
    if (filter.projectId) {
      clauses.push("project_id = ?");
      values.push(filter.projectId);
    }
    if (filter.supplierId) {
      clauses.push("supplier_id = ?");
      values.push(filter.supplierId);
    }
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    const rows = this.runtimeDb.db.prepare(`select * from stored_files ${where} order by created_at desc`).all(...values) as unknown as StoredFileRow[];
    return rows.map((row) => this.fromRow(row));
  }

  replace(fileId: string, input: SaveFileInput) {
    const current = this.get(fileId);
    if (!current) return null;
    const next = this.save({
      ...input,
      attachmentKind: input.attachmentKind || current.attachmentKind,
      objectType: input.objectType || current.objectType,
      objectId: input.objectId || current.objectId,
      projectId: input.projectId ?? current.projectId,
      supplierId: input.supplierId ?? current.supplierId,
      versionNo: current.versionNo + 1
    });
    this.runtimeDb.db.prepare("update stored_files set replaced_by_file_id = ?, deleted_at = ? where file_id = ?").run(next.fileId, new Date().toISOString(), fileId);
    return next;
  }

  softDelete(fileId: string, deletedBy: string, reason: string) {
    const file = this.get(fileId);
    if (!file) return null;
    const deletedAt = new Date().toISOString();
    this.runtimeDb.db.prepare("update stored_files set deleted_by = ?, deleted_reason = ?, deleted_at = ? where file_id = ?").run(deletedBy, reason, deletedAt, fileId);
    return { ...file, deletedBy, deletedReason: reason, deletedAt };
  }

  versions(file: StoredFileRecord) {
    const rows = this.runtimeDb.db
      .prepare(
        `select * from stored_files
         where (object_type = ? and object_id = ? and attachment_kind = ?)
         order by version_no asc, created_at asc`
      )
      .all(file.objectType, file.objectId, file.attachmentKind) as unknown as StoredFileRow[];
    return rows.map((row) => this.fromRow(row));
  }

  private fromRow(row: StoredFileRow): StoredFileRecord & { absolutePath: string } {
    return {
      fileId: row.file_id,
      storagePath: row.storage_path,
      originalName: row.original_name,
      contentType: row.content_type,
      sizeBytes: row.size_bytes,
      sha256: row.sha256,
      attachmentKind: row.attachment_kind,
      objectType: row.object_type,
      objectId: row.object_id,
      projectId: row.project_id ?? undefined,
      supplierId: row.supplier_id ?? undefined,
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at,
      replacedByFileId: row.replaced_by_file_id ?? undefined,
      versionNo: row.version_no,
      deletedBy: row.deleted_by ?? undefined,
      deletedReason: row.deleted_reason ?? undefined,
      deletedAt: row.deleted_at ?? undefined,
      absolutePath: this.backend.absolutePath(row.storage_path)
    };
  }

  storageStatus() {
    return this.backend.describe();
  }
}

interface StoredFileRow {
  file_id: string;
  storage_path: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  attachment_kind: string;
  object_type: string;
  object_id: string;
  project_id: string | null;
  supplier_id: string | null;
  uploaded_by: string;
  created_at: string;
  replaced_by_file_id: string | null;
  version_no: number;
  deleted_by: string | null;
  deleted_reason: string | null;
  deleted_at: string | null;
}

function sanitizeOriginalName(value: string) {
  const normalized = path.basename(value).replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "_").trim();
  return normalized || "upload.bin";
}

export function createFileStorageBackend(filesRoot: string, config?: RuntimeConfig): FileStorageBackend {
  if (config?.fileStorageMode === "mock") return new MockObjectStorageBackend(filesRoot);
  if (config?.fileStorageMode === "object") return new ObjectStorageContractBackend(filesRoot, config);
  return new LocalFileStorageBackend(filesRoot);
}

function ensureDirectory(targetPath: string) {
  try {
    fs.mkdirSync(targetPath, { recursive: true });
    fs.accessSync(targetPath, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
