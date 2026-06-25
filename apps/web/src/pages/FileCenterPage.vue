<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AttachmentList from "../components/AttachmentList.vue";
import { apiGet, apiPost, replaceFile, type UploadedFileMetadata } from "../api/http";
import { useSessionStore } from "../stores/session";
import { formatDateTime, labelStatus } from "../utils/status-labels";

type FileRecord = UploadedFileMetadata & {
  fileId: string;
  attachmentKind: string;
  objectType: string;
  objectId: string;
  uploadedBy: string;
  versionNo: number;
};

const files = ref<FileRecord[]>([]);
const session = useSessionStore();
const selectedFileId = ref("");
const replacementFile = ref<File | null>(null);
const busy = ref(false);
const message = ref("");
const fileMaintainerRoles = new Set(["group_manager", "buyer", "hotel_buyer", "platform_operator", "supplier", "supplier_admin"]);
const canMaintainFiles = computed(() => fileMaintainerRoles.has(session.roleId));

async function loadFiles() {
  const data = await apiGet<{ files: FileRecord[] }>("/api/files");
  files.value = data.files;
}

function chooseReplacement(event: Event) {
  replacementFile.value = (event.target as HTMLInputElement).files?.[0] ?? null;
}

async function replaceSelectedFile() {
  if (!selectedFileId.value || !replacementFile.value) return;
  busy.value = true;
  try {
    const result = await replaceFile(selectedFileId.value, replacementFile.value);
    message.value = `已替换为 ${result.file.fileName}，版本 ${result.file.versionNo ?? "-"}`;
    replacementFile.value = null;
    await loadFiles();
  } finally {
    busy.value = false;
  }
}

async function discardFile(fileId: string) {
  busy.value = true;
  try {
    await apiPost(`/api/files/${fileId}/discard`, { reason: "业务侧作废旧附件" });
    message.value = "文件已作废，原下载入口已关闭。";
    await loadFiles();
  } finally {
    busy.value = false;
  }
}

onMounted(loadFiles);
</script>

<template>
  <section class="panel">
    <h2>文件与图片中心</h2>
    <p>统一查看业务附件、图片预览、下载审计、替换和作废记录。</p>
    <div v-if="canMaintainFiles" class="form-grid">
      <label>
        选择待替换文件
        <select v-model="selectedFileId">
          <option value="">请选择</option>
          <option v-for="file in files" :key="file.fileId" :value="file.fileId">
            {{ file.fileName }} / {{ labelStatus(file.attachmentKind) }} / v{{ file.versionNo }}
          </option>
        </select>
      </label>
      <label>
        新文件
        <input type="file" @change="chooseReplacement" />
      </label>
      <button type="button" :disabled="busy || !selectedFileId || !replacementFile" @click="replaceSelectedFile">替换文件</button>
    </div>
    <p v-if="message" class="notice">{{ message }}</p>
  </section>

  <section class="panel">
    <h2>文件列表</h2>
    <table>
      <thead>
        <tr>
          <th>文件</th>
          <th>归属对象</th>
          <th>类型</th>
          <th>版本</th>
          <th>上传人</th>
          <th>上传时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="file in files" :key="file.fileId">
          <td>
            <AttachmentList :attachments="[file]" compact />
          </td>
          <td>{{ file.objectType }} / {{ file.objectId }}</td>
          <td>{{ labelStatus(file.attachmentKind) }}</td>
          <td>v{{ file.versionNo }}</td>
          <td>{{ file.uploadedBy }}</td>
          <td>{{ formatDateTime(file.uploadedAt) }}</td>
          <td>
            <button v-if="canMaintainFiles" type="button" class="secondary-button" :disabled="busy" @click="discardFile(file.fileId)">作废</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
