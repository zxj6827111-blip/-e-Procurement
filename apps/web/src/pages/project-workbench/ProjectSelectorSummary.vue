<script setup lang="ts">
import EnterpriseSurface from "../../components/base/EnterpriseSurface.vue";
import SummaryCards, { type SummaryCardItem } from "../../components/base/SummaryCards.vue";
import type { ProjectOption } from "./types";

defineProps<{
  currentProjectLabel: string;
  selectedProjectOptionLabel: string;
  projectOptions: ProjectOption[];
  projectSummaryItems: SummaryCardItem[];
  projectOptionLabel: (project: ProjectOption) => string;
}>();

const selectedProjectId = defineModel<string>("selectedProjectId", { required: true });
</script>

<template>
  <EnterpriseSurface title="当前操作项目">
    <div class="eds-form-section">
      <div>
        <span class="eds-meta">项目名称</span>
        <strong>{{ currentProjectLabel }}</strong>
      </div>
      <label>
        切换项目
        <select v-model="selectedProjectId" :title="selectedProjectOptionLabel">
          <option v-for="project in projectOptions" :key="project.id" :value="project.id">
            {{ projectOptionLabel(project) }}
          </option>
        </select>
      </label>
    </div>
    <SummaryCards :items="projectSummaryItems" />
  </EnterpriseSurface>
</template>
