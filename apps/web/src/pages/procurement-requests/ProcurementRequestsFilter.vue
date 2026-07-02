<script setup lang="ts">
import { FilterBar } from "../../components/base";

defineProps<{
  pageTitle: string;
  total: number;
}>();
</script>

<template>
  <FilterBar>
    <label>
      处理口径
      <input :value="pageTitle" readonly />
    </label>
    <label>
      当前申请
      <input :value="`${total} 条`" readonly />
    </label>
  </FilterBar>
</template>
