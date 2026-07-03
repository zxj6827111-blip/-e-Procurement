<script setup lang="ts">
defineProps<{
  commercial?: boolean;
  title?: string;
  subtitle?: string;
}>();
</script>

<template>
  <div :class="['enterprise-auth-shell', { 'enterprise-auth-shell-commercial': commercial }]">
    <section :class="['eds-auth-surface', { 'eds-auth-surface-commercial': commercial }]">
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
