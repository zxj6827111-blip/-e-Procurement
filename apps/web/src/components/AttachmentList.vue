<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { apiBlob } from "../api/http";
import { formatDateTime, isImageFile } from "../utils/status-labels";

interface Attachment {
  id?: string;
  fileId?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

const props = defineProps<{
  attachments?: Attachment[];
  prefix?: string;
  emptyText?: string;
  compact?: boolean;
}>();

const previewUrls = ref<Record<string, string>>({});
const loading = ref<Record<string, boolean>>({});
const errors = ref<Record<string, string>>({});

const normalizedAttachments = computed(() =>
  (props.attachments ?? [])
    .map((item, index) => ({
      ...item,
      key: attachmentId(item) || `${item.fileName ?? "attachment"}-${index}`
    }))
    .filter((item) => item.fileName || attachmentId(item))
);

function attachmentId(attachment: Attachment) {
  return attachment.id ?? attachment.fileId ?? "";
}

function displayName(attachment: Attachment) {
  return `${props.prefix ? `${props.prefix} / ` : ""}${attachment.fileName ?? attachmentId(attachment)}`;
}

function humanSize(value?: number) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

async function loadPreview(attachment: Attachment) {
  const id = attachmentId(attachment);
  if (!id || !isImageFile(attachment.fileName, attachment.contentType) || previewUrls.value[id] || loading.value[id]) return;
  loading.value = { ...loading.value, [id]: true };
  try {
    const blob = await apiBlob(`/api/files/${id}/download`);
    previewUrls.value = { ...previewUrls.value, [id]: URL.createObjectURL(blob) };
    const { [id]: _removed, ...rest } = errors.value;
    errors.value = rest;
  } catch (error) {
    errors.value = { ...errors.value, [id]: error instanceof Error ? error.message : "预览失败" };
  } finally {
    loading.value = { ...loading.value, [id]: false };
  }
}

async function downloadAttachment(attachment: Attachment) {
  const id = attachmentId(attachment);
  if (!id) return;
  try {
    const blob = await apiBlob(`/api/files/${id}/download`);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = attachment.fileName ?? "attachment";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    errors.value = { ...errors.value, [id]: error instanceof Error ? error.message : "下载失败" };
  }
}

function openPreview(attachment: Attachment) {
  const id = attachmentId(attachment);
  const url = previewUrls.value[id];
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

watch(
  normalizedAttachments,
  (attachments) => {
    for (const attachment of attachments) {
      void loadPreview(attachment);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  for (const url of Object.values(previewUrls.value)) {
    URL.revokeObjectURL(url);
  }
});
</script>

<template>
  <div v-if="normalizedAttachments.length" class="attachment-list" :class="{ compact }">
    <div v-for="attachment in normalizedAttachments" :key="attachment.key" class="attachment-item">
      <button
        v-if="isImageFile(attachment.fileName, attachment.contentType)"
        type="button"
        class="attachment-thumb"
        :disabled="!previewUrls[attachmentId(attachment)]"
        @click="openPreview(attachment)"
      >
        <img v-if="previewUrls[attachmentId(attachment)]" :src="previewUrls[attachmentId(attachment)]" :alt="displayName(attachment)" />
        <span v-else>{{ loading[attachmentId(attachment)] ? "加载中" : "图片" }}</span>
      </button>
      <div class="attachment-meta">
        <strong>{{ displayName(attachment) }}</strong>
        <small>{{ [formatDateTime(attachment.uploadedAt), humanSize(attachment.sizeBytes)].filter(Boolean).join(" / ") }}</small>
        <small v-if="errors[attachmentId(attachment)]" class="inline-error">{{ errors[attachmentId(attachment)] }}</small>
      </div>
      <button type="button" class="secondary-button" :disabled="!attachmentId(attachment)" @click="downloadAttachment(attachment)">下载</button>
    </div>
  </div>
  <span v-else class="notice">{{ emptyText ?? "-" }}</span>
</template>
