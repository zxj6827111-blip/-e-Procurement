<script setup lang="ts">
defineProps<{
  steps: Array<{ title: string; description?: string; status?: string }>;
}>();
</script>

<template>
  <div class="eds-step-list">
    <div v-for="(step, index) in steps" :key="`${step.title}-${index}`" class="eds-step-item">
      <span class="eds-step-index">{{ index + 1 }}</span>
      <div>
        <strong>{{ step.title }}</strong>
        <p v-if="step.description || step.status" class="eds-meta">{{ step.status ? `${step.status} / ` : "" }}{{ step.description }}</p>
      </div>
    </div>
  </div>
</template>
