<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiGet, apiPatch, apiPost, uploadFile } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { isTestLikeText } from "../utils/business-display";
import { formatDateTime, labelStatus } from "../utils/status-labels";

interface Project {
  id: string;
  code: string;
  name: string;
  beforeDeadline: boolean;
  externalTradeFlag: boolean;
}

interface Bid {
  id: string;
  projectId: string;
  supplierId: string;
  supplierName?: string;
  amount?: number;
  taxRate?: number;
  taxInclusive?: boolean;
  taxNote?: string;
  deliveryDays?: number;
  responseSummary?: string;
  serviceCommitment?: string;
  status: string;
  submittedAt: string | null;
  lockedAt: string | null;
  versionNo?: number;
}

const projects = ref<Project[]>([]);
const bids = ref<Bid[]>([]);
const suppliers = ref<Array<{ id: string; name: string }>>([]);
const selectedProjectId = ref("p-pre");
const selectedBidId = ref("");
const amount = ref(188800);
const taxRate = ref(0.13);
const taxInclusive = ref(true);
const taxNote = ref("含税总价");
const deliveryDays = ref(7);
const responseSummary = ref("按采购要求提供完整响应文件与交付计划。");
const serviceCommitment = ref("支持分批交付与异常补货。");
const responseFile = ref<File | null>(null);
const responseFileName = ref("");
const auditLogId = ref("");
const error = ref("");

function projectLabel(projectId: string) {
  const project = projects.value.find((item) => item.id === projectId);
  return project ? `${project.code} / ${project.name}` : "采购项目";
}

function supplierName(supplierId: string, fallback?: string) {
  return fallback ?? suppliers.value.find((item) => item.id === supplierId)?.name ?? "供应商";
}

function bidLabel(bid: Bid, index?: number) {
  return `报价单${index === undefined ? "" : ` ${index + 1}`} / ${supplierName(bid.supplierId, bid.supplierName)} / ${labelStatus(bid.status)}`;
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  responseFile.value = target.files?.[0] ?? null;
  responseFileName.value = responseFile.value?.name ?? "";
}

async function bidPayload() {
  const payload: Record<string, unknown> = {
    amount: amount.value,
    taxRate: taxRate.value,
    taxInclusive: taxInclusive.value,
    taxNote: taxNote.value,
    deliveryDays: deliveryDays.value,
    responseSummary: responseSummary.value,
    serviceCommitment: serviceCommitment.value
  };
  if (responseFile.value) {
    const uploaded = await uploadFile(responseFile.value, {
      attachmentKind: "bid_response_file",
      objectType: "bid",
      objectId: selectedBidId.value || `${selectedProjectId.value}-draft-bid`,
      projectId: selectedProjectId.value
    });
    payload.responseFileMetadata = [uploaded.file];
  }
  return payload;
}

async function load() {
  const [projectData, supplierData] = await Promise.all([
    apiGet<{ projects: Project[] }>("/api/projects"),
    apiGet<{ suppliers: Array<{ id: string; name: string }> }>("/api/suppliers").catch(() => ({ suppliers: [] }))
  ]);
  projects.value = projectData.projects.filter((item) => !item.externalTradeFlag && !isTestLikeText(item.name));
  suppliers.value = supplierData.suppliers;
  if (!projects.value.some((item) => item.id === selectedProjectId.value)) {
    selectedProjectId.value = projects.value[0]?.id ?? "";
  }
  if (selectedProjectId.value) {
    const summary = await apiGet<{ bids?: Bid[] }>(`/api/projects/${selectedProjectId.value}/bids/summary`);
    bids.value = summary.bids ?? [];
    if (!bids.value.some((item) => item.id === selectedBidId.value)) {
      selectedBidId.value = bids.value[0]?.id ?? "";
    }
  }
}

async function run(action: () => Promise<{ auditLogId?: string; bid?: Bid }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    selectedBidId.value = result.bid?.id ?? selectedBidId.value;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

onMounted(load);
</script>

<template>
  <section class="panel">
    <h2>报价响应</h2>
    <div class="form-grid">
      <label>
        项目
        <select v-model="selectedProjectId" @change="load">
          <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <label>
        报价金额
        <input v-model.number="amount" type="number" />
      </label>
      <label>
        税率
        <input v-model.number="taxRate" type="number" step="0.01" min="0" max="1" />
      </label>
      <label>
        交付周期(天)
        <input v-model.number="deliveryDays" type="number" min="1" />
      </label>
      <label>
        含税说明
        <input v-model="taxNote" />
      </label>
      <label>
        响应说明
        <input v-model="responseSummary" />
      </label>
      <label>
        服务承诺
        <input v-model="serviceCommitment" />
      </label>
      <label>
        响应文件
        <input type="file" @change="onFileChange" />
      </label>
      <label class="checkbox-field">
        <input v-model="taxInclusive" type="checkbox" />
        <span>含税报价</span>
      </label>
      <div class="notice">{{ responseFileName || "未选择文件" }}</div>
      <button
        type="button"
        :disabled="!selectedProjectId"
        @click="run(async () => apiPost(`/api/projects/${selectedProjectId}/bids`, await bidPayload()))"
      >
        保存草稿
      </button>
    </div>

    <table>
      <thead>
        <tr>
          <th>项目</th>
          <th>供应商</th>
          <th>金额</th>
          <th>税率</th>
          <th>交付</th>
          <th>状态</th>
          <th>版本</th>
          <th>提交时间</th>
          <th>锁定时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="bid in bids" :key="bid.id">
          <td>{{ projectLabel(bid.projectId) }}</td>
          <td>{{ supplierName(bid.supplierId, bid.supplierName) }}</td>
          <td>{{ bid.amount ?? "-" }}</td>
          <td>{{ bid.taxRate ?? "-" }}</td>
          <td>{{ bid.deliveryDays ? `${bid.deliveryDays} 天` : "-" }}</td>
          <td>{{ labelStatus(bid.status) }}</td>
          <td>{{ bid.versionNo ?? "-" }}</td>
          <td>{{ formatDateTime(bid.submittedAt) }}</td>
          <td>{{ formatDateTime(bid.lockedAt) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="form-grid">
      <label>
        报价单
        <select v-model="selectedBidId">
          <option v-for="(bid, index) in bids" :key="bid.id" :value="bid.id">{{ bidLabel(bid, index) }}</option>
        </select>
      </label>
      <button type="button" :disabled="!selectedBidId" @click="run(async () => apiPatch(`/api/bids/${selectedBidId}`, await bidPayload()))">更新草稿</button>
      <button type="button" :disabled="!selectedBidId" @click="run(() => apiPost(`/api/bids/${selectedBidId}/submit`, {}))">提交报价</button>
      <button type="button" :disabled="!selectedBidId" @click="run(() => apiPost(`/api/bids/${selectedBidId}/withdraw`, {}))">撤回</button>
      <button type="button" :disabled="!selectedBidId" @click="run(async () => apiPost(`/api/bids/${selectedBidId}/resubmit`, await bidPayload()))">重新提交</button>
    </div>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
