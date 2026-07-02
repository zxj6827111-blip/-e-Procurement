<script setup lang="ts">
defineProps<{
  title: string;
  eyebrow?: string;
  description?: string;
}>();
</script>

<template>
  <header class="eds-page-header">
    <div>
      <p v-if="eyebrow" class="eds-meta">{{ eyebrow }}</p>
      <h2>{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="eds-actions">
      <slot name="actions" />
    </div>
  </header>
</template>
