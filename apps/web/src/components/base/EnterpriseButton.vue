<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "primary" | "default" | "text";
    nativeType?: "button" | "submit" | "reset";
    disabled?: boolean;
  }>(),
  {
    type: "default",
    nativeType: "button",
    disabled: false
  }
);
</script>

<template>
  <button
    :type="nativeType"
    :disabled="disabled"
    :class="['eds-button', type === 'primary' ? 'eds-button-primary' : '', type === 'text' ? 'eds-button-text' : '']"
  >
    <slot />
  </button>
</template>
