<script setup lang="ts">
import {
  DataTable,
  EnterpriseButton,
  EnterpriseSurface,
  StatusTag,
  SubmitPanel,
  type DataTableColumn
} from "../../components/base";
import type { Expert, StatusTone } from "./types";

defineProps<{
  canMaintainExpertDirectory: boolean;
  reviewScopeOptions: string[];
  expertColumns: DataTableColumn[];
  experts: Expert[];
  expertFormMode: "create" | "edit";
  statusTone: (status: string) => StatusTone;
}>();

const emit = defineEmits<{
  saveExpert: [];
  editExpert: [expert: Expert];
}>();

const libraryOwnerOrgId = defineModel<string>("libraryOwnerOrgId", { required: true });
const libraryBranchOrgId = defineModel<string>("libraryBranchOrgId", { required: true });
const libraryAccountUserIds = defineModel<string>("libraryAccountUserIds", { required: true });
const libraryName = defineModel<string>("libraryName", { required: true });
const libraryCategory = defineModel<string>("libraryCategory", { required: true });
const libraryStatus = defineModel<string>("libraryStatus", { required: true });
const libraryReviewScopes = defineModel<string[]>("libraryReviewScopes", { required: true });
const librarySupplierAssessmentScopes = defineModel<string[]>("librarySupplierAssessmentScopes", { required: true });
const librarySharedAccount = defineModel<boolean>("librarySharedAccount", { required: true });
const libraryActive = defineModel<boolean>("libraryActive", { required: true });
const libraryMaintenanceLog = defineModel<string>("libraryMaintenanceLog", { required: true });
</script>

<template>
  <EnterpriseSurface title="评审专家库" description="统一维护专家账号、评审范围和启停状态，评审抽取从这里选取可用专家。">
    <p v-if="!canMaintainExpertDirectory" class="eds-meta">当前账号仅可查看专家库；新增、启停和账号绑定由集团采购管理维护。</p>

    <div v-if="canMaintainExpertDirectory" class="eds-form-section">
      <label>归属<input v-model="libraryOwnerOrgId" /></label>
      <label>所属分店<input v-model="libraryBranchOrgId" /></label>
      <label>用户账号<input v-model="libraryAccountUserIds" placeholder="例如 u4，多个账号用逗号分隔" /></label>
      <label>名称<input v-model="libraryName" /></label>
      <label>专业/分类<input v-model="libraryCategory" /></label>
      <label>
        状态
        <select v-model="libraryStatus">
          <option value="可抽取">可抽取</option>
          <option value="回避">回避</option>
          <option value="停用">停用</option>
        </select>
      </label>
      <label>
        评标范围
        <select v-model="libraryReviewScopes" multiple>
          <option v-for="scope in reviewScopeOptions" :key="scope" :value="scope">{{ scope }}</option>
        </select>
      </label>
      <label>
        供应商考核范围
        <select v-model="librarySupplierAssessmentScopes" multiple>
          <option v-for="scope in reviewScopeOptions" :key="scope" :value="scope">{{ scope }}</option>
        </select>
      </label>
      <label>
        是否共用账号
        <select v-model="librarySharedAccount">
          <option :value="false">否</option>
          <option :value="true">是</option>
        </select>
      </label>
      <label>
        是否激活
        <select v-model="libraryActive">
          <option :value="true">是</option>
          <option :value="false">否</option>
        </select>
      </label>
      <label>维护说明<input v-model="libraryMaintenanceLog" placeholder="例如新增专家、调整范围、停用原因" /></label>
    </div>
    <SubmitPanel v-if="canMaintainExpertDirectory">
      <EnterpriseButton type="primary" :disabled="!libraryName.trim()" @click="emit('saveExpert')">
        {{ expertFormMode === "edit" ? "保存专家" : "新增专家" }}
      </EnterpriseButton>
    </SubmitPanel>

    <DataTable :columns="expertColumns" :rows="experts" row-key="id" empty-text="暂无专家记录">
      <template #expert="{ row }">{{ row.name }} / {{ row.category }}</template>
      <template #accounts="{ row }">{{ (row.accountUserIds ?? []).join("，") || "-" }}</template>
      <template #reviewScopes="{ row }">{{ (row.reviewScopes ?? []).join("，") || "-" }}</template>
      <template #assessmentScopes="{ row }">{{ (row.supplierAssessmentScopes ?? []).join("，") || "-" }}</template>
      <template #sharedAccount="{ row }">{{ row.sharedAccount ? "是" : "否" }}</template>
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.active === false ? '停用' : row.status)">{{ row.active === false ? "停用" : row.status }}</StatusTag>
      </template>
      <template #actions="{ row }">
        <EnterpriseButton v-if="canMaintainExpertDirectory" type="text" @click="emit('editExpert', row)">编辑</EnterpriseButton>
        <span v-else class="eds-meta">只读</span>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
