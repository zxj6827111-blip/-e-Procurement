import type { RuntimeDb } from "../runtime/index.js";
import type {
  MallPrice,
  MallProduct,
  Supplier,
  SupplierAdmissionReview,
  SupplierCategoryAuthorization,
  SupplierEvaluation,
  SupplierQualificationAttachment,
  SupplierSealSample,
  SupplierServiceRegion
} from "../types.js";

type SqlValue = string | number | bigint | null | Uint8Array;
type Row = Record<string, SqlValue | undefined>;
type RunnableStatement = { run: (...values: SqlValue[]) => unknown };

function json<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function run(statement: RunnableStatement, values: SqlValue[]) {
  statement.run(...values);
}

function optionalString(value: SqlValue | undefined) {
  return value === null || value === undefined ? undefined : String(value);
}

function optionalNumber(value: SqlValue | undefined) {
  return value === null || value === undefined ? undefined : Number(value);
}

export class R3SupplierProductRepository {
  constructor(private readonly runtimeDb: RuntimeDb) {}

  listSuppliers(): Supplier[] {
    const suppliers = this.runtimeDb.db.prepare("select * from r2_suppliers order by id").all() as Row[];
    return suppliers.map((row) => this.supplierFromRow(row));
  }

  getSupplier(supplierId: string): Supplier | null {
    const row = this.runtimeDb.db.prepare("select * from r2_suppliers where id = ?").get(supplierId) as Row | undefined;
    return row ? this.supplierFromRow(row) : null;
  }

  upsertSupplier(supplier: Supplier) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_suppliers (
          id, supplier_name, admission_status, supplier_status, contact_name, contact_phone, contact_email,
          supplier_type, supplier_source, social_credit_code, business_license_no, legal_representative,
          registered_address, business_scope, qualification_status, risk_note, restriction_reason, restricted_at,
          evaluation_score, admission_level, admission_rule_code, admission_rule_snapshot_json, regularized_at,
          periodic_assessment_json, registration_trace_json, category_auth_json, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          supplier_name = excluded.supplier_name,
          admission_status = excluded.admission_status,
          supplier_status = excluded.supplier_status,
          contact_name = excluded.contact_name,
          contact_phone = excluded.contact_phone,
          contact_email = excluded.contact_email,
          supplier_type = excluded.supplier_type,
          supplier_source = excluded.supplier_source,
          social_credit_code = excluded.social_credit_code,
          business_license_no = excluded.business_license_no,
          legal_representative = excluded.legal_representative,
          registered_address = excluded.registered_address,
          business_scope = excluded.business_scope,
          qualification_status = excluded.qualification_status,
          risk_note = excluded.risk_note,
          restriction_reason = excluded.restriction_reason,
          restricted_at = excluded.restricted_at,
          evaluation_score = excluded.evaluation_score,
          admission_level = excluded.admission_level,
          admission_rule_code = excluded.admission_rule_code,
          admission_rule_snapshot_json = excluded.admission_rule_snapshot_json,
          regularized_at = excluded.regularized_at,
          periodic_assessment_json = excluded.periodic_assessment_json,
          registration_trace_json = excluded.registration_trace_json,
          category_auth_json = excluded.category_auth_json,
          updated_at = excluded.updated_at`
      ),
      [
        supplier.id,
        supplier.name,
        supplier.admissionStatus ?? supplier.status,
        supplier.status,
        supplier.contactName ?? null,
        supplier.contactPhone ?? null,
        supplier.contactEmail ?? null,
        supplier.supplierType ?? null,
        supplier.supplierSource ?? null,
        supplier.socialCreditCode ?? null,
        supplier.businessLicenseNo ?? null,
        supplier.legalRepresentative ?? null,
        supplier.registeredAddress ?? null,
        supplier.businessScope ?? null,
        supplier.qualification,
        supplier.risk || "正常",
        supplier.restrictionReason ?? null,
        supplier.restrictedAt ?? null,
        supplier.evaluationScore ?? null,
        supplier.admissionLevel ?? null,
        supplier.admissionRuleCode ?? null,
        supplier.admissionRuleSnapshot ? JSON.stringify(supplier.admissionRuleSnapshot) : null,
        supplier.regularizedAt ?? null,
        supplier.periodicAssessment ? JSON.stringify(supplier.periodicAssessment) : null,
        supplier.registrationTrace ? JSON.stringify(supplier.registrationTrace) : null,
        JSON.stringify(supplier.categoryAuth ?? []),
        now
      ]
    );
    this.replaceSupplierServiceRegions(supplier.id, supplier.serviceRegions ?? []);
    this.replaceSupplierCategoryAuthorizations(supplier.id, supplier.categoryAuthorizations ?? []);
    this.replaceSupplierQualifications(supplier.id, supplier.qualificationAttachments ?? [], supplier.qualification);
    this.replaceSupplierReviews(supplier.id, supplier.admissionReviews ?? []);
    this.replaceSupplierSealSamples(supplier.id, supplier.sealSamples ?? []);
    this.replaceSupplierRestriction(supplier);
  }

  replaceSupplierQualifications(supplierId: string, attachments: SupplierQualificationAttachment[], status: string) {
    const now = new Date().toISOString();
    this.runtimeDb.db.prepare("delete from r2_supplier_qualifications where supplier_id = ?").run(supplierId);
    const statement = this.runtimeDb.db.prepare(
      `insert into r2_supplier_qualifications
       (id, supplier_id, qualification_type, file_id, file_name, valid_until, qualification_status, uploaded_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const attachment of attachments) {
      run(statement, [
        attachment.id,
        supplierId,
        attachment.qualificationType,
        attachment.id,
        attachment.fileName,
        attachment.validUntil ?? null,
        status,
        attachment.uploadedAt,
        now
      ]);
    }
  }

  addSupplierReview(supplierId: string, review: SupplierAdmissionReview) {
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_supplier_admission_reviews
         (id, supplier_id, review_type, review_status, score, reviewer_name, opinion, reviewed_at, score_template_code, score_items_json, regularization_decision, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           review_type = excluded.review_type,
           review_status = excluded.review_status,
           score = excluded.score,
           reviewer_name = excluded.reviewer_name,
           opinion = excluded.opinion,
           reviewed_at = excluded.reviewed_at,
           score_template_code = excluded.score_template_code,
           score_items_json = excluded.score_items_json,
           regularization_decision = excluded.regularization_decision,
           updated_at = excluded.updated_at`
      ),
      [
        review.id,
        supplierId,
        review.reviewType,
        review.status,
        review.score ?? null,
        review.reviewer,
        review.opinion,
        review.reviewedAt,
        review.scoreTemplateCode ?? null,
        review.scoreItems ? JSON.stringify(review.scoreItems) : null,
        review.regularizationDecision ?? null,
        new Date().toISOString()
      ]
    );
  }

  addSupplierEvaluation(evaluation: SupplierEvaluation) {
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_supplier_evaluations
         (id, supplier_id, project_id, purchase_order_id, score, dimensions_json, evaluation_status, locked_at, created_by, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           purchase_order_id = excluded.purchase_order_id,
           score = excluded.score,
           dimensions_json = excluded.dimensions_json,
           evaluation_status = excluded.evaluation_status,
           locked_at = excluded.locked_at,
           updated_at = excluded.updated_at`
      ),
      [
        evaluation.id,
        evaluation.supplierId,
        evaluation.projectId,
        evaluation.purchaseOrderId ?? null,
        evaluation.score,
        JSON.stringify(evaluation.dimensions),
        evaluation.status,
        evaluation.lockedAt,
        evaluation.createdBy,
        evaluation.createdAt,
        new Date().toISOString()
      ]
    );
  }

  listProducts(): MallProduct[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_products order by id").all() as Row[];
    return rows.map((row) => this.productFromRow(row));
  }

  getProduct(productId: string): MallProduct | null {
    const row = this.runtimeDb.db.prepare("select * from r2_products where id = ?").get(productId) as Row | undefined;
    return row ? this.productFromRow(row) : null;
  }

  upsertProduct(product: MallProduct) {
    const now = new Date().toISOString();
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_products (
          id, product_name, category, brand, unit, packing_quantity, min_order_qty, max_order_qty,
          tax_rate, invoice_name, tax_classification_code, detail_description, acceptance_guide,
          installation_requirement, tags_json, product_status, supplier_id, service_regions_json, procurement_category,
          created_by, created_at, updated_at, synced_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          product_name = excluded.product_name,
          category = excluded.category,
          brand = excluded.brand,
          unit = excluded.unit,
          packing_quantity = excluded.packing_quantity,
          min_order_qty = excluded.min_order_qty,
          max_order_qty = excluded.max_order_qty,
          tax_rate = excluded.tax_rate,
          invoice_name = excluded.invoice_name,
          tax_classification_code = excluded.tax_classification_code,
          detail_description = excluded.detail_description,
          acceptance_guide = excluded.acceptance_guide,
          installation_requirement = excluded.installation_requirement,
          tags_json = excluded.tags_json,
          product_status = excluded.product_status,
          supplier_id = excluded.supplier_id,
          service_regions_json = excluded.service_regions_json,
          procurement_category = excluded.procurement_category,
          updated_at = excluded.updated_at,
          synced_at = excluded.synced_at`
      ),
      [
        product.id,
        product.name,
        product.category,
        product.brand,
        product.unit,
        product.packingQuantity ?? null,
        product.minOrderQty ?? null,
        product.maxOrderQty ?? null,
        product.taxRate ?? null,
        product.invoiceName ?? null,
        product.taxClassificationCode ?? null,
        product.detailDescription ?? null,
        product.acceptanceGuide ?? null,
        product.installationRequirement ?? null,
        JSON.stringify(product.tags ?? []),
        product.status,
        product.supplierId,
        JSON.stringify(product.serviceRegions ?? []),
        product.procurementCategory ?? null,
        product.createdBy,
        product.createdAt,
        product.updatedAt,
        now
      ]
    );
    this.upsertSku(product);
    this.replaceProductImages(product.id, product.imageFileIds);
  }

  upsertSku(product: MallProduct) {
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_skus
         (id, product_id, sku_code, specification, unit, sku_status, min_order_qty, max_order_qty, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           sku_code = excluded.sku_code,
           specification = excluded.specification,
           unit = excluded.unit,
           sku_status = excluded.sku_status,
           min_order_qty = excluded.min_order_qty,
           max_order_qty = excluded.max_order_qty,
           updated_at = excluded.updated_at`
      ),
      [`sku:${product.id}`, product.id, product.skuCode, product.specification, product.unit, product.status, product.minOrderQty ?? null, product.maxOrderQty ?? null, new Date().toISOString()]
    );
  }

  replaceProductImages(productId: string, fileIds: string[]) {
    this.runtimeDb.db.prepare("delete from r2_product_images where product_id = ?").run(productId);
    const statement = this.runtimeDb.db.prepare("insert into r2_product_images (id, product_id, file_id, image_role, sort_no, updated_at) values (?, ?, ?, ?, ?, ?)");
    const now = new Date().toISOString();
    fileIds.forEach((fileId, index) => run(statement, [`${productId}:image:${index + 1}`, productId, fileId, index === 0 ? "main" : "detail", index + 1, now]));
  }

  listPrices(): MallPrice[] {
    const rows = this.runtimeDb.db.prepare("select * from r2_supplier_quotations order by id").all() as Row[];
    return rows.map((row) => this.priceFromRow(row));
  }

  getPrice(priceId: string): MallPrice | null {
    const row = this.runtimeDb.db.prepare("select * from r2_supplier_quotations where id = ?").get(priceId) as Row | undefined;
    return row ? this.priceFromRow(row) : null;
  }

  upsertPrice(price: MallPrice) {
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_supplier_quotations
         (id, supplier_id, product_id, quotation_type, quotation_status, effective_from, effective_to, version_no, created_by, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           quotation_status = excluded.quotation_status,
           effective_from = excluded.effective_from,
           effective_to = excluded.effective_to,
           version_no = excluded.version_no,
           updated_at = excluded.updated_at`
      ),
      [
        price.id,
        price.supplierId,
        price.productId,
        "supplier_price_baseline",
        price.approvalStatus,
        price.effectiveFrom,
        price.effectiveTo ?? null,
        price.versionNo,
        price.createdBy,
        price.createdAt,
        new Date().toISOString()
      ]
    );
    run(
      this.runtimeDb.db.prepare(
        `insert into r2_supplier_quotation_items
         (id, quotation_id, product_id, sku_id, purchase_price, sale_price, tax_rate, delivery_days, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           purchase_price = excluded.purchase_price,
           sale_price = excluded.sale_price,
           tax_rate = excluded.tax_rate,
           delivery_days = excluded.delivery_days,
           updated_at = excluded.updated_at`
      ),
      [
        `${price.id}:line:1`,
        price.id,
        price.productId,
        `sku:${price.productId}`,
        price.purchasePrice ?? price.price,
        price.salePrice ?? price.price,
        price.taxRate ?? null,
        price.deliveryDays ?? null,
        new Date().toISOString()
      ]
    );
  }

  syncSupplierState(stateSuppliers: Supplier[]) {
    const byId = new Map(stateSuppliers.map((supplier) => [supplier.id, supplier]));
    for (const supplier of this.listSuppliers()) {
      const existing = byId.get(supplier.id);
      if (existing) Object.assign(existing, { ...existing, ...supplier });
      else stateSuppliers.push(supplier);
    }
  }

  syncProductState(stateProducts: MallProduct[], statePrices: MallPrice[]) {
    const byProductId = new Map(stateProducts.map((product) => [product.id, product]));
    for (const product of this.listProducts()) {
      const existing = byProductId.get(product.id);
      if (existing) Object.assign(existing, { ...existing, ...product, attachmentFileIds: existing.attachmentFileIds });
      else stateProducts.push(product);
    }

    const byPriceId = new Map(statePrices.map((price) => [price.id, price]));
    for (const price of this.listPrices()) {
      const existing = byPriceId.get(price.id);
      if (existing) Object.assign(existing, { ...existing, ...price });
      else statePrices.push(price);
    }
  }

  private supplierFromRow(row: Row): Supplier {
    const supplierId = String(row.id);
    const serviceRegions = this.runtimeDb.db.prepare("select * from r2_supplier_service_regions where supplier_id = ? order by id").all(supplierId) as Row[];
    const authorizations = this.runtimeDb.db.prepare("select * from r2_supplier_category_authorizations where supplier_id = ? order by id").all(supplierId) as Row[];
    const qualifications = this.runtimeDb.db.prepare("select * from r2_supplier_qualifications where supplier_id = ? order by id").all(supplierId) as Row[];
    const reviews = this.runtimeDb.db.prepare("select * from r2_supplier_admission_reviews where supplier_id = ? order by reviewed_at").all(supplierId) as Row[];
    const sealSamples = this.runtimeDb.db.prepare("select * from r2_supplier_seal_samples where supplier_id = ? order by id").all(supplierId) as Row[];
    const categories = json<string[]>(optionalString(row.category_auth_json), []);
    return {
      id: supplierId,
      name: String(row.supplier_name),
      status: String(row.supplier_status),
      admissionStatus: String(row.admission_status) as Supplier["admissionStatus"],
      admissionLevel: optionalString(row.admission_level) as Supplier["admissionLevel"],
      admissionRuleCode: optionalString(row.admission_rule_code),
      admissionRuleSnapshot: json(optionalString(row.admission_rule_snapshot_json), undefined),
      regularizedAt: optionalString(row.regularized_at),
      periodicAssessment: json(optionalString(row.periodic_assessment_json), undefined),
      registrationTrace: json(optionalString(row.registration_trace_json), undefined),
      supplierType: optionalString(row.supplier_type),
      supplierSource: optionalString(row.supplier_source),
      socialCreditCode: optionalString(row.social_credit_code),
      businessLicenseNo: optionalString(row.business_license_no),
      legalRepresentative: optionalString(row.legal_representative),
      registeredAddress: optionalString(row.registered_address),
      businessScope: optionalString(row.business_scope),
      contactName: optionalString(row.contact_name),
      contactPhone: optionalString(row.contact_phone),
      contactEmail: optionalString(row.contact_email),
      categoryAuth: categories,
      categoryAuthorizations: authorizations.map((item) => ({
        category: String(item.category),
        status: String(item.authorization_status) as SupplierCategoryAuthorization["status"],
        authorizedAt: String(item.authorized_at),
        expiresAt: optionalString(item.expires_at)
      })),
      serviceRegions: serviceRegions.map((item) => ({
        id: String(item.id),
        region: String(item.region_name),
        storeName: String(item.hotel_name),
        category: String(item.category),
        status: String(item.region_status) as SupplierServiceRegion["status"]
      })),
      qualification: String(row.qualification_status),
      qualificationAttachments: qualifications.map((item) => ({
        id: String(item.file_id ?? item.id),
        fileName: String(item.file_name),
        qualificationType: String(item.qualification_type),
        validUntil: optionalString(item.valid_until),
        uploadedAt: String(item.uploaded_at)
      })),
      admissionReviews: reviews.map((item) => ({
        id: String(item.id),
        reviewType: String(item.review_type) as SupplierAdmissionReview["reviewType"],
        status: String(item.review_status) as SupplierAdmissionReview["status"],
        score: optionalNumber(item.score),
        scoreTemplateCode: optionalString(item.score_template_code),
        scoreItems: json(optionalString(item.score_items_json), undefined),
        regularizationDecision: optionalString(item.regularization_decision) as SupplierAdmissionReview["regularizationDecision"],
        reviewer: String(item.reviewer_name),
        opinion: String(item.opinion),
        reviewedAt: String(item.reviewed_at)
      })),
      sealSamples: sealSamples.map((item) => ({
        id: String(item.id),
        sampleName: String(item.sample_name),
        specification: String(item.specification),
        confirmedBy: String(item.confirmed_by),
        confirmedAt: String(item.confirmed_at),
        fileId: optionalString(item.file_id),
        fileName: optionalString(item.file_name),
        contentType: optionalString(item.content_type),
        uploadedAt: optionalString(item.uploaded_at),
        imageFileName: optionalString(item.file_name)
      })),
      risk: String(row.risk_note),
      restrictionReason: optionalString(row.restriction_reason),
      restrictedAt: optionalString(row.restricted_at),
      evaluationScore: row.evaluation_score === null || row.evaluation_score === undefined ? null : Number(row.evaluation_score)
    };
  }

  private productFromRow(row: Row): MallProduct {
    const productId = String(row.id);
    const sku = this.runtimeDb.db.prepare("select * from r2_skus where product_id = ? order by id limit 1").get(productId) as Row | undefined;
    const images = this.runtimeDb.db.prepare("select file_id from r2_product_images where product_id = ? order by sort_no").all(productId) as Array<{ file_id: string }>;
    return {
      id: productId,
      name: String(row.product_name),
      category: String(row.category),
      brand: String(row.brand),
      unit: String(row.unit),
      skuCode: sku ? String(sku.sku_code) : `SKU-${productId}`,
      specification: sku ? String(sku.specification) : "标准规格",
      packingQuantity: optionalNumber(row.packing_quantity),
      minOrderQty: optionalNumber(sku?.min_order_qty ?? row.min_order_qty),
      maxOrderQty: optionalNumber(sku?.max_order_qty ?? row.max_order_qty),
      taxRate: optionalNumber(row.tax_rate),
      invoiceName: optionalString(row.invoice_name),
      taxClassificationCode: optionalString(row.tax_classification_code),
      detailDescription: optionalString(row.detail_description),
      acceptanceGuide: optionalString(row.acceptance_guide),
      installationRequirement: optionalString(row.installation_requirement),
      tags: json<string[]>(optionalString(row.tags_json), []),
      status: String(row.product_status) as MallProduct["status"],
      supplierId: String(row.supplier_id),
      serviceRegions: json<string[]>(optionalString(row.service_regions_json), []),
      procurementCategory: optionalString(row.procurement_category),
      imageFileIds: images.map((item) => item.file_id),
      attachmentFileIds: [],
      createdBy: String(row.created_by),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private priceFromRow(row: Row): MallPrice {
    const item = this.runtimeDb.db.prepare("select * from r2_supplier_quotation_items where quotation_id = ? order by id limit 1").get(String(row.id)) as Row | undefined;
    const salePrice = optionalNumber(item?.sale_price) ?? 0;
    return {
      id: String(row.id),
      productId: String(row.product_id),
      supplierId: String(row.supplier_id),
      price: salePrice,
      purchasePrice: optionalNumber(item?.purchase_price),
      salePrice,
      taxRate: optionalNumber(item?.tax_rate),
      deliveryDays: optionalNumber(item?.delivery_days),
      effectiveFrom: String(row.effective_from),
      effectiveTo: optionalString(row.effective_to),
      approvalStatus: String(row.quotation_status) as MallPrice["approvalStatus"],
      versionNo: Number(row.version_no),
      createdBy: String(row.created_by),
      createdAt: String(row.created_at)
    };
  }

  private replaceSupplierServiceRegions(supplierId: string, regions: SupplierServiceRegion[]) {
    const now = new Date().toISOString();
    this.runtimeDb.db.prepare("delete from r2_supplier_service_regions where supplier_id = ?").run(supplierId);
    const statement = this.runtimeDb.db.prepare(
      "insert into r2_supplier_service_regions (id, supplier_id, region_name, hotel_name, category, region_status, updated_at) values (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const region of regions) run(statement, [region.id, supplierId, region.region, region.storeName, region.category, region.status, now]);
  }

  private replaceSupplierCategoryAuthorizations(supplierId: string, authorizations: SupplierCategoryAuthorization[]) {
    const now = new Date().toISOString();
    this.runtimeDb.db.prepare("delete from r2_supplier_category_authorizations where supplier_id = ?").run(supplierId);
    const statement = this.runtimeDb.db.prepare(
      "insert into r2_supplier_category_authorizations (id, supplier_id, category, authorization_status, authorized_at, expires_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const authorization of authorizations) {
      run(statement, [`${supplierId}:${authorization.category}`, supplierId, authorization.category, authorization.status, authorization.authorizedAt, authorization.expiresAt ?? null, now]);
    }
  }

  private replaceSupplierReviews(supplierId: string, reviews: SupplierAdmissionReview[]) {
    this.runtimeDb.db.prepare("delete from r2_supplier_admission_reviews where supplier_id = ?").run(supplierId);
    for (const review of reviews) this.addSupplierReview(supplierId, review);
  }

  private replaceSupplierSealSamples(supplierId: string, samples: SupplierSealSample[]) {
    const now = new Date().toISOString();
    this.runtimeDb.db.prepare("delete from r2_supplier_seal_samples where supplier_id = ?").run(supplierId);
    const statement = this.runtimeDb.db.prepare(
      `insert into r2_supplier_seal_samples
       (id, supplier_id, sample_name, specification, confirmed_by, confirmed_at, file_id, file_name, content_type, uploaded_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const sample of samples) {
      run(statement, [
        sample.id,
        supplierId,
        sample.sampleName,
        sample.specification,
        sample.confirmedBy,
        sample.confirmedAt,
        sample.fileId ?? null,
        sample.fileName ?? sample.imageFileName ?? null,
        sample.contentType ?? null,
        sample.uploadedAt ?? null,
        now
      ]);
    }
  }

  private replaceSupplierRestriction(supplier: Supplier) {
    const now = new Date().toISOString();
    if (supplier.admissionStatus === "restricted" || supplier.status === "restricted" || supplier.status === "限制名单") {
      run(
        this.runtimeDb.db.prepare(
          `insert into r2_supplier_restrictions (id, supplier_id, restriction_status, reason, restricted_at, updated_at)
           values (?, ?, ?, ?, ?, ?)
           on conflict(id) do update set restriction_status = excluded.restriction_status, reason = excluded.reason, restricted_at = excluded.restricted_at, updated_at = excluded.updated_at`
        ),
        [`restriction:${supplier.id}`, supplier.id, "active", supplier.restrictionReason ?? supplier.risk, supplier.restrictedAt ?? now, now]
      );
    } else {
      this.runtimeDb.db.prepare("delete from r2_supplier_restrictions where supplier_id = ?").run(supplier.id);
    }
  }
}
