<script setup lang="ts">
import { FilterBar } from "../../components/base";

defineProps<{
  pageTitle: string;
  total: number;
}>();
</script>

<template>
  <FilterBar class="g-hotel-filter-bar">
    <label>
      搜索
      <input placeholder="搜索单号、标题、提报部门" />
    </label>
    <label>
      状态
      <select>
        <option>所有状态</option>
        <option>草稿</option>
        <option>审批中</option>
        <option>已通过</option>
        <option>已驳回</option>
      </select>
    </label>
    <label>
      当前口径
      <input :value="`${pageTitle} / ${total} 条`" readonly />
    </label>
  </FilterBar>
</template>
