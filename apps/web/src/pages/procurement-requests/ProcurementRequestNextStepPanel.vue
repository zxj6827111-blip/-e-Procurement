<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { EnterpriseButton, EnterpriseSurface, FormSection, type SummaryCardItem } from "../../components/base";
import { isExternalRule, methodRuleIdFor, methodRuleSummary, projectDisplayName, projectExecutionLink, ruleResultLabel } from "./display";
import type { MethodRule, ProcurementRequest, ProjectRow } from "./types";

const props = defineProps<{
  request: ProcurementRequest;
  rules: MethodRule[];
  selectedRuleId: string;
  projectNameDraft: string;
  linkedProject: ProjectRow | null;
  canDecideMethod: boolean;
  canCreateProject: boolean;
}>();

const emit = defineEmits<{
  "update:selectedRuleId": [value: string];
  "update:projectNameDraft": [value: string];
  "decide-method": [];
  "create-project": [];
}>();

const selectedRule = computed(() => props.rules.find((rule) => rule.id === props.selectedRuleId));

const summaryItems = computed<SummaryCardItem[]>(() => {
  if (props.canDecideMethod) {
    return [
      { label: "当前节点", value: "待方式判定" },
      { label: "规则结果", value: ruleResultLabel(selectedRule.value) },
      { label: "外部备案", value: isExternalRule(selectedRule.value) ? "需要" : "不需要" }
    ];
  }
  if (props.canCreateProject) {
    return [
      { label: "当前节点", value: "待发起项目" },
      { label: "采购方式", value: props.request.methodSuggestion || "-" },
      { label: "项目名称", value: props.projectNameDraft.trim() || "待填写" }
    ];
  }
  if (props.request.projectId) {
    return [
      { label: "当前节点", value: "已转项目" },
      { label: "项目名称", value: projectDisplayName(props.linkedProject) },
      { label: "项目编号", value: props.linkedProject?.code || props.request.projectId }
    ];
  }
  return [];
});

function inputValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}
</script>

<template>
  <EnterpriseSurface
    v-if="canDecideMethod || canCreateProject || request.projectId"
    :title="canDecideMethod ? '判定采购方式' : canCreateProject ? '发起采购项目' : '项目已承接'"
    eyebrow="下一步处理"
    :description="canDecideMethod ? '审批通过后先锁定采购方式，再决定后续执行链路。' : canCreateProject ? '方式判定完成后，直接从需求承接为采购项目。' : '该需求已进入项目工作台，后续执行统一在项目主线处理。'"
  >
    <div v-if="summaryItems.length" class="eds-procurement-step-facts">
      <article v-for="item in summaryItems" :key="item.label">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <div v-if="canDecideMethod" class="eds-section">
      <p class="eds-meta">该需求已审批通过，当前需要先选择适用的采购方式规则，再进入后续执行链路。</p>
      <FormSection title="采购方式规则" description="规则决定需求进入内部招采还是外部交易备案链路。">
        <label>
          选择采购方式规则
          <select :value="selectedRuleId" @change="emit('update:selectedRuleId', inputValue($event))">
            <option v-for="rule in rules" :key="rule.id" :value="rule.id">{{ rule.ruleName || rule.resultMethod }}</option>
          </select>
        </label>
        <div class="eds-form-full-row">
          <strong>{{ selectedRule?.ruleName || "暂无可用规则" }}</strong>
          <p class="eds-meta">判定结果：{{ ruleResultLabel(selectedRule) }}</p>
          <p>{{ methodRuleSummary(selectedRule) }}</p>
        </div>
      </FormSection>
      <EnterpriseButton type="primary" :disabled="!methodRuleIdFor(request.id, {}, selectedRuleId, rules)" @click="$emit('decide-method')">
        确认方式判定
      </EnterpriseButton>
    </div>

    <div v-else-if="canCreateProject" class="eds-section">
      <p class="eds-meta">采购方式已判定，当前可以直接从该需求发起采购项目，避免重复录入。</p>
      <FormSection title="项目承接" description="项目名称会作为后续工作台和执行链路的主标题。">
        <label>
          项目名称
          <input :value="projectNameDraft" @input="emit('update:projectNameDraft', inputValue($event))" />
        </label>
      </FormSection>
      <EnterpriseButton type="primary" :disabled="!projectNameDraft.trim()" @click="$emit('create-project')">发起采购项目</EnterpriseButton>
    </div>

    <div v-else-if="request.projectId" class="eds-section">
      <p class="eds-meta">该需求已经转为采购项目，详情、流程和审计留痕统一回到项目工作台处理。</p>
      <RouterLink class="eds-button eds-button-primary" :to="projectExecutionLink(request.projectId)">进入项目执行</RouterLink>
    </div>
  </EnterpriseSurface>
</template>
