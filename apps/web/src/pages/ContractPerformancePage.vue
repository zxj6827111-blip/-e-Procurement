<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useSessionStore } from "../stores/session";

const session = useSessionStore();
const summary = computed(() => {
  const roleLabels: Record<string, string> = {
    group_manager: "集团采购管理人",
    buyer: "采购经办人",
    supplier: "供应商",
    auditor: "纪检 / 审计"
  };
  return roleLabels[session.roleId] ?? "当前角色";
});
</script>

<template>
  <section class="panel">
    <h2>履约与结算入口说明</h2>
    <p>
      采购订单、收货验收、异常处理、供应商评价、结算资料上传与档案归集统一收口到项目工作台，
      当前页面仅保留为导航说明，避免 UAT 期间出现两套业务入口。
    </p>

    <div class="stack-item">
      <strong>{{ summary }}</strong>
      <span>请从项目工作台进入具体项目，再完成履约、结算资料和归档相关操作。</span>
    </div>

    <div class="actions">
      <RouterLink class="button-link" to="/project-workbench">进入项目工作台</RouterLink>
    </div>
  </section>
</template>
