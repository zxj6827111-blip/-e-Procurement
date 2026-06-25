<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { apiGet } from "../api/http";
import WorkflowSurfaceSummary from "../components/WorkflowSurfaceSummary.vue";
import { useSessionStore } from "../stores/session";

const health = ref("检查中");
const projectCount = ref(0);
const auditCount = ref(0);
const session = useSessionStore();
const roleLabels: Record<string, string> = {
  group_manager: "集团采购管理人",
  buyer: "采购经办人",
  supplier: "供应商",
  expert: "专家",
  auditor: "纪检 / 审计",
  admin: "系统管理员"
};

function canReadAuditLogs(roleId: string) {
  return ["group_manager", "buyer", "hotel_buyer", "hotel_finance", "platform_operator", "finance_reviewer", "auditor"].includes(roleId);
}

function canReadProjects(roleId: string) {
  return ["group_manager", "buyer", "hotel_buyer", "platform_operator", "auditor"].includes(roleId);
}

async function loadDashboard() {
  const healthData = await apiGet<{ status: string }>("/health").catch(() => ({ status: "unavailable" }));
  health.value = healthData.status === "ok" ? "正常" : healthData.status;

  if (!session.roleId) {
    projectCount.value = 0;
    auditCount.value = 0;
    return;
  }

  const [projects, auditLogs] = await Promise.all([
    canReadProjects(session.roleId) ? apiGet<{ projects: unknown[] }>("/api/projects").catch(() => ({ projects: [] })) : Promise.resolve({ projects: [] }),
    canReadAuditLogs(session.roleId) ? apiGet<{ auditLogs: unknown[] }>("/api/audit-logs").catch(() => ({ auditLogs: [] })) : Promise.resolve({ auditLogs: [] })
  ]);
  projectCount.value = projects.projects.length;
  auditCount.value = auditLogs.auditLogs.length;
}

onMounted(() => {
  void loadDashboard();
});

watch(
  () => session.roleId,
  () => {
    void loadDashboard();
  }
);
</script>

<template>
  <section class="panel">
    <h2>集团采购驾驶舱</h2>
    <div class="metrics">
      <div><strong>{{ health }}</strong><span>系统服务状态</span></div>
      <div><strong>{{ projectCount }}</strong><span>当前角色可见项目</span></div>
      <div><strong>{{ auditCount }}</strong><span>审计留痕记录</span></div>
      <div><strong>{{ roleLabels[session.roleId] || "-" }}</strong><span>当前权限视角</span></div>
    </div>
    <p class="notice">页面数据按当前登录角色过滤，覆盖采购、报价、评审、履约和监督主链路。</p>
  </section>

  <WorkflowSurfaceSummary v-if="session.roleId !== 'admin'" title="今日待办与站内消息" />
</template>
