<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { EnterpriseButton } from "../components/base";

export interface AppShellNavItem {
  id?: string;
  label: string;
  to: string;
  description?: string;
}

export interface RoleSwitchOption {
  id: string;
  label: string;
}

const props = defineProps<{
  brandTitle: string;
  brandSubtitle: string;
  brandMark: string;
  homeTo: string;
  pageTitle: string;
  contextLabel: string;
  userLabel: string;
  navItems: AppShellNavItem[];
  utilityItems?: AppShellNavItem[];
  environmentLabel?: string;
  roleLabel?: string;
  roleSwitchEnabled?: boolean;
  roleSwitchOptions?: RoleSwitchOption[];
  selectedRoleSwitchId?: string;
  showMessageBell?: boolean;
  messageRoute?: string;
}>();

const emit = defineEmits<{
  logout: [];
  "update:selectedRoleSwitchId": [value: string];
  "switch-role": [value: string];
}>();

const activeRoleSwitchId = computed(() => props.selectedRoleSwitchId ?? props.roleSwitchOptions?.[0]?.id ?? "");
const accountUtilityItems = computed(() => props.utilityItems ?? []);

function onRoleSwitchChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit("update:selectedRoleSwitchId", value);
  emit("switch-role", value);
}
</script>

<template>
  <div class="enterprise-shell">
    <header class="enterprise-topbar">
      <div class="enterprise-topbar-brand-group">
        <RouterLink class="enterprise-topbar-brand" :to="homeTo">
          <span class="enterprise-brand-mark">{{ brandMark }}</span>
          <span class="enterprise-brand-copy">
            <strong>{{ brandTitle }}</strong>
            <small>{{ brandSubtitle }}</small>
          </span>
        </RouterLink>
      </div>

      <div class="enterprise-topbar-context">
        <span class="enterprise-context-chip">{{ contextLabel }}</span>
        <strong>{{ pageTitle }}</strong>
      </div>

      <div class="enterprise-topbar-actions">
        <label v-if="roleSwitchEnabled && roleSwitchOptions?.length" class="enterprise-role-switch">
          <span>角色切换</span>
          <select :value="activeRoleSwitchId" @change="onRoleSwitchChange">
            <option v-for="option in roleSwitchOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>

        <RouterLink v-if="showMessageBell && messageRoute" class="enterprise-bell-button" :to="messageRoute" aria-label="消息中心">
          <span class="enterprise-bell-dot" aria-hidden="true"></span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3.5a4.25 4.25 0 0 0-4.25 4.25v1.2c0 1.72-.63 3.38-1.77 4.66l-.91 1.02a1 1 0 0 0 .75 1.67h12.36a1 1 0 0 0 .75-1.67l-.91-1.02a7 7 0 0 1-1.77-4.66v-1.2A4.25 4.25 0 0 0 12 3.5Zm0 17.25a2.63 2.63 0 0 0 2.35-1.45H9.65A2.63 2.63 0 0 0 12 20.75Z"
              fill="currentColor"
            />
          </svg>
        </RouterLink>

        <details class="enterprise-account-menu">
          <summary class="enterprise-user-pill">
            <span class="enterprise-avatar">{{ userLabel.slice(0, 1) }}</span>
            <span class="enterprise-user-copy">
              <strong>{{ userLabel }}</strong>
              <small>{{ roleLabel }}</small>
            </span>
          </summary>

          <div class="enterprise-account-popover">
            <span v-if="roleLabel" class="enterprise-role-badge">{{ roleLabel }}</span>

            <RouterLink
              v-for="item in accountUtilityItems"
              :key="item.to"
              class="enterprise-account-link"
              :to="item.to"
            >
              {{ item.label }}
            </RouterLink>

            <EnterpriseButton @click="emit('logout')">退出登录</EnterpriseButton>
          </div>
        </details>
      </div>
    </header>

    <aside class="enterprise-sidebar">
      <nav class="enterprise-nav" aria-label="业务导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.id ?? `${item.to}-${item.label}`"
          class="enterprise-nav-item"
          :to="item.to"
        >
          <span class="enterprise-nav-label">{{ item.label }}</span>
          <span v-if="item.description" class="enterprise-nav-description">{{ item.description }}</span>
        </RouterLink>
      </nav>

      <footer class="enterprise-sidebar-footer">
        <span v-if="environmentLabel" class="enterprise-environment-badge">{{ environmentLabel }}</span>
      </footer>
    </aside>

    <section class="enterprise-main">
      <main class="enterprise-content">
        <slot />
      </main>
    </section>
  </div>
</template>
