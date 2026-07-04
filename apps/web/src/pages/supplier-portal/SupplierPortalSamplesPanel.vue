<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { EnterpriseButton, EnterpriseSurface, FormSection, SubmitPanel } from "../../components/base";
import { formatDateTime } from "../../utils/status-labels";
import type { Attachment, SealSample } from "./types";

defineProps<{
  sealSampleName: string;
  sealSampleSpec: string;
  sealSampleFileName: string;
  sampleSaving: boolean;
  samples?: SealSample[];
  sealSampleAttachments: (sample: SealSample) => Attachment[];
}>();

const emit = defineEmits<{
  updateSealSampleName: [value: string];
  updateSealSampleSpec: [value: string];
  fileChange: [event: Event];
  submitSealSample: [];
  deleteSealSample: [sample: SealSample];
}>();
</script>

<template>
  <div class="eds-stack">
    <FormSection title="上传封样" description="封样用于集团侧验收、比对和后续履约留痕。">
      <label>封样名称<input :value="sealSampleName" @input="emit('updateSealSampleName', ($event.target as HTMLInputElement).value)" /></label>
      <label>规格说明<input :value="sealSampleSpec" @input="emit('updateSealSampleSpec', ($event.target as HTMLInputElement).value)" /></label>
      <label class="eds-field-wide eds-file-field">
        <span>封样附件</span>
        <span class="eds-file-picker">
          <span class="eds-file-picker-main">
            <strong>选择封样图片</strong>
            <small>{{ sealSampleFileName || "可上传一张或多张封样图片" }}</small>
          </span>
          <span class="eds-button eds-button-accent">选择图片</span>
          <input type="file" accept="image/*" multiple @change="emit('fileChange', $event)" />
        </span>
      </label>
    </FormSection>
    <SubmitPanel>
      <EnterpriseButton type="primary" :disabled="sampleSaving || !sealSampleName.trim()" @click="emit('submitSealSample')">上传封样</EnterpriseButton>
    </SubmitPanel>

    <EnterpriseSurface title="封样样品">
      <div v-if="samples?.length" class="eds-record-grid">
        <article v-for="sample in samples" :key="sample.id" class="eds-record">
          <strong>{{ sample.sampleName }}</strong>
          <span>{{ sample.specification || "-" }}</span>
          <small>{{ sample.confirmedBy }} / {{ formatDateTime(sample.uploadedAt ?? sample.confirmedAt) }}</small>
          <AttachmentList
            v-if="sealSampleAttachments(sample).length"
            :attachments="sealSampleAttachments(sample)"
            variant="gallery"
            image-only
            empty-text="暂无封样图片"
          />
          <EnterpriseButton type="text" @click="emit('deleteSealSample', sample)">删除封样</EnterpriseButton>
        </article>
      </div>
      <p v-else class="eds-meta">暂无封样样品。</p>
    </EnterpriseSurface>
  </div>
</template>
