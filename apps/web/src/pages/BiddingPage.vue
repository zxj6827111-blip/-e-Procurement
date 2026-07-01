<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiGet, apiPatch, apiPost, uploadFile } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import ProcessTimeline from "../components/ProcessTimeline.vue";
import type { ProcessBusinessType } from "../api/process";
import { isTestLikeText } from "../utils/business-display";
import { formatDateTime, labelStatus } from "../utils/status-labels";

interface Project {
  id: string;
  code: string;
  name: string;
  type: string;
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

interface Registration {
  projectId: string;
  status: string;
}

const projects = ref<Project[]>([]);
const bids = ref<Bid[]>([]);
const suppliers = ref<Array<{ id: string; name: string }>>([]);
const registrations = ref<Registration[]>([]);
const selectedProjectId = ref("");
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
const businessDialog = ref("");
const processRefreshKey = ref(0);
const route = useRoute();
const router = useRouter();
const biddingEntryHint = "报价响应只开放给报名资格已通过的供应商。请先在“报名资料”提交材料，采购经办人审核通过后，才可以在这里保存草稿并提交报价。";
const emptyProjectHint = computed(() => {
  if (projects.value.length > 0) return "";
  return "暂无可报价项目。请先确认已在“报名资料”提交报名材料，并等待采购经办人审核通过。";
});

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

function projectProcessType(projectId: string): ProcessBusinessType {
  const project = projects.value.find((item) => item.id === projectId);
  const method = `${(project as Project & { type?: string } | undefined)?.type ?? ""}`.toLowerCase();
  if (method.includes("direct") || method.includes("直接")) return "direct_purchase";
  if (method.includes("comparison") || method.includes("rfq") || method.includes("询价") || method.includes("比选")) return "rfq";
  return "tender";
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

function routeProjectId() {
  const value = route.query.projectId;
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function pickProjectFromRouteOrFallback(preferRoute: boolean) {
  const queryProjectId = routeProjectId();
  if (preferRoute && queryProjectId && projects.value.some((item) => item.id === queryProjectId)) {
    selectedProjectId.value = queryProjectId;
    return;
  }
  if (!projects.value.some((item) => item.id === selectedProjectId.value)) {
    selectedProjectId.value = (queryProjectId && projects.value.some((item) => item.id === queryProjectId) ? queryProjectId : projects.value[0]?.id) ?? "";
  }
}

async function load(options: { preferRoute?: boolean } = {}) {
  const [projectData, supplierData, registrationData] = await Promise.all([
    apiGet<{ projects: Project[] }>("/api/projects"),
    apiGet<{ suppliers: Array<{ id: string; name: string }> }>("/api/suppliers").catch(() => ({ suppliers: [] })),
    apiGet<{ registrations: Registration[] }>("/api/registrations").catch(() => ({ registrations: [] }))
  ]);
  registrations.value = registrationData.registrations;
  const qualifiedProjectIds = new Set(registrations.value.filter((item) => item.status === "qualified").map((item) => item.projectId));
  projects.value = projectData.projects.filter((item) => !item.externalTradeFlag && !isTestLikeText(item.name) && qualifiedProjectIds.has(item.id));
  suppliers.value = supplierData.suppliers;
  pickProjectFromRouteOrFallback(Boolean(options.preferRoute));
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
  businessDialog.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    selectedBidId.value = result.bid?.id ?? selectedBidId.value;
    processRefreshKey.value += 1;
    await load();
  } catch (err) {
    const message = err instanceof Error ? err.message : "操作失败";
    if (message.includes("当前项目还不能报价") || message.includes("报名")) {
      businessDialog.value = message;
    } else {
      error.value = message;
    }
  }
}

function onProjectChange() {
  void load();
}

function closeBusinessDialog() {
  businessDialog.value = "";
}

async function goRegistration() {
  businessDialog.value = "";
  await router.push("/supplier-registration");
}

onMounted(() => {
  void load({ preferRoute: true });
});
watch(() => route.query.projectId, () => {
  void load({ preferRoute: true });
});
</script>

<template>
  <section class="panel">
    <h2>报价响应</h2>
    <p class="notice">{{ biddingEntryHint }}</p>
    <div class="form-grid">
      <label>
        项目
        <select v-model="selectedProjectId" @change="onProjectChange">
          <option v-if="!projects.length" value="">暂无可报价项目</option>
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

    <p v-if="emptyProjectHint" class="notice">{{ emptyProjectHint }}</p>

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

    <ProcessTimeline
      v-if="selectedProjectId"
      :business-type="projectProcessType(selectedProjectId)"
      :business-id="selectedProjectId"
      title="招采响应流程轨迹"
      :refresh-key="processRefreshKey"
    />

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

    <div v-if="businessDialog" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="bidding-dialog-title">
      <section class="modal-panel">
        <h3 id="bidding-dialog-title">暂时不能提交报价</h3>
        <p>{{ businessDialog }}</p>
        <div class="modal-actions">
          <button type="button" class="secondary-button" @click="closeBusinessDialog">知道了</button>
          <button type="button" @click="goRegistration">去报名资料</button>
        </div>
      </section>
    </div>
  </section>
</template>
