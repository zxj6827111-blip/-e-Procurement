<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { apiGet } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";

interface SwitchableUser {
  id: string;
  name: string;
  roleId: string;
  roleLabel: string;
  supplierId?: string;
  supplierName?: string;
}

const session = useSessionStore();
const router = useRouter();
const nextUserId = ref("u1");
const error = ref("");
const auditLogId = ref("");
const enabled = computed(() => session.mockAuthEnabled);
const switchableUsers = ref<SwitchableUser[]>([]);

const roleDefaultRoutes: Record<string, string> = {
  group_manager: "/",
  buyer: "/",
  hotel_buyer: "/",
  supplier: "/",
  platform_operator: "/",
  supplier_admin: "/",
  supplier_quotation: "/",
  expert: "/",
  hotel_finance: "/",
  finance_reviewer: "/",
  auditor: "/",
  admin: "/permissions"
};

const selectedUser = computed(() => switchableUsers.value.find((item) => item.id === nextUserId.value));

function accountLabel(user: SwitchableUser) {
  if (user.supplierName) return `${user.roleLabel} / ${user.supplierName}`;
  return `${user.roleLabel} / ${user.name}`;
}

async function loadSwitchableUsers() {
  if (!session.mockAuthEnabled) return;
  const data = await apiGet<{ users: SwitchableUser[] }>("/api/auth/mock-users");
  switchableUsers.value = data.users;
  if (!switchableUsers.value.some((item) => item.id === nextUserId.value)) {
    nextUserId.value = switchableUsers.value[0]?.id ?? "";
  }
}

async function switchRole() {
  error.value = "";
  try {
    const data = await session.demoLogin(nextUserId.value);
    auditLogId.value = data.auditLogId ?? "";
    await router.replace(roleDefaultRoutes[data.roleId] ?? "/");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "角色切换失败";
    auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
  }
}

onMounted(async () => {
  await session.loadAuthProviders();
  await loadSwitchableUsers().catch((err) => {
    error.value = err instanceof Error ? err.message : "账号列表加载失败";
  });
});
</script>

<template>
  <section class="panel">
    <h2>账号入口</h2>
    <p v-if="enabled" class="notice">该页面仅保留为隐藏入口，正式业务导航不展示。</p>
    <p v-else>当前环境已禁用账号入口。</p>
    <template v-if="enabled">
      <select v-model="nextUserId">
        <option v-for="user in switchableUsers" :key="user.id" :value="user.id">
          {{ accountLabel(user) }}
        </option>
      </select>
      <p v-if="selectedUser?.supplierName" class="notice">当前将进入：{{ selectedUser.supplierName }}，账号 {{ selectedUser.id }}</p>
      <button type="button" @click="switchRole">进入</button>
    </template>
    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </section>
</template>
