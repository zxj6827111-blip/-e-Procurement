<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import type { Project } from "./types";

const selectedProjectId = defineModel<string>("selectedProjectId", { required: true });
const title = defineModel<string>("title", { required: true });
const contentSummary = defineModel<string>("contentSummary", { required: true });

defineProps<{
  canMaintainDocuments: boolean;
  internalProjects: Project[];
  selectedFileName: string;
}>();

const emit = defineEmits<{
  createDocument: [];
  fileChange: [event: Event];
}>();
</script>

<template>
  <EnterpriseSurface
    v-if="canMaintainDocuments"
    title="创建采购文件"
    description="选择内部采购项目，补充文件名称、摘要和附件后创建文件版本。"
  >
    <div class="eds-form-section">
      <label>
        采购项目
        <select v-model="selectedProjectId">
          <option v-for="project in internalProjects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <label>
        文件名称
        <input v-model="title" />
      </label>
      <label>
        文件摘要
        <input v-model="contentSummary" />
      </label>
      <label>
        文件附件
        <input type="file" @change="emit('fileChange', $event)" />
      </label>
    </div>
    <p class="eds-meta">{{ selectedFileName || "未选择文件" }}</p>
    <SubmitPanel>
      <EnterpriseButton type="primary" :disabled="!selectedProjectId" @click="emit('createDocument')">创建采购文件</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>

  <EnterpriseSurface v-else title="只读权限" description="当前账号仅查看采购文件状态；创建、修订、发布锁定由采购经办操作。" />
</template>
