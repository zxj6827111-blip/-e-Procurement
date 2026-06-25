<script setup lang="ts">
import { onMounted, ref } from "vue";
import AttachmentList from "../components/AttachmentList.vue";
import { apiGet, apiPost, uploadFile, type UploadedFileMetadata } from "../api/http";
import { labelStatus } from "../utils/status-labels";
import { useSessionStore } from "../stores/session";
import WorkflowSurfaceSummary from "../components/WorkflowSurfaceSummary.vue";

const session = useSessionStore();
const products = ref<any[]>([]);
const orders = ref<any[]>([]);
const templates = ref<any[]>([]);
const questionnaires = ref<any[]>([]);
const fundAccounts = ref<any[]>([]);
const selectedProductId = ref("");
const selectedOrderId = ref("");
const productImage = ref<File | null>(null);
const productImageName = ref("");
const receiptFile = ref<File | null>(null);
const receiptFileName = ref("");
const invoiceFile = ref<File | null>(null);
const invoiceFileName = ref("");
const message = ref("");
const error = ref("");

const buyerRoles = ["group_manager", "buyer", "hotel_buyer", "platform_operator"];
const supplierRoles = ["supplier", "supplier_admin", "supplier_quotation"];
const supplierAdminRoles = ["supplier", "supplier_admin"];
const financeRoles = ["group_manager", "buyer", "hotel_finance", "finance_reviewer"];
const operatorRoles = ["group_manager", "buyer", "platform_operator"];

function hasRole(roles: string[]) {
  return roles.includes(session.roleId);
}

function chooseImage(event: Event) {
  productImage.value = (event.target as HTMLInputElement).files?.[0] ?? null;
  productImageName.value = productImage.value?.name ?? "";
}

function chooseInvoice(event: Event) {
  invoiceFile.value = (event.target as HTMLInputElement).files?.[0] ?? null;
  invoiceFileName.value = invoiceFile.value?.name ?? "";
}

function chooseReceiptFile(event: Event) {
  receiptFile.value = (event.target as HTMLInputElement).files?.[0] ?? null;
  receiptFileName.value = receiptFile.value?.name ?? "";
}

async function loadMall() {
  products.value = (await apiGet<{ products: any[] }>("/api/mall/products")).products;
  orders.value = (await apiGet<{ orders: any[] }>("/api/mall/orders")).orders;
  templates.value = (await apiGet<{ templates: any[] }>("/api/mall/scenario-templates")).templates;
  questionnaires.value = (await apiGet<{ questionnaires: any[] }>("/api/mall/questionnaires")).questionnaires;
  fundAccounts.value = (await apiGet<{ accounts: any[] }>("/api/mall/fund-accounts")).accounts;
}

async function runMallAction(action: () => Promise<void>) {
  error.value = "";
  try {
    await action();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

function priceSummary(product: any) {
  const price = product.activePrice;
  if (!price) return "暂无已批准报价";
  const parts = [`销售价 ${price.salePrice ?? price.price} 元`];
  if (price.purchasePrice !== undefined) parts.push(`采购价 ${price.purchasePrice} 元`);
  if (price.deliveryDays !== undefined) parts.push(`${price.deliveryDays} 天交付`);
  parts.push(price.sourceLabel ?? product.priceSource?.label ?? labelStatus(price.approvalStatus));
  return parts.join(" / ");
}

function priceTrace(product: any) {
  const source = product.priceSource;
  if (!source) return "暂无可追溯价格来源";
  if (source.type === "pricing_report") return `定价报告 ${source.trace?.reportNo ?? source.sourceId}`;
  return `供应商报价 ${source.trace?.quotationId ?? source.sourceId}`;
}

async function createProduct() {
  error.value = "";
  let imageFileIds: string[] = [];
  if (productImage.value) {
    const uploaded = await uploadFile(productImage.value, {
      attachmentKind: "mall_product_image",
      objectType: "supplier",
      objectId: session.user?.supplierId ?? "sup-1",
      supplierId: session.user?.supplierId ?? "sup-1"
    });
    imageFileIds = [uploaded.file.id];
  }
  const created = await apiPost<{ product: any }>("/api/mall/products", {
    name: "客房一次性用品套装",
    category: "客房物资",
    brand: "华礼优选",
    unit: "箱",
    skuCode: `SKU-${Date.now()}`,
    specification: "牙具/梳子/护理包组合",
    supplierId: session.user?.supplierId ?? "sup-1",
    serviceRegions: ["全国"],
    procurementCategory: "客房一次性用品",
    imageFileIds
  });
  message.value = `已创建商品 ${created.product.name}`;
  productImage.value = null;
  productImageName.value = "";
  await loadMall();
}

async function submitPriceAndList(productId: string) {
  await runMallAction(async () => {
    const price = await apiPost<{ price: any }>(`/api/mall/products/${productId}/prices`, {
      price: 1280,
      purchasePrice: 1080,
      salePrice: 1280,
      taxRate: 0.13,
      deliveryDays: 3,
      effectiveFrom: "2026-07-01"
    });
    await apiPost(`/api/mall/prices/${price.price.id}/approve`, { approved: true });
    await apiPost(`/api/mall/products/${productId}/status`, { status: "listed" });
    message.value = "商品已审批定价并上架";
    await loadMall();
  });
}

async function delistProduct(productId: string) {
  await runMallAction(async () => {
    await apiPost(`/api/mall/products/${productId}/status`, { status: "delisted" });
    message.value = "商品已下架";
    await loadMall();
  });
}

async function addToCart(productId: string) {
  await apiPost("/api/mall/cart/items", { productId, quantity: 2 });
  const order = await apiPost<{ order: any }>("/api/mall/orders", { shippingAddress: "上海滨江华礼酒店后勤仓", invoiceTitle: "华礼酒店集团" });
  message.value = `订单已提交：${order.order.orderNo}`;
  await loadMall();
}

async function copyOrder(orderId: string) {
  await runMallAction(async () => {
    const copied = await apiPost<{ order: any }>(`/api/mall/orders/${orderId}/copy`, { shippingAddress: "复制订单收货地址" });
    message.value = `已复制订单：${copied.order.orderNo}`;
    await loadMall();
  });
}

async function viewContract(orderId: string) {
  await runMallAction(async () => {
    const result = await apiGet<{ contract: any }>(`/api/mall/orders/${orderId}/contract`);
    message.value = `合同摘要 ${result.contract.id}：${result.contract.adapterBoundary}`;
  });
}

async function capturePayment(orderId: string) {
  await runMallAction(async () => {
    await apiPost(`/api/mall/orders/${orderId}/fund-ledger`, { action: "capture", note: "商城页模拟支付扣款" });
    message.value = "已登记模拟支付台账";
    await loadMall();
  });
}

async function rechargeFund(orgId: string) {
  await runMallAction(async () => {
    await apiPost(`/api/mall/fund-accounts/${orgId}/recharges`, { amount: 5000, note: "商城页模拟充值" });
    message.value = "已登记模拟充值台账";
    await loadMall();
  });
}

async function shipOrder(orderId: string) {
  await apiPost(`/api/mall/orders/${orderId}/confirm`, {});
  await apiPost(`/api/mall/orders/${orderId}/shipments`, { carrier: "供应商配送", trackingNo: `WL-${Date.now()}` });
  message.value = "订单已确认并登记发货";
  await loadMall();
}

async function receiveOrder(orderId: string) {
  await apiPost(`/api/mall/orders/${orderId}/receive`, {});
  message.value = "订单已收货";
  await loadMall();
}

async function receiveOrderWithException(order: any) {
  await runMallAction(async () => {
    let attachmentFileIds: string[] = [];
    if (receiptFile.value) {
      const uploaded = await uploadFile(receiptFile.value, {
        attachmentKind: "mall_receipt_image",
        objectType: "mall_order",
        objectId: order.id,
        supplierId: order.supplierId
      });
      attachmentFileIds = [uploaded.file.id];
    }
    await apiPost(`/api/mall/orders/${order.id}/receive`, {
      receiptType: "exception",
      exceptionType: "quality_issue",
      summary: "门店验收发现质量或包装异常，已上传验收附件并留痕。",
      attachmentFileIds,
      receivedItems: order.lineItems.map((line: any) => ({
        productId: line.productId,
        receivedQuantity: line.quantity,
        accepted: false
      }))
    });
    receiptFile.value = null;
    receiptFileName.value = "";
    message.value = "异常收货已登记";
    await loadMall();
  });
}

async function requestReturn(order: any) {
  await apiPost(`/api/mall/orders/${order.id}/returns`, { productId: order.lineItems[0]?.productId, quantity: 1, reason: "门店收货后发现规格不符" });
  message.value = "退货申请已提交";
  await loadMall();
}

async function reviewReturn(order: any, approved: boolean) {
  const response = await apiGet<{ orders: any[] }>("/api/mall/orders");
  const target = response.orders.find((item) => item.id === order.id);
  const returnId = target?.latestReturnId ?? order.latestReturnId;
  if (!returnId) {
    error.value = "当前订单没有可处理的退货申请";
    return;
  }
  await apiPost(`/api/mall/returns/${returnId}/review`, { approved, handlingNote: approved ? "供应商同意退货" : "供应商驳回退货" });
  message.value = approved ? "已同意退货" : "已驳回退货";
  await loadMall();
}

async function evaluateOrder(order: any) {
  await apiPost(`/api/mall/orders/${order.id}/evaluations`, {
    quality: 92,
    delivery: 90,
    service: 91,
    description: "门店已完成履约评价，质量、到货速度和服务态度符合要求。"
  });
  message.value = "供应商履约评价已提交";
  await loadMall();
}

async function uploadInvoice(order: any) {
  if (!invoiceFile.value) return;
  const uploaded = await uploadFile(invoiceFile.value, {
    attachmentKind: "mall_settlement_invoice",
    objectType: "mall_order",
    objectId: order.id,
    supplierId: order.supplierId
  });
  await apiPost(`/api/mall/orders/${order.id}/invoices`, { fileId: uploaded.file.id, fileName: uploaded.file.fileName, amount: order.totalAmount });
  message.value = "发票已上传";
  invoiceFile.value = null;
  invoiceFileName.value = "";
  await loadMall();
}

async function createScenario(templateType: string) {
  await apiPost("/api/mall/questionnaires", {
    title: "门店开业物资问卷",
    scope: "新开业门店",
    targetSupplierIds: ["sup-1"],
    questions: [
      { id: "room-count", prompt: "客房数量", type: "number", maxScore: 1000 },
      { id: "linen-spec", prompt: "布草规格", type: "text" },
      { id: "opening-date", prompt: "开业日期", type: "text" }
    ]
  });
  await apiPost("/api/mall/scenario-templates", {
    templateType,
    name: templateType === "sample_room" ? "样板间标准包" : "酒店开业基础包",
    productIds: products.value.map((item) => item.id),
    packageItems: products.value.map((item) => ({ productId: item.id, quantity: templateType === "sample_room" ? 1 : 3 })),
    applicableBrands: ["华礼"],
    applicableHotelTypes: ["高端酒店"],
    applicableHotelIds: ["org-hotel"],
    budgetAmount: 10000
  });
  message.value = "问卷与场景模板已创建";
  await loadMall();
}

async function submitQuestionnaire(questionnaire: any) {
  await runMallAction(async () => {
    await apiPost(`/api/mall/questionnaires/${questionnaire.id}/submissions`, {
      answers: (questionnaire.questions || []).map((question: any, index: number) => ({
        questionId: typeof question === "string" ? `q${index + 1}` : question.id,
        answer: typeof question === "string" ? "已填写" : question.type === "score" || question.type === "number" ? 9 : "已填写"
      }))
    });
    message.value = "问卷已填写并自动评分";
    await loadMall();
  });
}

async function archiveQuestionnaire(questionnaireId: string) {
  await runMallAction(async () => {
    await apiPost(`/api/mall/questionnaires/${questionnaireId}/archive`, {});
    message.value = "问卷已归档";
    await loadMall();
  });
}

async function templateToCart(templateId: string) {
  await runMallAction(async () => {
    await apiPost(`/api/mall/scenario-templates/${templateId}/cart`, {});
    message.value = "场景商品包已加入购物车";
    await loadMall();
  });
}

async function templateToOrder(templateId: string) {
  await runMallAction(async () => {
    const result = await apiPost<{ order: any }>(`/api/mall/scenario-templates/${templateId}/orders`, { shippingAddress: "场景包收货地址" });
    message.value = `场景包已一键下单：${result.order.orderNo}`;
    await loadMall();
  });
}

onMounted(loadMall);
</script>

<template>
  <section class="panel">
    <h2>供应链商城</h2>
    <WorkflowSurfaceSummary title="商城履约、结算与消息" :business-types="['mall_order', 'settlement_bill', 'invoice', 'payment_request', 'return_request']" compact />
    <div class="actions" v-if="hasRole([...buyerRoles, ...supplierAdminRoles])">
      <input type="file" accept="image/*" @change="chooseImage" />
      <span class="notice">{{ productImageName || "未选择商品图片" }}</span>
      <button type="button" @click="createProduct">新建商品</button>
      <button v-if="hasRole(operatorRoles)" type="button" @click="createScenario('sample_room')">样板间模板</button>
      <button v-if="hasRole(operatorRoles)" type="button" @click="createScenario('opening_package')">开业包模板</button>
    </div>
    <p v-if="message" class="notice">{{ message }}</p>
    <p v-if="error" class="inline-error">{{ error }}</p>
  </section>

  <section class="panel">
    <h2>商品中心</h2>
    <table>
      <thead>
        <tr>
          <th>商品</th>
          <th>分类</th>
          <th>SKU</th>
          <th>供应商</th>
          <th>状态</th>
          <th>报价</th>
          <th>价格来源</th>
          <th>图片</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="product in products" :key="product.id">
          <td>{{ product.name }}</td>
          <td>{{ product.category }} / {{ product.brand }}</td>
          <td>{{ product.skuCode }}</td>
          <td>{{ product.supplierId }}</td>
          <td>{{ labelStatus(product.status) }}</td>
          <td>{{ priceSummary(product) }}</td>
          <td>{{ priceTrace(product) }}</td>
          <td>
            <AttachmentList :attachments="product.imageFileMetadata || product.imageFileIds.map((id: string) => ({ id, fileName: '商品图片.png', contentType: 'image/png' } as UploadedFileMetadata))" compact empty-text="-" />
          </td>
          <td class="actions">
            <button v-if="hasRole(operatorRoles) && product.status !== 'listed'" type="button" class="secondary-button" @click="submitPriceAndList(product.id)">定价上架</button>
            <button v-if="hasRole(operatorRoles) && product.status === 'listed'" type="button" class="secondary-button" @click="delistProduct(product.id)">下架</button>
            <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" :disabled="product.status !== 'listed'" @click="addToCart(product.id)">加入购物车并下单</button>
            <span v-if="session.roleId === 'auditor'" class="notice">只读</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="panel">
    <h2>订单履约</h2>
    <table>
      <thead>
        <tr>
          <th>订单</th>
          <th>供应商</th>
          <th>金额</th>
          <th>状态</th>
          <th>地址</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id">
          <td>{{ order.orderNo }}</td>
          <td>{{ order.supplierId }}</td>
          <td>{{ order.totalAmount }}</td>
          <td>{{ labelStatus(order.status) }}</td>
          <td>{{ order.shippingAddress }}</td>
          <td class="actions">
            <button v-if="hasRole(supplierAdminRoles)" type="button" class="secondary-button" :disabled="!['submitted', 'supplier_confirmed'].includes(order.status)" @click="shipOrder(order.id)">确认发货</button>
            <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" :disabled="order.status !== 'shipped'" @click="receiveOrder(order.id)">收货</button>
            <input v-if="hasRole(buyerRoles)" type="file" accept="image/*,.pdf" @change="chooseReceiptFile" />
            <span v-if="hasRole(buyerRoles)" class="notice">{{ receiptFileName || "未选择验收附件" }}</span>
            <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" :disabled="order.status !== 'shipped'" @click="receiveOrderWithException(order)">异常收货</button>
            <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" :disabled="!['received', 'shipped', 'return_rejected'].includes(order.status)" @click="requestReturn(order)">退货</button>
            <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" :disabled="!['received', 'return_approved', 'return_rejected'].includes(order.status)" @click="evaluateOrder(order)">评价</button>
            <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" @click="copyOrder(order.id)">复制订单</button>
            <button type="button" class="secondary-button" @click="viewContract(order.id)">合同查看</button>
            <button v-if="hasRole(financeRoles)" type="button" class="secondary-button" :disabled="order.paymentStatus === 'paid'" @click="capturePayment(order.id)">模拟支付</button>
            <button v-if="hasRole(supplierAdminRoles)" type="button" class="secondary-button" :disabled="order.status !== 'return_requested'" @click="reviewReturn(order, true)">同意退货</button>
            <button v-if="hasRole(supplierAdminRoles)" type="button" class="secondary-button" :disabled="order.status !== 'return_requested'" @click="reviewReturn(order, false)">驳回退货</button>
            <input v-if="hasRole(supplierAdminRoles)" type="file" @change="chooseInvoice" />
            <span v-if="hasRole(supplierAdminRoles)" class="notice">{{ invoiceFileName || "未选择发票" }}</span>
            <button v-if="hasRole(supplierAdminRoles)" type="button" class="secondary-button" :disabled="!invoiceFile" @click="uploadInvoice(order)">上传发票</button>
            <span v-if="session.roleId === 'auditor'" class="notice">只读</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="panel">
    <h2>资金台账</h2>
    <table>
      <thead>
        <tr>
          <th>组织</th>
          <th>余额</th>
          <th>授信</th>
          <th>占用</th>
          <th>边界</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="account in fundAccounts" :key="account.id">
          <td>{{ account.orgId }}</td>
          <td>{{ account.balance }}</td>
          <td>{{ account.creditLimit }}</td>
          <td>{{ account.occupiedAmount }}</td>
          <td>{{ account.adapterBoundary }}</td>
          <td><button v-if="hasRole(financeRoles)" type="button" class="secondary-button" @click="rechargeFund(account.orgId)">模拟充值</button></td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="panel">
    <h2>问卷调查</h2>
    <table>
      <thead>
        <tr>
          <th>问卷</th>
          <th>范围</th>
          <th>状态</th>
          <th>提交</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="questionnaire in questionnaires" :key="questionnaire.id">
          <td>{{ questionnaire.title }}</td>
          <td>{{ questionnaire.scope }}</td>
          <td>{{ labelStatus(questionnaire.status) }}</td>
          <td>{{ questionnaire.submissions?.length || 0 }}</td>
          <td class="actions">
            <button v-if="hasRole(supplierRoles) && questionnaire.status === 'published'" type="button" class="secondary-button" @click="submitQuestionnaire(questionnaire)">填写</button>
            <button v-if="hasRole(operatorRoles) && questionnaire.status !== 'closed'" type="button" class="secondary-button" @click="archiveQuestionnaire(questionnaire.id)">归档</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="panel">
    <h2>场景模板</h2>
    <div class="list">
      <span v-for="template in templates" :key="template.id">
        {{ template.name }} / {{ labelStatus(template.templateType) }}
        <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" @click="templateToCart(template.id)">批量选品</button>
        <button v-if="hasRole(buyerRoles)" type="button" class="secondary-button" @click="templateToOrder(template.id)">一键下单</button>
      </span>
    </div>
  </section>
</template>
