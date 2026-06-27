<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../api/http";
import ErrorAlert from "../components/ErrorAlert.vue";
import { formatDateTime, labelStatus } from "../utils/status-labels";

interface IntegrationLog {
  id: string;
  jobId?: string;
  operation: string;
  status: string;
  mode?: string;
  businessType?: string;
  businessId?: string;
  requestId?: string;
  idempotencyKey?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
  key?: string;
}

interface IntegrationAdapter {
  key: string;
  name: string;
  mode: string;
  logs: IntegrationLog[];
}

const adapters = ref<IntegrationAdapter[]>([]);
const jobs = ref<IntegrationLog[]>([]);
const selectedAdapterKey = ref("");
const loading = ref(false);
const error = ref("");
const message = ref("");
const callForm = ref({
  operation: "integration.operation",
  businessType: "procurement_request",
  businessId: "",
  requestId: "",
  idempotencyKey: "",
  forceFailure: false,
  payloadJson: "{}"
});

const selectedAdapter = computed(() => adapters.value.find((item) => item.key === selectedAdapterKey.value));
const summary = computed(() => ({
  adapters: adapters.value.length,
  jobs: jobs.value.length,
  failed: jobs.value.filter((job) => job.status === "failed").length,
  pending: jobs.value.filter((job) => ["queued", "pending", "retrying"].includes(job.status)).length
}));

function payloadText(value: unknown) {
  if (value === undefined || value === null) return "-";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function jobId(job: IntegrationLog) {
  return job.jobId ?? job.id;
}

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
    error.value = err instanceof Error ? err.message : "外部联调边界数据加载失败";
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
    mock ? "已创建模拟联调调用" : "已创建联调调用"
  );
}

function operateJob(job: IntegrationLog, action: "execute" | "retry" | "repush" | "cancel") {
  const adapterKey = job.key ?? selectedAdapterKey.value;
  return run(() => apiPost(`/api/integration-adapters/${adapterKey}/jobs/${jobId(job)}/${action}`, {}), "联调任务状态已更新");
}

onMounted(load);
</script>

<template>
  <section class="page-surface">
    <div class="page-title-row">
      <div>
        <p class="eyebrow">外部系统边界</p>
        <h2>OA / 财务 / 支付联调边界</h2>
      </div>
      <div class="summary-strip">
        <span><strong>{{ summary.adapters }}</strong> adapter</span>
        <span><strong>{{ summary.jobs }}</strong> 任务</span>
        <span><strong>{{ summary.pending }}</strong> 待处理</span>
        <span><strong>{{ summary.failed }}</strong> 失败</span>
      </div>
    </div>
    <p v-if="message" class="notice">{{ message }}</p>
    <p v-if="loading" class="notice">正在加载外部联调边界...</p>
    <ErrorAlert v-if="error" :message="error" />
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>Adapter调用</h3>
      <button type="button" class="secondary-button" @click="load">刷新</button>
    </div>
    <div class="form-grid">
      <label>
        Adapter
        <select v-model="selectedAdapterKey">
          <option v-for="adapter in adapters" :key="adapter.key" :value="adapter.key">{{ adapter.name }} / {{ adapter.mode }}</option>
        </select>
      </label>
      <label>
        操作
        <input v-model="callForm.operation" />
      </label>
      <label>
        业务类型
        <input v-model="callForm.businessType" />
      </label>
      <label>
        业务ID
        <input v-model="callForm.businessId" />
      </label>
      <label>
        请求ID
        <input v-model="callForm.requestId" />
      </label>
      <label>
        幂等键
        <input v-model="callForm.idempotencyKey" />
      </label>
      <label class="check-row">
        <input v-model="callForm.forceFailure" type="checkbox" />
        强制失败
      </label>
    </div>
    <label class="form-grid">
      Payload JSON
      <textarea v-model="callForm.payloadJson" rows="4"></textarea>
    </label>
    <div class="actions">
      <button type="button" :disabled="!selectedAdapterKey" @click="callAdapter(false)">创建联调调用</button>
      <button type="button" :disabled="!selectedAdapterKey" class="secondary-button" @click="callAdapter(true)">创建模拟调用</button>
    </div>
    <p class="notice">
      当前 adapter：{{ selectedAdapter?.name || "-" }} / {{ selectedAdapter?.mode || "-" }}。真实外部 HTTP、凭据托管、回调验签和生产重推仍按 adapter 边界处理。
    </p>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>Adapter 状态</h3>
      <span class="tag">{{ adapters.length }} 个</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>名称</th>
            <th>模式</th>
            <th>日志数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="adapter in adapters" :key="adapter.key">
            <td>{{ adapter.key }}</td>
            <td>{{ adapter.name }}</td>
            <td>{{ adapter.mode }}</td>
            <td>{{ adapter.logs.length }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="business-panel">
    <div class="panel-head">
      <h3>联调任务</h3>
      <span class="tag">{{ jobs.length }} 条</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>任务</th>
            <th>Adapter</th>
            <th>操作</th>
            <th>业务</th>
            <th>状态</th>
            <th>请求</th>
            <th>响应/错误</th>
            <th>更新时间</th>
            <th>处理</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="job in jobs" :key="`${job.key}-${jobId(job)}`">
            <td>{{ jobId(job) }}</td>
            <td>{{ job.key }}</td>
            <td>{{ job.operation }}</td>
            <td>{{ job.businessType || "-" }} / {{ job.businessId || "-" }}</td>
            <td>{{ labelStatus(job.status) }}</td>
            <td>{{ payloadText(job.requestPayload) }}</td>
            <td>{{ job.errorMessage || payloadText(job.responsePayload) }}</td>
            <td>{{ formatDateTime(job.updatedAt || job.createdAt || "") }}</td>
            <td>
              <button type="button" class="secondary-button" @click="operateJob(job, 'execute')">执行</button>
              <button type="button" class="secondary-button" @click="operateJob(job, 'retry')">重试</button>
              <button type="button" class="secondary-button" @click="operateJob(job, 'repush')">重推</button>
              <button type="button" class="secondary-button" @click="operateJob(job, 'cancel')">取消</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!jobs.length" class="empty compact-empty">暂无联调任务。</div>
    </div>
  </section>
</template>
