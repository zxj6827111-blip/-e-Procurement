<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import type { ExternalTradeFormState } from "./types";

const selectedProjectId = defineModel<string>("selectedProjectId", { required: true });
const externalPlatformName = defineModel<string>("externalPlatformName", { required: true });
const externalProjectCode = defineModel<string>("externalProjectCode", { required: true });
const form = defineModel<ExternalTradeFormState>("form", { required: true });

defineProps<{
  canMaintainExternalTrade: boolean;
}>();

defineEmits<{
  createExternalProject: [];
  load: [];
  recordInternalApproval: [];
  saveExternalProjectCode: [];
}>();
</script>

<template>
  <EnterpriseSurface title="备案控制" description="维护外部交易项目基础信息和外部平台编号。">
    <div class="eds-form-section">
      <label>
        项目编号
        <input v-model="selectedProjectId" />
      </label>
      <label>
        新建项目名称
        <input v-model="form.projectName" :disabled="!canMaintainExternalTrade" />
      </label>
      <label>
        组织ID
        <input v-model="form.orgId" :disabled="!canMaintainExternalTrade" placeholder="不填使用当前组织" />
      </label>
      <label>
        组织名称
        <input v-model="form.orgName" :disabled="!canMaintainExternalTrade" />
      </label>
      <label>
        项目分类
        <input v-model="form.category" :disabled="!canMaintainExternalTrade" />
      </label>
      <label>
        内部审批意见
        <input v-model="form.internalApprovalOpinion" :disabled="!canMaintainExternalTrade" />
      </label>
      <label>
        结果备案说明
        <input v-model="form.resultRecordNote" :disabled="!canMaintainExternalTrade" />
      </label>
      <label>
        外部平台
        <input v-model="externalPlatformName" :disabled="!canMaintainExternalTrade" />
      </label>
      <label>
        外部项目编号
        <input v-model="externalProjectCode" :disabled="!canMaintainExternalTrade" />
      </label>
    </div>
    <SubmitPanel>
      <EnterpriseButton @click="$emit('load')">刷新</EnterpriseButton>
      <EnterpriseButton v-if="canMaintainExternalTrade" type="primary" @click="$emit('createExternalProject')">新建外部交易项目</EnterpriseButton>
      <EnterpriseButton v-if="canMaintainExternalTrade" @click="$emit('recordInternalApproval')">登记内部审批</EnterpriseButton>
      <EnterpriseButton v-if="canMaintainExternalTrade" @click="$emit('saveExternalProjectCode')">保存外部编号</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
