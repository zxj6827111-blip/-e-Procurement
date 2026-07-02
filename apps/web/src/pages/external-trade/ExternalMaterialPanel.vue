<script setup lang="ts">
import AttachmentList from "../../components/AttachmentList.vue";
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import type { UploadedFileMetadata } from "../../api/http";

defineProps<{
  announcementMaterials?: UploadedFileMetadata[];
  canMaintainExternalTrade: boolean;
  materialFile: File | null;
  materialFileName: string;
  resultMaterials?: UploadedFileMetadata[];
}>();

defineEmits<{
  fileChange: [event: Event];
  recordExternalResult: [];
  uploadAnnouncement: [];
  uploadResult: [];
}>();
</script>

<template>
  <EnterpriseSurface title="备案材料" description="公告材料与结果材料作为外部交易项目的审计证据。">
    <div v-if="canMaintainExternalTrade" class="eds-form-section">
      <label>
        备案材料文件
        <input type="file" @change="$emit('fileChange', $event)" />
      </label>
      <p class="eds-meta">{{ materialFileName || "未选择文件" }}</p>
    </div>
    <SubmitPanel v-if="canMaintainExternalTrade">
      <EnterpriseButton :disabled="!materialFile" @click="$emit('uploadAnnouncement')">上传外部公告材料</EnterpriseButton>
      <EnterpriseButton :disabled="!materialFile" @click="$emit('uploadResult')">上传外部结果材料</EnterpriseButton>
      <EnterpriseButton type="primary" @click="$emit('recordExternalResult')">登记外部结果</EnterpriseButton>
    </SubmitPanel>
    <div class="eds-form-section">
      <div>
        <p class="eds-meta">公告材料</p>
        <AttachmentList :attachments="announcementMaterials" empty-text="暂无公告材料" />
      </div>
      <div>
        <p class="eds-meta">结果材料</p>
        <AttachmentList :attachments="resultMaterials" empty-text="暂无结果材料" />
      </div>
    </div>
  </EnterpriseSurface>
</template>
