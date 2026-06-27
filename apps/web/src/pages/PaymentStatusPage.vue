<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../api/http";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";
import { formatDateTime, labelStatus } from "../utils/status-labels";

interface FundLedgerEntry {
  id: string;
  accountId: string;
  orgId: string;
  orderId?: string;
  direction: string;
  entryType: string;
  amount: number;
  status: string;
  createdBy: string;
  createdAt: string;
  note?: string;
}

interface FundAccount {
  id: string;
  orgId: string;
  balance: number;
  creditLimit: number;
  occupiedAmount: number;
  status: string;
  ledgerEntries: FundLedgerEntry[];
  updatedAt: string;
}

interface MallOrder {
  id: string;
  orderNo: string;
  orgId: string;
  supplierId: string;
  status: string;
  totalAmount: number;
  paymentStatus?: string;
  paymentReservedAmount?: number;
  updatedAt: string;
}

interface Organization {
  id: string;
  name: string;
}

const session = useSessionStore();
const accounts = ref<FundAccount[]>([]);
const orders = ref<MallOrder[]>([]);
const organizations = ref<Organization[]>([]);
const loading = ref(false);
const error = ref("");
const message = ref("");
const fundOperationForm = ref({
  rechargeAmount: 5000,
  rechargeNote: "门店采购备用金补充",
  captureNote: "订单验收后付款确认",
  releaseNote: "订单异常释放占用"
});

const canMaintainFunds = computed(() => ["group_manager", "buyer", "hotel_buyer", "hotel_finance", "finance_reviewer"].includes(session.roleId));
const allLedgerEntries = computed(() => accounts.value.flatMap((account) => account.ledgerEntries.map((entry) => ({ ...entry, account }))));
const payableOrders = computed(() => orders.value.filter((order) => order.paymentStatus === "payment_reserved" || order.status === "received"));
const orderNos = computed(() => new Map(orders.value.map((order) => [order.id, order.orderNo])));
const summary = computed(() => ({
  balance: accounts.value.reduce((sum, item) => sum + Number(item.balance ?? 0), 0),
  credit: accounts.value.reduce((sum, item) => sum + Number(item.creditLimit ?? 0), 0),
  occupied: accounts.value.reduce((sum, item) => sum + Number(item.occupiedAmount ?? 0), 0),
  pendingAmount: payableOrders.value.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0)
}));

function money(value: number | undefined) {
  if (value === undefined || Number.isNaN(Number(value))) return "-";
  return `¥${Number(value).toLocaleString("zh-CN")}`;
}

function directionLabel(value: string) {
  const labels: Record<string, string> = {
    inbound: "入账",
    outbound: "出账",
    occupy: "占用",
    release: "释放",
    reverse: "冲正"
  };
  return labels[value] ?? labelStatus(value);
}

function entryTypeLabel(value: string) {
  const labels: Record<string, string> = {
    opening_balance: "期初余额",
    recharge: "充值入账",
    credit_grant: "授信调整",
    payment_reserve: "付款占用",
    payment_capture: "付款确认",
    return_refund: "退货退款",
    settlement_adjustment: "结算调整"
  };
  return labels[value] ?? labelStatus(value);
}

function businessNote(entry: FundLedgerEntry) {
  if (entry.entryType === "opening_balance") return "账户期初余额";
  if (entry.entryType === "payment_reserve") return "订单提交后占用额度";
  if (entry.entryType === "payment_capture") return "订单验收后确认付款";
  if (entry.entryType === "recharge") return "采购备用金补充";
  if (entry.entryType === "return_refund") return "退货退款处理";
  if (entry.entryType === "settlement_adjustment") return "结算调整";
  return entry.note && !/(本地|模拟|演示|mock|test|未连接|接口资料)/i.test(entry.note) ? entry.note : "资金流水已记录";
}

function orgName(orgId: string) {
  return organizations.value.find((item) => item.id === orgId)?.name ?? "门店账户";
}

function orderLabel(orderId?: string) {
  if (!orderId) return "-";
  return orderNos.value.get(orderId) ?? "关联订单";
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [fundData, orderData, orgData] = await Promise.all([
      apiGet<{ accounts: FundAccount[] }>("/api/mall/fund-accounts"),
      apiGet<{ orders: MallOrder[] }>("/api/mall/orders").catch(() => ({ orders: [] })),
      apiGet<{ organizations: Organization[] }>("/api/organizations").catch(() => ({ organizations: [] }))
    ]);
    accounts.value = fundData.accounts;
    orders.value = orderData.orders;
    organizations.value = orgData.organizations;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "资金数据加载失败";
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
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

function recharge(account: FundAccount) {
  return run(
    () =>
      apiPost(`/api/mall/fund-accounts/${account.orgId}/recharges`, {
        amount: Number(fundOperationForm.value.rechargeAmount),
        note: fundOperationForm.value.rechargeNote
      }),
    "充值入账已登记"
  );
}

function capturePayment(order: MallOrder) {
  return run(() => apiPost(`/api/mall/orders/${order.id}/fund-ledger`, { action: "capture", note: fundOperationForm.value.captureNote }), "付款状态已更新");
}

function releasePayment(order: MallOrder) {
  return run(() => apiPost(`/api/mall/orders/${order.id}/fund-ledger`, { action: "release", note: fundOperationForm.value.releaseNote }), "占用金额已释放");
}

onMounted(load);
</script>

<template>
  <section class="page-surface">
    <div class="page-title-row">
      <div>
        <p class="eyebrow">资金付款</p>
        <h2>资金与付款状态</h2>
      </div>
      <div class="summary-strip">
        <span><strong>{{ money(summary.balance) }}</strong> 可用余额</span>
        <span><strong>{{ money(summary.credit) }}</strong> 授信额度</span>
        <span><strong>{{ money(summary.occupied) }}</strong> 已占用</span>
        <span><strong>{{ money(summary.pendingAmount) }}</strong> 待处理</span>
      </div>
    </div>
    <p v-if="message" class="notice">{{ message }}</p>
    <p v-if="loading" class="notice">正在加载资金状态...</p>
  </section>

  <section v-if="canMaintainFunds" class="business-panel">
    <div class="panel-head">
      <h3>资金操作参数</h3>
    </div>
    <div class="form-grid">
      <label>
        充值金额
        <input v-model.number="fundOperationForm.rechargeAmount" type="number" min="0" step="0.01" />
      </label>
      <label>
        充值说明
        <input v-model="fundOperationForm.rechargeNote" />
      </label>
      <label>
        付款占用说明
        <input v-model="fundOperationForm.captureNote" />
      </label>
      <label>
        付款释放说明
        <input v-model="fundOperationForm.releaseNote" />
      </label>
    </div>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>资金账户</h3>
      <span class="tag">{{ accounts.length }} 个账户</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>账户</th>
            <th>状态</th>
            <th>余额</th>
            <th>授信</th>
            <th>占用</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="account in accounts" :key="account.id">
            <td>{{ orgName(account.orgId) }}</td>
            <td>{{ labelStatus(account.status) }}</td>
            <td>{{ money(account.balance) }}</td>
            <td>{{ money(account.creditLimit) }}</td>
            <td>{{ money(account.occupiedAmount) }}</td>
            <td>{{ formatDateTime(account.updatedAt) }}</td>
            <td>
              <button v-if="canMaintainFunds" type="button" @click="recharge(account)">登记充值</button>
              <span v-else class="notice">只读</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>待处理付款</h3>
      <span class="tag">{{ payableOrders.length }} 单</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>订单号</th>
            <th>组织</th>
            <th>订单状态</th>
            <th>付款状态</th>
            <th>金额</th>
            <th>占用金额</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in payableOrders" :key="order.id">
            <td>{{ order.orderNo }}</td>
            <td>{{ orgName(order.orgId) }}</td>
            <td>{{ labelStatus(order.status) }}</td>
            <td>{{ labelStatus(order.paymentStatus ?? 'pending_payment') }}</td>
            <td>{{ money(order.totalAmount) }}</td>
            <td>{{ money(order.paymentReservedAmount) }}</td>
            <td>
              <button v-if="canMaintainFunds && order.paymentStatus === 'payment_reserved'" type="button" @click="capturePayment(order)">确认付款</button>
              <button v-if="canMaintainFunds && order.paymentStatus === 'payment_reserved'" type="button" class="secondary-button" @click="releasePayment(order)">释放占用</button>
              <span v-if="!canMaintainFunds" class="notice">只读</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!payableOrders.length" class="empty compact-empty">暂无待处理付款。</div>
    </div>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>资金流水</h3>
      <span class="tag">{{ allLedgerEntries.length }} 条</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>时间</th>
            <th>账户</th>
            <th>方向</th>
            <th>类型</th>
            <th>状态</th>
            <th>订单</th>
            <th>金额</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in allLedgerEntries" :key="entry.id">
            <td>{{ formatDateTime(entry.createdAt) }}</td>
            <td>{{ orgName(entry.orgId) }}</td>
            <td>{{ directionLabel(entry.direction) }}</td>
            <td>{{ entryTypeLabel(entry.entryType) }}</td>
            <td>{{ labelStatus(entry.status) }}</td>
            <td>{{ orderLabel(entry.orderId) }}</td>
            <td>{{ money(entry.amount) }}</td>
            <td>{{ businessNote(entry) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!allLedgerEntries.length" class="empty compact-empty">暂无资金流水。</div>
    </div>
  </section>

  <ErrorAlert v-if="error" :message="error" />
</template>
