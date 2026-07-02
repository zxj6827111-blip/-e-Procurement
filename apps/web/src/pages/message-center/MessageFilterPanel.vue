<script setup lang="ts">
import type { R8ApprovalBusinessType } from "../../api/workflow";
import { EnterpriseButton, FilterBar } from "../../components/base";
import { READ_FILTER_OPTIONS } from "./display";
import type { BusinessTypeOption, ReadFilter } from "./types";

const readFilter = defineModel<ReadFilter>("readFilter", { required: true });
const businessTypeFilter = defineModel<"all" | R8ApprovalBusinessType>("businessTypeFilter", { required: true });

defineProps<{
  businessTypeOptions: BusinessTypeOption[];
  busyMessageId: string;
  hasUnreadVisible: boolean;
}>();

defineEmits<{
  markAllVisibleRead: [];
}>();
</script>

<template>
  <FilterBar>
    <label>
      已读状态
      <select v-model="readFilter">
        <option v-for="item in READ_FILTER_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    </label>
    <label>
      业务类型
      <select v-model="businessTypeFilter">
        <option value="all">全部业务</option>
        <option v-for="item in businessTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    </label>
    <EnterpriseButton :disabled="!hasUnreadVisible || Boolean(busyMessageId)" @click="$emit('markAllVisibleRead')">当前列表全部已读</EnterpriseButton>
  </FilterBar>
</template>
