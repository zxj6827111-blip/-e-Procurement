<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";
import { formatDateTime, labelStatus } from "../utils/status-labels";

interface Attachment {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt: string;
}

interface ProcurementRequestLineItem {
  id: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice?: number;
  budgetAmount?: number;
  requiredByDate?: string;
  remark?: string;
}

interface ProcurementRequest {
  id: string;
  title: string;
  status?: string;
  approvalStatus: string;
  projectId: string | null;
  externalTradeFlag: boolean;
  methodSuggestion: string;
  requestDepartment?: string;
  requesterName?: string;
  budgetAmount?: number;
  expectedArrivalAt?: string;
  receivingLocation?: string;
  attachments?: Attachment[];
  lineItems?: ProcurementRequestLineItem[];
}

interface Project {
  id: string;
  code: string;
  name: string;
  status: string;
  type: string;
  externalTradeFlag: boolean;
  sourceRequestId?: string;
  budgetAmount?: number;
  attachments?: Attachment[];
  sourceLineItems?: ProcurementRequestLineItem[];
}

const session = useSessionStore();
const requests = ref<ProcurementRequest[]>([]);
const projects = ref<Project[]>([]);
const selectedRequestId = ref("");
const projectName = ref("采购项目");
const auditLogId = ref("");
const error = ref("");

const canCreateProject = computed(() => ["buyer", "group_manager"].includes(session.roleId));
const readyRequests = computed(() =>
  requests.value.filter((item) => item.status === "method_decided" && item.approvalStatus === "approved" && !item.projectId)
);

function requestSummary(requestId?: string) {
  const request = requests.value.find((item) => item.id === requestId);
  return request ? `${request.title} / ${request.methodSuggestion}` : requestId || "-";
}

async function load() {
  const [requestData, projectData] = await Promise.all([
    apiGet<{ procurementRequests: ProcurementRequest[] }>("/api/procurement-requests"),
    apiGet<{ projects: Project[] }>("/api/projects")
  ]);
  requests.value = requestData.procurementRequests;
  projects.value = projectData.projects;
  if (!readyRequests.value.some((item) => item.id === selectedRequestId.value)) {
    selectedRequestId.value = readyRequests.value[0]?.id ?? "";
  }
}

async function createProject() {
  error.value = "";
  try {
    const result = await apiPost<{ project: Project; auditLogId: string }>("/api/projects", {
      requestId: selectedRequestId.value,
      name: projectName.value
    });
    auditLogId.value = result.auditLogId;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "立项失败";
  }
}

onMounted(async () => {
  await session.loadMe(session.user?.id);
  await load();
});
</script>

<template>
  <section class="panel">
    <h2>项目发起</h2>

    <div v-if="canCreateProject" class="form-grid">
      <label>
        可立项申请
        <select v-model="selectedRequestId">
          <option v-for="item in readyRequests" :key="item.id" :value="item.id">
            {{ item.title }} / {{ item.methodSuggestion }}{{ item.externalTradeFlag ? " / 外部交易" : "" }}
          </option>
        </select>
      </label>
      <label>
        项目名称
        <input v-model="projectName" />
      </label>
      <button type="button" :disabled="!selectedRequestId" @click="createProject">发起项目</button>
    </div>
    <p v-else class="notice">当前角色仅查看已授权项目，不显示项目发起入口。</p>

    <div v-if="selectedRequestId" class="section-block">
      <h3>待发起申请摘要</h3>
      <div v-for="request in readyRequests.filter((item) => item.id === selectedRequestId)" :key="request.id" class="stack-item">
        <strong>{{ request.title }}</strong>
        <span>{{ request.requestDepartment || "-" }} / {{ request.requesterName || "-" }}</span>
        <span>预算 {{ request.budgetAmount ?? "-" }} / 到货 {{ request.expectedArrivalAt || "-" }} / 收货 {{ request.receivingLocation || "-" }}</span>
        <AttachmentList :attachments="request.attachments" compact />
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>项目编号</th>
          <th>项目名称</th>
          <th>关联申请</th>
          <th>采购方式</th>
          <th>状态</th>
          <th>预算</th>
          <th>附件</th>
          <th>明细行</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="project in projects" :key="project.id">
          <td>{{ project.code }}</td>
          <td>{{ project.name }}</td>
          <td>{{ requestSummary(project.sourceRequestId) }}</td>
          <td>{{ labelStatus(project.type) }}</td>
          <td>{{ labelStatus(project.status) }}</td>
          <td>{{ project.budgetAmount ?? "-" }}</td>
          <td>
            <AttachmentList :attachments="project.attachments" compact />
          </td>
          <td>{{ project.sourceLineItems?.length ?? 0 }}</td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
