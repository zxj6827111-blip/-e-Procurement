import type { ProcessTaskView } from "../../api/process";
import type { R8WorkflowTaskView } from "../../api/workflow";

export interface ProjectRow {
  id: string;
  name?: string;
  title?: string;
  status: string;
  budgetAmount?: number;
  supplierId?: string;
  createdAt?: string;
  updatedAt?: string;
  dueAt?: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  status: string;
  admissionStatus?: string;
  qualification?: string;
  risk?: string;
  qualificationAttachments?: unknown[];
  sealSamples?: unknown[];
  admissionReviews?: Array<{ status: string; reviewedAt?: string; opinion?: string }>;
}

export interface ProductRow {
  id: string;
  name: string;
  status: string;
  supplierName?: string;
  supplierId: string;
  activePrice?: { salePrice?: number; price?: number; deliveryDays?: number } | null;
}

export interface OrderRow {
  id: string;
  orderNo: string;
  supplierId: string;
  status: string;
  totalAmount: number;
  paymentStatus?: string;
  createdAt?: string;
}

export interface AuditRow {
  id: string;
  action: string;
  objectType: string;
  objectId: string;
  createdAt?: string;
  result?: string;
}

export interface WorkbenchPayload {
  purchaseOrders: OrderRow[];
}

export interface SummaryCard {
  label: string;
  value: string | number;
  meta?: string;
  tone: "blue" | "green" | "amber" | "red";
  to?: string;
}

export interface DashboardTodoItem {
  title: string;
  meta: string;
  status: string;
  to: string;
  due?: string;
  risk?: string;
}

export interface WorkbenchListItem {
  text: string;
  tone?: "neutral" | "warning";
}

export function taskKey(task: Pick<ProcessTaskView | R8WorkflowTaskView, "businessType" | "businessId" | "taskType">) {
  return `${task.businessType}:${task.businessId}:${task.taskType}`;
}
