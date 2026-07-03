<script setup lang="ts">
defineProps<{
  steps: Array<{ title: string; description?: string; status?: string }>;
}>();
</script>

<template>
  <div class="eds-process-step-bar">
    <div v-for="(step, index) in steps" :key="`${step.title}-${index}`" class="eds-process-step">
      <span class="eds-process-step-index">{{ index + 1 }}</span>
      <div>
        <strong>{{ step.title }}</strong>
        <p v-if="step.description || step.status" class="eds-meta">{{ step.status ? `${step.status} / ` : "" }}{{ step.description }}</p>
      </div>
    </div>
  </div>
</template>
