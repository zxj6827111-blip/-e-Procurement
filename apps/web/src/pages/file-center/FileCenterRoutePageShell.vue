<script setup lang="ts">
import FileCenterPageShell from "./FileCenterPageShell.vue";
import FileOperationPanel from "./FileOperationPanel.vue";
import FileTable from "./FileTable.vue";
import { useFileCenterPage } from "./useFileCenterPage";

const {
  busy,
  canMaintainFiles,
  chooseReplacement,
  discardFile,
  files,
  message,
  objectLabel,
  replacementFile,
  replaceSelectedFile,
  selectedFileId,
  summaryItems
} = useFileCenterPage();
</script>

<template>
  <section class="eds-section">
    <FileCenterPageShell :can-maintain-files="canMaintainFiles" :message="message" :summary-items="summaryItems" />

    <FileOperationPanel
      v-model:selected-file-id="selectedFileId"
      :busy="busy"
      :can-maintain-files="canMaintainFiles"
      :files="files"
      :replacement-file="replacementFile"
      @choose-replacement="chooseReplacement"
      @replace-selected-file="replaceSelectedFile"
    />

    <FileTable :busy="busy" :can-maintain-files="canMaintainFiles" :files="files" :object-label="objectLabel" @discard-file="discardFile" />
  </section>
</template>

