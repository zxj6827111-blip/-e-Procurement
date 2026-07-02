<script setup lang="ts">
import { EnterpriseSurface } from "../../components/base";
import type { ProcurementDocument, Project } from "./types";

defineProps<{
  internalProjects: Project[];
  lockedDocuments: ProcurementDocument[];
  canMaintainSourcing: boolean;
  canCreateAnnouncement: boolean;
  announcementPrerequisiteMessage: string;
}>();

const selectedProjectId = defineModel<string>("selectedProjectId", { required: true });
const selectedDocumentId = defineModel<string>("selectedDocumentId", { required: true });

const emit = defineEmits<{
  projectChange: [];
}>();
</script>

<template>
  <EnterpriseSurface title="项目与文件" description="先选择采购项目，再选择可用于公告的采购文件。">
    <div class="eds-form-section">
      <label>
        采购项目
        <select v-model="selectedProjectId" @change="emit('projectChange')">
          <option v-for="project in internalProjects" :key="project.id" :value="project.id">{{ project.code }} / {{ project.name }}</option>
        </select>
      </label>
      <label>
        可用采购文件
        <select v-model="selectedDocumentId" :disabled="!lockedDocuments.length">
          <option v-if="!lockedDocuments.length" value="">暂无已发布并锁定的采购文件</option>
          <option v-for="document in lockedDocuments" :key="document.id" :value="document.id">{{ document.title }} / v{{ document.versionNo }}</option>
        </select>
      </label>
    </div>
    <p v-if="canMaintainSourcing && !canCreateAnnouncement" class="eds-meta">{{ announcementPrerequisiteMessage }}</p>
    <p v-if="!canMaintainSourcing" class="eds-meta">当前账号仅查看公告与邀请状态；创建、发布、关闭公告和发送邀请由采购经办操作。</p>
  </EnterpriseSurface>
</template>
