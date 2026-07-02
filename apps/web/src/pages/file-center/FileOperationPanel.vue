<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import type { FileRecord } from "./types";

const selectedFileId = defineModel<string>("selectedFileId", { required: true });

defineProps<{
  busy: boolean;
  canMaintainFiles: boolean;
  files: FileRecord[];
  replacementFile: File | null;
}>();

defineEmits<{
  chooseReplacement: [event: Event];
  replaceSelectedFile: [];
}>();
</script>

<template>
  <EnterpriseSurface title="文件替换" description="仅允许有维护权限的角色替换可维护业务附件。">
    <p v-if="!canMaintainFiles" class="eds-meta">当前角色仅可查看文件和下载记录。</p>
    <div class="eds-form-section">
      <label>
        选择待替换文件
        <select v-model="selectedFileId" :disabled="!canMaintainFiles">
          <option value="">请选择</option>
          <option v-for="file in files" :key="file.fileId" :value="file.fileId">
            {{ file.fileName }} / {{ labelStatus(file.attachmentKind) }} / v{{ file.versionNo }}
          </option>
        </select>
      </label>
      <label>
        新文件
        <input type="file" :disabled="!canMaintainFiles" @change="$emit('chooseReplacement', $event)" />
      </label>
    </div>
    <SubmitPanel>
      <EnterpriseButton type="primary" :disabled="!canMaintainFiles || busy || !selectedFileId || !replacementFile" @click="$emit('replaceSelectedFile')">替换文件</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
