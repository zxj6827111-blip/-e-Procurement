<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { DataTable, EnterpriseButton, EnterpriseSurface, StatusTag, type DataTableColumn } from "../../components/base";
import type { Attachment, SealSample, Supplier } from "./types";

defineProps<{
  supplier: Supplier;
  canEditOwnSupplier: boolean;
  inactive: boolean;
  labels: {
    dateTime: (value?: string | null) => string;
    sealSampleAttachments: (sample: SealSample) => Attachment[];
  };
}>();

const emit = defineEmits<{
  uploadSample: [];
  deleteSample: [sample: SealSample];
}>();

const columns: DataTableColumn[] = [
  { key: "sampleName", label: "样品" },
  { key: "specification", label: "规格" },
  { key: "confirmedBy", label: "确认人" },
  { key: "attachments", label: "附件" },
  { key: "action", label: "操作" }
];
</script>

<template>
  <div class="eds-section">
    <EnterpriseSurface title="封样样品">
      <template #actions>
        <StatusTag>共 {{ supplier.sealSamples?.length ?? 0 }} 件</StatusTag>
        <EnterpriseButton v-if="canEditOwnSupplier && !inactive" type="text" @click="emit('uploadSample')">上传封样</EnterpriseButton>
      </template>
      <DataTable :columns="columns" :rows="supplier.sealSamples ?? []" row-key="id" empty-text="暂无封样资料">
        <template #confirmedBy="{ row }">{{ row.confirmedBy }} / {{ labels.dateTime(row.uploadedAt ?? row.confirmedAt) }}</template>
        <template #attachments="{ row }">
          <AttachmentList :attachments="labels.sealSampleAttachments(row)" variant="gallery" compact empty-text="暂无封样图片" />
        </template>
        <template #action="{ row }">
          <EnterpriseButton type="text" @click="emit('deleteSample', row)">删除封样</EnterpriseButton>
        </template>
      </DataTable>
    </EnterpriseSurface>
  </div>
</template>
