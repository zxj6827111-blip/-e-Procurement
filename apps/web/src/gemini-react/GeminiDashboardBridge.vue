<script setup lang="ts">
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { GeminiDashboardApp, type GeminiDashboardProps } from "./GeminiDashboardApp";

const props = defineProps<GeminiDashboardProps>();

const host = ref<HTMLElement | null>(null);
let root: Root | null = null;

function renderReactApp() {
  if (!host.value) return;
  if (!root) root = createRoot(host.value);
  root.render(
    React.createElement(GeminiDashboardApp, {
      userName: props.userName,
      roleLabel: props.roleLabel,
      organization: props.organization,
      navItems: props.navItems,
      quickActions: props.quickActions,
      todoRows: props.todoRows,
      updatedAt: props.updatedAt,
      kpis: props.kpis,
      canResetRuntimeData: props.canResetRuntimeData,
      resettingData: props.resettingData,
      resetMessage: props.resetMessage,
      onResetRuntimeData: props.onResetRuntimeData,
      onNavigate: props.onNavigate,
      onLogout: props.onLogout
    })
  );
}

onMounted(renderReactApp);

watch(
  () => [
    props.userName,
    props.roleLabel,
    props.organization,
    props.updatedAt,
    props.navItems,
    props.quickActions,
    props.todoRows,
    props.kpis.todo,
    props.kpis.quoteDeadline,
    props.kpis.review,
    props.kpis.abnormal,
    props.canResetRuntimeData,
    props.resettingData,
    props.resetMessage
  ],
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
