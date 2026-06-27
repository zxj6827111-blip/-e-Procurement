<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";

const session = useSessionStore();
const router = useRouter();
const nextUserId = ref("u1");
const error = ref("");
const auditLogId = ref("");
const enabled = computed(() => session.mockAuthEnabled);

const roleDefaultRoutes: Record<string, string> = {
  group_manager: "/",
  buyer: "/",
  hotel_buyer: "/supply-mall",
  supplier: "/",
  platform_operator: "/supply-mall",
  supplier_admin: "/",
  supplier_quotation: "/bidding",
  expert: "/expert-scoring",
  hotel_finance: "/",
  finance_reviewer: "/",
  auditor: "/",
  admin: "/permissions"
};

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
</script>

<template>
  <section class="panel">
    <h2>账号入口</h2>
    <p v-if="enabled" class="notice">该页面仅保留为隐藏入口，正式业务导航不展示。</p>
    <p v-else>当前环境已禁用账号入口。</p>
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
        <option value="u14">供应商管理员 / 苏州洁雅</option>
        <option value="u15">供应商报价人员 / 苏州洁雅</option>
        <option value="u16">供应商管理员 / 杭州鲜达</option>
        <option value="u17">供应商报价人员 / 杭州鲜达</option>
        <option value="u7">专家</option>
        <option value="u13">财务审核</option>
        <option value="u5">纪检 / 审计</option>
        <option value="u6">系统管理员</option>
      </select>
      <button type="button" @click="switchRole">进入</button>
    </template>
    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </section>
</template>
