<script setup lang="ts">
import { EnterpriseSurface } from "../../components/base";
import type { FundOperationForm } from "./types";

const form = defineModel<FundOperationForm>("form", { required: true });

defineProps<{
  canMaintainFunds: boolean;
}>();
</script>

<template>
  <EnterpriseSurface v-if="canMaintainFunds" class="eds-drawer-panel" title="付款操作区" description="用于登记充值、确认付款和释放占用时写入资金流水备注。">
    <div class="eds-form-section">
      <label>
        充值金额
        <input v-model.number="form.rechargeAmount" type="number" min="0" step="0.01" />
      </label>
      <label>
        充值说明
        <input v-model="form.rechargeNote" />
      </label>
      <label>
        付款确认说明
        <input v-model="form.captureNote" />
      </label>
      <label>
        付款释放说明
        <input v-model="form.releaseNote" />
      </label>
    </div>
  </EnterpriseSurface>
</template>
