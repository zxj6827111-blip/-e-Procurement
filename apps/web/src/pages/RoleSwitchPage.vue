<script setup lang="ts">
import { computed, ref } from "vue";
import { apiPost, setCurrentMockUserId } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";

const session = useSessionStore();
const nextUserId = ref("u1");
const error = ref("");
const auditLogId = ref("");
const enabled = computed(() => session.mockAuthEnabled);

async function switchRole() {
  error.value = "";
  try {
    const data = await apiPost<{ user: { id: string; name: string; roleId: string }; auditLogId?: string }>("/api/me/mock-role-switch", { userId: nextUserId.value }, nextUserId.value);
    auditLogId.value = data.auditLogId ?? "";
    setCurrentMockUserId(data.user.id);
    localStorage.setItem("mockUserId", data.user.id);
    localStorage.setItem("mockAuthEnabled", "true");
    await session.loadMe(data.user.id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "角色切换失败";
    auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
  }
}
</script>

<template>
  <section class="panel">
    <h2>角色切换</h2>
    <p v-if="enabled">仅供本地测试环境验证权限隔离，不属于正式运行路径。</p>
    <p v-else>当前环境已禁用 Mock 角色切换。</p>
    <template v-if="enabled">
      <select v-model="nextUserId">
        <option value="u1">集团采购管理人员</option>
        <option value="u2">采购经办人</option>
        <option value="u8">酒店采购</option>
        <option value="u9">酒店财务</option>
        <option value="u10">平台运营</option>
        <option value="u3">供应商</option>
        <option value="u11">供应商管理员</option>
        <option value="u12">供应商报价人员</option>
        <option value="u7">专家</option>
        <option value="u13">财务审核</option>
        <option value="u5">纪检 / 审计</option>
        <option value="u6">系统管理员</option>
      </select>
      <button type="button" @click="switchRole">切换</button>
    </template>
    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </section>
</template>
