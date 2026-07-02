import type { DataTableColumn } from "../../components/base";

export const FILE_COLUMNS: DataTableColumn[] = [
  { key: "file", label: "文件" },
  { key: "object", label: "归属对象" },
  { key: "kind", label: "类型" },
  { key: "version", label: "版本" },
  { key: "uploadedBy", label: "上传人" },
  { key: "uploadedAt", label: "上传时间" },
  { key: "actions", label: "操作" }
];

export const objectTypeLabels: Record<string, string> = {
  procurement_request: "采购申请",
  procurement_document: "采购文件",
  supplier: "供应商档案",
  supplier_registration: "报名资料",
  bid: "报价响应",
  settlement_material: "结算资料",
  mall_product: "商城商品",
  mall_order: "商城订单",
  archive_supplement_request: "补档申请",
  external_trade_record: "外部交易备案"
};
