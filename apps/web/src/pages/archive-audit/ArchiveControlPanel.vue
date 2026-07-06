<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";

const selectedProjectId = defineModel<string>("selectedProjectId", { required: true });

defineProps<{
  canMaintainArchive: boolean;
}>();

defineEmits<{
  checkArchive: [];
  createArchiveSnapshot: [];
  load: [];
  sealArchive: [];
}>();
</script>

<template>
  <EnterpriseSurface class="g-hotel-compliance-card eds-drawer-panel" title="档案控制台" description="按项目生成档案快照、执行完整性检查，并在材料齐备后封存。">
    <div class="eds-form-section">
      <label>
        项目编号
        <input v-model="selectedProjectId" />
      </label>
    </div>
    <SubmitPanel class="g-hotel-sticky-actions">
      <EnterpriseButton @click="$emit('load')">{{ canMaintainArchive ? "刷新档案" : "查看档案与审计记录" }}</EnterpriseButton>
      <EnterpriseButton v-if="canMaintainArchive" @click="$emit('createArchiveSnapshot')">生成档案快照</EnterpriseButton>
      <EnterpriseButton v-if="canMaintainArchive" @click="$emit('checkArchive')">完整性检查</EnterpriseButton>
      <EnterpriseButton v-if="canMaintainArchive" type="primary" @click="$emit('sealArchive')">封存档案</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
