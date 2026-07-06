<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { apiGet } from "../../api/http";
import DataTable, { type DataTableColumn } from "../../components/base/DataTable.vue";
import EnterpriseButton from "../../components/base/EnterpriseButton.vue";
import EnterpriseSurface from "../../components/base/EnterpriseSurface.vue";
import FeedbackMessage from "../../components/base/FeedbackMessage.vue";
import FilterBar from "../../components/base/FilterBar.vue";
import PaginationBar from "../../components/base/PaginationBar.vue";
import StatusTag from "../../components/base/StatusTag.vue";
import SummaryCards, { type SummaryCardItem } from "../../components/base/SummaryCards.vue";
import { useSessionStore } from "../../stores/session";
import { labelStatus } from "../../utils/status-labels";

interface ServiceRegion {
  id: string;
  region: string;
  storeName: string;
  category: string;
  status: string;
}

interface Attachment {
  id: string;
  fileName: string;
}

interface Supplier {
  id: string;
  name: string;
  status: string;
  admissionStatus?: string;
  categoryAuth: string[];
  qualification: string;
  risk: string;
  contactName?: string;
  contactPhone?: string;
  socialCreditCode?: string;
  serviceRegions?: ServiceRegion[];
  qualificationAttachments?: Attachment[];
  sealSamples?: unknown[];
  onboardingProfile?: unknown;
}

const session = useSessionStore();
const suppliers = ref<Supplier[]>([]);
const searchText = ref("");
const statusFilter = ref("正常/待准入");
const error = ref("");
const selectedSupplier = ref<Supplier | null>(null);

const supplierGovernanceRoles = new Set(["group_manager"]);
const supplierPortalRoles = new Set(["supplier", "supplier_admin", "supplier_quotation"]);
const canMaintainSupplier = computed(() => supplierGovernanceRoles.has(session.roleId));
const isSupplierPortal = computed(() => supplierPortalRoles.has(session.roleId) && !canMaintainSupplier.value);

const statusOptions = computed(() => [
  "全部",
  "正常/待准入",
  "正常",
  "待准入",
  "停用",
  ...Array.from(new Set(suppliers.value.map((item) => labelStatus(item.admissionStatus || item.status)))).filter(
    (status) => !["全部", "正常/待准入", "正常", "待准入", "停用"].includes(status)
  )
]);

const filteredSuppliers = computed(() =>
  suppliers.value.filter((supplier) => {
    if (isTestSupplier(supplier)) return false;
    if (isSupplierPortal.value) return session.user?.supplierId ? supplier.id === session.user.supplierId : true;
    const keyword = searchText.value.trim().toLowerCase();
    const keywordMatched = [supplier.name, supplier.contactName, supplier.contactPhone, supplier.categoryAuth.join(" "), serviceRegionSummary(supplier)]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
    const currentStatus = supplier.admissionStatus || supplier.status;
    const statusMatched =
      statusFilter.value === "全部" ||
      (statusFilter.value === "正常/待准入" && ["admitted", "pending"].includes(currentStatus)) ||
      (statusFilter.value === "正常" && currentStatus === "admitted") ||
      (statusFilter.value === "待准入" && currentStatus === "pending") ||
      (statusFilter.value === "停用" && ["inactive", "suspended"].includes(currentStatus)) ||
      labelStatus(currentStatus) === statusFilter.value;
    return keywordMatched && statusMatched;
  })
);

const summaryItems = computed<SummaryCardItem[]>(() => [
  { label: "供应商档案", value: filteredSuppliers.value.length },
  { label: "已准入", value: filteredSuppliers.value.filter((item) => ["admitted", "已准入"].includes(item.admissionStatus || item.status)).length },
  { label: "待准入", value: filteredSuppliers.value.filter((item) => ["pending", "待准入"].includes(item.admissionStatus || item.status)).length },
  { label: "资质附件", value: filteredSuppliers.value.reduce((sum, item) => sum + (item.qualificationAttachments?.length ?? 0), 0) }
]);

const columns: DataTableColumn[] = [
  { key: "name", label: "供应商编号 / 企业名称" },
  { key: "contact", label: "联系人" },
  { key: "phone", label: "联系电话" },
  { key: "score", label: "绩效评分" },
  { key: "status", label: "准入状态" },
  { key: "actions", label: "操作" }
];

function isTestSupplier(supplier: Supplier) {
  return [supplier.name, supplier.contactName, supplier.contactPhone].some((value) => /stage\s*\d|阶段\s*\d|runtime|uat|mock|test/i.test(String(value ?? "")));
}

function serviceRegionSummary(supplier: Supplier | null) {
  if (!supplier?.serviceRegions?.length) return "暂无服务区域";
  return supplier.serviceRegions.map((item) => `${item.region}/${item.storeName}`).join("，");
}

function statusTone(supplier: Supplier) {
  const status = supplier.admissionStatus || supplier.status;
  if (status === "admitted") return "success";
  if (status === "pending") return "warning";
  if (status === "inactive" || status === "suspended") return "error";
  return "default";
}

function performanceScore(supplier: Supplier) {
  if (supplier.risk?.includes("高")) return 72;
  if (supplier.admissionStatus === "pending" || supplier.status === "pending") return 82;
  return 95;
}

async function load() {
  error.value = "";
  try {
    const data = await apiGet<{ suppliers: Supplier[] }>("/api/suppliers");
    suppliers.value = data.suppliers;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "供应商列表加载失败";
  }
}

onMounted(async () => {
  if (!session.user) await session.loadMe();
  await load();
});
</script>

<template>
  <section class="eds-section g-hotel-page g-hotel-supplier-page">
    <header class="g-hotel-page-header">
      <div>
        <p>供应商管理 / 企业档案</p>
        <h2><span aria-hidden="true">供</span>{{ isSupplierPortal ? "我的供应商档案" : "供应商档案" }}</h2>
        <small>按准入状态、主营品类、服务区域和资料完整性查看供应商档案。</small>
      </div>
      <div class="g-hotel-page-actions">
        <RouterLink v-if="canMaintainSupplier" class="eds-button eds-button-primary" to="/suppliers/new">新增供应商</RouterLink>
      </div>
    </header>

    <FeedbackMessage v-if="error" tone="error">{{ error }}</FeedbackMessage>

    <EnterpriseSurface class="g-hotel-ledger-card" title="准入与资料状态">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <FilterBar v-if="!isSupplierPortal" class="g-hotel-filter-bar">
      <label>
        状态
        <select v-model="statusFilter">
          <option v-for="status in statusOptions" :key="status">{{ status }}</option>
        </select>
      </label>
      <label>
        关键词
        <input v-model="searchText" placeholder="供应商、联系人、品类" />
      </label>
    </FilterBar>

    <EnterpriseSurface class="g-hotel-table-card" title="供应商档案台账">
      <DataTable :columns="columns" :rows="filteredSuppliers" empty-text="当前筛选条件下暂无供应商档案">
        <template #name="{ row }">
          <strong>{{ row.name }}</strong>
          <p class="eds-meta">SUP-{{ row.id }} / 信用代码：{{ row.socialCreditCode || "-" }}</p>
        </template>
        <template #contact="{ row }">{{ row.contactName || "-" }}</template>
        <template #phone="{ row }">{{ row.contactPhone || "-" }}</template>
        <template #score="{ row }">{{ performanceScore(row) }}</template>
        <template #status="{ row }">
          <StatusTag :tone="statusTone(row)">{{ labelStatus(row.admissionStatus || row.status) }}</StatusTag>
        </template>
        <template #actions="{ row }">
          <div class="eds-actions">
            <button class="eds-button eds-button-text" type="button" @click="selectedSupplier = row">查看详细档案</button>
            <RouterLink class="eds-button eds-button-text" :to="isSupplierPortal ? '/supplier-portal' : `/suppliers/${encodeURIComponent(row.id)}`">
              {{ isSupplierPortal ? "维护档案" : "管理状态" }}
            </RouterLink>
          </div>
        </template>
      </DataTable>
      <PaginationBar :total="filteredSuppliers.length" />
    </EnterpriseSurface>

    <div v-if="selectedSupplier" class="g-hotel-modal" role="dialog" aria-modal="true" aria-label="供应商详细档案">
      <button class="g-hotel-modal-mask" type="button" aria-label="关闭" @click="selectedSupplier = null"></button>
      <article class="g-hotel-modal-panel">
        <header>
          <h3>企业档案：{{ selectedSupplier.name }}</h3>
          <button type="button" aria-label="关闭" @click="selectedSupplier = null">×</button>
        </header>
        <div class="g-hotel-detail-list">
          <p><span>联系人：</span>{{ selectedSupplier.contactName || "-" }}</p>
          <p><span>联系电话：</span>{{ selectedSupplier.contactPhone || "-" }}</p>
          <p><span>综合评分：</span>{{ performanceScore(selectedSupplier) }} 分</p>
          <p><span>主营业务：</span>{{ selectedSupplier.categoryAuth.join("，") || "酒店综合物资与服务" }}</p>
          <p><span>服务范围：</span>{{ serviceRegionSummary(selectedSupplier) }}</p>
          <p><span>资料状态：</span>资质 {{ selectedSupplier.qualificationAttachments?.length ?? 0 }} / 封样 {{ selectedSupplier.sealSamples?.length ?? 0 }}</p>
        </div>
        <footer>
          <EnterpriseButton @click="selectedSupplier = null">关闭档案</EnterpriseButton>
          <RouterLink class="eds-button eds-button-primary" :to="isSupplierPortal ? '/supplier-portal' : `/suppliers/${encodeURIComponent(selectedSupplier.id)}`">进入管理</RouterLink>
        </footer>
      </article>
    </div>
  </section>
</template>

