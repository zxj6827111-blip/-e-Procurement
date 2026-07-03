<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <section class="eds-page-section">
    <header v-if="title || description" class="eds-disclosure-head">
      <div>
        <strong v-if="title">{{ title }}</strong>
        <p v-if="description" class="eds-meta">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="eds-actions">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>
