<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiGet } from "../api/http";
import { labelStatus } from "../utils/status-labels";

const menus = ref<string[]>([]);
const actions = ref<string[]>([]);
const users = ref<Array<{ id: string; name: string; roleId: string; orgId: string; status?: string; departmentId?: string; position?: string }>>([]);
const organizations = ref<Array<{ id: string; name: string }>>([]);
const approvalRules = ref<Array<{ id: string; ruleName: string; businessType: string; nodeRoleIds: string[]; actions: string[]; status: string; versionNo: number }>>([]);
const adminLoadError = ref("");

const menuLabels: Record<string, string> = {
  admin: "系统管理",
  config: "基础配置",
  dashboard: "集团采购驾驶舱",
  myTasks: "待办任务",
  procurement: "采购业务",
  supplier: "供应商管理"
};

const actionLabels: Record<string, string> = {
  "audit:read": "查看审计日志",
  "bid:read": "查看报价",
  "config:manage": "维护基础配置",
  "file:download": "下载文件",
  "file:upload": "上传文件",
  "project:maintain": "维护采购项目",
  "supplier:maintain": "维护供应商资料",
  apply: "提交申请",
  approve: "审批通过",
  audit_read: "审计查阅",
  reject: "驳回",
  request: "发起申请",
  return: "退回修改",
  submit: "提交"
};

const roleLabels: Record<string, string> = {
  admin: "系统管理员",
  auditor: "纪检 / 审计",
  buyer: "采购经办人",
  expert: "专家",
  group_manager: "集团采购管理人",
  supplier: "供应商",
  system: "系统账号"
};

const businessTypeLabels: Record<string, string> = {
  archive_supplement: "档案补档审批",
  award_approval: "定标审批",
  mall_order: "商城订单审批",
  price_approval: "价格审批",
  procurement_request: "采购需求审批"
};

function orgName(orgId: string) {
  return organizations.value.find((item) => item.id === orgId)?.name ?? "组织";
}

onMounted(async () => {
  menus.value = (await apiGet<{ menus: string[] }>("/api/me/menus")).menus;
  actions.value = (await apiGet<{ actions: string[] }>("/api/me/actions")).actions;
  approvalRules.value = (await apiGet<{ approvalRules: typeof approvalRules.value }>("/api/workflow/approval-rules")).approvalRules;
  organizations.value = (await apiGet<{ organizations: typeof organizations.value }>("/api/organizations").catch(() => ({ organizations: [] }))).organizations;
  try {
    users.value = (await apiGet<{ users: typeof users.value }>("/api/users")).users;
  } catch (error) {
    adminLoadError.value = (error as Error).message;
  }
});
</script>

<template>
  <section class="panel">
    <h2>权限与基础配置</h2>
    <p>当前页面展示后端返回的菜单和动作权限，用于核对系统管理员配置边界。</p>
    <div class="list">
      <span v-for="menu in menus" :key="menu">{{ menuLabels[menu] ?? labelStatus(menu) }}</span>
    </div>
    <h3>动作权限</h3>
    <div class="list">
      <span v-for="action in actions" :key="action">{{ actionLabels[action] ?? action }}</span>
    </div>
  </section>

  <section class="panel">
    <h2>审批规则</h2>
    <table>
      <thead>
        <tr>
          <th>规则</th>
          <th>业务类型</th>
          <th>节点角色</th>
          <th>动作</th>
          <th>状态</th>
          <th>版本</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="rule in approvalRules" :key="rule.id">
          <td>{{ rule.ruleName }}</td>
          <td>{{ businessTypeLabels[rule.businessType] ?? labelStatus(rule.businessType) }}</td>
          <td>{{ rule.nodeRoleIds.map((role) => roleLabels[role] ?? role).join(" / ") }}</td>
          <td>{{ rule.actions.map((action) => actionLabels[action] ?? action).join(" / ") }}</td>
          <td>{{ labelStatus(rule.status) }}</td>
          <td>{{ rule.versionNo }}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section v-if="users.length || adminLoadError" class="panel">
    <h2>组织账号</h2>
    <p v-if="adminLoadError">当前角色只能查看个人权限和审批规则，账号维护由系统管理员处理。</p>
    <table v-else>
      <thead>
        <tr>
          <th>人员</th>
          <th>角色</th>
          <th>组织</th>
          <th>部门</th>
          <th>岗位</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.name }}</td>
          <td>{{ roleLabels[user.roleId] ?? labelStatus(user.roleId) }}</td>
          <td>{{ orgName(user.orgId) }}</td>
          <td>{{ user.departmentId ?? "-" }}</td>
          <td>{{ user.position ?? "-" }}</td>
          <td>{{ labelStatus(user.status ?? "active") }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
