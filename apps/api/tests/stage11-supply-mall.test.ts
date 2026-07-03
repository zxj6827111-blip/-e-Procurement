import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createAppContext } from "../src/app-context.js";

function makeDataRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "eproc-stage11-"));
}

function boot(dataRoot = makeDataRoot()) {
  const ctx = createAppContext({
    runtime: {
      appEnv: "test",
      dataRoot,
      mockAuthEnabled: true
    }
  });
  return { ctx, app: createApp(ctx) };
}

function tinyPngBase64() {
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}

async function createListedProduct(runtime: ReturnType<typeof boot>) {
  const image = await request(runtime.app)
    .post("/api/files/upload")
    .set("x-mock-user-id", "u3")
    .send({
      originalName: "mall-product.png",
      contentType: "image/png",
      contentBase64: tinyPngBase64(),
      attachmentKind: "mall_product_image",
      objectType: "supplier",
      objectId: "sup-1",
      supplierId: "sup-1"
    });
  expect(image.status).toBe(201);

  const product = await request(runtime.app)
    .post("/api/mall/products")
    .set("x-mock-user-id", "u3")
    .send({
      name: "酒店开业客房一次性用品套装",
      category: "客房物资",
      brand: "华礼优选",
      unit: "箱",
      skuCode: "SKU-STAGE11-001",
      specification: "牙具/梳子/护理包组合",
      supplierId: "sup-1",
      serviceRegions: ["全国"],
      procurementCategory: "客房一次性用品",
      imageFileIds: [image.body.file.id]
    });
  expect(product.status).toBe(201);

  const price = await request(runtime.app).post(`/api/mall/products/${product.body.product.id}/prices`).set("x-mock-user-id", "u3").send({ price: 1280, effectiveFrom: "2026-07-01" });
  expect(price.status).toBe(201);

  const approved = await request(runtime.app).post(`/api/mall/prices/${price.body.price.id}/approve`).set("x-mock-user-id", "u2").send({ approved: true });
  expect(approved.status).toBe(200);

  const listed = await request(runtime.app)
    .post(`/api/mall/products/${product.body.product.id}/status`)
    .set("x-mock-user-id", "u2")
    .send({
      status: "listed",
      sourceType: "agreement",
      sourceAgreementNo: "AG-STAGE11-001",
      purchasePrice: 1100,
      salePrice: 1280,
      taxRate: 0.13,
      deliveryDays: 3,
      effectiveFrom: "2026-07-01"
    });
  expect(listed.status).toBe(200);

  return { product: listed.body.product, imageFileId: image.body.file.id, price: approved.body.price };
}

describe("Stage 11 supply chain mall expansion", () => {
  it("blocks mall supplier-side operations before supplier admission is approved", async () => {
    const runtime = boot();
    const admission = await request(runtime.app)
      .post("/api/suppliers/admissions")
      .set("x-mock-user-id", "u1")
      .send({ name: "待准入商城供应商", category: "客房一次性用品", contactName: "待准入联系人", contactPhone: "13900009998" });
    expect(admission.status).toBe(201);
    expect(admission.body.supplier.admissionStatus).toBe("pending");
    const supplierId = admission.body.supplier.id as string;
    const adminUserId = `u-pending-mall-admin-${supplierId}`;
    const quotationUserId = `u-pending-mall-quotation-${supplierId}`;
    runtime.ctx.state.users.push(
      {
        id: adminUserId,
        name: "待准入商城管理员",
        roleId: "supplier_admin",
        orgId: "org-supplier",
        supplierId,
        status: "active"
      },
      {
        id: quotationUserId,
        name: "待准入商城报价员",
        roleId: "supplier_quotation",
        orgId: "org-supplier",
        supplierId,
        status: "active"
      }
    );

    const product = await request(runtime.app)
      .post("/api/mall/products")
      .set("x-mock-user-id", adminUserId)
      .send({ name: "未准入商品", specification: "标准", supplierId, procurementCategory: "客房一次性用品" });
    expect(product.status).toBe(403);
    expect(product.body.error.code).toBe("MALL_SUPPLIER_NOT_ADMITTED");

    runtime.ctx.state.mallProducts.push({
      id: "mp-pending-supplier",
      name: "待准入供应商旧草稿",
      category: "客房物资",
      brand: "通用",
      unit: "件",
      skuCode: "SKU-PENDING-SUPPLIER",
      specification: "标准",
      status: "draft",
      supplierId,
      serviceRegions: ["全国"],
      listedAt: null,
      imageFileIds: [],
      attachmentFileIds: [],
      createdBy: adminUserId,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z"
    });
    const price = await request(runtime.app)
      .post("/api/mall/products/mp-pending-supplier/prices")
      .set("x-mock-user-id", quotationUserId)
      .send({ price: 100, effectiveFrom: "2026-07-01" });
    expect(price.status).toBe(403);
    expect(price.body.error.code).toBe("MALL_SUPPLIER_NOT_ADMITTED");

    const questionnaire = await request(runtime.app)
      .post("/api/mall/questionnaires")
      .set("x-mock-user-id", "u2")
      .send({ title: "待准入不可提交问卷", targetSupplierIds: [supplierId], questions: ["说明"] });
    expect(questionnaire.status).toBe(201);

    const submission = await request(runtime.app)
      .post(`/api/mall/questionnaires/${questionnaire.body.questionnaire.id}/submissions`)
      .set("x-mock-user-id", adminUserId)
      .send({ answers: [{ questionId: "q1", answer: "未准入提交" }] });
    expect(submission.status).toBe(403);
    expect(submission.body.error.code).toBe("MALL_SUPPLIER_NOT_ADMITTED");
  });

  it("runs product image, pricing, cart, order, shipment, receipt, return, invoice and scenario workflows", async () => {
    const runtime = boot();
    const { product, imageFileId } = await createListedProduct(runtime);

    const imagePreview = await request(runtime.app).get(`/api/files/${imageFileId}/download`).set("x-mock-user-id", "u3");
    expect(imagePreview.status).toBe(200);
    expect(imagePreview.headers["content-type"]).toContain("image/png");

    const productList = await request(runtime.app).get("/api/mall/products").set("x-mock-user-id", "u2");
    expect(productList.status).toBe(200);
    const listedProduct = productList.body.products.find((item: { id: string; status: string }) => item.id === product.id && item.status === "listed");
    expect(listedProduct).toBeTruthy();
    expect(listedProduct.imageFileMetadata[0]).toMatchObject({
      id: imageFileId,
      fileName: "mall-product.png",
      contentType: "image/png"
    });

    const cart = await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u2").send({ productId: product.id, quantity: 2 });
    expect(cart.status).toBe(200);
    expect(cart.body.cartItems[0].quantity).toBe(2);

    const order = await request(runtime.app).post("/api/mall/orders").set("x-mock-user-id", "u2").send({ shippingAddress: "上海滨江华礼酒店后勤仓", invoiceTitle: "华礼酒店集团" });
    expect(order.status).toBe(201);
    expect(order.body.order.status).toBe("submitted");
    expect(order.body.order.totalAmount).toBe(2560);

    const wrongSupplier = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/confirm`).set("x-mock-user-id", "u-other-mall-supplier");
    expect(wrongSupplier.status).toBe(401);

    const confirmed = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/confirm`).set("x-mock-user-id", "u3");
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.order.status).toBe("supplier_confirmed");

    const shipped = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/shipments`).set("x-mock-user-id", "u3").send({ carrier: "供应商配送", trackingNo: "WL-STAGE11" });
    expect(shipped.status).toBe(201);
    expect(shipped.body.order.status).toBe("shipped");

    const received = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/receive`).set("x-mock-user-id", "u2");
    expect(received.status).toBe(200);
    expect(received.body.order.status).toBe("received");

    const returnRequest = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/returns`).set("x-mock-user-id", "u2").send({ productId: product.id, quantity: 1, reason: "规格不符" });
    expect(returnRequest.status).toBe(201);
    expect(returnRequest.body.returnRequest.status).toBe("submitted");

    const returnReview = await request(runtime.app).post(`/api/mall/returns/${returnRequest.body.returnRequest.id}/review`).set("x-mock-user-id", "u3").send({ approved: true });
    expect(returnReview.status).toBe(200);
    expect(returnReview.body.returnRequest.status).toBe("approved");

    const invoiceFile = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u3")
      .send({
        originalName: "mall-invoice.txt",
        contentType: "text/plain",
        contentBase64: Buffer.from("mall invoice content", "utf8").toString("base64"),
        attachmentKind: "mall_settlement_invoice",
        objectType: "mall_order",
        objectId: order.body.order.id,
        supplierId: "sup-1"
      });
    expect(invoiceFile.status).toBe(201);

    const invoice = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/invoices`).set("x-mock-user-id", "u3").send({ fileId: invoiceFile.body.file.id, fileName: "mall-invoice.txt", amount: 2560 });
    expect(invoice.status).toBe(201);
    expect(invoice.body.invoice.status).toBe("pending_verification");

    const verifiedInvoice = await request(runtime.app).post(`/api/mall/invoices/${invoice.body.invoice.id}/verify`).set("x-mock-user-id", "u2").send({ approved: true });
    expect(verifiedInvoice.status).toBe(200);
    expect(verifiedInvoice.body.invoice.status).toBe("verified");

    const questionnaire = await request(runtime.app)
      .post("/api/mall/questionnaires")
      .set("x-mock-user-id", "u2")
      .send({ title: "开业物资问卷", scope: "新开业酒店", questions: ["客房数", "床型", "开业日期"] });
    expect(questionnaire.status).toBe(201);
    expect(questionnaire.body.questionnaire.status).toBe("published");

    const sampleRoom = await request(runtime.app).post("/api/mall/scenario-templates").set("x-mock-user-id", "u2").send({ templateType: "sample_room", name: "样板间标准包", productIds: [product.id] });
    expect(sampleRoom.status).toBe(201);
    expect(sampleRoom.body.template.templateType).toBe("sample_room");

    const openingPackage = await request(runtime.app).post("/api/mall/scenario-templates").set("x-mock-user-id", "u2").send({ templateType: "opening_package", name: "酒店开业基础包", productIds: [product.id] });
    expect(openingPackage.status).toBe(201);
    expect(openingPackage.body.template.templateType).toBe("opening_package");

    const templates = await request(runtime.app).get("/api/mall/scenario-templates").set("x-mock-user-id", "u2");
    expect(templates.status).toBe(200);
    expect(templates.body.templates.map((item: { templateType: string }) => item.templateType)).toEqual(expect.arrayContaining(["sample_room", "opening_package"]));
  });

  it("keeps mall permissions isolated across supplier, admin and auditor roles", async () => {
    const runtime = boot();
    runtime.ctx.state.users.push({ id: "u-other-mall-supplier", name: "Other Supplier", roleId: "supplier", orgId: "org-hotel", supplierId: "sup-2" });
    runtime.ctx.authStore.seedAccounts(runtime.ctx.state.users, runtime.ctx.config.allowLocalPasswordLogin);
    const { product } = await createListedProduct(runtime);

    const supplierProducts = await request(runtime.app).get("/api/mall/products").set("x-mock-user-id", "u-other-mall-supplier");
    expect(supplierProducts.status).toBe(200);
    expect(supplierProducts.body.products.map((item: { id: string }) => item.id)).not.toContain(product.id);
    expect(supplierProducts.body.products.every((item: { supplierId: string }) => item.supplierId === "sup-2")).toBe(true);

    const adminProducts = await request(runtime.app).get("/api/mall/products").set("x-mock-user-id", "u6");
    expect(adminProducts.status).toBe(403);
    expect(adminProducts.body.error.code).toBe("MALL_READ_DENIED");

    const auditorProducts = await request(runtime.app).get("/api/mall/products").set("x-mock-user-id", "u5");
    expect(auditorProducts.status).toBe(200);
    expect(auditorProducts.body.products.map((item: { id: string }) => item.id)).toContain(product.id);
  });

  it("persists mall domain data across reboot and syncs formal mall tables", async () => {
    const dataRoot = makeDataRoot();
    const runtime1 = boot(dataRoot);
    const { product } = await createListedProduct(runtime1);
    await request(runtime1.app).post("/api/mall/cart/items").set("x-mock-user-id", "u2").send({ productId: product.id, quantity: 1 });
    const order = await request(runtime1.app).post("/api/mall/orders").set("x-mock-user-id", "u2").send({ shippingAddress: "持久化测试地址", invoiceTitle: "华礼酒店集团" });
    expect(order.status).toBe(201);

    const productRow = runtime1.ctx.runtimeDb.db.prepare("select name from business_mall_products where id = ?").get(product.id) as { name: string } | undefined;
    expect(productRow?.name).toBe("酒店开业客房一次性用品套装");

    const runtime2 = boot(dataRoot);
    const orders = await request(runtime2.app).get("/api/mall/orders").set("x-mock-user-id", "u2");
    expect(orders.status).toBe(200);
    expect(orders.body.orders.some((item: { id: string }) => item.id === order.body.order.id)).toBe(true);
  }, 15000);

  it("covers PDF 1:1 mall, questionnaire, scenario package, fund account and split-role paths", async () => {
    const runtime = boot();
    const { product } = await createListedProduct(runtime);

    const hotelCart = await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u8").send({ productId: product.id, quantity: 1 });
    expect(hotelCart.status).toBe(200);

    const order = await request(runtime.app).post("/api/mall/orders").set("x-mock-user-id", "u8").send({ shippingAddress: "PDF 1:1 酒店收货仓", invoiceTitle: "酒店采购发票抬头" });
    expect(order.status).toBe(201);
    expect(order.body.order.paymentStatus).toBe("payment_reserved");
    expect(order.body.fundAccount.occupiedAmount).toBeGreaterThan(0);
    expect(order.body.paymentAdapterBoundary).toContain("本地模拟资金账户台账");

    const fundRead = await request(runtime.app).get("/api/mall/fund-accounts").set("x-mock-user-id", "u9");
    expect(fundRead.status).toBe(200);
    expect(fundRead.body.accounts.some((account: { orgId: string; occupiedAmount: number }) => account.orgId === "org-hotel" && account.occupiedAmount > 0)).toBe(true);

    const recharge = await request(runtime.app).post("/api/mall/fund-accounts/org-hotel/recharges").set("x-mock-user-id", "u9").send({ amount: 5000, note: "PDF 1:1 模拟充值" });
    expect(recharge.status).toBe(201);
    expect(recharge.body.ledger.entryType).toBe("recharge");

    const captured = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/fund-ledger`).set("x-mock-user-id", "u13").send({ action: "capture" });
    expect(captured.status).toBe(200);
    expect(captured.body.order.paymentStatus).toBe("paid");
    expect(captured.body.ledger.entryType).toBe("payment_capture");

    const detail = await request(runtime.app).get(`/api/mall/orders/${order.body.order.id}`).set("x-mock-user-id", "u8");
    expect(detail.status).toBe(200);
    expect(detail.body.contractView.status).toBe("adapter_contract_ready");

    const contract = await request(runtime.app).get(`/api/mall/orders/${order.body.order.id}/contract`).set("x-mock-user-id", "u8");
    expect(contract.status).toBe(200);
    expect(contract.body.contract.adapterBoundary).toContain("真实合同系统验收资料尚未提供");

    const copied = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/copy`).set("x-mock-user-id", "u8").send({ shippingAddress: "PDF 1:1 复制订单收货仓" });
    expect(copied.status).toBe(201);
    expect(copied.body.sourceOrderId).toBe(order.body.order.id);

    const supplierAdminConfirm = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/confirm`).set("x-mock-user-id", "u11");
    expect(supplierAdminConfirm.status).toBe(200);

    const questionnaire = await request(runtime.app)
      .post("/api/mall/questionnaires")
      .set("x-mock-user-id", "u10")
      .send({
        title: "PDF 1:1 供应商周期考核问卷",
        scope: "供应商准入后考核",
        targetSupplierIds: ["sup-1"],
        questions: [
          { id: "q-quality", prompt: "质量评分", type: "score", maxScore: 10 },
          { id: "q-service", prompt: "服务说明", type: "text" }
        ]
      });
    expect(questionnaire.status).toBe(201);

    const questionnaireList = await request(runtime.app).get("/api/mall/questionnaires").set("x-mock-user-id", "u12");
    expect(questionnaireList.status).toBe(200);
    expect(questionnaireList.body.questionnaires.some((item: { id: string }) => item.id === questionnaire.body.questionnaire.id)).toBe(true);

    const submission = await request(runtime.app)
      .post(`/api/mall/questionnaires/${questionnaire.body.questionnaire.id}/submissions`)
      .set("x-mock-user-id", "u12")
      .send({ answers: [{ questionId: "q-quality", answer: 9 }, { questionId: "q-service", answer: "按期供货" }] });
    expect(submission.status).toBe(201);
    expect(submission.body.submission.score).toBeGreaterThan(0);

    const archived = await request(runtime.app).post(`/api/mall/questionnaires/${questionnaire.body.questionnaire.id}/archive`).set("x-mock-user-id", "u10");
    expect(archived.status).toBe(200);
    expect(archived.body.questionnaire.status).toBe("closed");

    const sampleRoom = await request(runtime.app)
      .post("/api/mall/scenario-templates")
      .set("x-mock-user-id", "u10")
      .send({
        templateType: "sample_room",
        name: "PDF 1:1 样板间商品包",
        productIds: [product.id],
        packageItems: [{ productId: product.id, quantity: 2 }],
        applicableBrands: ["华礼"],
        applicableHotelTypes: ["高端酒店"],
        roomCount: 1
      });
    expect(sampleRoom.status).toBe(201);

    const sampleCart = await request(runtime.app).post(`/api/mall/scenario-templates/${sampleRoom.body.template.id}/cart`).set("x-mock-user-id", "u8");
    expect(sampleCart.status).toBe(200);
    expect(sampleCart.body.cartItems[0].quantity).toBe(2);

    const openingPackage = await request(runtime.app)
      .post("/api/mall/scenario-templates")
      .set("x-mock-user-id", "u10")
      .send({
        templateType: "opening_package",
        name: "PDF 1:1 开业包",
        productIds: [product.id],
        packageItems: [{ productId: product.id, quantity: 3 }],
        applicableHotelIds: ["org-hotel"],
        budgetAmount: 10000
      });
    expect(openingPackage.status).toBe(201);

    const packageOrder = await request(runtime.app).post(`/api/mall/scenario-templates/${openingPackage.body.template.id}/orders`).set("x-mock-user-id", "u8").send({ shippingAddress: "开业包收货仓" });
    expect(packageOrder.status).toBe(201);
    expect(packageOrder.body.template.generatedOrderIds).toContain(packageOrder.body.order.id);

    const auditorRead = await request(runtime.app).get(`/api/mall/orders/${packageOrder.body.order.id}`).set("x-mock-user-id", "u5");
    expect(auditorRead.status).toBe(200);

    const adminDenied = await request(runtime.app).post("/api/mall/fund-accounts/org-hotel/recharges").set("x-mock-user-id", "u6").send({ amount: 1000 });
    expect(adminDenied.status).toBe(403);
  });

  it("allows group procurement manager to see supplier draft products and complete listing pricing", async () => {
    const runtime = boot();
    const image = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u3")
      .send({
        originalName: "group-listing-product.png",
        contentType: "image/png",
        contentBase64: tinyPngBase64(),
        attachmentKind: "mall_product_image",
        objectType: "supplier",
        objectId: "sup-1",
        supplierId: "sup-1"
      });
    expect(image.status).toBe(201);

    const product = await request(runtime.app)
      .post("/api/mall/products")
      .set("x-mock-user-id", "u3")
      .send({
        name: "集团上架验证商品",
        category: "客房物资",
        brand: "华礼优选",
        unit: "件",
        skuCode: "SKU-GROUP-LISTING",
        specification: "标准",
        supplierId: "sup-1",
        serviceRegions: ["全国"],
        procurementCategory: "客房一次性用品",
        imageFileIds: [image.body.file.id]
      });
    expect(product.status).toBe(201);
    expect(product.body.product.status).toBe("draft");

    const groupVisibleProducts = await request(runtime.app).get("/api/mall/products").set("x-mock-user-id", "u1");
    expect(groupVisibleProducts.status).toBe(200);
    expect(groupVisibleProducts.body.products.some((item: { id: string }) => item.id === product.body.product.id)).toBe(true);

    const listed = await request(runtime.app)
      .post(`/api/mall/products/${product.body.product.id}/status`)
      .set("x-mock-user-id", "u1")
      .send({
        status: "listed",
        sourceType: "agreement",
        sourceAgreementNo: "AG-GROUP-LISTING-001",
        purchasePrice: 90,
        salePrice: 120,
        taxRate: 0.13,
        deliveryDays: 3,
        effectiveFrom: "2026-07-01"
      });
    expect(listed.status).toBe(200);
    expect(listed.body.product.status).toBe("listed");
    expect(listed.body.product.sourceTrace.agreementNo).toBe("AG-GROUP-LISTING-001");
    expect(listed.body.product.sourceTrace.pricingReportNo).toContain("PR-MALL-");
  });

  it("covers PDF product tags, bulk listing, quotation export, refund reversal and invoice adapter boundaries", async () => {
    const runtime = boot();
    const { product, price } = await createListedProduct(runtime);

    const enriched = await request(runtime.app)
      .patch(`/api/mall/products/${product.id}`)
      .set("x-mock-user-id", "u11")
      .send({
        detailDescription: "图文详情：客房一次性用品套装",
        acceptanceGuide: "按箱验收，检查包装和数量",
        installationRequirement: "无安装要求",
        tags: ["开业包", "客房", "快采"]
      });
    expect(enriched.status).toBe(200);
    expect(enriched.body.product.tags).toEqual(expect.arrayContaining(["开业包", "客房", "快采"]));

    const bulkDelist = await request(runtime.app)
      .post("/api/mall/products/bulk-status")
      .set("x-mock-user-id", "u10")
      .send({ productIds: [product.id], status: "delisted" });
    expect(bulkDelist.status).toBe(200);
    expect(bulkDelist.body.updatedProducts[0].status).toBe("delisted");

    const bulkList = await request(runtime.app)
      .post("/api/mall/products/bulk-status")
      .set("x-mock-user-id", "u10")
      .send({ productIds: [product.id], status: "listed" });
    expect(bulkList.status).toBe(200);
    expect(bulkList.body.updatedProducts[0].status).toBe("listed");

    const exported = await request(runtime.app).get(`/api/mall/prices/${price.id}/export`).set("x-mock-user-id", "u10");
    expect(exported.status).toBe(200);
    expect(exported.body.quotationExport.versionNo).toBe(price.versionNo);
    expect(exported.body.quotationExport.adapterBoundary).toContain("正式导入导出模板");

    await request(runtime.app).post("/api/mall/cart/items").set("x-mock-user-id", "u8").send({ productId: product.id, quantity: 2 });
    const order = await request(runtime.app).post("/api/mall/orders").set("x-mock-user-id", "u8").send({ shippingAddress: "退货冲正仓", invoiceTitle: "酒店财务抬头" });
    expect(order.status).toBe(201);
    await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/confirm`).set("x-mock-user-id", "u11");
    await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/shipments`).set("x-mock-user-id", "u11").send({ carrier: "供应商配送", trackingNo: "PDF-REFUND" });
    await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/receive`).set("x-mock-user-id", "u8");

    const returnRequest = await request(runtime.app).post(`/api/mall/orders/${order.body.order.id}/returns`).set("x-mock-user-id", "u8").send({ productId: product.id, quantity: 1, reason: "退货冲正测试" });
    expect(returnRequest.status).toBe(201);
    const returnReview = await request(runtime.app).post(`/api/mall/returns/${returnRequest.body.returnRequest.id}/review`).set("x-mock-user-id", "u11").send({ approved: true });
    expect(returnReview.status).toBe(200);
    expect(returnReview.body.returnRequest.settlementImpact.financeLedgerStatus).toBe("simulated_reversed");
    expect(returnReview.body.refundLedger.entryType).toBe("return_refund");
    expect(returnReview.body.paymentAdapterBoundary).toContain("本地模拟资金账户台账");

    const invoiceFile = await request(runtime.app)
      .post("/api/files/upload")
      .set("x-mock-user-id", "u11")
      .send({
        originalName: "adapter-invoice.txt",
        contentType: "text/plain",
        contentBase64: Buffer.from("invoice adapter", "utf8").toString("base64"),
        attachmentKind: "mall_settlement_invoice",
        objectType: "mall_order",
        objectId: order.body.order.id,
        supplierId: "sup-1"
      });
    expect(invoiceFile.status).toBe(201);

    const invoice = await request(runtime.app)
      .post(`/api/mall/orders/${order.body.order.id}/invoices`)
      .set("x-mock-user-id", "u11")
      .send({ invoiceNo: "INV-PDF-ADAPTER", fileId: invoiceFile.body.file.id, fileName: "adapter-invoice.txt", amount: order.body.order.totalAmount, taxRate: 0.13, taxAmount: 1 });
    expect(invoice.status).toBe(201);
    expect(invoice.body.invoiceVerificationAdapterBoundary).toContain("本地模拟发票验真 adapter");

    const rejected = await request(runtime.app)
      .post(`/api/mall/invoices/${invoice.body.invoice.id}/verify`)
      .set("x-mock-user-id", "u13")
      .send({ approved: true, taxRate: 0.13, taxAmount: 1 });
    expect(rejected.status).toBe(200);
    expect(rejected.body.invoice.status).toBe("rejected");
    expect(rejected.body.invoice.rejectReason).toContain("税额不匹配");

    const reupload = await request(runtime.app)
      .post(`/api/mall/orders/${order.body.order.id}/invoices`)
      .set("x-mock-user-id", "u11")
      .send({ invoiceNo: "INV-PDF-ADAPTER-R2", fileId: invoiceFile.body.file.id, fileName: "adapter-invoice-r2.txt", amount: order.body.order.totalAmount, taxRate: 0.13, reuploadOfInvoiceId: invoice.body.invoice.id });
    expect(reupload.status).toBe(201);
    expect(reupload.body.invoice.reuploadOfInvoiceId).toBe(invoice.body.invoice.id);
    expect(reupload.body.invoice.verificationAdapterBoundary).toContain("未连接真实税控");
  });
});
