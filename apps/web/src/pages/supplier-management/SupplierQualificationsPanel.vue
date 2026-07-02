<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { EnterpriseButton, EnterpriseSurface, StatusTag } from "../../components/base";
import type { Attachment, Supplier } from "./types";

defineProps<{
  supplier: Supplier;
  canEditOwnSupplier: boolean;
  inactive: boolean;
}>();

const emit = defineEmits<{
  addQualification: [];
  deleteQualification: [attachment: Attachment];
}>();
</script>

<template>
  <div class="eds-section">
    <EnterpriseSurface title="资质证照">
      <template #actions>
        <StatusTag>共 {{ supplier.qualificationAttachments?.length ?? 0 }} 件</StatusTag>
        <EnterpriseButton v-if="canEditOwnSupplier && !inactive" type="text" @click="emit('addQualification')">追加资质</EnterpriseButton>
      </template>
      <AttachmentList
        :attachments="supplier.qualificationAttachments"
        variant="document"
        empty-text="暂无资质文件"
        deletable
        @delete="(attachment) => emit('deleteQualification', attachment as Attachment)"
      />
    </EnterpriseSurface>
  </div>
</template>
