<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <section class="eds-surface eds-section">
    <header v-if="title || description" class="eds-page-header">
      <div>
        <h3 v-if="title">{{ title }}</h3>
        <p v-if="description">{{ description }}</p>
      </div>
    </header>
    <div class="eds-form-section">
      <slot />
    </div>
  </section>
</template>
