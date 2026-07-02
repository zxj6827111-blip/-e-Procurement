<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, FeedbackMessage, FormSection, SubmitPanel } from "../../components/base";
import type { Announcement } from "./types";

const selectedAnnouncementId = defineModel<string>("selectedAnnouncementId", { required: true });

defineProps<{
  announcements: Announcement[];
  busy: boolean;
  canSubmitRegistration: boolean;
  categoryMismatchMessage: string;
  emptyAnnouncementHint: string;
  isSupplierView: boolean;
  materialName: string;
  projectLabel: (projectId: string) => string;
  restrictedMessage: string;
  supplementName: string;
}>();

const emit = defineEmits<{
  fileChange: [event: Event];
  submitRegistration: [];
  supplementFileChange: [event: Event];
}>();
</script>

<template>
  <FormSection v-if="isSupplierView" title="提交报名资料" description="选择已发布公告，上传报名资料和可选补充材料。">
    <label>
      可报名公告
      <select v-model="selectedAnnouncementId">
        <option v-if="!announcements.length" value="">暂无可报名公告</option>
        <option v-for="announcement in announcements" :key="announcement.id" :value="announcement.id">
          {{ announcement.title }} / {{ projectLabel(announcement.projectId) }}
        </option>
      </select>
    </label>
    <label>
      报名资料文件
      <input type="file" @change="emit('fileChange', $event)" />
    </label>
    <label>
      资格补充材料
      <input type="file" @change="emit('supplementFileChange', $event)" />
    </label>
    <p class="eds-meta">{{ materialName || "未选择报名资料" }}</p>
    <p class="eds-meta">{{ supplementName || "未选择补充材料" }}</p>
    <p v-if="emptyAnnouncementHint" class="eds-meta">{{ emptyAnnouncementHint }}</p>
    <FeedbackMessage v-if="restrictedMessage" tone="error">{{ restrictedMessage }}</FeedbackMessage>
    <FeedbackMessage v-if="categoryMismatchMessage" tone="error">{{ categoryMismatchMessage }}</FeedbackMessage>
    <SubmitPanel>
      <EnterpriseButton
        type="primary"
        :disabled="!selectedAnnouncementId || !canSubmitRegistration || !materialName || Boolean(restrictedMessage) || Boolean(categoryMismatchMessage) || busy"
        @click="emit('submitRegistration')"
      >
        提交报名
      </EnterpriseButton>
    </SubmitPanel>
  </FormSection>

  <EnterpriseSurface v-else-if="emptyAnnouncementHint" title="报名入口状态" :description="emptyAnnouncementHint" />
</template>
