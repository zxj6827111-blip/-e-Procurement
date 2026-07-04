<script setup lang="ts">
import { computed } from "vue";
import { EnterpriseButton, StatusTag } from "../../components/base";
import type { DemoUser } from "./types";

const props = defineProps<{
  rows: DemoUser[];
  selectedUserId: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
  enter: [];
}>();

const selectedUser = computed(() => props.rows.find((row) => row.id === props.selectedUserId) ?? props.rows[0]);
</script>

<template>
  <section class="eds-role-select-panel">
    <label>
      选择验证角色
      <select :value="selectedUserId" @change="emit('select', ($event.target as HTMLSelectElement).value)">
        <option v-for="row in rows" :key="row.id" :value="row.id">
          {{ row.role }} / {{ row.org }}
        </option>
      </select>
    </label>

    <div class="eds-role-selected-card">
      <strong>{{ selectedUser.role }}</strong>
      <span>{{ selectedUser.org }}</span>
      <span>{{ selectedUser.summary }}</span>
      <StatusTag>验证角色</StatusTag>
    </div>

    <EnterpriseButton type="accent" :disabled="loading" @click="emit('enter')">进入该角色工作台</EnterpriseButton>
  </section>
</template>
