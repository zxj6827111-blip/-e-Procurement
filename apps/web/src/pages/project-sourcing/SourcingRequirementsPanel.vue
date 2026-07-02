<script setup lang="ts">
import { computed } from "vue";
import AttachmentList from "../../components/AttachmentList.vue";
import { DataTable, EnterpriseSurface, StatusTag, type DataTableColumn } from "../../components/base";
import { ATTACHMENT_COLUMNS } from "./constants";
import type { BidAttachmentRow, SourcingWorkbench, StatusTone } from "./types";

const props = defineProps<{
  project: SourcingWorkbench["project"];
  bidAttachmentRows: BidAttachmentRow[];
  canReadBidBody: boolean;
  statusTone: (value: string | undefined | null) => StatusTone;
  label: (value: string | undefined | null) => string;
  currency: (value: number | undefined) => string;
}>();

const requirementColumns: DataTableColumn[] = [
  { key: "type", label: "类型" },
  { key: "content", label: "内容" },
  { key: "answer", label: "答复" }
];

const requirementRows = computed(() => [
  {
    id: "qualification",
    type: "资格要求",
    content: props.project.qualificationRequirements?.join("、") || "暂无额外资格要求",
    answer: "-"
  },
  {
    id: "quote",
    type: "报价要求",
    content: props.project.quoteRequirements?.join("、") || "暂无额外报价要求",
    answer: "-"
  },
  ...(props.project.clarificationRecords ?? []).map((qa) => ({
    id: qa.id,
    type: "答疑记录",
    content: qa.question,
    answer: qa.answer
  }))
]);
</script>

<template>
  <EnterpriseSurface title="要求、答疑与响应文件">
    <DataTable :columns="requirementColumns" :rows="requirementRows" row-key="id" empty-text="暂无要求或答疑记录" />

    <DataTable :columns="ATTACHMENT_COLUMNS" :rows="bidAttachmentRows" row-key="id" empty-text="当前阶段还没有报价附件">
      <template #status="{ row }">
        <StatusTag :tone="statusTone(row.status)">{{ label(row.status) }}</StatusTag>
      </template>
      <template #amount="{ row }">{{ canReadBidBody ? currency(row.amount) : "截标前保密" }}</template>
      <template #deliveryDays="{ row }">{{ row.deliveryDays ? `${row.deliveryDays} 天` : "-" }}</template>
      <template #attachments="{ row }">
        <AttachmentList v-if="canReadBidBody && row.responseFileMetadata?.length" :attachments="row.responseFileMetadata" compact />
        <span v-else>{{ canReadBidBody ? row.fileName || "-" : "截标前保密" }}</span>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
