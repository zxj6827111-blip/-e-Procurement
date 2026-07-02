import type { UploadedFileMetadata } from "../../api/http";
import type { DataTableColumn, SummaryCardItem } from "../../components/base";

export interface MallProduct {
  id: string;
  name: string;
  category: string;
  brand?: string;
  unit: string;
  skuCode: string;
  specification: string;
  procurementCategory?: string;
  invoiceName?: string;
  taxClassificationCode?: string;
  detailDescription?: string;
  acceptanceGuide?: string;
  installationRequirement?: string;
  packingQuantity?: number;
  minOrderQty?: number;
  maxOrderQty?: number;
  taxRate?: number;
  supplierId: string;
  supplierName?: string;
  serviceRegions?: string[];
  tags?: string[];
  status: string;
  activePrice?: {
    price?: number;
    salePrice?: number;
    purchasePrice?: number;
    deliveryDays?: number;
    taxRate?: number;
    effectiveFrom?: string;
    effectiveTo?: string;
  } | null;
  priceSource?: {
    type: string;
    sourceId: string;
    trace?: { reportNo?: string; quotationId?: string };
  } | null;
  sourceType?: "award_project" | "agreement";
  sourceProjectId?: string;
  sourceAgreementNo?: string;
  sourcePricingReportId?: string;
  sourcePricingReportItemId?: string;
  listedAt?: string | null;
  sourceCompleted?: boolean;
  sourceTrace?: {
    type?: string;
    projectId?: string;
    projectCode?: string;
    projectName?: string;
    agreementNo?: string;
    pricingReportId?: string;
    pricingReportNo?: string;
    pricingReportItemId?: string;
  };
  availablePricingReports?: Array<{
    id: string;
    reportNo?: string;
    projectId?: string;
    status: string;
    items: Array<{ id: string; salePrice: number; purchasePrice: number; effectiveFrom?: string; effectiveTo?: string }>;
  }>;
  imageFileIds?: string[];
  imageFileMetadata?: UploadedFileMetadata[];
  attachmentFileIds?: string[];
  attachmentFileMetadata?: UploadedFileMetadata[];
  blockReasons?: string[];
}

export interface MallOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  supplierName?: string;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  orgId?: string;
  invoiceTitle?: string;
  expectedDeliveryAt?: string;
  paymentStatus?: string;
  lineItems: Array<{ productId: string; productName: string; quantity: number; unit: string; unitPrice: number; totalPrice: number }>;
}

export interface ScenarioTemplate {
  id: string;
  templateType: string;
  name: string;
  budgetAmount?: number;
  applicableBrands?: string[];
  applicableHotelTypes?: string[];
  applicableHotelIds?: string[];
  roomCount?: number;
  description?: string;
  packageItems?: Array<{ productId: string; quantity: number }>;
  productIds?: string[];
  attachmentFileIds?: string[];
  attachmentFileMetadata?: UploadedFileMetadata[];
}

export interface MallQuestionnaire {
  id: string;
  title: string;
  scope: string;
  status: string;
  submissions?: unknown[];
}

export interface FundAccount {
  id: string;
  orgId: string;
  orgName?: string;
  balance: number;
  creditLimit: number;
  occupiedAmount: number;
  status: string;
}

export interface SupplierRow {
  id: string;
  name: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface ProjectRow {
  id: string;
  code: string;
  name: string;
  externalTradeFlag?: boolean;
}

export interface ScenarioForm {
  templateType: string;
  name: string;
  productQuantities: string;
  applicableBrands: string;
  applicableHotelTypes: string;
  applicableHotelIds: string;
  roomCount: number;
  budgetAmount: number;
  description: string;
}

export interface MallQuestionnaireForm {
  title: string;
  scope: string;
  targetSupplierIds: string;
  questions: string;
}

export interface TemplateOrderForm {
  shippingAddress: string;
  invoiceTitle: string;
  expectedDeliveryAt: string;
  departmentId: string;
}

export interface MallOrderForm {
  shippingAddress: string;
  invoiceTitle: string;
  expectedDeliveryAt: string;
  departmentId: string;
}

export interface MallCopyOrderForm {
  shippingAddress: string;
  invoiceTitle: string;
  expectedDeliveryAt: string;
}

export interface ProductForm {
  name: string;
  category: string;
  brand: string;
  unit: string;
  skuCode: string;
  specification: string;
  procurementCategory: string;
  invoiceName: string;
  taxClassificationCode: string;
  detailDescription: string;
  acceptanceGuide: string;
  installationRequirement: string;
  packingQuantity: number;
  minOrderQty: number;
  maxOrderQty?: number;
  taxRate: number;
  serviceRegions: string;
  tags: string;
}

export interface PriceForm {
  productId: string;
  sourceType: "" | "award_project" | "agreement";
  sourceProjectId: string;
  sourceAgreementNo: string;
  pricingReportId: string;
  pricingReportItemId: string;
  purchasePrice: number;
  salePrice: number;
  taxRate: number;
  deliveryDays: number;
  effectiveFrom: string;
  effectiveTo: string;
}

export type PricingReport = NonNullable<MallProduct["availablePricingReports"]>[number];
export type PricingReportItem = PricingReport["items"][number];
export type MallSection = "catalog" | "orders" | "packages" | "maintenance" | "pricing";
export interface MallNavigationItem {
  key: MallSection;
  label: string;
  path: string;
  visible: boolean;
}
export type { DataTableColumn, SummaryCardItem };
