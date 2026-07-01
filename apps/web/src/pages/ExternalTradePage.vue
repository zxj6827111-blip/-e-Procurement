<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { apiGet, apiPost, uploadFile } from "../api/http";
import AttachmentList from "../components/AttachmentList.vue";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";
import { labelStatus } from "../utils/status-labels";

interface ExternalTradeListItem {
  project: {
    id: string;
    code: string;
    name: string;
    displayStatus: string;
  };
  record: {
    externalPlatformName?: string;
    externalProjectCode?: string;
    internalApprovalStatus?: string;
    resultRecordStatus?: string;
    status?: string;
  } | null;
}

interface ExternalTradeDetail {
  project?: ExternalTradeListItem["project"];
  record?: ExternalTradeListItem["record"] & {
    announcementMaterialMetadata?: Array<{ id: string; fileName: string; contentType?: string; sizeBytes?: number; uploadedAt?: string }>;
    resultMaterialMetadata?: Array<{ id: string; fileName: string; contentType?: string; sizeBytes?: number; uploadedAt?: string }>;
  };
}

const selectedProjectId = ref("p-ext");
const externalPlatformName = ref("上海公共资源交易平台");
const externalProjectCode = ref("SHGGZY-2026-0001");
const materialFile = ref<File | null>(null);
const materialFileName = ref("");
const externalTrades = ref<ExternalTradeListItem[]>([]);
const detail = ref<ExternalTradeDetail>({});
const blockResult = ref<{ allowed?: boolean; projectId?: string; externalTradeFlag?: boolean }>({});
const auditLogId = ref("");
const error = ref("");
const session = useSessionStore();
const route = useRoute();
const canMaintainExternalTrade = computed(() => ["buyer", "platform_operator"].includes(session.roleId));
const externalTradeForm = ref({
  projectName: "外部交易备案项目",
  orgId: "",
  orgName: "酒店集团",
  category: "按集团制度备案",
  internalApprovalOpinion: "内部审批已备案",
  resultRecordNote: "外部结果已备案"
});

const blockActions = [
  { value: "internal_announcement", label: "内部公告发布" },
  { value: "internal_registration", label: "内部报名" },
  { value: "internal_bid", label: "内部报价" },
  { value: "internal_expert_review", label: "内部评审" },
  { value: "internal_award", label: "内部定标" }
];

function projectLabel(projectId?: string) {
  if (!projectId) return detail.value.project?.name ?? "外部交易项目";
  const item = externalTrades.value.find((trade) => trade.project.id === projectId);
  return item?.project.name ?? detail.value.project?.name ?? "外部交易项目";
}

async function load() {
  externalTrades.value = (await apiGet<{ externalTrades: ExternalTradeListItem[] }>("/api/external-trades")).externalTrades;
  detail.value = await apiGet<ExternalTradeDetail>(`/api/external-trades/${selectedProjectId.value}`);
}

function onMaterialFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  materialFile.value = target.files?.[0] ?? null;
  materialFileName.value = materialFile.value?.name ?? "";
}

async function run(action: () => Promise<{ auditLogId?: string } & Record<string, unknown>>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

async function checkBlock(action: string) {
  error.value = "";
  try {
    blockResult.value = await apiPost<Record<string, unknown>>(`/api/external-trades/${selectedProjectId.value}/block-check`, { action });
  } catch (err) {
    const typed = err as Error & { auditLogId?: string; status?: number };
    error.value = `${typed.message}${typed.auditLogId ? ` (${typed.auditLogId})` : ""}`;
  }
}

async function uploadExternalMaterial(kind: "announcement" | "result") {
  if (!materialFile.value) {
    error.value = "请选择备案材料文件。";
    return;
  }
  await run(async () => {
    const fileResult = await uploadFile(materialFile.value as File, {
      attachmentKind: kind === "announcement" ? "external_announcement_material" : "external_result_material",
      objectType: "external_trade_record",
      objectId: selectedProjectId.value,
      projectId: selectedProjectId.value
    });
    const path = kind === "announcement" ? "announcement-materials" : "result-materials";
    const result = await apiPost<{ auditLogId?: string }>(`/api/external-trades/${selectedProjectId.value}/${path}`, { material: fileResult.file });
    materialFile.value = null;
    materialFileName.value = "";
    return { auditLogId: result.auditLogId ?? fileResult.auditLogId };
  });
}

function createExternalProject() {
  return run(() =>
    apiPost("/api/external-trades/projects", {
      name: externalTradeForm.value.projectName,
      orgId: externalTradeForm.value.orgId || undefined,
      orgName: externalTradeForm.value.orgName,
      category: externalTradeForm.value.category,
      internalApprovalOpinion: externalTradeForm.value.internalApprovalOpinion
    })
  );
}

function recordInternalApproval() {
  return run(() =>
    apiPost(`/api/external-trades/${selectedProjectId.value}/internal-approval`, {
      opinion: externalTradeForm.value.internalApprovalOpinion
    })
  );
}

function recordExternalResult() {
  return run(() =>
    apiPost(`/api/external-trades/${selectedProjectId.value}/result-record`, {
      note: externalTradeForm.value.resultRecordNote
    })
  );
}

onMounted(async () => {
  if (!session.user) await session.loadMe();
  selectedProjectId.value = String(route.query.projectId ?? selectedProjectId.value);
  await load();
});

watch(
  () => route.query.projectId,
  (projectId) => {
    if (!projectId || String(projectId) === selectedProjectId.value) return;
    selectedProjectId.value = String(projectId);
    void load();
  }
);
</script>

<template>
  <section class="panel">
    <h2>外部交易备案</h2>

    <p v-if="!canMaintainExternalTrade" class="notice">当前账号仅查看外部备案状态；新建、登记和上传备案材料由采购经办操作。</p>

    <div class="form-grid">
      <label>
        项目编号
        <input v-model="selectedProjectId" />
      </label>
      <label>
        新建项目名称
        <input v-model="externalTradeForm.projectName" />
      </label>
      <label>
        组织ID
        <input v-model="externalTradeForm.orgId" placeholder="不填使用当前组织" />
      </label>
      <label>
        组织名称
        <input v-model="externalTradeForm.orgName" />
      </label>
      <label>
        项目分类
        <input v-model="externalTradeForm.category" />
      </label>
      <label>
        内部审批意见
        <input v-model="externalTradeForm.internalApprovalOpinion" />
      </label>
      <label>
        结果备案说明
        <input v-model="externalTradeForm.resultRecordNote" />
      </label>
      <button type="button" @click="load">刷新</button>
      <button v-if="canMaintainExternalTrade" type="button" @click="createExternalProject">新建外部交易项目</button>
      <button v-if="canMaintainExternalTrade" type="button" @click="recordInternalApproval">登记内部审批</button>
    </div>

    <div v-if="canMaintainExternalTrade" class="form-grid">
      <label>
        外部平台
        <input v-model="externalPlatformName" />
      </label>
      <label>
        外部项目编号
        <input v-model="externalProjectCode" />
      </label>
      <button
        type="button"
        @click="run(() => apiPost(`/api/external-trades/${selectedProjectId}/external-project`, { externalPlatformName, externalProjectCode }))"
      >
        保存外部编号
      </button>
    </div>

    <div v-if="canMaintainExternalTrade" class="form-grid">
      <label>
        备案材料文件
        <input type="file" @change="onMaterialFileChange" />
      </label>
      <div class="notice">{{ materialFileName || "未选择文件" }}</div>
      <button type="button" :disabled="!materialFile" @click="uploadExternalMaterial('announcement')">
        上传外部公告材料
      </button>
      <button type="button" :disabled="!materialFile" @click="uploadExternalMaterial('result')">
        上传外部结果材料
      </button>
      <button type="button" @click="recordExternalResult">登记外部结果</button>
    </div>

    <div class="form-grid">
      <button v-for="action in blockActions" :key="action.value" type="button" @click="checkBlock(action.value)">{{ action.label }}校验</button>
    </div>

    <h3>备案项目</h3>
    <table>
      <thead>
        <tr>
          <th>项目</th>
          <th>项目名称</th>
          <th>外部平台</th>
          <th>外部编号</th>
          <th>备案状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in externalTrades" :key="item.project.id">
          <td>{{ item.project.code }}</td>
          <td>{{ item.project.name }}</td>
          <td>{{ item.record?.externalPlatformName || "-" }}</td>
          <td>{{ item.record?.externalProjectCode || "-" }}</td>
          <td>{{ item.record?.status ? labelStatus(item.record.status) : item.project.displayStatus }}</td>
        </tr>
      </tbody>
    </table>

    <h3>备案材料</h3>
    <div class="workbench-grid">
      <section class="section-block">
        <h3>公告材料</h3>
        <AttachmentList :attachments="detail.record?.announcementMaterialMetadata" />
      </section>
      <section class="section-block">
        <h3>结果材料</h3>
        <AttachmentList :attachments="detail.record?.resultMaterialMetadata" />
      </section>
    </div>

    <h3>当前项目详情</h3>
    <table>
      <thead>
        <tr>
          <th>项目</th>
          <th>内部审批</th>
          <th>公告材料数</th>
          <th>结果材料数</th>
          <th>结果备案</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ detail.project?.name || selectedProjectId }}</td>
          <td>{{ detail.record?.internalApprovalStatus === "recorded" ? "已备案" : "未备案" }}</td>
          <td>{{ detail.record?.announcementMaterialMetadata?.length ?? 0 }}</td>
          <td>{{ detail.record?.resultMaterialMetadata?.length ?? 0 }}</td>
          <td>{{ detail.record?.resultRecordStatus === "recorded" ? "已备案" : "未备案" }}</td>
        </tr>
      </tbody>
    </table>

    <h3>拦截校验</h3>
    <table>
      <thead>
        <tr>
          <th>项目编号</th>
          <th>外部交易标记</th>
          <th>校验结果</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ projectLabel(blockResult.projectId || selectedProjectId) }}</td>
          <td>{{ blockResult.externalTradeFlag ? "是" : "-" }}</td>
          <td>{{ blockResult.allowed ? "允许" : error ? "已拦截" : "-" }}</td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
