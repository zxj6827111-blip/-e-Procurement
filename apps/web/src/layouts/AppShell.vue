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

export interface ShellNotificationItem {
  id: string;
  title: string;
  summary: string;
  to: string;
  unread: boolean;
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
  notificationItems?: ShellNotificationItem[];
  globalTitle?: string;
}>();

const emit = defineEmits<{
  logout: [];
  "update:selectedRoleSwitchId": [value: string];
  "switch-role": [value: string];
}>();

const activeRoleSwitchId = computed(() => props.selectedRoleSwitchId ?? props.roleSwitchOptions?.[0]?.id ?? "");
const accountUtilityItems = computed(() => props.utilityItems ?? []);
const notificationRoute = computed(() => props.messageRoute ?? "/messages");
const visibleNotifications = computed(() => (props.notificationItems ?? []).slice(0, 2));
const unreadNotificationCount = computed(() => (props.notificationItems ?? []).filter((item) => item.unread).length);

function navIconPath(item: AppShellNavItem) {
  const key = item.id ?? item.label;
  if (/task|myTasks|approval|Rule|audit|archive/i.test(key)) return "M7 4h10M7 8h10M7 12h6M5 4h.01M5 8h.01M5 12h.01M9 18l2 2 4-5";
  if (/project|procurement|bid|bidding|award|review|scoring/i.test(key)) return "M4 6h16M6 6v14h12V6M8 10h8M8 14h5";
  if (/supplier|mall|order|settlement|payment|finance/i.test(key)) return "M4 8h16l-2 10H6L4 8Zm3-4h10l3 4H4l3-4Zm2 8h6";
  if (/integration|module|permission|system|admin/i.test(key)) return "M12 3v4M12 17v4M4.2 7.5l3.5 2M16.3 14l3.5 2M19.8 7.5l-3.5 2M7.7 14l-3.5 2M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z";
  return "M4 5h7v7H4V5Zm9 0h7v7h-7V5ZM4 14h7v5H4v-5Zm9 0h7v5h-7v-5Z";
}

function onRoleSwitchChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit("update:selectedRoleSwitchId", value);
  emit("switch-role", value);
}
</script>

<template>
  <div class="enterprise-shell">
    <div class="enterprise-globalbar">
      <span>{{ globalTitle || "G-Hotel Enterprise Procurement Platform" }}</span>
    </div>

    <aside class="enterprise-sidebar">
      <div class="enterprise-topbar-brand-group">
        <RouterLink class="enterprise-topbar-brand" :to="homeTo">
          <span class="enterprise-brand-mark">{{ brandMark }}</span>
          <span class="enterprise-brand-copy">
            <strong>{{ brandTitle }}</strong>
            <small>{{ brandSubtitle }}</small>
          </span>
        </RouterLink>
      </div>

      <div class="enterprise-sidebar-role">
        <strong>{{ roleLabel || contextLabel }}</strong>
        <span>{{ userLabel }}</span>
      </div>

      <nav class="enterprise-nav" aria-label="业务导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.id ?? `${item.to}-${item.label}`"
          class="enterprise-nav-item"
          :to="item.to"
        >
          <span class="enterprise-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path :d="navIconPath(item)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
            </svg>
          </span>
          <span class="enterprise-nav-copy">
            <span class="enterprise-nav-label">{{ item.label }}</span>
            <span v-if="item.description" class="enterprise-nav-description">{{ item.description }}</span>
          </span>
        </RouterLink>
      </nav>

      <footer class="enterprise-sidebar-footer">
        <span v-if="environmentLabel" class="enterprise-environment-badge">{{ environmentLabel }}</span>
      </footer>
    </aside>

    <header class="enterprise-topbar">
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

        <details v-if="showMessageBell && messageRoute" class="enterprise-notification-menu">
          <summary aria-label="消息通知菜单">
            <RouterLink class="enterprise-bell-button" :to="notificationRoute" aria-label="消息中心" @click.stop>
              <span v-if="unreadNotificationCount" class="enterprise-bell-dot" aria-hidden="true"></span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 3.5a4.25 4.25 0 0 0-4.25 4.25v1.2c0 1.72-.63 3.38-1.77 4.66l-.91 1.02a1 1 0 0 0 .75 1.67h12.36a1 1 0 0 0 .75-1.67l-.91-1.02a7 7 0 0 1-1.77-4.66v-1.2A4.25 4.25 0 0 0 12 3.5Zm0 17.25a2.63 2.63 0 0 0 2.35-1.45H9.65A2.63 2.63 0 0 0 12 20.75Z"
                  fill="currentColor"
                />
              </svg>
            </RouterLink>
          </summary>
          <div class="enterprise-notification-popover">
            <header>
              <strong>消息通知</strong>
              <RouterLink :to="notificationRoute">全部消息</RouterLink>
            </header>
            <RouterLink
              v-for="item in visibleNotifications"
              :key="item.id"
              class="enterprise-notification-item"
              :to="item.to"
            >
              <span>{{ item.title }}</span>
              <small>{{ item.summary }}</small>
            </RouterLink>
            <RouterLink v-if="!visibleNotifications.length" class="enterprise-notification-item" :to="notificationRoute">
              <span>暂无未读消息</span>
              <small>进入消息中心查看历史通知和业务提醒。</small>
            </RouterLink>
          </div>
        </details>

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

    <section class="enterprise-main">
      <main class="enterprise-content">
        <slot />
      </main>
    </section>
  </div>
</template>
