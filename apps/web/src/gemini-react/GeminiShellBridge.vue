<script setup lang="ts">
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { GeminiShellApp, type GeminiShellAppProps } from "./GeminiShellApp";

const props = defineProps<GeminiShellAppProps>();

const host = ref<HTMLElement | null>(null);
let root: Root | null = null;

function renderReactApp() {
  if (!host.value) return;
  if (!root) root = createRoot(host.value);
  root.render(
    React.createElement(GeminiShellApp, {
      currentUser: props.currentUser,
      currentView: props.currentView,
      currentProjectId: props.currentProjectId,
      onViewChange: props.onViewChange,
      onProjectIdChange: props.onProjectIdChange,
      onLogout: props.onLogout
    })
  );
}

onMounted(renderReactApp);

watch(
  () => [props.currentUser, props.currentView, props.currentProjectId],
  renderReactApp,
  { deep: true }
);

onBeforeUnmount(() => {
  root?.unmount();
  root = null;
});
</script>

<template>
  <div ref="host" class="g-hotel-gemini-react-host"></div>
</template>

<style scoped>
.g-hotel-gemini-react-host {
  min-height: 100vh;
}
</style>
