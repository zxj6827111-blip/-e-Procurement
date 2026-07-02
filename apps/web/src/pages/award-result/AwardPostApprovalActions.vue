<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel, SummaryCards } from "../../components/base";
import { CONTRACT_STATUS_LABELS, currency } from "./constants";
import type { ContractLedger } from "./types";

defineProps<{
  currentContract: ContractLedger | null;
  hasListedAwardProducts: boolean;
  canStartContractSigning: boolean;
  canAutoListAwardProducts: boolean;
}>();

const emit = defineEmits<{
  startContractSigning: [];
  autoListAwardProducts: [];
}>();
</script>

<template>
  <EnterpriseSurface title="中标后续执行" description="合同确认后可按定标价格报告上架中标商品。">
    <SummaryCards
      :items="[
        {
          label: '合同签订',
          value: currentContract ? CONTRACT_STATUS_LABELS[currentContract.status] ?? currentContract.status : '未发起',
          meta: currentContract ? `${currentContract.contractNo} / ${currency(currentContract.amount)}` : '先由采购发起合同'
        },
        {
          label: '商品上架',
          value: hasListedAwardProducts ? '已上架' : '未上架',
          meta: '合同确认后可生成商品'
        }
      ]"
    />
    <SubmitPanel>
      <EnterpriseButton :disabled="!canStartContractSigning" @click="emit('startContractSigning')">
        {{ currentContract ? "合同已发起" : "发起合同签订" }}
      </EnterpriseButton>
      <EnterpriseButton type="primary" :disabled="!canAutoListAwardProducts" @click="emit('autoListAwardProducts')">
        {{ hasListedAwardProducts ? "中标商品已上架" : "一键上架中标商品" }}
      </EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
