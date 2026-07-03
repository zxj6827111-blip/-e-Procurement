<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <article class="eds-record">
    <div class="eds-disclosure-head">
      <strong>{{ title }}</strong>
      <div v-if="$slots.actions" class="eds-actions">
        <slot name="actions" />
      </div>
    </div>
    <p v-if="description" class="eds-meta">{{ description }}</p>
    <slot />
  </article>
</template>
