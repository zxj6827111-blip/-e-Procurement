<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { EnterpriseButton, EnterpriseSurface, FormSection } from "../../components/base";
import { methodRuleIdFor, methodRuleSummary, projectDisplayName, projectExecutionLink, ruleResultLabel } from "./display";
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

function inputValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}
</script>

<template>
  <EnterpriseSurface v-if="canDecideMethod || canCreateProject || request.projectId" :title="canDecideMethod ? '判定采购方式' : canCreateProject ? '发起采购项目' : '项目已发起'">
    <div v-if="canDecideMethod" class="eds-section">
      <p class="eds-meta">该需求已审批通过，当前需要先选择适用的采购方式规则。</p>
      <FormSection title="采购方式规则">
        <label>
          选择采购方式规则
          <select :value="selectedRuleId" @change="emit('update:selectedRuleId', inputValue($event))">
            <option v-for="rule in rules" :key="rule.id" :value="rule.id">{{ rule.ruleName || rule.resultMethod }}</option>
          </select>
        </label>
        <div>
          <strong>{{ selectedRule?.ruleName || "暂无可用规则" }}</strong>
          <p class="eds-meta">判定结果：{{ ruleResultLabel(selectedRule) }}</p>
          <p>{{ methodRuleSummary(selectedRule) }}</p>
        </div>
      </FormSection>
      <EnterpriseButton type="primary" :disabled="!methodRuleIdFor(request.id, {}, selectedRuleId, rules)" @click="$emit('decide-method')">方式判定</EnterpriseButton>
    </div>

    <div v-else-if="canCreateProject" class="eds-section">
      <p class="eds-meta">采购方式已判定，可以从该需求直接发起采购项目。</p>
      <FormSection title="项目承接">
        <label>
          项目名称
          <input :value="projectNameDraft" @input="emit('update:projectNameDraft', inputValue($event))" />
        </label>
      </FormSection>
      <EnterpriseButton type="primary" :disabled="!projectNameDraft.trim()" @click="$emit('create-project')">发起项目</EnterpriseButton>
    </div>

    <div v-else-if="request.projectId" class="eds-section">
      <strong>该需求已经转为采购项目。</strong>
      <p class="eds-meta">{{ projectDisplayName(linkedProject) }}</p>
      <RouterLink class="eds-button eds-button-primary" :to="projectExecutionLink(request.projectId)">进入项目执行</RouterLink>
    </div>
  </EnterpriseSurface>
</template>
