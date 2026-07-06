<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, FormSection } from "../../components/base";
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
    class="eds-drawer-panel"
    title="起草文件"
    description="先选择内部采购项目，再补齐文件标题、摘要与附件，形成可发布的文件版本。"
  >
    <FormSection title="文件基础信息" description="版本创建后仍可在锁定前补充，但公告只能引用锁定版本。">
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
      <label class="eds-form-full-row">
        文件摘要
        <textarea v-model="contentSummary" rows="3" />
      </label>
      <label class="eds-form-full-row">
        文件附件
        <input type="file" @change="emit('fileChange', $event)" />
      </label>
    </FormSection>
    <p class="eds-meta">当前文件：{{ selectedFileName || "未选择文件" }}</p>
    <div class="eds-actions">
      <EnterpriseButton type="primary" :disabled="!selectedProjectId" @click="emit('createDocument')">创建采购文件</EnterpriseButton>
    </div>
  </EnterpriseSurface>

  <EnterpriseSurface v-else title="只读权限" description="当前账号仅查看采购文件状态；创建、修订、发布与停用由采购经办或平台运营处理。" />
</template>
