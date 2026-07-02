<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { EnterpriseSurface } from "../../components/base";
import type { Attachment } from "./types";

defineProps<{
  attachments?: Attachment[];
}>();

const emit = defineEmits<{
  delete: [attachment: Attachment];
}>();
</script>

<template>
  <div class="eds-stack">
    <EnterpriseSurface title="资质证照">
      <AttachmentList
        :attachments="attachments"
        variant="document"
        empty-text="暂无资质文件"
        deletable
        @delete="emit('delete', $event)"
      />
    </EnterpriseSurface>
  </div>
</template>
