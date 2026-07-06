<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface } from "../../components/base";
import type { IntegrationAdapter, IntegrationCallForm } from "./types";

defineProps<{
  adapters: IntegrationAdapter[];
  selectedAdapter?: IntegrationAdapter;
  disabled: boolean;
  modelValue: string;
  form: IntegrationCallForm;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  call: [mock: boolean];
  refresh: [];
}>();
</script>

<template>
  <EnterpriseSurface class="g-hotel-compliance-card eds-drawer-panel" title="适配器调用抽屉" description="通过统一适配器边界发起外部系统调用或本地验证调用，保持请求幂等和失败注入能力。">
    <template #actions>
      <EnterpriseButton type="text" @click="emit('refresh')">刷新</EnterpriseButton>
    </template>
    <div class="eds-form-section">
      <label>
        Adapter
        <select :value="modelValue" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
          <option v-for="adapter in adapters" :key="adapter.key" :value="adapter.key">{{ adapter.name }} / {{ adapter.mode }}</option>
        </select>
      </label>
      <label>
        操作
        <input v-model="form.operation" />
      </label>
      <label>
        业务类型
        <input v-model="form.businessType" />
      </label>
      <label>
        业务ID
        <input v-model="form.businessId" />
      </label>
      <label>
        请求ID
        <input v-model="form.requestId" />
      </label>
      <label>
        幂等键
        <input v-model="form.idempotencyKey" />
      </label>
      <label>
        强制失败
        <select :value="String(form.forceFailure)" @change="form.forceFailure = ($event.target as HTMLSelectElement).value === 'true'">
          <option value="false">否</option>
          <option value="true">是</option>
        </select>
      </label>
      <label>
        Payload JSON
        <textarea v-model="form.payloadJson" rows="4"></textarea>
      </label>
    </div>
    <div class="eds-submit-panel g-hotel-sticky-actions">
      <EnterpriseButton :disabled="disabled" type="primary" @click="emit('call', false)">创建外部调用</EnterpriseButton>
      <EnterpriseButton :disabled="disabled" @click="emit('call', true)">创建本地验证调用</EnterpriseButton>
    </div>
    <p class="eds-meta">
      当前适配器：{{ selectedAdapter?.name || "-" }} / {{ selectedAdapter?.mode || "-" }}。外部 HTTP、凭据托管、回调验签和生产重推均停留在适配器边界内处理。
    </p>
  </EnterpriseSurface>
</template>
