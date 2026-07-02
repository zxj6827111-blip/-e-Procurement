<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="eds-dialog-backdrop" role="presentation" @click.self="emit('close')">
      <section class="eds-dialog" role="dialog" aria-modal="true" :aria-label="title">
        <header class="eds-page-header">
          <div>
            <h3>{{ title }}</h3>
          </div>
          <div class="eds-actions">
            <button type="button" class="eds-dialog-close" aria-label="关闭" @click="emit('close')">×</button>
          </div>
        </header>
        <slot />
        <footer v-if="$slots.actions" class="eds-submit-panel">
          <slot name="actions" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>
