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
  if (/System administrators cannot read/i.test(value)) return "系统管理员不能读取业务附件内容。";
  if (/Login is required/i.test(value)) return "请先登录。";
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
