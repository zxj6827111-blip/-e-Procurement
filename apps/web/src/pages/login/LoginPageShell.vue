<script setup lang="ts">
import { RouterLink } from "vue-router";
import AuditLogRef from "../../components/AuditLogRef.vue";
import ErrorAlert from "../../components/ErrorAlert.vue";
import PasswordLoginPanel from "./PasswordLoginPanel.vue";
import { useLoginPage } from "./useLoginPage";

const state = useLoginPage();
</script>

<template>
  <section class="enterprise-login-layout g-hotel-login">
    <div class="enterprise-login-brand g-hotel-login-brand">
      <div class="g-hotel-brand-lockup">
        <span class="g-hotel-shield" aria-hidden="true">盾</span>
        <strong>G-HOTEL GROUP</strong>
      </div>
      <div class="g-hotel-login-message">
        <h1>数字驱动采购<br />阳光护航未来</h1>
        <p>集团内部采购规范化平台，为您提供全流程、可追溯、安全高效的供应链管理与招标采购服务。</p>
      </div>
      <footer>© 2026 G-Hotel Group. All rights reserved.</footer>
    </div>

    <div class="enterprise-login-card g-hotel-login-card">
      <div class="eds-login-card-title g-hotel-login-title">
        <h2>欢迎登录</h2>
        <p>请输入您的账号密码进入系统工作台</p>
      </div>

      <PasswordLoginPanel
        v-model:password="state.password.value"
        v-model:username="state.username.value"
        :loading="state.loading.value"
        @login="state.login"
      />

      <section v-if="state.showLocalAccess.value" class="g-hotel-role-accounts">
        <p>业务角色入口：</p>
        <div>
          <button
            v-for="row in state.demoUsers"
            :key="row.id"
            :data-user-id="row.id"
            type="button"
            :class="{ active: row.id === state.selectedUserId.value }"
            @click="state.selectDemoUser(row.id)"
          >
            {{ row.role }}
          </button>
        </div>
        <small>* 选择业务角色后将自动填入账号信息</small>
      </section>

      <ErrorAlert v-if="state.error.value" :message="state.error.value" />
      <AuditLogRef :audit-log-id="state.auditLogId.value" />

      <footer class="enterprise-login-footer g-hotel-login-links">
        <span>平台操作手册请登录后在文件中心查看</span>
        <RouterLink to="/supplier-onboarding-register">供应商入驻</RouterLink>
        <span>技术支持由系统管理员受理</span>
      </footer>
    </div>
  </section>
</template>
