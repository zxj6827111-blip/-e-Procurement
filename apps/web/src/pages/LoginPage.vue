<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { apiPost } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";

const session = useSessionStore();
const router = useRouter();
const username = ref("u2");
const password = ref("pass-u2");
const selectedUserId = ref("u2");
const error = ref("");
const auditLogId = ref("");

const users = [
  ["u1", "集团采购管理人"],
  ["u2", "采购经办人"],
  ["u8", "酒店采购"],
  ["u9", "酒店财务"],
  ["u10", "平台运营"],
  ["u3", "供应商"],
  ["u11", "供应商管理员"],
  ["u12", "供应商报价人员"],
  ["u7", "专家"],
  ["u13", "财务审核"],
  ["u5", "纪检 / 审计"],
  ["u6", "系统管理员"]
];

async function login() {
  error.value = "";
  try {
    const data = await session.login(username.value, password.value);
    auditLogId.value = data.auditLogId ?? "";
    await router.replace("/");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "登录失败";
    auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
  }
}

async function mockLogin() {
  error.value = "";
  try {
    const data = await apiPost<{ user: { id: string; name: string; roleId: string }; auditLogId?: string }>("/api/auth/mock-login", { userId: selectedUserId.value }, selectedUserId.value);
    auditLogId.value = data.auditLogId ?? "";
    await session.loadMe(data.user.id);
    await router.replace("/");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Mock 登录失败";
    auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
  }
}
</script>

<template>
  <section class="panel">
    <h2>正式登录</h2>
    <p>当前版本默认使用本地账号和会话体系，后续可切换到集团 SSO 适配层。</p>
    <div class="form-grid">
      <label>
        账号
        <input v-model="username" />
      </label>
      <label>
        密码
        <input v-model="password" type="password" />
      </label>
      <button type="button" @click="login">登录</button>
    </div>

    <div v-if="session.mockAuthEnabled" class="stack-item">
      <h3>本地 Mock 登录</h3>
      <select v-model="selectedUserId">
        <option v-for="[id, label] in users" :key="id" :value="id">{{ label }} - {{ id }}</option>
      </select>
      <button type="button" @click="mockLogin">Mock 登录</button>
    </div>

    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </section>
</template>
