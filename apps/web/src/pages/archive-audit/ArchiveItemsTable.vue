<script setup lang="ts">
import { DataTable, EnterpriseSurface, StatusTag } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import { ARCHIVE_ITEM_COLUMNS, archiveItemStatusTone, yesNo } from "./display";
import type { ArchiveItem } from "./types";

defineProps<{
  archiveItems: ArchiveItem[];
}>();
</script>

<template>
  <EnterpriseSurface title="档案项" :description="`共 ${archiveItems.length} 项归档材料。`">
    <DataTable :columns="ARCHIVE_ITEM_COLUMNS" :rows="archiveItems" row-key="id" empty-text="当前项目暂无档案项。">
      <template #required="{ row }">{{ yesNo(row.requiredFlag) }}</template>
      <template #collected="{ row }">{{ yesNo(row.collectedFlag) }}</template>
      <template #sealed="{ row }">{{ yesNo(row.sealed) }}</template>
      <template #status="{ row }">
        <StatusTag :tone="archiveItemStatusTone(row)">{{ labelStatus(row.status) }}</StatusTag>
      </template>
    </DataTable>
  </EnterpriseSurface>
</template>
