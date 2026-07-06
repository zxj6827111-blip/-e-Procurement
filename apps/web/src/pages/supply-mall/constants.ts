import type { DataTableColumn } from "../../components/base";
import type {
  MallCopyOrderForm,
  MallOrderForm,
  MallQuestionnaireForm,
  PriceForm,
  ProductForm,
  ScenarioForm,
  TemplateOrderForm
} from "./types";

export const BUYER_ROLES = ["buyer", "hotel_buyer", "platform_operator"];
export const SUPPLIER_ADMIN_ROLES = ["supplier", "supplier_admin"];
export const OPERATOR_ROLES = ["buyer", "platform_operator"];
export const LISTING_OPERATOR_ROLES = ["group_manager", "buyer", "platform_operator"];

export const PRODUCT_LISTING_STEPS = ["供应商维护商品", "平台关联来源", "生成/选择定价报告", "平台上架", "酒店采购下单"];

export const PRODUCT_COLUMNS: DataTableColumn[] = [
  { key: "name", label: "商品编号 / 商品名称" },
  { key: "category", label: "分类" },
  { key: "unit", label: "单位" },
  { key: "price", label: "参考价" },
  { key: "status", label: "上架状态" },
  { key: "actions", label: "操作" }
];

export const ORDER_COLUMNS: DataTableColumn[] = [
  { key: "orderNo", label: "订单编号" },
  { key: "supplier", label: "供应商名称" },
  { key: "status", label: "订单状态" },
  { key: "amount", label: "订单金额" },
  { key: "address", label: "收货地址" },
  { key: "actions", label: "处理" }
];

export const TEMPLATE_COLUMNS: DataTableColumn[] = [
  { key: "name", label: "采购包名称" },
  { key: "type", label: "适用类型" },
  { key: "summary", label: "配置摘要" },
  { key: "actions", label: "处理" }
];

export function createProductForm(): ProductForm {
  return {
    name: "",
    category: "客房物资",
    brand: "",
    unit: "件",
    skuCode: "",
    specification: "",
    procurementCategory: "客房物资",
    invoiceName: "",
    taxClassificationCode: "",
    detailDescription: "",
    acceptanceGuide: "",
    installationRequirement: "",
    packingQuantity: 1,
    minOrderQty: 1,
    maxOrderQty: undefined,
    taxRate: 0.13,
    serviceRegions: "全国",
    tags: ""
  };
}

export function createPriceForm(): PriceForm {
  return {
    productId: "",
    sourceType: "agreement",
    sourceProjectId: "",
    sourceAgreementNo: "",
    pricingReportId: "",
    pricingReportItemId: "",
    purchasePrice: 0,
    salePrice: 0,
    taxRate: 0.13,
    deliveryDays: 3,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: ""
  };
}

export function createOrderForm(): MallOrderForm {
  return {
    shippingAddress: "上海滨江华礼酒店后勤仓",
    invoiceTitle: "华礼酒店集团",
    expectedDeliveryAt: "",
    departmentId: ""
  };
}

export function createCopyOrderForm(): MallCopyOrderForm {
  return {
    shippingAddress: "复购订单收货地址",
    invoiceTitle: "华礼酒店集团",
    expectedDeliveryAt: ""
  };
}

export function createScenarioForm(): ScenarioForm {
  return {
    templateType: "opening_package",
    name: "",
    productQuantities: "",
    applicableBrands: "华礼",
    applicableHotelTypes: "高端酒店",
    applicableHotelIds: "org-hotel",
    roomCount: 100,
    budgetAmount: 10000,
    description: ""
  };
}

export function createQuestionnaireForm(): MallQuestionnaireForm {
  return {
    title: "门店开业物资问卷",
    scope: "新开业门店",
    targetSupplierIds: "",
    questions: "room-count|客房数量|number|1000\nlinen-spec|布草规格|text|\nopening-date|开业日期|text|"
  };
}

export function createTemplateOrderForm(): TemplateOrderForm {
  return {
    shippingAddress: "场景包收货地址",
    invoiceTitle: "华礼酒店集团",
    expectedDeliveryAt: "",
    departmentId: ""
  };
}
