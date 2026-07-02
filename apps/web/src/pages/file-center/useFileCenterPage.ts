import { computed, onMounted, ref } from "vue";
import { apiGet, apiPost, replaceFile } from "../../api/http";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { businessRecordLabel } from "../../utils/business-display";
import { labelStatus } from "../../utils/status-labels";
import { objectTypeLabels } from "./display";
import type { FileRecord } from "./types";

export function useFileCenterPage() {
  const files = ref<FileRecord[]>([]);
  const session = useSessionStore();
  const selectedFileId = ref("");
  const replacementFile = ref<File | null>(null);
  const busy = ref(false);
  const message = ref("");
  const fileMaintainerRoles = new Set(["buyer", "platform_operator", "supplier", "supplier_admin"]);
  const canMaintainFiles = computed(() => fileMaintainerRoles.has(session.roleId));
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "可见文件", value: files.value.length, meta: "当前角色" },
    { label: "可替换", value: canMaintainFiles.value ? "是" : "否", meta: "按角色控制" },
    { label: "已作废", value: files.value.filter((item) => item.deletedAt).length, meta: "历史附件" },
    { label: "最新版本", value: files.value.reduce((max, item) => Math.max(max, Number(item.versionNo || 0)), 0), meta: "附件版本" }
  ]);

  function objectLabel(file: FileRecord) {
    const type = objectTypeLabels[file.objectType] ?? labelStatus(file.objectType);
    return `${type} / ${businessRecordLabel(file.objectId, "业务记录")}`;
  }

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

  return {
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
  };
}
