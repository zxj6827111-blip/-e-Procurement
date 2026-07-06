<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface, SubmitPanel } from "../../components/base";
import { labelStatus } from "../../utils/status-labels";
import type { ArchiveItem, SupplementRequest } from "./types";

const selectedArchiveItemId = defineModel<string>("selectedArchiveItemId", { required: true });
const selectedSupplementRequestId = defineModel<string>("selectedSupplementRequestId", { required: true });

defineProps<{
  archiveItems: ArchiveItem[];
  canMaintainArchive: boolean;
  supplementFile: File | null;
  supplementFileName: string;
  supplementRequestLabel: (requestId: string) => string;
  supplementRequests: SupplementRequest[];
}>();

defineEmits<{
  applySupplement: [];
  approveSupplementRequest: [];
  createSupplementRequest: [];
  fileChange: [event: Event];
}>();
</script>

<template>
  <EnterpriseSurface class="g-hotel-compliance-card eds-drawer-panel" title="补档处理抽屉" description="封存后发现缺失材料时，必须走补档申请、审批和材料提交链路。">
    <p v-if="!canMaintainArchive" class="eds-meta">当前角色仅可查看补档申请状态。</p>
    <div class="eds-form-section">
      <label>
        档案项
        <select v-model="selectedArchiveItemId" :disabled="!canMaintainArchive">
          <option v-for="item in archiveItems" :key="item.id" :value="item.id">{{ item.itemName }}</option>
        </select>
      </label>
      <label>
        补档申请
        <select v-model="selectedSupplementRequestId" :disabled="!canMaintainArchive">
          <option v-for="request in supplementRequests" :key="request.id" :value="request.id">
            {{ supplementRequestLabel(request.id) }} / {{ labelStatus(request.approvalStatus) }}
          </option>
        </select>
      </label>
      <label v-if="canMaintainArchive">
        补档材料
        <input type="file" @change="$emit('fileChange', $event)" />
      </label>
      <p v-if="canMaintainArchive" class="eds-meta">{{ supplementFileName || "未选择文件" }}</p>
    </div>
    <SubmitPanel v-if="canMaintainArchive" class="g-hotel-sticky-actions">
      <EnterpriseButton :disabled="!selectedArchiveItemId" @click="$emit('createSupplementRequest')">发起补档</EnterpriseButton>
      <EnterpriseButton :disabled="!selectedSupplementRequestId" @click="$emit('approveSupplementRequest')">批准补档</EnterpriseButton>
      <EnterpriseButton type="primary" :disabled="!selectedSupplementRequestId || !supplementFile" @click="$emit('applySupplement')">提交补档材料</EnterpriseButton>
    </SubmitPanel>
  </EnterpriseSurface>
</template>
