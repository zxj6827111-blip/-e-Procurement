import { Router, type Request, type Response } from "express";
import type { AppContext } from "../app-context.js";
import type { AuthContext } from "../types.js";
import { PolicyError, errorBody } from "../errors.js";
import type { StoredFileRecord } from "../runtime/index.js";
import { isAuditReaderRoleId, isOrgReaderRole, isProcurementMaintainerRole, isSupplierRole, supplierIdMatches, userOrgScope } from "../role-groups.js";
import { canReadProject, denyResponse } from "./permission-helpers.js";

const allowedExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xls", ".xlsx", ".txt"]);
const preProjectUploadObjectTypes = new Set(["procurement_request"]);
const supplierPreParticipationObjectTypes = new Set(["supplier_registration"]);
const supplierOwnedObjectTypes = new Set(["mall_order"]);

function decodeBody(body: unknown) {
  const encoded = typeof body === "string" ? body : String((body as { contentBase64?: string } | null)?.contentBase64 ?? "");
  if (!encoded) return null;
  return Buffer.from(encoded, "base64");
}

interface UploadScope {
  attachmentKind: string;
  objectType: string;
  objectId: string;
  projectId?: string;
  supplierId?: string;
}

function validateUploadScope(ctx: AppContext, req: Request, res: Response, scope: UploadScope) {
  const { objectType, objectId, projectId, supplierId } = scope;
  if (projectId) {
    const project = ctx.state.projects.find((item) => item.id === projectId);
    if (!project) {
      res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
      return false;
    }
    if (isSupplierRole(req.auth.roleId)) {
      if (!supplierIdMatches(req.auth.user, supplierId) || !project.participantSupplierIds.includes(supplierId ?? "")) {
        denyResponse(ctx, req, res, 403, "SUPPLIER_FILE_SCOPE_DENIED", "Supplier can only upload files for own in-scope project objects.", "file.upload.denied", objectType, objectId, projectId);
        return false;
      }
    } else if (!isProcurementMaintainerRole(req.auth.roleId) || !canReadProject(req as never, project)) {
      denyResponse(ctx, req, res, 403, "FILE_UPLOAD_SCOPE_DENIED", "Current role cannot upload files for this project.", "file.upload.denied", objectType, objectId, projectId);
      return false;
    }
    return true;
  }
  if (objectType === "supplier") {
    if (isSupplierRole(req.auth.roleId) && !supplierIdMatches(req.auth.user, objectId)) {
      denyResponse(ctx, req, res, 403, "SUPPLIER_FILE_SCOPE_DENIED", "Supplier can only upload own qualification files.", "file.upload.denied", objectType, objectId);
      return false;
    }
    if (!isSupplierRole(req.auth.roleId) && !isProcurementMaintainerRole(req.auth.roleId)) {
      denyResponse(ctx, req, res, 403, "FILE_UPLOAD_SCOPE_DENIED", "Current role cannot upload supplier files.", "file.upload.denied", objectType, objectId);
      return false;
    }
    return true;
  }
  if (preProjectUploadObjectTypes.has(objectType)) {
    if (isProcurementMaintainerRole(req.auth.roleId)) return true;
    denyResponse(ctx, req, res, 403, "FILE_UPLOAD_SCOPE_DENIED", "Only procurement business roles can upload pre-project request files.", "file.upload.denied", objectType, objectId);
    return false;
  }
  if (supplierPreParticipationObjectTypes.has(objectType)) {
    if (isSupplierRole(req.auth.roleId) && supplierIdMatches(req.auth.user, supplierId)) return true;
    denyResponse(ctx, req, res, 403, "SUPPLIER_FILE_SCOPE_DENIED", "Only supplier accounts can upload own registration files.", "file.upload.denied", objectType, objectId, projectId);
    return false;
  }
  if (supplierOwnedObjectTypes.has(objectType)) {
    if (isSupplierRole(req.auth.roleId) && supplierIdMatches(req.auth.user, supplierId)) return true;
    if (objectType === "mall_order" && isProcurementMaintainerRole(req.auth.roleId)) {
      const order = ctx.state.mallOrders.find((item) => item.id === objectId);
      if (order && userOrgScope(req.auth.user).includes(order.orgId)) return true;
    }
    denyResponse(ctx, req, res, 403, "SUPPLIER_FILE_SCOPE_DENIED", "Only supplier accounts can upload own business files.", "file.upload.denied", objectType, objectId, projectId);
    return false;
  }
  denyResponse(ctx, req, res, 403, "FILE_UPLOAD_SCOPE_DENIED", "Project or supported object scope is required for file upload.", "file.upload.denied", objectType, objectId);
  return false;
}

function validateUploadFile(ctx: AppContext, originalName: string, contentType: string, body: Buffer) {
  if (!originalName || !body.byteLength) {
    return { code: "FILE_UPLOAD_INVALID", message: "originalName and file content are required." };
  }
  if (body.byteLength > ctx.config.fileUploadMaxBytes) {
    return { code: "FILE_TOO_LARGE", message: `File exceeds ${ctx.config.fileUploadMaxBytes} bytes limit.` };
  }
  if (!ctx.config.allowedUploadContentTypes.includes(contentType.toLowerCase())) {
    return { code: "FILE_TYPE_NOT_ALLOWED", message: "Current content type is not allowed." };
  }
  const extension = normalizedExtension(originalName);
  if (extension && !allowedExtensions.has(extension)) {
    return { code: "FILE_EXTENSION_NOT_ALLOWED", message: "Current file extension is not allowed." };
  }
  return null;
}

function storedFileResponse(ctx: AppContext, auth: AuthContext, scope: UploadScope, originalName: string, contentType: string, body: Buffer) {
  const stored = ctx.fileStore.save({
    originalName,
    contentType,
    body,
    attachmentKind: scope.attachmentKind,
    objectType: scope.objectType,
    objectId: scope.objectId,
    projectId: scope.projectId,
    supplierId: scope.supplierId,
    uploadedBy: auth.user.id
  });
  const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(auth, "file.upload", scope.objectType, scope.objectId, scope.projectId, `fileId=${stored.fileId}`);
  return {
    file: {
      id: stored.fileId,
      fileName: stored.originalName,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      uploadedAt: stored.createdAt,
      versionNo: stored.versionNo
    },
    auditLogId: auditLog.id
  };
}

function fileSummary(file: StoredFileRecord) {
  return {
    id: file.fileId,
    fileId: file.fileId,
    fileName: file.originalName,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    attachmentKind: file.attachmentKind,
    objectType: file.objectType,
    objectId: file.objectId,
    projectId: file.projectId,
    supplierId: file.supplierId,
    uploadedBy: file.uploadedBy,
    uploadedAt: file.createdAt,
    versionNo: file.versionNo,
    replacedByFileId: file.replacedByFileId,
    deletedAt: file.deletedAt,
    deletedBy: file.deletedBy,
    deletedReason: file.deletedReason,
    previewable: file.contentType.startsWith("image/")
  };
}

function assertFileAccess(ctx: AppContext, req: Request, res: Response, file: StoredFileRecord, action: "read" | "write") {
  const deniedAction = action === "read" ? "file.read.denied" : "file.write.denied";
  if (isMallCatalogAsset(ctx, req, file)) {
    if (action === "read") return true;
    if (isProcurementMaintainerRole(req.auth.roleId)) return true;
    if (isSupplierRole(req.auth.roleId) && supplierIdMatches(req.auth.user, file.supplierId)) return true;
    return denyResponse(ctx, req, res, 403, "FILE_WRITE_DENIED", "Current role cannot replace mall catalog files.", deniedAction, file.objectType, file.objectId);
  }
  if (file.objectType === "bid" || file.attachmentKind === "bid_response_file") {
    if (action !== "read") {
      return denyResponse(ctx, req, res, 403, "FILE_WRITE_DENIED", "Bid response files cannot be replaced through file center.", deniedAction, file.objectType, file.objectId, file.projectId);
    }
    const bid = ctx.state.bids.find((item) => item.id === file.objectId || item.fileId === file.fileId);
    if (!bid) {
      res.status(404).json({ error: { code: "BID_NOT_FOUND", message: "Bid does not exist." } });
      return false;
    }
    try {
      ctx.policies.bidConfidentiality.assertBidAccess(req.auth, bid, "response_file_download", {
        approvalId: String(req.query.approvalId ?? ""),
        download: true
      });
      return true;
    } catch (error) {
      if (error instanceof PolicyError) {
        res.status(error.status).json(errorBody(error));
        return false;
      }
      throw error;
    }
  }
  if (file.projectId) {
    const project = ctx.state.projects.find((item) => item.id === file.projectId);
    if (!project) {
      res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project does not exist." } });
      return false;
    }
    if (isSupplierRole(req.auth.roleId)) {
      if (!supplierIdMatches(req.auth.user, file.supplierId)) {
        return denyResponse(ctx, req, res, 403, "SUPPLIER_FILE_DOWNLOAD_DENIED", "供应商只能访问本企业附件。", deniedAction, file.objectType, file.objectId, file.projectId);
      }
      return action === "read" || file.uploadedBy === req.auth.user.id;
    }
    if (req.auth.roleId === "admin") {
      return denyResponse(ctx, req, res, 403, "FILE_DOWNLOAD_DENIED", "系统管理员不能读取业务附件内容。", deniedAction, file.objectType, file.objectId, file.projectId);
    }
    if (!isOrgReaderRole(req.auth.roleId) || !canReadProject(req, project)) {
      return denyResponse(ctx, req, res, 403, action === "read" ? "FILE_DOWNLOAD_DENIED" : "FILE_WRITE_DENIED", "当前角色无权访问该附件。", deniedAction, file.objectType, file.objectId, file.projectId);
    }
    if (action === "write" && isAuditReaderRoleId(req.auth.roleId) && !isProcurementMaintainerRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "FILE_WRITE_DENIED", "审计角色只能读取附件信息和内容。", deniedAction, file.objectType, file.objectId, file.projectId);
    }
    return true;
  }
  if (file.objectType === "supplier") {
    if (isSupplierRole(req.auth.roleId)) {
      if (!supplierIdMatches(req.auth.user, file.objectId)) {
        return denyResponse(ctx, req, res, 403, "SUPPLIER_FILE_DOWNLOAD_DENIED", "供应商只能访问本企业资质附件。", deniedAction, file.objectType, file.objectId);
      }
      return action === "read" || file.uploadedBy === req.auth.user.id;
    }
    if (req.auth.roleId === "admin") {
      return denyResponse(ctx, req, res, 403, "FILE_DOWNLOAD_DENIED", "系统管理员不能读取供应商附件内容。", deniedAction, file.objectType, file.objectId);
    }
    if (!isOrgReaderRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, action === "read" ? "FILE_DOWNLOAD_DENIED" : "FILE_WRITE_DENIED", "当前角色无权访问该供应商附件。", deniedAction, file.objectType, file.objectId);
    }
    if (action === "write" && !isProcurementMaintainerRole(req.auth.roleId)) {
      return denyResponse(ctx, req, res, 403, "FILE_WRITE_DENIED", "审计角色只能读取附件信息和内容。", deniedAction, file.objectType, file.objectId);
    }
    return true;
  }
  if (file.objectType === "mall_order") {
    const order = ctx.state.mallOrders.find((item) => item.id === file.objectId);
    if (!order) {
      res.status(404).json({ error: { code: "MALL_ORDER_NOT_FOUND", message: "Mall order does not exist." } });
      return false;
    }
    if (isSupplierRole(req.auth.roleId)) {
      if (!supplierIdMatches(req.auth.user, order.supplierId) || !supplierIdMatches(req.auth.user, file.supplierId)) {
        return denyResponse(ctx, req, res, 403, "SUPPLIER_FILE_DOWNLOAD_DENIED", "供应商只能访问本企业订单附件。", deniedAction, file.objectType, file.objectId);
      }
      return action === "read" || file.uploadedBy === req.auth.user.id;
    }
    if (req.auth.roleId === "admin") {
      return denyResponse(ctx, req, res, 403, "FILE_DOWNLOAD_DENIED", "系统管理员不能读取业务附件内容。", deniedAction, file.objectType, file.objectId);
    }
    if (isOrgReaderRole(req.auth.roleId) && userOrgScope(req.auth.user).includes(order.orgId)) {
      if (action === "write" && !isProcurementMaintainerRole(req.auth.roleId)) {
        return denyResponse(ctx, req, res, 403, "FILE_WRITE_DENIED", "审计角色只能读取附件信息和内容。", deniedAction, file.objectType, file.objectId);
      }
      return true;
    }
    return denyResponse(ctx, req, res, 403, action === "read" ? "FILE_DOWNLOAD_DENIED" : "FILE_WRITE_DENIED", "当前角色无权访问该订单附件。", deniedAction, file.objectType, file.objectId);
  }
  return denyResponse(ctx, req, res, 403, action === "read" ? "FILE_DOWNLOAD_DENIED" : "FILE_WRITE_DENIED", "当前角色无权访问该附件。", deniedAction, file.objectType, file.objectId);
}

function canListFile(ctx: AppContext, req: Request, file: StoredFileRecord) {
  if (isMallCatalogAsset(ctx, req, file)) return true;
  if (file.projectId) {
    const project = ctx.state.projects.find((item) => item.id === file.projectId);
    if (!project) return false;
    if (isSupplierRole(req.auth.roleId)) return supplierIdMatches(req.auth.user, file.supplierId);
    return isOrgReaderRole(req.auth.roleId) && canReadProject(req, project);
  }
  if (file.objectType === "supplier") {
    if (isSupplierRole(req.auth.roleId)) return supplierIdMatches(req.auth.user, file.objectId);
    return isOrgReaderRole(req.auth.roleId);
  }
  if (file.objectType === "mall_order") {
    const order = ctx.state.mallOrders.find((item) => item.id === file.objectId);
    if (!order) return false;
    if (isSupplierRole(req.auth.roleId)) return supplierIdMatches(req.auth.user, order.supplierId) && supplierIdMatches(req.auth.user, file.supplierId);
    return isOrgReaderRole(req.auth.roleId) && userOrgScope(req.auth.user).includes(order.orgId);
  }
  return false;
}

function isMallCatalogAsset(ctx: AppContext, req: Request, file: StoredFileRecord) {
  if (file.objectType === "mall_product") {
    const product = ctx.state.mallProducts.find((item) => item.id === file.objectId);
    if (!product) return false;
    if (isSupplierRole(req.auth.roleId)) return supplierIdMatches(req.auth.user, product.supplierId) && supplierIdMatches(req.auth.user, file.supplierId);
    return isOrgReaderRole(req.auth.roleId) && (product.status === "listed" || isProcurementMaintainerRole(req.auth.roleId));
  }
  if (file.objectType === "mall_scenario_template") {
    const template = ctx.state.mallScenarioTemplates.find((item) => item.id === file.objectId);
    if (!template) return false;
    if (isSupplierRole(req.auth.roleId)) return false;
    return isOrgReaderRole(req.auth.roleId) && template.status === "active";
  }
  return false;
}

function readMultipartUpload(ctx: AppContext, req: Request, res: Response, callback: (result: { fields: Record<string, string>; filePart: { fileName: string; contentType: string; body: Buffer } }) => void) {
  const contentTypeHeader = req.header("content-type") ?? "";
  const boundaryMatch = contentTypeHeader.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    res.status(400).json({ error: { code: "MULTIPART_BOUNDARY_MISSING", message: "Multipart boundary is required." } });
    return;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  req.on("data", (chunk: Buffer) => {
    size += chunk.byteLength;
    if (size <= ctx.config.fileUploadMaxBytes + 1024 * 1024) chunks.push(chunk);
  });
  req.on("end", () => {
    if (size > ctx.config.fileUploadMaxBytes + 1024 * 1024) {
      res.status(400).json({ error: { code: "FILE_TOO_LARGE", message: `File exceeds ${ctx.config.fileUploadMaxBytes} bytes limit.` } });
      return;
    }
    const parsed = parseMultipart(Buffer.concat(chunks), boundaryMatch[1] ?? boundaryMatch[2]);
    const filePart = parsed.files.find((item) => item.fieldName === "file");
    if (!filePart) {
      res.status(400).json({ error: { code: "FILE_UPLOAD_INVALID", message: "file is required." } });
      return;
    }
    callback({ fields: parsed.fields, filePart });
  });
  req.on("error", () => res.status(400).json({ error: { code: "MULTIPART_READ_FAILED", message: "Unable to read uploaded file." } }));
}

export function fileRoutes(ctx: AppContext) {
  const router = Router();

  router.get("/files", (req, res) => {
    const files = ctx.fileStore
      .list({
        objectType: req.query.objectType === undefined ? undefined : String(req.query.objectType),
        objectId: req.query.objectId === undefined ? undefined : String(req.query.objectId),
        projectId: req.query.projectId === undefined ? undefined : String(req.query.projectId),
        supplierId: req.query.supplierId === undefined ? undefined : String(req.query.supplierId),
        includeDeleted: req.query.includeDeleted === "true"
      })
      .filter((file) => canListFile(ctx, req, file))
      .map(fileSummary);
    return res.json({ files });
  });

  router.post("/files/upload", (req, res) => {
    const originalName = String(req.body?.originalName ?? "").trim();
    const contentType = String(req.body?.contentType ?? "application/octet-stream");
    const attachmentKind = String(req.body?.attachmentKind ?? "generic");
    const objectType = String(req.body?.objectType ?? "generic");
    const objectId = String(req.body?.objectId ?? "");
    const projectId = req.body?.projectId === undefined ? undefined : String(req.body.projectId);
    const supplierId = req.body?.supplierId === undefined ? req.auth.user.supplierId : String(req.body.supplierId);
    const body = decodeBody(req.body);

    if (!objectId || !body) {
      return res.status(400).json({ error: { code: "FILE_UPLOAD_INVALID", message: "originalName, objectId and contentBase64 are required." } });
    }
    const scope = { attachmentKind, objectType, objectId, projectId, supplierId };
    const fileError = validateUploadFile(ctx, originalName, contentType, body);
    if (fileError) return res.status(400).json({ error: fileError });
    if (!validateUploadScope(ctx, req, res, scope)) return;
    return res.status(201).json(storedFileResponse(ctx, req.auth, scope, originalName, contentType, body));
  });

  router.post("/files/upload-multipart", (req, res) => {
    readMultipartUpload(ctx, req, res, ({ fields, filePart }) => {
      const objectId = fields.objectId ?? "";
      const scope: UploadScope = {
        attachmentKind: fields.attachmentKind ?? "generic",
        objectType: fields.objectType ?? "generic",
        objectId,
        projectId: fields.projectId,
        supplierId: fields.supplierId ?? req.auth.user.supplierId
      };
      if (!objectId) {
        return res.status(400).json({ error: { code: "FILE_UPLOAD_INVALID", message: "file and objectId are required." } });
      }
      const contentType = filePart.contentType || "application/octet-stream";
      const fileError = validateUploadFile(ctx, filePart.fileName, contentType, filePart.body);
      if (fileError) return res.status(400).json({ error: fileError });
      if (!validateUploadScope(ctx, req, res, scope)) return;
      return res.status(201).json(storedFileResponse(ctx, req.auth, scope, filePart.fileName, contentType, filePart.body));
    });
  });

  router.post("/files/:fileId/replace", (req, res) => {
    const current = ctx.fileStore.get(req.params.fileId);
    if (!current) return res.status(404).json({ error: { code: "FILE_NOT_FOUND", message: "File does not exist." } });
    if (!assertFileAccess(ctx, req, res, current, "write")) return;
    readMultipartUpload(ctx, req, res, ({ fields, filePart }) => {
      const contentType = filePart.contentType || "application/octet-stream";
      const fileError = validateUploadFile(ctx, filePart.fileName, contentType, filePart.body);
      if (fileError) return res.status(400).json({ error: fileError });
      const replacement = ctx.fileStore.replace(current.fileId, {
        originalName: filePart.fileName,
        contentType,
        body: filePart.body,
        attachmentKind: fields.attachmentKind ?? current.attachmentKind,
        objectType: fields.objectType ?? current.objectType,
        objectId: fields.objectId ?? current.objectId,
        projectId: fields.projectId ?? current.projectId,
        supplierId: fields.supplierId ?? current.supplierId,
        uploadedBy: req.auth.user.id
      });
      if (!replacement) return res.status(404).json({ error: { code: "FILE_NOT_FOUND", message: "File does not exist." } });
      const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "file.replace", current.objectType, current.objectId, current.projectId, `from=${current.fileId};to=${replacement.fileId};version=${replacement.versionNo}`);
      return res.status(201).json({ file: fileSummary(replacement), previousFileId: current.fileId, auditLogId: auditLog.id });
    });
  });

  router.post("/files/:fileId/discard", (req, res) => {
    const current = ctx.fileStore.get(req.params.fileId);
    if (!current) return res.status(404).json({ error: { code: "FILE_NOT_FOUND", message: "File does not exist." } });
    if (!assertFileAccess(ctx, req, res, current, "write")) return;
    const reason = String(req.body?.reason ?? "file discarded").trim() || "file discarded";
    const discarded = ctx.fileStore.softDelete(current.fileId, req.auth.user.id, reason);
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "file.discard", current.objectType, current.objectId, current.projectId, reason);
    return res.json({ file: discarded ? fileSummary(discarded) : null, auditLogId: auditLog.id });
  });

  router.get("/files/:fileId/versions", (req, res) => {
    const file = ctx.fileStore.get(req.params.fileId);
    if (!file) return res.status(404).json({ error: { code: "FILE_NOT_FOUND", message: "File does not exist." } });
    if (!assertFileAccess(ctx, req, res, file, "read")) return;
    return res.json({ versions: ctx.fileStore.versions(file).map(fileSummary) });
  });

  router.get("/files/:fileId/download", (req, res) => {
    const file = ctx.fileStore.get(req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: { code: "FILE_NOT_FOUND", message: "File does not exist." } });
    }
    if (!assertFileAccess(ctx, req, res, file, "read")) return;
    const auditLog = ctx.policies.auditRequiredAction.recordSensitiveAction(req.auth, "file.download", file.objectType, file.objectId, file.projectId, `fileId=${file.fileId}`);
    res.setHeader("x-audit-log-id", auditLog.id);
    res.setHeader("content-type", file.contentType);
    res.setHeader("content-disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    return res.sendFile(file.absolutePath);
  });

  return router;
}

function normalizedExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function parseMultipart(body: Buffer, boundary: string) {
  const delimiter = Buffer.from(`--${boundary}`);
  const fields: Record<string, string> = {};
  const files: Array<{ fieldName: string; fileName: string; contentType: string; body: Buffer }> = [];
  let cursor = 0;
  while (cursor < body.length) {
    const start = body.indexOf(delimiter, cursor);
    if (start < 0) break;
    const next = body.indexOf(delimiter, start + delimiter.length);
    if (next < 0) break;
    let part = body.subarray(start + delimiter.length, next);
    if (part.subarray(0, 2).toString() === "--") break;
    if (part.subarray(0, 2).toString() === "\r\n") part = part.subarray(2);
    if (part.subarray(part.length - 2).toString() === "\r\n") part = part.subarray(0, part.length - 2);
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd >= 0) {
      const rawHeaders = part.subarray(0, headerEnd).toString("utf8");
      const content = part.subarray(headerEnd + 4);
      const disposition = rawHeaders.match(/content-disposition:\s*form-data;\s*([^\r\n]+)/i)?.[1] ?? "";
      const name = disposition.match(/name="([^"]+)"/i)?.[1] ?? "";
      const fileName = decodeMultipartFileName(disposition);
      const contentType = rawHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() ?? "";
      if (name && fileName) {
        files.push({ fieldName: name, fileName, contentType, body: content });
      } else if (name) {
        fields[name] = content.toString("utf8");
      }
    }
    cursor = next;
  }
  return { fields, files };
}

function decodeMultipartFileName(disposition: string) {
  const encoded = disposition.match(/filename\*=([^;]+)/i)?.[1]?.trim();
  if (encoded) {
    const utf8 = encoded.match(/^UTF-8''(.+)$/i)?.[1];
    if (utf8) return decodeURIComponent(utf8);
    return encoded.replace(/^"|"$/g, "");
  }
  const raw = disposition.match(/filename="([^"]*)"/i)?.[1] ?? "";
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
