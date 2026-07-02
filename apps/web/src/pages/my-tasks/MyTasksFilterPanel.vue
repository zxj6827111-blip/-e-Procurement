<script setup lang="ts">
import type { R8ApprovalBusinessType } from "../../api/workflow";
import { FilterBar } from "../../components/base";
import { DATE_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "./display";
import type { BusinessTypeOption, DateFilter, TaskStatusFilter } from "./types";

const statusFilter = defineModel<TaskStatusFilter>("statusFilter", { required: true });
const businessTypeFilter = defineModel<"all" | R8ApprovalBusinessType>("businessTypeFilter", { required: true });
const dateFilter = defineModel<DateFilter>("dateFilter", { required: true });
const opinion = defineModel<string>("opinion", { required: true });

defineProps<{
  businessTypeOptions: BusinessTypeOption[];
}>();
</script>

<template>
  <FilterBar>
    <label>
      状态
      <select v-model="statusFilter">
        <option v-for="item in STATUS_FILTER_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    </label>
    <label>
      业务类型
      <select v-model="businessTypeFilter">
        <option value="all">全部业务</option>
        <option v-for="item in businessTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    </label>
    <label>
      时间
      <select v-model="dateFilter">
        <option v-for="item in DATE_FILTER_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    </label>
    <label>
      处理意见
      <input v-model="opinion" />
    </label>
  </FilterBar>
</template>
