const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
let currentMockUserId = "u2";

export function setCurrentMockUserId(userId: string) {
  currentMockUserId = userId || "u2";
}

function buildHeaders(userId: string, hasBody: boolean) {
  const headers: Record<string, string> = {};
  if (hasBody) headers["content-type"] = "application/json";
  if (import.meta.env.DEV && sessionStorage.getItem("demoAuthActive") === "true") {
    headers["x-mock-user-id"] = userId;
  }
  return headers;
}

function normalizeErrorMessage(message: string, status: number, path: string) {
  const value = message || "";
  if (/Current role cannot access this file/i.test(value)) return "当前角色无权访问该附件。";
  if (/Current role cannot access this supplier file/i.test(value)) return "当前角色无权访问该供应商附件。";
  if (/Current role cannot access this mall order file/i.test(value)) return "当前角色无权访问该订单附件。";
  if (/Supplier can only access own/i.test(value)) return "供应商只能访问本企业资料。";
  if (/Supplier can only upload files for own in-scope project objects/i.test(value)) return "供应商只能上传本企业、当前可报名公告范围内的材料。";
  if (/Supplier can only upload registration files/i.test(value)) return "供应商只能上传本企业、当前可报名公告范围内的报名材料。";
  if (/Only supplier accounts can upload own registration files/i.test(value)) return "只有当前供应商账号可以上传本企业报名材料。";
  if (/Supplier must complete registration before bidding/i.test(value)) return "当前项目还不能报价。请先在“报名资料”完成报名，资格通过或进入报价阶段后再提交报价。";
  if (/Supplier is not authorized for this procurement category/i.test(value)) return "当前供应商未授权参与该采购品类，不能报名。请联系采购方在供应商档案中补充该品类授权后再提交。";
  if (/Approved award approval is required before contract signing/i.test(value)) return "请先完成中标审批，再发起合同签订。";
  if (/Contract supplier must be the awarded supplier/i.test(value)) return "合同供应商必须是本项目的中标供应商。";
  if (/Supplier can only confirm own contract/i.test(value)) return "供应商只能确认本企业的合同。";
  if (/Supplier must confirm the contract before awarded products can be listed/i.test(value)) return "请先由中标供应商确认合同，再上架中标商品。";
  if (/Approved award approval is required before listing awarded products/i.test(value)) return "请先完成中标审批，再上架中标商品。";
  if (/System administrators cannot read/i.test(value)) return "系统管理员不能读取业务附件内容。";
  if (/Login is required/i.test(value)) return "请先登录。";
  if (/Current password is incorrect/i.test(value)) return "当前密码不正确。";
  if (/New password and confirmation do not match/i.test(value)) return "两次输入的新密码不一致。";
  if (/New password must be at least/i.test(value)) return "新密码至少需要 8 位。";
  if (/New password must be different from current password/i.test(value)) return "新密码不能和当前密码相同。";
  if (/Change password through the configured enterprise identity provider/i.test(value)) return "当前账号需要到统一身份系统修改密码。";
  if (/must change temporary password/i.test(value)) return "当前账号必须先修改临时密码，才能继续使用业务功能。";
  if (/Procurement document review has been retired/i.test(value)) return "采购文件不再走集团审核，请由采购经办直接发布并锁定。";
  if (/Procurement document must be approved before publishing/i.test(value)) return "请由采购经办先发布并锁定采购文件。";
  if (/Announcement requires a published and locked procurement document/i.test(value)) return "公告必须选择已发布并锁定的采购文件。请先由采购经办在采购文件页发布并锁定。";
  if (/Procurement document under review cannot be revised before approval or rejection/i.test(value)) return "采购文件处于旧审核状态，请由采购经办发布锁定或作废后重新创建。";
  if (/Published procurement documents are locked/i.test(value)) return "已发布并锁定的采购文件不能再次提交审核。";
  if (/Procurement document has already been published and locked/i.test(value)) return "采购文件已经发布并锁定，无需重复发布。";
  if (value.startsWith("API ")) return `请求失败（${status}）。`;
  return value || `请求失败（${status}）：${path}`;
}

async function apiRequest<T>(method: string, path: string, userId = currentMockUserId, body?: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    credentials: "include",
    headers: buildHeaders(userId, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string; auditLogId?: string } } | null;
    const error = new Error(normalizeErrorMessage(payload?.error?.message ?? "", response.status, path));
    Object.assign(error, { auditLogId: payload?.error?.auditLogId, status: response.status });
    throw error;
  }
  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string, userId = currentMockUserId): Promise<T> {
  return apiRequest<T>("GET", path, userId);
}

export function apiPost<T>(path: string, body?: unknown, userId = currentMockUserId): Promise<T> {
  return apiRequest<T>("POST", path, userId, body);
}

export function apiPatch<T>(path: string, body?: unknown, userId = currentMockUserId): Promise<T> {
  return apiRequest<T>("PATCH", path, userId, body);
}

export function apiDelete<T>(path: string, userId = currentMockUserId): Promise<T> {
  return apiRequest<T>("DELETE", path, userId);
}

export async function apiBlob(path: string, userId = currentMockUserId): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(userId, false)
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string; auditLogId?: string } } | null;
    const error = new Error(normalizeErrorMessage(payload?.error?.message ?? "", response.status, path));
    Object.assign(error, { auditLogId: payload?.error?.auditLogId, status: response.status });
    throw error;
  }
  return response.blob();
}

async function multipartRequest<T>(path: string, formData: FormData, userId = currentMockUserId): Promise<T> {
  const headers = buildHeaders(userId, false);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string; auditLogId?: string } } | null;
    const error = new Error(normalizeErrorMessage(payload?.error?.message ?? "", response.status, path));
    Object.assign(error, { auditLogId: payload?.error?.auditLogId, status: response.status });
    throw error;
  }
  return response.json() as Promise<T>;
}

export function bufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  for (const item of new Uint8Array(buffer)) {
    binary += String.fromCharCode(item);
  }
  return btoa(binary);
}

export interface UploadPayload {
  fileName: string;
  contentType: string;
  contentBase64: string;
  sizeBytes: number;
}

export async function toUploadPayload(file: File): Promise<UploadPayload> {
  return {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    contentBase64: bufferToBase64(await file.arrayBuffer()),
    sizeBytes: file.size
  };
}

export interface UploadedFileMetadata {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  versionNo?: number;
  previewable?: boolean;
  objectType?: string;
  objectId?: string;
  attachmentKind?: string;
  projectId?: string;
  supplierId?: string;
  deletedAt?: string;
}

export async function uploadFile(
  file: File,
  options: {
    attachmentKind: string;
    objectType: string;
    objectId: string;
    projectId?: string;
    supplierId?: string;
  },
  userId = currentMockUserId
) {
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("attachmentKind", options.attachmentKind);
  formData.append("objectType", options.objectType);
  formData.append("objectId", options.objectId);
  if (options.projectId) formData.append("projectId", options.projectId);
  if (options.supplierId) formData.append("supplierId", options.supplierId);
  return multipartRequest<{ file: UploadedFileMetadata; auditLogId?: string }>("/api/files/upload-multipart", formData, userId);
}

export async function replaceFile(
  fileId: string,
  file: File,
  options: {
    attachmentKind?: string;
    objectType?: string;
    objectId?: string;
    projectId?: string;
    supplierId?: string;
  } = {},
  userId = currentMockUserId
) {
  const formData = new FormData();
  formData.append("file", file, file.name);
  if (options.attachmentKind) formData.append("attachmentKind", options.attachmentKind);
  if (options.objectType) formData.append("objectType", options.objectType);
  if (options.objectId) formData.append("objectId", options.objectId);
  if (options.projectId) formData.append("projectId", options.projectId);
  if (options.supplierId) formData.append("supplierId", options.supplierId);
  return multipartRequest<{ file: UploadedFileMetadata; previousFileId: string; auditLogId?: string }>(`/api/files/${fileId}/replace`, formData, userId);
}

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}
