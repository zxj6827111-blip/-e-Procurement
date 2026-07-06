<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import type { Bid } from "./types";

const selectedBidId = defineModel<string>("selectedBidId", { required: true });

defineProps<{
  bids: Bid[];
  selectedBid: Bid | null;
  bidLabel: (bid: Bid, index?: number) => string;
  labelStatus: (status?: string | null) => string;
}>();

const emit = defineEmits<{
  updateDraft: [];
  submitBid: [];
  withdrawBid: [];
  resubmitBid: [];
}>();
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="报价单操作" description="选择已有报价单后，可更新草稿、提交、撤回或重新提交。">
    <div class="eds-form-section">
      <label>
        报价单
        <select v-model="selectedBidId">
          <option v-if="!bids.length" value="">暂无可操作报价单</option>
          <option v-for="(bid, index) in bids" :key="bid.id" :value="bid.id">{{ bidLabel(bid, index) }}</option>
        </select>
      </label>
      <label>
        当前状态
        <input :value="selectedBid ? labelStatus(selectedBid.status) : '-'" disabled />
      </label>
    </div>
    <SubmitPanel>
      <EnterpriseButton :disabled="!selectedBidId" @click="emit('updateDraft')">暂存草稿</EnterpriseButton>
      <EnterpriseButton type="primary" :disabled="!selectedBidId" @click="emit('submitBid')">提交并锁定报价</EnterpriseButton>
      <EnterpriseButton :disabled="!selectedBidId" @click="emit('withdrawBid')">撤回</EnterpriseButton>
      <EnterpriseButton :disabled="!selectedBidId" @click="emit('resubmitBid')">重新提交</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
