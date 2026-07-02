<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseButton } from "../components/base";

export interface AppShellNavItem {
  label: string;
  to: string;
}

defineProps<{
  brandTitle: string;
  brandSubtitle: string;
  brandMark: string;
  pageTitle: string;
  contextLabel: string;
  userLabel: string;
  navItems: AppShellNavItem[];
  utilityItems?: AppShellNavItem[];
}>();

const emit = defineEmits<{
  logout: [];
}>();
</script>

<template>
  <div class="enterprise-shell">
    <aside class="enterprise-sidebar">
      <div class="enterprise-brand">
        <span class="enterprise-brand-mark">{{ brandMark }}</span>
        <div>
          <strong>{{ brandTitle }}</strong>
          <small>{{ brandSubtitle }}</small>
        </div>
      </div>

      <nav class="enterprise-nav" aria-label="业务导航">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to">{{ item.label }}</RouterLink>
      </nav>
    </aside>

    <section class="enterprise-main">
      <header class="enterprise-topbar">
        <div>
          <p>{{ contextLabel }}</p>
          <h1>{{ pageTitle }}</h1>
        </div>
        <div class="enterprise-topbar-actions">
          <RouterLink v-for="item in utilityItems" :key="item.to" class="enterprise-utility-link" :to="item.to">
            {{ item.label }}
          </RouterLink>
          <span class="enterprise-user-pill">{{ userLabel }}</span>
          <EnterpriseButton @click="emit('logout')">退出</EnterpriseButton>
        </div>
      </header>

      <main class="enterprise-content">
        <slot />
      </main>
    </section>
  </div>
</template>
