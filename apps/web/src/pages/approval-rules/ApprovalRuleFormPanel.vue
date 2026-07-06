<script setup lang="ts">
import type { R8ApprovalBusinessType } from "../../api/workflow";
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import type { BusinessTypeOption, RuleFormState } from "./types";

const form = defineModel<RuleFormState>("form", { required: true });

defineProps<{
  allBusinessTypeOptions: BusinessTypeOption[];
  busyRuleId: string;
  canMaintainRules: boolean;
  editingRuleId: string;
}>();

defineEmits<{
  resetRuleForm: [];
  saveRule: [];
}>();
</script>

<template>
  <EnterpriseSurface class="eds-drawer-panel g-hotel-compliance-card" title="审批规则配置抽屉" :description="editingRuleId ? '编辑当前审批规则。' : '创建新的审批规则。'">
    <div class="eds-form-section">
      <label>
        规则编码
        <input v-model="form.ruleCode" :disabled="Boolean(editingRuleId) || !canMaintainRules" />
      </label>
      <label>
        规则名称
        <input v-model="form.ruleName" :disabled="!canMaintainRules" />
      </label>
      <label>
        业务类型
        <select v-model="form.businessType" :disabled="Boolean(editingRuleId) || !canMaintainRules">
          <option v-for="item in allBusinessTypeOptions" :key="item.value" :value="item.value as R8ApprovalBusinessType">{{ item.label }}</option>
        </select>
      </label>
      <label>
        最小金额
        <input v-model.number="form.amountMin" type="number" min="0" :disabled="!canMaintainRules" />
      </label>
      <label>
        最大金额
        <input v-model.number="form.amountMax" type="number" min="0" :disabled="!canMaintainRules" />
      </label>
      <label>
        采购方式
        <input v-model="form.methodTypes" :disabled="!canMaintainRules" placeholder="多个用逗号分隔" />
      </label>
      <label>
        审批角色
        <input v-model="form.nodeRoleIds" :disabled="!canMaintainRules" placeholder="buyer,group_manager" />
      </label>
      <label>
        触发动作
        <input v-model="form.actions" :disabled="!canMaintainRules" placeholder="submit,review" />
      </label>
      <label>
        组织范围
        <input v-model="form.orgScope" :disabled="!canMaintainRules" />
      </label>
      <label>
        酒店范围
        <input v-model="form.hotelScope" :disabled="!canMaintainRules" />
      </label>
      <label>
        审批顺序
        <input v-model="form.approvalOrder" :disabled="!canMaintainRules" />
      </label>
      <label>
        默认策略
        <select v-model="form.defaultStrategy" :disabled="!canMaintainRules">
          <option value="manual_review_required">无规则时转人工复核</option>
          <option value="reject_without_rule">无规则时拒绝提交</option>
        </select>
      </label>
      <label>
        状态
        <select v-model="form.status" :disabled="!canMaintainRules">
          <option value="enabled">启用</option>
          <option value="disabled">停用</option>
        </select>
      </label>
    </div>
    <SubmitPanel class="g-hotel-sticky-actions">
      <EnterpriseButton :disabled="!canMaintainRules" @click="$emit('resetRuleForm')">新建规则</EnterpriseButton>
      <EnterpriseButton type="primary" :disabled="!canMaintainRules || busyRuleId !== ''" @click="$emit('saveRule')">
        {{ editingRuleId ? "保存规则" : "创建规则" }}
      </EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
