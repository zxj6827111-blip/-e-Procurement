import type { AppContext } from "../app-context.js";
import type { ProcurementDocumentAttachment } from "../types.js";

export function resolveAttachments(
  ctx: AppContext,
  rawAttachments: unknown,
  options: {
    fallbackPrefix: string;
    objectType: string;
    objectId: string;
    attachmentKind: string;
    projectId?: string;
    supplierId?: string;
    uploadedBy: string;
  }
): ProcurementDocumentAttachment[] {
  const now = new Date().toISOString();
  if (!Array.isArray(rawAttachments)) return [];
  return rawAttachments.map((item, index) => {
    const value = (item ?? {}) as Record<string, unknown>;
    const contentBase64 = typeof value.contentBase64 === "string" ? value.contentBase64 : "";
    if (!contentBase64) {
      const size = Number(value.sizeBytes ?? 0);
      return {
        id: String(value.id ?? `${options.fallbackPrefix}-att-${index + 1}`),
        fileName: String(value.fileName ?? `attachment-${index + 1}.pdf`),
        contentType: String(value.contentType ?? "application/pdf"),
        sizeBytes: Number.isFinite(size) ? size : 0,
        uploadedAt: String(value.uploadedAt ?? now)
      };
    }
    const stored = ctx.fileStore.save({
      originalName: String(value.fileName ?? `attachment-${index + 1}.bin`),
      contentType: String(value.contentType ?? "application/octet-stream"),
      body: Buffer.from(contentBase64, "base64"),
      attachmentKind: options.attachmentKind,
      objectType: options.objectType,
      objectId: options.objectId,
      projectId: options.projectId,
      supplierId: options.supplierId,
      uploadedBy: options.uploadedBy
    });
    return {
      id: stored.fileId,
      fileName: stored.originalName,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      uploadedAt: stored.createdAt
    };
  });
}
