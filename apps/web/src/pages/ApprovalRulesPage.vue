<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { loadApprovalRules, updateApprovalRule, type R8ApprovalBusinessType, type R8ApprovalRuleView } from "../api/workflow";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";
import { formatDateTime } from "../utils/status-labels";
import { r8BusinessTypeLabels } from "../../../api/src/workflow-ui-contract";

const session = useSessionStore();
const rules = ref<R8ApprovalRuleView[]>([]);
const loading = ref(false);
const error = ref("");
const auditLogId = ref("");
const busyRuleId = ref("");
const businessTypeFilter = ref<"all" | R8ApprovalBusinessType>("all");

const canMaintainRules = computed(() => session.roleId === "admin");
const readonlyReason = computed(() => {
  if (session.roleId === "admin") return "";
  if (session.roleId === "auditor") return "审计角色只读，可核对规则状态和版本，不可启停或编辑。";
  return "当前角色只允许查看授权范围内规则，不具备维护审批规则权限。";
});

const businessTypeOptions = computed(() => {
  const seen = new Set(rules.value.map((rule) => rule.businessType));
  return Array.from(seen).map((value) => ({ value, label: r8BusinessTypeLabels[value] ?? value }));
});

const filteredRules = computed(() => rules.value.filter((rule) => businessTypeFilter.value === "all" || rule.businessType === businessTypeFilter.value));

async function load() {
  loading.value = true;
  error.value = "";
  try {
    rules.value = await loadApprovalRules();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "审批规则加载失败";
    rules.value = [];
  } finally {
    loading.value = false;
  }
}

async function toggleRule(rule: R8ApprovalRuleView) {
  busyRuleId.value = rule.id;
  error.value = "";
  auditLogId.value = "";
  try {
    const result = await updateApprovalRule(rule.id, { status: rule.status === "enabled" ? "disabled" : "enabled" });
    auditLogId.value = result.auditLogId ?? "";
    await load();
  } catch (err) {
    const typed = err as Error & { auditLogId?: string };
    error.value = typed.message;
    auditLogId.value = typed.auditLogId ?? "";
  } finally {
    busyRuleId.value = "";
  }
}

onMounted(load);

watch(
  () => session.roleId,
  () => {
    void load();
  }
);
</script>

<template>
  <section class="panel">
    <div class="page-head">
      <div>
        <p class="eyebrow">R8 审批规则主源</p>
        <h2>审批规则维护</h2>
      </div>
      <label>
        业务类型
        <select v-model="businessTypeFilter">
          <option value="all">全部规则</option>
          <option v-for="item in businessTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
    </div>

    <div class="metrics">
      <div><strong>{{ rules.length }}</strong><span>规则总数</span></div>
      <div><strong>{{ rules.filter((item) => item.status === "enabled").length }}</strong><span>启用规则</span></div>
      <div><strong>{{ rules.filter((item) => item.status === "disabled").length }}</strong><span>停用规则</span></div>
      <div><strong>{{ canMaintainRules ? "可维护" : "只读" }}</strong><span>当前入口权限</span></div>
    </div>

    <p v-if="readonlyReason" class="notice">{{ readonlyReason }}</p>
    <ErrorAlert v-if="error" :message="error" />
    <AuditLogRef :audit-log-id="auditLogId" />
  </section>

  <section class="panel">
    <div v-if="loading" class="notice">正在加载审批规则...</div>
    <div v-else-if="filteredRules.length === 0" class="empty">当前筛选条件下没有可查看规则。</div>

    <table v-else>
      <thead>
        <tr>
          <th>规则</th>
          <th>业务类型</th>
          <th>金额范围</th>
          <th>审批节点</th>
          <th>动作</th>
          <th>默认策略</th>
          <th>状态</th>
          <th>版本</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="rule in filteredRules" :key="rule.id">
          <td>
            <strong>{{ rule.ruleName }}</strong>
            <small>{{ rule.ruleCode }} / {{ formatDateTime(rule.updatedAt) }}</small>
          </td>
          <td>{{ rule.businessTypeLabel }}</td>
          <td>{{ rule.amountRangeLabel }}</td>
          <td>{{ rule.nodeRoleLabels }}</td>
          <td>{{ rule.actionLabels }}</td>
          <td>{{ rule.strategyLabel }}</td>
          <td><span class="tag">{{ rule.statusLabel }}</span></td>
          <td>{{ rule.versionNo }}</td>
          <td>
            <button type="button" :disabled="!canMaintainRules || busyRuleId === rule.id" @click="toggleRule(rule)">
              {{ rule.status === "enabled" ? "停用" : "启用" }}
            </button>
            <span v-if="!canMaintainRules" class="notice">只读</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
