<script setup lang="ts">
import { FeedbackMessage } from "./base";

defineProps<{
  message: string;
}>();
</script>

<template>
  <FeedbackMessage tone="error" role="alert">
    {{ message }}
  </FeedbackMessage>
</template>
