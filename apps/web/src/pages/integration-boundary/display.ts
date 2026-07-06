import { formatDateTime } from "../../utils/status-labels";
import type { IntegrationLog } from "./types";

export const adapterColumns = [
  { key: "key", label: "适配器编号" },
  { key: "name", label: "适配器名称" },
  { key: "mode", label: "运行模式" },
  { key: "logs", label: "日志数" }
];

export const jobColumns = [
  { key: "job", label: "任务编号" },
  { key: "key", label: "适配器" },
  { key: "operation", label: "操作" },
  { key: "business", label: "业务对象" },
  { key: "status", label: "任务状态" },
  { key: "request", label: "请求" },
  { key: "response", label: "响应 / 错误" },
  { key: "updatedAt", label: "更新时间" },
  { key: "actions", label: "处理" }
];

export function payloadText(value: unknown) {
  if (value === undefined || value === null) return "-";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function jobId(job: IntegrationLog) {
  return job.jobId ?? job.id;
}

export function jobUpdatedAt(job: IntegrationLog) {
  return formatDateTime(job.updatedAt || job.createdAt || "");
}
