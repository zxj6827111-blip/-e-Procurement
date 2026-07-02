<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { apiGet } from "../../api/http";
import DataTable, { type DataTableColumn } from "../../components/base/DataTable.vue";
import EnterpriseSurface from "../../components/base/EnterpriseSurface.vue";
import FeedbackMessage from "../../components/base/FeedbackMessage.vue";
import FilterBar from "../../components/base/FilterBar.vue";
import PageHeader from "../../components/base/PageHeader.vue";
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
  { key: "name", label: "供应商" },
  { key: "status", label: "准入状态" },
  { key: "category", label: "主营品类" },
  { key: "contact", label: "联系人" },
  { key: "region", label: "服务范围" },
  { key: "risk", label: "风险" },
  { key: "materials", label: "资料" },
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
  <section class="eds-section">
    <PageHeader :title="isSupplierPortal ? '我的供应商档案' : '供应商档案'" eyebrow="供应商治理" description="按准入状态、主营品类、服务区域和资料完整性查看供应商档案。">
      <template #actions>
        <RouterLink v-if="canMaintainSupplier" class="eds-button eds-button-primary" to="/suppliers/new">新增供应商</RouterLink>
      </template>
    </PageHeader>

    <FeedbackMessage v-if="error" tone="error">{{ error }}</FeedbackMessage>

    <EnterpriseSurface title="准入与资料状态">
      <SummaryCards :items="summaryItems" />
    </EnterpriseSurface>

    <FilterBar v-if="!isSupplierPortal">
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

    <EnterpriseSurface title="供应商档案台账">
      <DataTable :columns="columns" :rows="filteredSuppliers" empty-text="当前筛选条件下暂无供应商档案">
        <template #name="{ row }">
          <strong>{{ row.name }}</strong>
          <p class="eds-meta">信用代码：{{ row.socialCreditCode || "-" }}</p>
        </template>
        <template #status="{ row }">
          <StatusTag :tone="statusTone(row)">{{ labelStatus(row.admissionStatus || row.status) }}</StatusTag>
        </template>
        <template #category="{ row }">{{ row.categoryAuth.join("，") || "-" }}</template>
        <template #contact="{ row }">{{ row.contactName || "-" }} / {{ row.contactPhone || "-" }}</template>
        <template #region="{ row }">{{ serviceRegionSummary(row) }}</template>
        <template #risk="{ row }">{{ row.risk || "-" }}</template>
        <template #materials="{ row }">
          资质 {{ row.qualificationAttachments?.length ?? 0 }} / 封样 {{ row.sealSamples?.length ?? 0 }}
        </template>
        <template #actions="{ row }">
          <RouterLink class="eds-button eds-button-text" :to="isSupplierPortal ? '/supplier-portal' : `/suppliers/${encodeURIComponent(row.id)}`">
            {{ isSupplierPortal ? "维护档案" : "查看详情" }}
          </RouterLink>
        </template>
      </DataTable>
      <PaginationBar :total="filteredSuppliers.length" />
    </EnterpriseSurface>
  </section>
</template>

