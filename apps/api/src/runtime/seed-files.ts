import type { AppContext } from "../app-context.js";

function encodeText(name: string) {
  return Buffer.from(`seed file for ${name}`, "utf8");
}

export function seedRuntimeFiles(ctx: AppContext) {
  const knownIds = new Set<string>();

  for (const bid of ctx.state.bids) {
    const existing = ctx.fileStore.get(bid.fileId);
    if (existing) {
      knownIds.add(existing.fileId);
      continue;
    }
    const stored = ctx.fileStore.save({
      fileId: bid.fileId,
      originalName: bid.fileName,
      contentType: bid.responseFileMetadata?.[0]?.contentType ?? "application/pdf",
      body: encodeText(bid.fileName),
      attachmentKind: "bid_response_file",
      objectType: "bid",
      objectId: bid.id,
      projectId: bid.projectId,
      supplierId: bid.supplierId,
      uploadedBy: bid.supplierId
    });
    knownIds.add(stored.fileId);
  }
}
