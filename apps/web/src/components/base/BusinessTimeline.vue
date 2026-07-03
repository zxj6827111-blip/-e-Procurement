<script setup lang="ts">
defineProps<{
  items: Array<{ title: string; description?: string; time?: string }>;
}>();
</script>

<template>
  <div class="eds-business-timeline">
    <div v-for="(item, index) in items" :key="`${item.title}-${index}`" class="eds-process-step">
      <span class="eds-process-step-index">{{ index + 1 }}</span>
      <div>
        <strong>{{ item.title }}</strong>
        <p v-if="item.description || item.time" class="eds-meta">{{ item.description }}<span v-if="item.description && item.time"> / </span>{{ item.time }}</p>
      </div>
    </div>
  </div>
</template>
