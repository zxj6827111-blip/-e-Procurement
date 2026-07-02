import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../../api/http";
import type { IntegrationAdapter, IntegrationCallForm, IntegrationJobAction, IntegrationLog } from "./types";
import { jobId } from "./display";

export function useIntegrationBoundaryPage() {
  const adapters = ref<IntegrationAdapter[]>([]);
  const jobs = ref<IntegrationLog[]>([]);
  const selectedAdapterKey = ref("");
  const loading = ref(false);
  const error = ref("");
  const message = ref("");
  const callForm = ref<IntegrationCallForm>({
    operation: "integration.operation",
    businessType: "procurement_request",
    businessId: "",
    requestId: "",
    idempotencyKey: "",
    forceFailure: false,
    payloadJson: "{}"
  });

  const selectedAdapter = computed(() => adapters.value.find((item) => item.key === selectedAdapterKey.value));
  const summaryItems = computed(() => [
    { label: "Adapter", value: adapters.value.length, meta: "外部系统边界" },
    { label: "任务", value: jobs.value.length, meta: "集成队列" },
    { label: "待处理", value: jobs.value.filter((job) => ["queued", "pending", "retrying"].includes(job.status)).length, meta: "队列中" },
    { label: "失败", value: jobs.value.filter((job) => job.status === "failed").length, meta: "需复核" }
  ]);

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      const [adapterData, jobData] = await Promise.all([
        apiGet<{ adapters: IntegrationAdapter[] }>("/api/integration-adapters"),
        apiGet<{ jobs: IntegrationLog[] }>("/api/integration-jobs")
      ]);
      adapters.value = adapterData.adapters;
      jobs.value = jobData.jobs;
      selectedAdapterKey.value ||= adapters.value[0]?.key ?? "";
    } catch (err) {
      error.value = err instanceof Error ? err.message : "外部集成边界数据加载失败";
    } finally {
      loading.value = false;
    }
  }

  async function run(action: () => Promise<unknown>, successText: string) {
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

  function callAdapter(mock = false) {
    const adapterKey = selectedAdapterKey.value;
    if (!adapterKey) return;
    let payload: unknown = {};
    try {
      payload = JSON.parse(callForm.value.payloadJson || "{}");
    } catch {
      error.value = "Payload JSON 格式不正确。";
      return;
    }
    const path = mock ? "mock-call" : "call";
    return run(
      () =>
        apiPost(`/api/integration-adapters/${adapterKey}/${path}`, {
          operation: callForm.value.operation,
          businessType: callForm.value.businessType,
          businessId: callForm.value.businessId || undefined,
          requestId: callForm.value.requestId || undefined,
          idempotencyKey: callForm.value.idempotencyKey || undefined,
          forceFailure: callForm.value.forceFailure,
          payload
        }),
      mock ? "已创建本地验证调用" : "已创建集成调用"
    );
  }

  function operateJob(job: IntegrationLog, action: IntegrationJobAction) {
    const adapterKey = job.key ?? selectedAdapterKey.value;
    return run(() => apiPost(`/api/integration-adapters/${adapterKey}/jobs/${jobId(job)}/${action}`, {}), "集成任务状态已更新");
  }

  onMounted(load);

  return {
    adapters,
    callAdapter,
    callForm,
    error,
    jobs,
    load,
    loading,
    message,
    operateJob,
    selectedAdapter,
    selectedAdapterKey,
    summaryItems
  };
}
