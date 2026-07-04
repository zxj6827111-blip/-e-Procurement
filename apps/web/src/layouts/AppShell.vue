<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { EnterpriseButton } from "../components/base";

export interface AppShellNavItem {
  label: string;
  to: string;
  group?: string;
  icon?: string;
  description?: string;
  priority?: number;
}

const props = defineProps<{
  brandTitle: string;
  brandSubtitle: string;
  brandMark: string;
  pageTitle: string;
  contextLabel: string;
  userLabel: string;
  navItems: AppShellNavItem[];
  utilityItems?: AppShellNavItem[];
  environmentLabel?: string;
  roleLabel?: string;
  roleSwitchEnabled?: boolean;
}>();

const emit = defineEmits<{
  logout: [];
}>();

const navGroups = computed(() => {
  const order = ["工作", "采购", "供应商", "履约结算", "审计与配置"];
  const grouped = new Map<string, AppShellNavItem[]>();
  for (const item of props.navItems) {
    const group = item.group ?? "工作";
    grouped.set(group, [...(grouped.get(group) ?? []), item]);
  }
  return [...grouped.entries()]
    .map(([group, items]) => ({
      group,
      items: [...items].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || a.label.localeCompare(b.label))
    }))
    .sort((a, b) => {
      const left = order.indexOf(a.group);
      const right = order.indexOf(b.group);
      return (left < 0 ? 999 : left) - (right < 0 ? 999 : right);
    });
});
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
        <section v-for="group in navGroups" :key="group.group" class="enterprise-nav-group">
          <p class="enterprise-nav-group-title">{{ group.group }}</p>
          <RouterLink v-for="item in group.items" :key="`${group.group}-${item.to}-${item.label}`" :to="item.to">
            <span class="enterprise-nav-copy">
              <span class="enterprise-nav-label">{{ item.label }}</span>
              <span v-if="item.description" class="enterprise-nav-description">{{ item.description }}</span>
            </span>
          </RouterLink>
        </section>
      </nav>

      <footer class="enterprise-sidebar-footer">
        <span v-if="environmentLabel" class="enterprise-environment-badge">{{ environmentLabel }}</span>
      </footer>
    </aside>

    <section class="enterprise-main">
      <header class="enterprise-topbar">
        <div class="enterprise-topbar-copy">
          <p class="enterprise-breadcrumb">{{ contextLabel }} / {{ pageTitle }}</p>
          <h1>{{ pageTitle }}</h1>
        </div>
        <div class="enterprise-topbar-actions">
          <RouterLink v-for="item in utilityItems" :key="item.to" class="enterprise-utility-link" :to="item.to">
            {{ item.label }}
          </RouterLink>
          <details class="enterprise-account-menu">
            <summary class="enterprise-user-pill">{{ userLabel }}</summary>
            <div class="enterprise-account-popover">
              <span v-if="roleLabel" class="enterprise-role-badge">{{ roleLabel }}</span>
              <RouterLink v-if="roleSwitchEnabled" class="enterprise-utility-link" to="/role-switch">
                切换验证角色
              </RouterLink>
              <EnterpriseButton @click="emit('logout')">退出登录</EnterpriseButton>
            </div>
          </details>
        </div>
      </header>

      <main class="enterprise-content">
        <slot />
      </main>
    </section>
  </div>
</template>
