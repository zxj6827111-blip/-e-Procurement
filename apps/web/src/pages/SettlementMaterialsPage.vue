<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../api/http";
import ErrorAlert from "../components/ErrorAlert.vue";
import ProcessTimeline from "../components/ProcessTimeline.vue";
import { useSessionStore } from "../stores/session";
import { formalFileName } from "../utils/business-display";
import { formatDateTime, labelStatus } from "../utils/status-labels";

interface SupplierRow {
  id: string;
  name: string;
}

interface SettlementBill {
  id: string;
  billNo: string;
  purchaseOrderId: string;
  purchaseOrderNo?: string;
  projectId: string;
  supplierId: string;
  period: string;
  orderAmount: number;
  receivedAmount: number;
  returnAmount: number;
  serviceFee: number;
  settlementAmount: number;
  status: string;
  createdAt: string;
}

interface SettlementMaterial {
  id: string;
  purchaseOrderId: string;
  projectId: string;
  supplierId: string;
  materialType: string;
  status: string;
  fileName?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  verificationOpinion?: string;
}

interface PurchaseOrder {
  id: string;
  orderNo: string;
}

interface Invoice {
  id: string;
  settlementBillId?: string;
  orderId?: string;
  supplierId: string;
  invoiceNo?: string;
  fileName?: string;
  amount: number;
  taxAmount?: number;
  status: string;
  uploadedAt: string;
  verificationOpinion?: string;
}

interface ReconciliationLine {
  id: string;
  sourceType: string;
  sourceId: string;
  supplierId?: string;
  expectedAmount: number;
  actualAmount: number;
  status: string;
  reason?: string;
  updatedAt: string;
}

interface Overview {
  settlementBills: SettlementBill[];
  settlementMaterials: SettlementMaterial[];
  invoices: Invoice[];
  reconciliationLines: ReconciliationLine[];
  fundLedgerEntries: Array<{ id: string; settlementBillId: string; amount: number; status: string }>;
}

const session = useSessionStore();
const suppliers = ref<SupplierRow[]>([]);
const overview = ref<Overview>({
  settlementBills: [],
  settlementMaterials: [],
  invoices: [],
  reconciliationLines: [],
  fundLedgerEntries: []
});
const loading = ref(false);
const error = ref("");
const message = ref("");
const processRefreshKey = ref(0);
const settlementOperationForm = ref({
  billApproveOpinion: "财务审核通过",
  billRejectOpinion: "金额或资料需更正",
  materialType: "delivery_note",
  materialFileName: "",
  materialApproveOpinion: "资料清晰完整",
  materialRejectOpinion: "资料缺少签收信息",
  invoiceApproveOpinion: "发票金额与结算单一致",
  invoiceRejectOpinion: "发票金额或税额需复核"
});

const supplierNames = computed(() => new Map(suppliers.value.map((item) => [item.id, item.name])));
const canFinanceReview = computed(() => ["group_manager", "buyer", "hotel_buyer", "hotel_finance", "finance_reviewer"].includes(session.roleId));
const canSupplierUpload = computed(() => ["supplier", "supplier_admin", "supplier_quotation"].includes(session.roleId));

const summary = computed(() => ({
  bills: overview.value.settlementBills.length,
  materials: overview.value.settlementMaterials.length,
  pendingInvoices: overview.value.invoices.filter((item) => item.status === "pending_verification").length,
  amount: overview.value.settlementBills.reduce((sum, item) => sum + Number(item.settlementAmount ?? 0), 0)
}));
const selectedSettlementBillId = computed(() => overview.value.settlementBills[0]?.id ?? "");
const selectedInvoiceId = computed(() => overview.value.invoices[0]?.id ?? "");

function money(value: number | undefined) {
  if (value === undefined || Number.isNaN(Number(value))) return "-";
  return `¥${Number(value).toLocaleString("zh-CN")}`;
}

function supplierName(supplierId?: string) {
  if (!supplierId) return "-";
  return supplierNames.value.get(supplierId) ?? supplierId;
}

function materialTypeLabel(value: string) {
  const labels: Record<string, string> = {
    invoice: "发票",
    delivery_note: "送货单",
    acceptance_record: "验收单",
    other: "其他资料"
  };
  return labels[value] ?? labelStatus(value);
}

function invoiceBillNo(invoice: Invoice) {
  const bill = overview.value.settlementBills.find((item) => item.id === invoice.settlementBillId);
  return bill?.billNo ?? orderLabel(invoice.orderId) ?? "-";
}

function orderLabel(orderId?: string) {
  if (!orderId) return "-";
  return overview.value.settlementBills.find((item) => item.purchaseOrderId === orderId)?.purchaseOrderNo ?? "关联订单";
}

function materialFileLabel(fileName?: string) {
  return formalFileName(fileName, "结算资料");
}

function invoiceFileLabel(invoice: Invoice) {
  return invoice.invoiceNo || formalFileName(invoice.fileName, "发票");
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [supplierData, overviewData] = await Promise.all([
      apiGet<{ suppliers: SupplierRow[] }>("/api/suppliers").catch(() => ({ suppliers: [] })),
      apiGet<Overview>("/api/settlement-finance/overview").catch(() => ({
        settlementBills: [],
        settlementMaterials: [],
        invoices: [],
        reconciliationLines: [],
        fundLedgerEntries: []
      }))
    ]);
    suppliers.value = supplierData.suppliers;
    overview.value = overviewData;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "结算数据加载失败";
  } finally {
    loading.value = false;
  }
}

async function run(action: () => Promise<void>, successText: string) {
  error.value = "";
  message.value = "";
  try {
    await action();
    message.value = successText;
    await load();
    processRefreshKey.value += 1;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

function submitBill(bill: SettlementBill) {
  return run(() => apiPost(`/api/settlement-finance/settlement-bills/${bill.id}/submit`), "结算单已提交审核");
}

function reviewBill(bill: SettlementBill, approved: boolean) {
  return run(
    () =>
      apiPost(`/api/settlement-finance/settlement-bills/${bill.id}/review`, {
        approved,
        opinion: approved ? settlementOperationForm.value.billApproveOpinion : settlementOperationForm.value.billRejectOpinion
      }),
    approved ? "结算单已审核通过" : "结算单已驳回"
  );
}

function reviewMaterial(material: SettlementMaterial, approved: boolean) {
  return run(
    () =>
      apiPost(`/api/settlement-finance/materials/${material.id}/review`, {
        approved,
        opinion: approved ? settlementOperationForm.value.materialApproveOpinion : settlementOperationForm.value.materialRejectOpinion
      }),
    approved ? "结算资料已核验" : "结算资料已驳回"
  );
}

function createMaterial(bill: SettlementBill) {
  return run(
    () =>
      apiPost(`/api/settlement-finance/settlement-bills/${bill.id}/materials`, {
        materialType: settlementOperationForm.value.materialType,
        fileName: settlementOperationForm.value.materialFileName || `${bill.billNo}-${materialTypeLabel(settlementOperationForm.value.materialType)}.pdf`
      }),
    "结算资料已补充"
  );
}

function reviewInvoice(invoice: Invoice, approved: boolean) {
  if (!invoice.settlementBillId) return Promise.resolve();
  return run(
    () =>
      apiPost(`/api/settlement-finance/invoices/${invoice.id}/review`, {
        approved,
        opinion: approved ? settlementOperationForm.value.invoiceApproveOpinion : settlementOperationForm.value.invoiceRejectOpinion
      }),
    approved ? "发票已审核通过" : "发票已驳回"
  );
}

onMounted(load);
</script>

<template>
  <section class="page-surface">
    <div class="page-title-row">
      <div>
        <p class="eyebrow">结算材料</p>
        <h2>结算与发票审核</h2>
      </div>
      <div class="summary-strip">
        <span><strong>{{ summary.bills }}</strong> 结算单</span>
        <span><strong>{{ summary.materials }}</strong> 材料</span>
        <span><strong>{{ summary.pendingInvoices }}</strong> 待审发票</span>
        <span><strong>{{ money(summary.amount) }}</strong> 应结金额</span>
      </div>
    </div>
    <p v-if="message" class="notice">{{ message }}</p>
    <p v-if="loading" class="notice">正在加载结算数据...</p>
  </section>

  <ProcessTimeline
    v-if="selectedSettlementBillId"
    business-type="settlement"
    :business-id="selectedSettlementBillId"
    title="结算流程"
    :refresh-key="processRefreshKey"
  />

  <ProcessTimeline
    v-if="selectedInvoiceId"
    business-type="invoice"
    :business-id="selectedInvoiceId"
    title="发票流程"
    :refresh-key="processRefreshKey"
  />

  <section class="business-panel">
    <div class="panel-head">
      <h3>结算操作参数</h3>
    </div>
    <div class="form-grid">
      <label>
        结算通过意见
        <input v-model="settlementOperationForm.billApproveOpinion" />
      </label>
      <label>
        结算驳回意见
        <input v-model="settlementOperationForm.billRejectOpinion" />
      </label>
      <label>
        补充材料类型
        <select v-model="settlementOperationForm.materialType">
          <option value="invoice">发票</option>
          <option value="delivery_note">送货单</option>
          <option value="acceptance_record">验收单</option>
          <option value="other">其他资料</option>
        </select>
      </label>
      <label>
        补充材料文件名
        <input v-model="settlementOperationForm.materialFileName" placeholder="不填自动按结算单生成" />
      </label>
      <label>
        材料通过意见
        <input v-model="settlementOperationForm.materialApproveOpinion" />
      </label>
      <label>
        材料驳回意见
        <input v-model="settlementOperationForm.materialRejectOpinion" />
      </label>
      <label>
        发票通过意见
        <input v-model="settlementOperationForm.invoiceApproveOpinion" />
      </label>
      <label>
        发票驳回意见
        <input v-model="settlementOperationForm.invoiceRejectOpinion" />
      </label>
    </div>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>结算单</h3>
      <span class="tag">{{ overview.settlementBills.length }} 单</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>结算单号</th>
            <th>供应商</th>
            <th>账期</th>
            <th>订单金额</th>
            <th>退货/服务费</th>
            <th>应结金额</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bill in overview.settlementBills" :key="bill.id">
            <td>{{ bill.billNo }}</td>
            <td>{{ supplierName(bill.supplierId) }}</td>
            <td>{{ bill.period }}</td>
            <td>{{ money(bill.orderAmount) }}</td>
            <td>{{ money(bill.returnAmount + bill.serviceFee) }}</td>
            <td>{{ money(bill.settlementAmount) }}</td>
            <td>{{ labelStatus(bill.status) }}</td>
            <td>
              <button v-if="canSupplierUpload && bill.status === 'draft'" type="button" @click="submitBill(bill)">提交审核</button>
              <button v-if="canSupplierUpload" type="button" class="secondary-button" @click="createMaterial(bill)">补充资料</button>
              <button v-if="canFinanceReview && ['submitted', 'payable'].includes(bill.status)" type="button" @click="reviewBill(bill, true)">审核通过</button>
              <button v-if="canFinanceReview && bill.status === 'submitted'" type="button" class="secondary-button" @click="reviewBill(bill, false)">驳回</button>
              <span v-if="!canSupplierUpload && !canFinanceReview" class="notice">只读</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!overview.settlementBills.length" class="empty compact-empty">当前角色暂无可见结算单。</div>
    </div>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>结算资料</h3>
      <span class="tag">{{ overview.settlementMaterials.length }} 份</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>资料类型</th>
            <th>文件</th>
            <th>供应商</th>
            <th>订单</th>
            <th>状态</th>
            <th>上传时间</th>
            <th>核验意见</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="material in overview.settlementMaterials" :key="material.id">
            <td>{{ materialTypeLabel(material.materialType) }}</td>
            <td>{{ materialFileLabel(material.fileName) }}</td>
            <td>{{ supplierName(material.supplierId) }}</td>
            <td>{{ orderLabel(material.purchaseOrderId) }}</td>
            <td>{{ labelStatus(material.status) }}</td>
            <td>{{ formatDateTime(material.uploadedAt) }}</td>
            <td>{{ material.verificationOpinion || "-" }}</td>
            <td>
              <button v-if="canFinanceReview && material.status === 'pending_verification'" type="button" @click="reviewMaterial(material, true)">核验通过</button>
              <button v-if="canFinanceReview && material.status === 'pending_verification'" type="button" class="secondary-button" @click="reviewMaterial(material, false)">驳回</button>
              <span v-if="!canFinanceReview" class="notice">只读</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!overview.settlementMaterials.length" class="empty compact-empty">当前角色暂无可见结算资料。</div>
    </div>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>发票</h3>
      <span class="tag">{{ overview.invoices.length }} 张</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>发票号/文件</th>
            <th>关联结算</th>
            <th>供应商</th>
            <th>金额</th>
            <th>税额</th>
            <th>状态</th>
            <th>上传时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="invoice in overview.invoices" :key="invoice.id">
            <td>{{ invoiceFileLabel(invoice) }}</td>
            <td>{{ invoiceBillNo(invoice) }}</td>
            <td>{{ supplierName(invoice.supplierId) }}</td>
            <td>{{ money(invoice.amount) }}</td>
            <td>{{ money(invoice.taxAmount) }}</td>
            <td>{{ labelStatus(invoice.status) }}</td>
            <td>{{ formatDateTime(invoice.uploadedAt) }}</td>
            <td>
              <button v-if="canFinanceReview && invoice.status === 'pending_verification' && invoice.settlementBillId" type="button" @click="reviewInvoice(invoice, true)">审核通过</button>
              <button v-if="canFinanceReview && invoice.status === 'pending_verification' && invoice.settlementBillId" type="button" class="secondary-button" @click="reviewInvoice(invoice, false)">驳回</button>
              <span v-if="!canFinanceReview || !invoice.settlementBillId" class="notice">只读</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!overview.invoices.length" class="empty compact-empty">当前角色暂无可见发票。</div>
    </div>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>金额核对</h3>
    </div>
    <div class="work-list">
      <article v-for="line in overview.reconciliationLines" :key="line.id" class="work-list-row">
        <span class="tag">{{ labelStatus(line.status) }}</span>
        <strong>{{ supplierName(line.supplierId) }} / {{ money(line.expectedAmount) }}</strong>
        <small>{{ line.reason || `实核 ${money(line.actualAmount)} / ${formatDateTime(line.updatedAt)}` }}</small>
      </article>
      <div v-if="!overview.reconciliationLines.length" class="empty compact-empty">暂无金额差异记录。</div>
    </div>
  </section>

  <ErrorAlert v-if="error" :message="error" />
</template>
