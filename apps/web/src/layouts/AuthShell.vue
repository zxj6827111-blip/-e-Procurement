<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
}>();
</script>

<template>
  <div class="enterprise-auth-shell">
    <section class="eds-auth-surface">
      <div v-if="title || subtitle" class="eds-page-header">
        <div>
          <p v-if="subtitle" class="eds-meta">{{ subtitle }}</p>
          <h2 v-if="title">{{ title }}</h2>
        </div>
      </div>
      <slot />
    </section>
  </div>
</template>
