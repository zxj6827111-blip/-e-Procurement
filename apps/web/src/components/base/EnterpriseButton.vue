<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "primary" | "default" | "text" | "accent" | "danger";
    size?: "default" | "sm";
    nativeType?: "button" | "submit" | "reset";
    disabled?: boolean;
  }>(),
  {
    type: "default",
    size: "default",
    nativeType: "button",
    disabled: false
  }
);
</script>

<template>
  <button
    :type="nativeType"
    :disabled="disabled"
    :class="[
      'eds-button',
      type === 'primary' ? 'eds-button-primary' : '',
      type === 'text' ? 'eds-button-text' : '',
      type === 'accent' ? 'eds-button-accent' : '',
      type === 'danger' ? 'eds-button-danger' : '',
      size === 'sm' ? 'eds-button-sm' : ''
    ]"
  >
    <slot />
  </button>
</template>
