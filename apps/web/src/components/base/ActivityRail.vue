<script setup lang="ts">
defineProps<{
  items: Array<{ title: string; description?: string; time?: string }>;
}>();
</script>

<template>
  <div class="eds-activity-rail">
    <div v-for="(item, index) in items" :key="`${item.title}-${index}`" class="eds-step-item">
      <span class="eds-step-index">{{ index + 1 }}</span>
      <div>
        <strong>{{ item.title }}</strong>
        <p v-if="item.description || item.time" class="eds-meta">{{ item.description }}<span v-if="item.description && item.time"> / </span>{{ item.time }}</p>
      </div>
    </div>
  </div>
</template>
