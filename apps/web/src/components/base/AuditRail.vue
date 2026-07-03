<script setup lang="ts">
defineProps<{
  items: Array<{ title: string; meta?: string; time?: string }>;
}>();
</script>

<template>
  <div class="eds-audit-rail">
    <div v-for="(item, index) in items" :key="`${item.title}-${index}`" class="eds-process-step">
      <span class="eds-process-step-index">{{ index + 1 }}</span>
      <div>
        <strong>{{ item.title }}</strong>
        <p v-if="item.meta || item.time" class="eds-meta">{{ item.meta }}<span v-if="item.meta && item.time"> / </span>{{ item.time }}</p>
      </div>
    </div>
  </div>
</template>
