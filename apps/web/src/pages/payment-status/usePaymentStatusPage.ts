import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { directionLabel, entryTypeLabel, money } from "./display";
import type { FundAccount, FundLedgerEntry, FundOperationForm, LedgerRow, MallOrder, Organization } from "./types";

export function usePaymentStatusPage() {
  const session = useSessionStore();
  const accounts = ref<FundAccount[]>([]);
  const orders = ref<MallOrder[]>([]);
  const organizations = ref<Organization[]>([]);
  const loading = ref(false);
  const error = ref("");
  const message = ref("");
  const processRefreshKey = ref(0);
  const fundOperationForm = ref<FundOperationForm>({
    rechargeAmount: 5000,
    rechargeNote: "门店采购备用金补充",
    captureNote: "订单验收后付款确认",
    releaseNote: "订单异常释放占用"
  });

  const canMaintainFunds = computed(() => ["group_manager", "buyer", "hotel_buyer", "hotel_finance", "finance_reviewer"].includes(session.roleId));
  const allLedgerEntries = computed<LedgerRow[]>(() => accounts.value.flatMap((account) => account.ledgerEntries.map((entry) => ({ ...entry, account }))));
  const payableOrders = computed(() => orders.value.filter((order) => order.paymentStatus === "payment_reserved" || order.status === "received"));
  const orderNos = computed(() => new Map(orders.value.map((order) => [order.id, order.orderNo])));
  const selectedPaymentBusinessId = computed(() => payableOrders.value[0]?.id ?? orders.value[0]?.id ?? allLedgerEntries.value.find((entry) => entry.entryType === "payment_request")?.id ?? "");
  const summary = computed(() => ({
    balance: accounts.value.reduce((sum, item) => sum + Number(item.balance ?? 0), 0),
    credit: accounts.value.reduce((sum, item) => sum + Number(item.creditLimit ?? 0), 0),
    occupied: accounts.value.reduce((sum, item) => sum + Number(item.occupiedAmount ?? 0), 0),
    pendingAmount: payableOrders.value.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0)
  }));
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "可用余额", value: money(summary.value.balance), meta: "全部账户" },
    { label: "授信额度", value: money(summary.value.credit), meta: "全部账户" },
    { label: "已占用", value: money(summary.value.occupied), meta: "订单付款占用" },
    { label: "待处理", value: money(summary.value.pendingAmount), meta: "待处理付款" }
  ]);

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
      processRefreshKey.value += 1;
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

  return {
    accounts,
    allLedgerEntries,
    businessNote,
    canMaintainFunds,
    capturePayment,
    directionLabel,
    entryTypeLabel,
    error,
    fundOperationForm,
    loading,
    message,
    money,
    orderLabel,
    orgName,
    payableOrders,
    processRefreshKey,
    recharge,
    releasePayment,
    selectedPaymentBusinessId,
    summaryItems
  };
}
