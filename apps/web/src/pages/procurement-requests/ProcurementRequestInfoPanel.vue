<script setup lang="ts">
import { EnterpriseSurface, SummaryCards } from "../../components/base";
import { formatDate } from "./display";
import type { ProcurementRequest } from "./types";
import { formatDateTime } from "../../utils/status-labels";

defineProps<{
  request: ProcurementRequest;
}>();
</script>

<template>
  <EnterpriseSurface title="基础信息">
    <SummaryCards
      :items="[
        { label: '使用部门', value: request.requestDepartment || '-' },
        { label: '申请人', value: request.requesterName || '-' },
        { label: '采购品类', value: request.category || '-' },
        { label: '预算口径', value: request.budgetLabel || '-' },
        { label: '需求日期', value: formatDate(request.expectedArrivalAt) },
        { label: '收货地点', value: request.receivingLocation || '-' },
        { label: '外部交易', value: request.externalTradeFlag ? '需要外部备案' : '内部采购' },
        { label: '审批人', value: request.approvalBy || '-' },
        { label: '审批时间', value: formatDateTime(request.approvedAt) }
      ]"
    />
  </EnterpriseSurface>

  <EnterpriseSurface title="需求说明">
    <p>{{ request.purpose || "-" }}</p>
    <p class="eds-meta">申请说明：{{ request.description || "-" }}</p>
    <p class="eds-meta">审批意见：{{ request.approvalOpinion || "-" }}</p>
  </EnterpriseSurface>
</template>
