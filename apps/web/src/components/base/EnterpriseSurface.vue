<script setup lang="ts">
defineProps<{
  title?: string;
  eyebrow?: string;
  description?: string;
}>();
</script>

<template>
  <section class="eds-surface">
    <header v-if="title || eyebrow || description || $slots.actions" class="eds-page-header">
      <div>
        <p v-if="eyebrow" class="eds-meta">{{ eyebrow }}</p>
        <h3 v-if="title">{{ title }}</h3>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="eds-actions">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>
