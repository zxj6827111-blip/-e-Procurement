import type { DataTableColumn } from "../../components/base";
import type { SiteType } from "./types";

export const ONBOARDING_STEPS = ["账号注册", "基础信息", "联系人信息", "主营产品", "办公室、工厂及展厅", "企业资料", "入驻问卷"];

export const STEP_COLUMNS: DataTableColumn[] = [
  { key: "index", label: "序号" },
  { key: "name", label: "步骤" },
  { key: "status", label: "状态" }
];

export const SITE_TYPE_OPTIONS: Array<{ value: SiteType; label: string }> = [
  { value: "office", label: "办公室" },
  { value: "factory", label: "工厂" },
  { value: "showroom", label: "展厅" },
  { value: "warehouse", label: "仓库" },
  { value: "other", label: "其他" }
];

export function attachmentText(count: number, emptyText: string) {
  return count ? `已选择 ${count} 个文件` : emptyText;
}
