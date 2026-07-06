<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { apiGet } from "../../api/http";
import {
  DataTable,
  EnterpriseSurface,
  FeedbackMessage,
  FilterBar,
  PageHeader,
  PaginationBar,
  StatusTag,
  SummaryCards,
  type DataTableColumn,
  type SummaryCardItem
} from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { labelStatus } from "../../utils/status-labels";

interface ProjectOption {
  id: string;
  code?: string;
  name: string;
  type?: string;
  status?: string;
  displayStatus: string;
  displayName?: string;
  sourceRequestTitle?: string;
  requestDepartment?: string;
  budgetAmount?: number;
  category: string;
  externalTradeFlag?: boolean;
}

const session = useSessionStore();
const projects = ref<ProjectOption[]>([]);
const keyword = ref("");
const statusFilter = ref("全部");
const typeFilter = ref("全部");
const error = ref("");

const statusOptions = computed(() => ["全部", ...Array.from(new Set(projects.value.map((item) => statusText(item)).filter(Boolean)))]);
const typeOptions = computed(() => ["全部", ...Array.from(new Set(projects.value.map((item) => projectTypeText(item)).filter(Boolean)))]);

const filteredProjects = computed(() =>
  projects.value.filter((project) => {
    const text = [project.displayName, project.code, project.name, project.sourceRequestTitle, project.requestDepartment, project.category].join(" ").toLowerCase();
    const keywordMatched = text.includes(keyword.value.trim().toLowerCase());
    const statusMatched = statusFilter.value === "全部" || statusText(project) === statusFilter.value;
    const typeMatched = typeFilter.value === "全部" || projectTypeText(project) === typeFilter.value;
    return keywordMatched && statusMatched && typeMatched;
  })
);

const summaryItems = computed<SummaryCardItem[]>(() => [
  { label: "经办项目", value: filteredProjects.value.length },
  { label: "内部采购", value: filteredProjects.value.filter((item) => !item.externalTradeFlag).length },
  { label: "外部备案", value: filteredProjects.value.filter((item) => item.externalTradeFlag).length },
  { label: "履约中", value: filteredProjects.value.filter((item) => ["performing", "external_performing"].includes(String(item.status))).length }
]);

const columns: DataTableColumn[] = [
  { key: "project", label: "项目编号 / 名称" },
  { key: "department", label: "组织与经办" },
  { key: "type", label: "采购方式" },
  { key: "status", label: "当前阶段" },
  { key: "budget", label: "风险与预算" },
  { key: "actions", label: "操作" }
];

function isGenericTitle(value: string | undefined | null) {
  const text = String(value ?? "").trim();
  return !text || ["采购项目", "采购申请", "项目", "申请"].includes(text) || /^\d+$/.test(text);
}

function projectName(project: ProjectOption) {
  if (project.displayName) return project.displayName;
  const name = !isGenericTitle(project.name) ? project.name : project.sourceRequestTitle;
  return [project.code, name || project.name || project.id].filter(Boolean).join(" / ");
}

function statusText(project: ProjectOption) {
  return labelStatus(project.status || project.displayStatus);
}

function projectTypeText(project: ProjectOption) {
  if (project.externalTradeFlag) return "外部采购备案";
  return labelStatus(project.type) || "内部采购";
}

function statusTone(project: ProjectOption) {
  const status = String(project.status ?? project.displayStatus ?? "");
  if (["closed", "archived", "external_closed", "external_archived"].includes(status)) return "success";
  if (["cancelled", "rejected"].includes(status)) return "error";
  if (["performing", "external_performing", "bidding_open", "expert_reviewing", "award_approving"].includes(status)) return "primary";
  return "default";
}

function currency(value: number | undefined) {
  if (value === undefined) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

async function loadProjects() {
  error.value = "";
  try {
    if (!session.user) await session.loadMe();
    const data = await apiGet<{ projects: ProjectOption[] }>("/api/projects");
    projects.value = data.projects;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "项目列表加载失败";
  }
}

onMounted(loadProjects);
</script>

<template>
  <section class="eds-section">
    <PageHeader
      title="采购项目台账"
      eyebrow="项目工作台"
      description="查看和管理授权范围内的采购项目"
    >
      <template #actions>
        <RouterLink class="eds-button eds-button-primary" to="/procurement-requests">新建项目</RouterLink>
      </template>
    </PageHeader>

    <FeedbackMessage v-if="error" tone="error">{{ error }}</FeedbackMessage>

    <EnterpriseSurface class="g-hotel-ledger-card" title="项目阶段分布">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <FilterBar class="g-hotel-filter-bar">
      <label>
        关键字
        <input v-model="keyword" placeholder="搜索项目编号、名称或经办人" />
      </label>
      <label>
        阶段
        <select v-model="statusFilter">
          <option v-for="status in statusOptions" :key="status">{{ status }}</option>
        </select>
      </label>
      <label>
        类型
        <select v-model="typeFilter">
          <option v-for="type in typeOptions" :key="type">{{ type }}</option>
        </select>
      </label>
    </FilterBar>

    <EnterpriseSurface class="g-hotel-table-card" title="采购项目台账">
      <DataTable :columns="columns" :rows="filteredProjects" row-key="id" empty-text="当前筛选条件下暂无项目">
        <template #project="{ row }">
          <strong>{{ projectName(row) }}</strong>
          <p class="eds-meta">{{ row.code || row.id }} / {{ row.category || "-" }}</p>
        </template>
        <template #department="{ row }">
          <strong>{{ row.requestDepartment || "-" }}</strong>
          <p class="eds-meta">{{ row.category || "采购经办范围" }}</p>
        </template>
        <template #type="{ row }">{{ projectTypeText(row) }}</template>
        <template #status="{ row }">
          <StatusTag :tone="statusTone(row)">{{ statusText(row) }}</StatusTag>
        </template>
        <template #budget="{ row }">
          <strong>{{ currency(row.budgetAmount) }}</strong>
          <p class="eds-meta">{{ row.externalTradeFlag ? "外部交易备案" : "内部采购流程" }}</p>
        </template>
        <template #actions="{ row }">
          <RouterLink class="eds-button eds-button-text" :to="`/project-workbench/${encodeURIComponent(row.id)}`">进入详情</RouterLink>
        </template>
      </DataTable>
      <PaginationBar :total="filteredProjects.length" />
    </EnterpriseSurface>
  </section>
</template>

