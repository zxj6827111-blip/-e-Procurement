<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { EnterpriseSurface } from "../../components/base";
import type { Attachment } from "./types";

defineProps<{
  attachments: Attachment[];
}>();
</script>

<template>
  <EnterpriseSurface title="申请附件">
    <AttachmentList :attachments="attachments" empty-text="未提交附件" variant="document" show-meta show-download />
  </EnterpriseSurface>
</template>
