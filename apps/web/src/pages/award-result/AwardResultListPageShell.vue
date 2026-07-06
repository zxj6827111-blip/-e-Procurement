<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { apiGet } from "../../api/http";
import {
  DataTable,
  EnterpriseSurface,
  FeedbackMessage,
  FilterBar,
  PaginationBar,
  StatusTag,
  SummaryCards,
  type DataTableColumn,
  type SummaryCardItem
} from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { labelStatus } from "../../utils/status-labels";

interface AwardProject {
  id: string;
  code?: string;
  name: string;
  displayName?: string;
  sourceRequestTitle?: string;
  requestDepartment?: string;
  budgetAmount?: number;
  category?: string;
  status?: string;
  displayStatus?: string;
  type?: string;
  externalTradeFlag?: boolean;
}

type StatusTone = "default" | "primary" | "success" | "warning" | "error";

const session = useSessionStore();
const route = useRoute();
const router = useRouter();

const projects = ref<AwardProject[]>([]);
const keyword = ref("");
const statusFilter = ref("全部");
const error = ref("");
const selectedProject = ref<AwardProject | null>(null);
const supplierRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
const isSupplierResultView = computed(() => supplierRoles.has(session.roleId));

const columns = computed<DataTableColumn[]>(() => {
  if (isSupplierResultView.value) {
    return [
      { key: "project", label: "项目" },
      { key: "status", label: "结果状态" },
      { key: "next", label: "下一步" },
      { key: "actions", label: "操作" }
    ];
  }
  return [
    { key: "project", label: "项目编号 / 名称" },
    { key: "winner", label: "推荐中标人" },
    { key: "scoreQuote", label: "综合得分 / 报价" },
    { key: "status", label: "当前状态" },
    { key: "actions", label: "操作" }
  ];
});

const statusOptions = computed(() => ["全部", ...Array.from(new Set(projects.value.map((item) => statusText(item))))]);

const filteredProjects = computed(() =>
  projects.value.filter((project) => {
    const searchableText = [project.code, project.name, project.displayName, project.sourceRequestTitle, project.requestDepartment, project.category]
      .join(" ")
      .toLowerCase();
    const keywordMatched = searchableText.includes(keyword.value.trim().toLowerCase());
    const statusMatched = statusFilter.value === "全部" || statusText(project) === statusFilter.value;
    return keywordMatched && statusMatched;
  })
);
const activeAwardProject = computed(() => selectedProject.value ?? filteredProjects.value[0] ?? null);

const summaryItems = computed<SummaryCardItem[]>(() => {
  if (isSupplierResultView.value) {
    return [
      { label: "结果通知", value: filteredProjects.value.length },
      { label: "后续待办", value: filteredProjects.value.filter((item) => ["awarded_pending_order", "result_notified"].includes(rawStatus(item))).length },
      { label: "履约中", value: filteredProjects.value.filter((item) => ["contract_registered", "performing"].includes(rawStatus(item))).length },
      { label: "已归档", value: filteredProjects.value.filter((item) => ["closed", "archived"].includes(rawStatus(item))).length }
    ];
  }
  return [
    { label: "定标项目", value: filteredProjects.value.length },
    { label: "待定标", value: filteredProjects.value.filter((item) => ["review_report_frozen", "expert_reviewing"].includes(rawStatus(item))).length },
    { label: "审批中", value: filteredProjects.value.filter((item) => rawStatus(item) === "award_approving").length },
    {
      label: "已定标",
      value: filteredProjects.value.filter((item) => ["awarded_pending_order", "result_notified", "contract_registered", "performing", "closed", "archived"].includes(rawStatus(item))).length
    }
  ];
});

function queryProjectId() {
  const value = route.query.projectId;
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function rawStatus(project: AwardProject) {
  return String(project.status ?? project.displayStatus ?? "");
}

function isGenericTitle(value: string | undefined | null) {
  const text = String(value ?? "").trim();
  return !text || ["采购项目", "采购申请", "项目", "申请"].includes(text) || /^\d+$/.test(text);
}

function projectName(project: AwardProject) {
  if (project.displayName) return project.displayName;
  const title = !isGenericTitle(project.name) ? project.name : project.sourceRequestTitle;
  return [project.code, title || project.name || project.id].filter(Boolean).join(" / ");
}

function statusText(project: AwardProject) {
  return labelStatus(rawStatus(project));
}

function statusTone(project: AwardProject): StatusTone {
  const status = rawStatus(project);
  if (["awarded_pending_order", "result_notified", "contract_registered", "performing", "closed", "archived"].includes(status)) return "success";
  if (status === "award_approving") return "primary";
  if (["review_report_frozen", "expert_reviewing"].includes(status)) return "warning";
  if (["cancelled", "rejected"].includes(status)) return "error";
  return "default";
}

function nextStep(project: AwardProject) {
  if (isSupplierResultView.value) return "查看结果、合同和价格报告";
  const status = rawStatus(project);
  if (["review_report_frozen", "expert_reviewing"].includes(status)) return "创建或提交定标审批";
  if (status === "award_approving") return session.roleId === "group_manager" ? "处理集团审批" : "等待集团审批";
  if (status === "awarded_pending_order") return "发送结果并生成价格报告";
  if (status === "result_notified") return "进入履约结算";
  if (["contract_registered", "performing"].includes(status)) return "跟进合同和订单";
  return "查看项目定标资料";
}

function currency(value: number | undefined) {
  if (value === undefined) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function selectAwardProject(project: AwardProject) {
  selectedProject.value = project;
}

async function loadProjects() {
  error.value = "";
  try {
    if (!session.user) await session.loadMe();
    const data = await apiGet<{ projects: AwardProject[] }>("/api/projects");
    const visibleProjects = data.projects.filter((project) => !project.externalTradeFlag);
    if (!isSupplierResultView.value) {
      projects.value = visibleProjects;
      return;
    }
    const notifiedProjects: AwardProject[] = [];
    for (const project of visibleProjects) {
      const result = await apiGet<{ notifications: unknown[] }>(`/api/projects/${project.id}/result-notifications`).catch(() => ({ notifications: [] }));
      if (result.notifications.length > 0) notifiedProjects.push(project);
    }
    projects.value = notifiedProjects;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "定标项目列表加载失败";
  }
}

onMounted(async () => {
  const projectId = queryProjectId();
  if (projectId) {
    await router.replace(`/award-result/${encodeURIComponent(projectId)}`);
    return;
  }
  await loadProjects();
});
</script>

<template>
  <section class="eds-section g-hotel-page g-hotel-award-page">
    <header class="g-hotel-page-header">
      <div>
        <p>评审定标 / 定标审批</p>
        <h2><span aria-hidden="true">标</span>{{ isSupplierResultView ? "中标结果" : "定标审批" }}</h2>
        <small>{{ isSupplierResultView ? "查看采购方发送给本供应商的结果通知、合同确认和价格报告。" : "复核评审结果、推荐中标人、报价与合规检查，再进入定标审批详情。" }}</small>
      </div>
    </header>

    <FeedbackMessage v-if="error" tone="error">{{ error }}</FeedbackMessage>

    <EnterpriseSurface class="g-hotel-ledger-card" title="定标阶段分布">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <FilterBar class="g-hotel-filter-bar">
      <label>
        关键字
        <input v-model="keyword" placeholder="项目编号、项目名称、需求部门" />
      </label>
      <label>
        阶段
        <select v-model="statusFilter">
          <option v-for="status in statusOptions" :key="status">{{ status }}</option>
        </select>
      </label>
    </FilterBar>

    <div class="g-hotel-award-review-grid">
      <EnterpriseSurface class="g-hotel-table-card" title="定标项目台账">
        <DataTable :columns="columns" :rows="filteredProjects" row-key="id" :empty-text="isSupplierResultView ? '当前账号暂无可见的中标结果。' : '当前筛选条件下暂无定标项目'">
          <template #project="{ row }">
            <button class="g-hotel-link-cell" type="button" @click="selectAwardProject(row)">
              <strong>{{ row.code || row.id }}</strong>
              <span>{{ projectName(row) }}</span>
            </button>
          </template>
          <template #winner="{ row }">{{ row.requestDepartment || "待评审推荐" }}</template>
          <template #scoreQuote="{ row }">
            <strong>{{ rawStatus(row) === "award_approving" ? "待审批" : "已汇总" }}</strong>
            <p class="eds-meta">{{ currency(row.budgetAmount) }}</p>
          </template>
          <template #status="{ row }">
            <StatusTag :tone="statusTone(row)">{{ statusText(row) }}</StatusTag>
          </template>
          <template #next="{ row }">{{ nextStep(row) }}</template>
          <template #actions="{ row }">
            <RouterLink class="eds-button eds-button-text" :to="`/award-result/${encodeURIComponent(row.id)}`">{{ isSupplierResultView ? "查看结果" : "定标审查" }}</RouterLink>
          </template>
        </DataTable>
        <PaginationBar :total="filteredProjects.length" />
      </EnterpriseSurface>

      <EnterpriseSurface class="g-hotel-compliance-card" title="定标合规审查">
        <template v-if="activeAwardProject">
          <p class="eds-meta">{{ activeAwardProject.code || activeAwardProject.id }} / {{ activeAwardProject.name }}</p>
          <div class="g-hotel-compliance-list">
            <article>
              <span aria-hidden="true">✓</span>
              <strong>专家评分偏离度正常</strong>
              <small>复核综合评分、评审意见和异常低分说明。</small>
            </article>
            <article>
              <span aria-hidden="true">✓</span>
              <strong>中标价未突破预算</strong>
              <small>预算金额 {{ currency(activeAwardProject.budgetAmount) }}，需结合详情页审批记录确认。</small>
            </article>
            <article>
              <span aria-hidden="true">✓</span>
              <strong>有效响应供应商满足要求</strong>
              <small>确认供应商资格、报价锁定和评审记录完整。</small>
            </article>
          </div>
          <RouterLink class="eds-button eds-button-primary" :to="`/award-result/${encodeURIComponent(activeAwardProject.id)}`">进入定标审查</RouterLink>
        </template>
        <p v-else class="eds-meta">点击左侧列表查看合规审查详情。</p>
      </EnterpriseSurface>
    </div>
  </section>
</template>

