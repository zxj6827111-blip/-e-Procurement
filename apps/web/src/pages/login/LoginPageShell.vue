<script setup lang="ts">
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import { FeedbackMessage, StatusTag } from "../../components/base";
import DemoAccountTable from "./DemoAccountTable.vue";
import PasswordLoginPanel from "./PasswordLoginPanel.vue";
import { useLoginPage } from "./useLoginPage";

const state = useLoginPage();
</script>

<template>
  <section class="enterprise-login-layout">
    <div class="enterprise-login-brand">
      <StatusTag tone="primary">{{ state.environmentLabel.value }}</StatusTag>
      <h1>酒店供应链采购平台</h1>
      <p v-if="state.showLocalAccess.value">面向酒店集团采购、评审、履约与结算的内部协同入口。正式环境接入统一身份认证，本地和 UAT 环境用于岗位验证。</p>
      <p v-else>面向酒店集团采购、评审、履约与结算的内部协同入口。正式环境接入统一身份认证，请通过集团身份系统进入。</p>
      <div class="enterprise-login-proof">
        <div class="enterprise-login-proof-item">
          <strong>采购申请</strong>
          <span>需求、预算、审批、立项</span>
        </div>
        <div class="enterprise-login-proof-item">
          <strong>供应商报价</strong>
          <span>报名、报价、截标、履约</span>
        </div>
        <div class="enterprise-login-proof-item">
          <strong>专家评审</strong>
          <span>抽取、评分、定标、追溯</span>
        </div>
      </div>
    </div>

    <div class="enterprise-login-card">
      <div class="eds-login-card-title eds-page-header">
        <h2>登录采购平台</h2>
        <p v-if="state.showLocalAccess.value">正式环境使用统一身份认证；本地和 UAT 可选择验证角色。</p>
        <p v-else>正式环境使用统一身份认证，岗位权限由集团身份系统下发。</p>
      </div>

      <PasswordLoginPanel
        v-model:password="state.password.value"
        v-model:username="state.username.value"
        :loading="state.loading.value"
        @login="state.login"
      />

      <FeedbackMessage v-if="state.showLocalAccess.value" tone="warning">
        本地和 UAT 环境提供岗位验证入口，用于检查首页、菜单和权限边界。
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
        <span>{{ state.environmentLabel.value }}</span>
        <span>技术支持：集团信息中心</span>
      </footer>
    </div>
  </section>
</template>
