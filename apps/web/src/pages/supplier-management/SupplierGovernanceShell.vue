<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import {
  DataTable,
  EnterpriseButton,
  EnterpriseSurface,
  FilterBar,
  PageHeader,
  StatusTag,
  SummaryCards,
  type DataTableColumn
} from "../../components/base";
import type { Supplier } from "./types";

interface SupplierStats {
  total: number;
  admitted: number;
  pending: number;
  qualifications: number;
  samples: number;
}

interface OnboardingPrompt {
  supplier: Supplier;
  issues: string[];
  attachmentCount: number;
  nextAction: string;
}

interface OnboardingStats {
  total: number;
  materialIncomplete: number;
  qualificationReview: number;
  admissionReview: number;
}

const props = defineProps<{
  pageTitle: string;
  isSupplierPortal: boolean;
  canMaintainSupplier: boolean;
  supplierStats: SupplierStats;
  statusOptions: string[];
  groupOnboardingPrompts: OnboardingPrompt[];
  groupOnboardingStats: OnboardingStats;
}>();

const statusFilter = defineModel<string>("statusFilter", { required: true });
const searchText = defineModel<string>("searchText", { required: true });

const emit = defineEmits<{
  openOnboardingPrompt: [supplier: Supplier];
}>();

const responsibilityColumns: DataTableColumn[] = [
  { key: "step", label: "步骤" },
  { key: "title", label: "事项" },
  { key: "owner", label: "责任方" },
  { key: "status", label: "状态" }
];

const onboardingColumns: DataTableColumn[] = [
  { key: "nextAction", label: "下一动作" },
  { key: "supplierName", label: "供应商" },
  { key: "contact", label: "联系人" },
  { key: "attachmentCount", label: "附件" },
  { key: "socialCreditCode", label: "统一社会信用代码" },
  { key: "issues", label: "资料缺口" },
  { key: "actions", label: "操作" }
];

const responsibilityRows = computed(() => [
  {
    id: "create-account",
    step: "1",
    title: "集团建档开户",
    owner: "集团采购管理",
    status: "已纳入治理"
  },
  {
    id: "admission-review",
    step: "2",
    title: "集团准入评审",
    owner: "集团采购管理",
    status: props.canMaintainSupplier ? "当前可处理" : "只读查看"
  },
  {
    id: "project-invite",
    step: "3",
    title: "经办邀请参与项目",
    owner: "采购经办",
    status: "项目执行"
  },
  {
    id: "quotation",
    step: "4",
    title: "供应商报名报价",
    owner: "供应商",
    status: "外部协作"
  }
]);

const onboardingRows = computed(() =>
  props.groupOnboardingPrompts.map((item) => ({
    id: item.supplier.id,
    supplier: item.supplier,
    nextAction: item.nextAction,
    supplierName: item.supplier.name,
    contact: `${item.supplier.contactName || item.supplier.onboardingProfile?.contacts?.[0]?.name || "暂无联系人"} / ${
      item.supplier.contactPhone || item.supplier.onboardingProfile?.contacts?.[0]?.mobile || "暂无电话"
    }`,
    attachmentCount: `${item.attachmentCount} 件`,
    socialCreditCode: item.supplier.onboardingProfile?.basic?.socialCreditCode || item.supplier.socialCreditCode || "-",
    issues: item.issues.length ? item.issues.join("、") : "资料齐备"
  }))
);
</script>

<template>
  <PageHeader title="供应商档案" :description="pageTitle" eyebrow="SUPPLIER GOVERNANCE">
    <template #actions>
      <RouterLink class="eds-button eds-button-text" to="/suppliers">返回列表</RouterLink>
      <RouterLink v-if="canMaintainSupplier" class="eds-button eds-button-primary" to="/suppliers/new">新增供应商</RouterLink>
    </template>
  </PageHeader>

  <SummaryCards
    v-if="!isSupplierPortal"
    :items="[
      { label: '档案', value: supplierStats.total },
      { label: '已准入', value: supplierStats.admitted },
      { label: '待准入', value: supplierStats.pending },
      { label: '资质', value: supplierStats.qualifications },
      { label: '封样', value: supplierStats.samples }
    ]"
  />

  <FilterBar v-if="!isSupplierPortal">
    <label>
      状态
      <select v-model="statusFilter">
        <option v-for="status in statusOptions" :key="status">{{ status }}</option>
      </select>
    </label>
    <label class="eds-filter-keyword">
      关键词
      <input v-model="searchText" placeholder="供应商、联系人、品类" />
    </label>
    <RouterLink v-if="canMaintainSupplier" class="eds-button eds-button-primary" to="/suppliers/new">新增供应商</RouterLink>
  </FilterBar>

  <EnterpriseSurface
    v-if="!isSupplierPortal"
    title="职责边界"
    :description="
      canMaintainSupplier
        ? '当前账号可以新增供应商、开通供应商账号、记录准入评审、作废停用、重新启用和维护档案；账号开通不等于准入完成。'
        : '当前账号只查看供应商档案和项目关联信息；供应商新增、账号开设、准入停用和重新启用由集团采购管理处理。'
    "
  >
    <DataTable :columns="responsibilityColumns" :rows="responsibilityRows" row-key="id">
      <template #status="{ value }">
        <StatusTag :tone="value === '当前可处理' ? 'primary' : value === '只读查看' ? 'warning' : 'default'">{{ value }}</StatusTag>
      </template>
    </DataTable>
  </EnterpriseSurface>

  <EnterpriseSurface
    v-if="canMaintainSupplier && groupOnboardingPrompts.length"
    title="供应商自助注册待处理"
    :description="`当前有 ${groupOnboardingStats.total} 家自助注册供应商待处理，其中 ${groupOnboardingStats.materialIncomplete} 家资料需补齐，${groupOnboardingStats.qualificationReview} 家待资质初审，${groupOnboardingStats.admissionReview} 家待准入评审。`"
  >
    <DataTable :columns="onboardingColumns" :rows="onboardingRows" row-key="id">
      <template #nextAction="{ value, row }">
        <StatusTag :tone="row.issues === '资料齐备' ? 'primary' : 'warning'">{{ value }}</StatusTag>
      </template>
      <template #issues="{ value }">
        <StatusTag :tone="value === '资料齐备' ? 'default' : 'warning'">{{ value }}</StatusTag>
      </template>
      <template #actions="{ row }">
        <EnterpriseButton type="text" @click="emit('openOnboardingPrompt', row.supplier)">处理</EnterpriseButton>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
