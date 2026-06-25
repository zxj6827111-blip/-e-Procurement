<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>

<template>
  <div class="error-alert" role="alert">
    {{ message }}
  </div>
</template>
