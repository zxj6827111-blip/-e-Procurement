<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useRouter } from "vue-router";
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
const loading = ref(false);

const users = [
  { id: "u1", role: "集团采购管理", org: "集团采购管理部", summary: "发布集团采购需求、组织评审定标" },
  { id: "u2", role: "采购经办", org: "华东区域公司", summary: "采购执行、供应商准入、订单履约" },
  { id: "u8", role: "酒店采购", org: "上海滨江华礼酒店", summary: "商品目录、采购申请、到货验收" },
  { id: "u11", role: "供应商管理员", org: "上海棉织供应链有限公司", summary: "报价响应、商品维护、订单履约" },
  { id: "u9", role: "酒店财务", org: "上海滨江华礼酒店", summary: "发票审核、付款状态、结算资料" },
  { id: "u7", role: "专家", org: "集团评审专家库", summary: "查看评审资料、提交专家评分" },
  { id: "u5", role: "审计监督", org: "集团纪检审计部", summary: "项目档案、日志监督、异常核查" },
  { id: "u6", role: "系统管理员", org: "集团信息中心", summary: "权限与基础配置" }
] as const;

const selectedUser = computed(() => users.find((item) => item.id === selectedUserId.value) ?? users[0]);

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

function defaultRoute(roleId: string) {
  return roleDefaultRoutes[roleId] ?? "/";
}

function postLoginRoute(roleId: string, passwordChangeRequired?: boolean) {
  if (passwordChangeRequired && ["supplier", "supplier_admin", "supplier_quotation"].includes(roleId)) return "/account-security";
  return defaultRoute(roleId);
}

async function login() {
  error.value = "";
  loading.value = true;
  try {
    const data = await session.login(username.value, password.value);
    auditLogId.value = data.auditLogId ?? "";
    await router.replace(postLoginRoute(data.roleId, data.passwordChangeRequired));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "登录失败";
    auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
  } finally {
    loading.value = false;
  }
}

async function enterDemo() {
  error.value = "";
  loading.value = true;
  try {
    const data = await session.demoLogin(selectedUserId.value);
    auditLogId.value = data.auditLogId ?? "";
    await router.replace(postLoginRoute(data.roleId, data.passwordChangeRequired));
  } catch (err) {
    error.value = err instanceof Error ? err.message : "账号进入失败";
    auditLogId.value = String((err as { auditLogId?: string }).auditLogId ?? "");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void session.loadAuthProviders().catch(() => {
    session.mockAuthEnabled = false;
  });
});
</script>

<template>
  <section class="login-card">
    <div class="login-brand">
      <span class="brand-mark">采</span>
      <div>
        <strong>酒店供应链采购平台</strong>
        <small>供应商准入、商品集采、履约结算一体化</small>
      </div>
    </div>

    <div class="login-main">
      <div>
        <p class="eyebrow">账号登录</p>
        <h1>进入采购业务系统</h1>
      </div>

      <div class="login-secondary-actions">
        <span>供应商首次入驻可先提交企业资料，集团审核通过后再参与采购项目。</span>
        <RouterLink class="secondary-button" to="/supplier-onboarding-register">供应商注册</RouterLink>
      </div>

      <div v-if="session.mockAuthEnabled" class="demo-entry">
        <div class="demo-grid">
          <button
            v-for="user in users"
            :key="user.id"
            type="button"
            class="demo-account"
            :class="{ selected: selectedUserId === user.id }"
            @click="selectedUserId = user.id"
          >
            <strong>{{ user.role }}</strong>
            <span>{{ user.org }}</span>
            <small>{{ user.summary }}</small>
          </button>
        </div>
        <button type="button" class="primary-wide" :disabled="loading" @click="enterDemo">
          以{{ selectedUser.role }}身份进入
        </button>
      </div>

      <details class="password-login" open>
        <summary>账号密码登录</summary>
        <div class="form-grid">
          <label>
            账号
            <input v-model="username" autocomplete="username" />
          </label>
          <label>
            密码
            <input v-model="password" type="password" autocomplete="current-password" />
          </label>
          <button type="button" :disabled="loading" @click="login">登录</button>
        </div>
      </details>
    </div>

    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </section>
</template>
