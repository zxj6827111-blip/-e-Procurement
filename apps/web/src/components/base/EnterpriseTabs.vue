<script setup lang="ts">
const props = defineProps<{
  tabs: Array<{ key: string; label: string }>;
  activeKey: string;
}>();

const emit = defineEmits<{
  change: [key: string];
}>();

function changeTab(key: string) {
  emit("change", key);
}

function focusTab(event: KeyboardEvent, index: number) {
  const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  buttons?.[index]?.focus();
  changeTab(props.tabs[index].key);
}

function handleKeydown(event: KeyboardEvent, index: number) {
  if (props.tabs.length === 0) return;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    focusTab(event, (index + 1) % props.tabs.length);
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    focusTab(event, (index - 1 + props.tabs.length) % props.tabs.length);
  }
  if (event.key === "Home") {
    event.preventDefault();
    focusTab(event, 0);
  }
  if (event.key === "End") {
    event.preventDefault();
    focusTab(event, props.tabs.length - 1);
  }
}
</script>

<template>
  <div class="eds-tabs" role="tablist">
    <button
      v-for="(tab, index) in tabs"
      :key="tab.key"
      type="button"
      role="tab"
      :aria-selected="tab.key === activeKey"
      :tabindex="tab.key === activeKey ? 0 : -1"
      :class="['eds-tab', tab.key === activeKey ? 'active' : '']"
      @click="changeTab(tab.key)"
      @keydown="handleKeydown($event, index)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
