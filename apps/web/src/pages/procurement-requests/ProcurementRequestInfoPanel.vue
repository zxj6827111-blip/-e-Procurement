<script setup lang="ts">
import { computed } from "vue";
import { EnterpriseSurface } from "../../components/base";
import { formatDate } from "./display";
import type { ProcurementRequest } from "./types";
import { formatDateTime } from "../../utils/status-labels";

const props = defineProps<{
  request: ProcurementRequest;
}>();

const infoItems = computed(() => [
  { label: "使用部门", value: props.request.requestDepartment || "-" },
  { label: "申请人", value: props.request.requesterName || "-" },
  { label: "采购品类", value: props.request.category || "-" },
  { label: "预算口径", value: props.request.budgetLabel || "-" },
  { label: "需求日期", value: formatDate(props.request.expectedArrivalAt) },
  { label: "收货地点", value: props.request.receivingLocation || "-" },
  { label: "外部交易", value: props.request.externalTradeFlag ? "需要外部备案" : "内部采购" },
  { label: "审批人", value: props.request.approvalBy || "-" },
  { label: "审批时间", value: formatDateTime(props.request.approvedAt) }
]);
</script>

<template>
  <EnterpriseSurface title="基础信息">
    <dl class="eds-fact-grid">
      <div v-for="item in infoItems" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
  </EnterpriseSurface>

  <EnterpriseSurface title="需求说明">
    <p>{{ props.request.purpose || "-" }}</p>
    <p class="eds-meta">申请说明：{{ props.request.description || "-" }}</p>
    <p class="eds-meta">审批意见：{{ props.request.approvalOpinion || "-" }}</p>
  </EnterpriseSurface>
</template>
