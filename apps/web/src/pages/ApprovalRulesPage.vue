<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { createApprovalRule, loadApprovalRules, updateApprovalRule, type R8ApprovalBusinessType, type R8ApprovalRuleDto, type R8ApprovalRuleView } from "../api/workflow";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";
import { useSessionStore } from "../stores/session";
import { formatDateTime } from "../utils/status-labels";
import { r8BusinessTypeLabels, type R8RoleId } from "../../../api/src/workflow-ui-contract";

const session = useSessionStore();
const rules = ref<R8ApprovalRuleView[]>([]);
const loading = ref(false);
const error = ref("");
const auditLogId = ref("");
const busyRuleId = ref("");
const businessTypeFilter = ref<"all" | R8ApprovalBusinessType>("all");
const editingRuleId = ref("");
const ruleForm = ref({
  ruleCode: "",
  ruleName: "",
  businessType: "procurement_request" as R8ApprovalBusinessType,
  amountMin: undefined as number | undefined,
  amountMax: undefined as number | undefined,
  methodTypes: "",
  nodeRoleIds: "buyer",
  actions: "submit",
  orgScope: "",
  hotelScope: "",
  approvalOrder: "buyer",
  defaultStrategy: "manual_review_required" as NonNullable<R8ApprovalRuleDto["defaultStrategy"]>,
  status: "enabled" as R8ApprovalRuleDto["status"]
});

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
const allBusinessTypeOptions = computed(() => {
  const seen = new Set<R8ApprovalBusinessType>([...Object.keys(r8BusinessTypeLabels), ...rules.value.map((rule) => rule.businessType)] as R8ApprovalBusinessType[]);
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

function stringList(value: string) {
  return value
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resetRuleForm() {
  editingRuleId.value = "";
  ruleForm.value = {
    ruleCode: "",
    ruleName: "",
    businessType: "procurement_request",
    amountMin: undefined,
    amountMax: undefined,
    methodTypes: "",
    nodeRoleIds: "buyer",
    actions: "submit",
    orgScope: "",
    hotelScope: "",
    approvalOrder: "buyer",
    defaultStrategy: "manual_review_required",
    status: "enabled"
  };
}

function editRule(rule: R8ApprovalRuleView) {
  editingRuleId.value = rule.id;
  const source = rule as R8ApprovalRuleView & R8ApprovalRuleDto;
  ruleForm.value = {
    ruleCode: source.ruleCode,
    ruleName: source.ruleName,
    businessType: source.businessType,
    amountMin: source.amountMin,
    amountMax: source.amountMax,
    methodTypes: (source.methodTypes ?? []).join("，"),
    nodeRoleIds: (source.nodeRoleIds ?? []).join("，"),
    actions: (source.actions ?? []).join("，"),
    orgScope: (source.orgScope ?? []).join("，"),
    hotelScope: (source.hotelScope ?? []).join("，"),
    approvalOrder: (source.approvalOrder ?? []).join("，"),
    defaultStrategy: source.defaultStrategy ?? "manual_review_required",
    status: source.status
  };
}

function roleList(value: string): R8RoleId[] {
  const valid = new Set<R8RoleId>(["group_manager", "buyer", "supplier", "expert", "auditor", "admin", "system"]);
  return stringList(value).filter((item): item is R8RoleId => valid.has(item as R8RoleId));
}

function rulePayload(): Partial<R8ApprovalRuleDto> {
  return {
    ruleCode: ruleForm.value.ruleCode.trim(),
    ruleName: ruleForm.value.ruleName.trim(),
    businessType: ruleForm.value.businessType,
    amountMin: ruleForm.value.amountMin,
    amountMax: ruleForm.value.amountMax,
    methodTypes: stringList(ruleForm.value.methodTypes),
    nodeRoleIds: roleList(ruleForm.value.nodeRoleIds),
    actions: stringList(ruleForm.value.actions),
    orgScope: stringList(ruleForm.value.orgScope),
    hotelScope: stringList(ruleForm.value.hotelScope),
    approvalOrder: roleList(ruleForm.value.approvalOrder),
    defaultStrategy: ruleForm.value.defaultStrategy,
    status: ruleForm.value.status
  };
}

async function saveRule() {
  if (!canMaintainRules.value) return;
  busyRuleId.value = editingRuleId.value || "new";
  error.value = "";
  auditLogId.value = "";
  try {
    const payload = rulePayload();
    const result = editingRuleId.value
      ? await updateApprovalRule(editingRuleId.value, payload)
      : await createApprovalRule(payload);
    auditLogId.value = result.auditLogId ?? "";
    resetRuleForm();
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
    <div class="panel-head">
      <h3>规则配置表单</h3>
      <button type="button" class="secondary-button" :disabled="!canMaintainRules" @click="resetRuleForm">新建规则</button>
    </div>
    <div class="form-grid">
      <label>
        规则编码
        <input v-model="ruleForm.ruleCode" :disabled="Boolean(editingRuleId) || !canMaintainRules" />
      </label>
      <label>
        规则名称
        <input v-model="ruleForm.ruleName" :disabled="!canMaintainRules" />
      </label>
      <label>
        业务类型
        <select v-model="ruleForm.businessType" :disabled="Boolean(editingRuleId) || !canMaintainRules">
          <option v-for="item in allBusinessTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <label>
        最小金额
        <input v-model.number="ruleForm.amountMin" type="number" min="0" :disabled="!canMaintainRules" />
      </label>
      <label>
        最大金额
        <input v-model.number="ruleForm.amountMax" type="number" min="0" :disabled="!canMaintainRules" />
      </label>
      <label>
        采购方式
        <input v-model="ruleForm.methodTypes" :disabled="!canMaintainRules" placeholder="多个用逗号分隔" />
      </label>
      <label>
        审批角色
        <input v-model="ruleForm.nodeRoleIds" :disabled="!canMaintainRules" placeholder="buyer,group_manager" />
      </label>
      <label>
        触发动作
        <input v-model="ruleForm.actions" :disabled="!canMaintainRules" placeholder="submit,review" />
      </label>
      <label>
        组织范围
        <input v-model="ruleForm.orgScope" :disabled="!canMaintainRules" />
      </label>
      <label>
        酒店范围
        <input v-model="ruleForm.hotelScope" :disabled="!canMaintainRules" />
      </label>
      <label>
        审批顺序
        <input v-model="ruleForm.approvalOrder" :disabled="!canMaintainRules" />
      </label>
      <label>
        默认策略
        <select v-model="ruleForm.defaultStrategy" :disabled="!canMaintainRules">
          <option value="manual_review_required">无规则时转人工复核</option>
          <option value="reject_without_rule">无规则时拒绝提交</option>
        </select>
      </label>
      <label>
        状态
        <select v-model="ruleForm.status" :disabled="!canMaintainRules">
          <option value="enabled">启用</option>
          <option value="disabled">停用</option>
        </select>
      </label>
      <button type="button" :disabled="!canMaintainRules || busyRuleId !== ''" @click="saveRule">
        {{ editingRuleId ? "保存规则" : "创建规则" }}
      </button>
    </div>
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
            <button type="button" :disabled="!canMaintainRules || busyRuleId === rule.id" class="secondary-button" @click="editRule(rule)">编辑</button>
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
