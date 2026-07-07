<script setup lang="ts">
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ViewState } from "./shared/types";
import { SupplierOnboardingRegisterView } from "./features/views/SupplierOnboardingRegisterView";

const props = defineProps<{
  view: Extract<ViewState, "SUPPLIER_ONBOARDING">;
}>();

const host = ref<HTMLElement | null>(null);
let root: Root | null = null;

function renderReactView() {
  if (!host.value) return;
  if (!root) root = createRoot(host.value);

  const component = props.view === "SUPPLIER_ONBOARDING" ? SupplierOnboardingRegisterView : null;
  root.render(component ? React.createElement(component) : null);
}

onMounted(renderReactView);

watch(() => props.view, renderReactView);

onBeforeUnmount(() => {
  root?.unmount();
  root = null;
});
</script>

<template>
  <div ref="host" class="g-hotel-gemini-standalone-host"></div>
</template>

<style scoped>
.g-hotel-gemini-standalone-host {
  min-height: 100vh;
}
</style>
