<script setup lang="ts">
import { EnterpriseSurface, SummaryCards } from "../../components/base";
import type { AttachmentGroup, ScoringSheet } from "./types";

defineProps<{
  attachmentGroups: AttachmentGroup[];
  selectedSheetDetail: ScoringSheet | null;
}>();
</script>

<template>
  <EnterpriseSurface v-if="selectedSheetDetail" title="评审材料" description="专家评分时可核对报名资料、补充资料、响应文件和报价摘要。">
    <SummaryCards
      :items="[
        ...attachmentGroups.map((group) => ({
          label: group.label,
          value: group.items.length,
          meta: group.items.map((file) => file.fileName).join('、') || '暂无材料'
        })),
        {
          label: '报价摘要',
          value: selectedSheetDetail.materials?.bidSummary ? '已提交' : '暂无',
          meta: selectedSheetDetail.materials?.bidSummary
            ? `金额：¥${selectedSheetDetail.materials.bidSummary.amount.toLocaleString()} / 交期：${selectedSheetDetail.materials.bidSummary.deliveryDays ?? '-'} 天`
            : '暂无报价摘要'
        }
      ]"
    />
  </EnterpriseSurface>
</template>
