<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";

defineProps<{
  canMaintainSourcing: boolean;
  canCreateAnnouncement: boolean;
  busyAction: string;
}>();

const title = defineModel<string>("title", { required: true });
const procurementMethod = defineModel<string>("procurementMethod", { required: true });
const scope = defineModel<string>("scope", { required: true });
const registrationDeadlineAt = defineModel<string>("registrationDeadlineAt", { required: true });
const quoteDeadlineAt = defineModel<string>("quoteDeadlineAt", { required: true });
const deliveryWindow = defineModel<string>("deliveryWindow", { required: true });
const openingLocation = defineModel<string>("openingLocation", { required: true });

const emit = defineEmits<{
  create: [];
}>();
</script>

<template>
  <EnterpriseSurface v-if="canMaintainSourcing" title="起草公告" description="公告创建后先进入草稿状态，确认供应商范围后再发布。">
    <div class="eds-form-section">
      <label>
        公告标题
        <input v-model="title" />
      </label>
      <label>
        采购方式
        <select v-model="procurementMethod">
          <option value="internal_open">内部公开</option>
          <option value="comparison">询价/比价</option>
          <option value="selection">比选</option>
        </select>
      </label>
      <label>
        公告范围
        <select v-model="scope">
          <option value="public_internal">内部公开</option>
          <option value="invited_suppliers">定向邀请</option>
        </select>
      </label>
      <label>
        报名截止
        <input v-model="registrationDeadlineAt" type="datetime-local" />
      </label>
      <label>
        报价截止
        <input v-model="quoteDeadlineAt" type="datetime-local" />
      </label>
      <label v-if="procurementMethod === 'comparison'">
        交付窗口
        <input v-model="deliveryWindow" />
      </label>
      <label v-else>
        开标地点
        <input v-model="openingLocation" />
      </label>
    </div>
    <SubmitPanel>
      <EnterpriseButton type="primary" :disabled="!canCreateAnnouncement || busyAction === 'create'" @click="emit('create')">创建公告草稿</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
