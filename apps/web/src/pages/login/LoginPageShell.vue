<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { FeedbackMessage, StatusTag } from "../../components/base";
import DemoAccountTable from "./DemoAccountTable.vue";
import PasswordLoginPanel from "./PasswordLoginPanel.vue";
import SupplierEntryPanel from "./SupplierEntryPanel.vue";
import { useLoginPage } from "./useLoginPage";

const state = useLoginPage();
</script>

<template>
  <section class="enterprise-login-layout">
    <div class="enterprise-login-brand">
      <StatusTag tone="warning">{{ state.environmentLabel.value }}</StatusTag>
      <h1>集团阳光采购与供应链协同平台</h1>
      <p>覆盖需求、采购、评审、履约、结算和审计追溯，面向集团、酒店、供应商、专家、财务与审计岗位提供统一业务入口。</p>
      <div class="enterprise-login-proof">
        <div class="enterprise-login-proof-item">
          <strong>全流程</strong>
          <span>采购闭环和责任人可追溯</span>
        </div>
        <div class="enterprise-login-proof-item">
          <strong>强隔离</strong>
          <span>供应商、专家、审计边界清晰</span>
        </div>
        <div class="enterprise-login-proof-item">
          <strong>可审计</strong>
          <span>关键操作留痕并可复核</span>
        </div>
      </div>
    </div>

    <div class="enterprise-login-card">
      <PasswordLoginPanel
        v-model:password="state.password.value"
        v-model:username="state.username.value"
        :loading="state.loading.value"
        @login="state.login"
      />

      <SupplierEntryPanel />

      <FeedbackMessage v-if="state.showLocalAccess.value" tone="warning">
        本地验证入口仅用于试用和流程检查，生产环境不会展示角色快捷进入。
      </FeedbackMessage>

      <DemoAccountTable
        v-if="state.showLocalAccess.value"
        :loading="state.loading.value"
        :rows="state.demoUsers"
        :selected-user-id="state.selectedUserId.value"
        @enter="state.enterDemo"
        @select="state.selectDemoUser"
      />

      <ErrorAlert v-if="state.error.value" :message="state.error.value" />
      <AuditLogRef :audit-log-id="state.auditLogId.value" />

      <footer class="enterprise-login-footer">
        <span>版本：local-build</span>
        <span>{{ state.environmentLabel.value }}</span>
        <span>技术支持：集团信息中心</span>
      </footer>
    </div>
  </section>
</template>
