import { computed, onMounted, ref, watch } from "vue";
import { createApprovalRule, loadApprovalRules, updateApprovalRule, type R8ApprovalBusinessType, type R8ApprovalRuleDto, type R8ApprovalRuleView } from "../../api/workflow";
import type { SummaryCardItem } from "../../components/base";
import { useSessionStore } from "../../stores/session";
import { r8BusinessTypeLabels, type R8RoleId } from "../../../../api/src/workflow-ui-contract";
import type { BusinessTypeOption, RuleFormState } from "./types";

export function useApprovalRulesPage() {
  const session = useSessionStore();
  const rules = ref<R8ApprovalRuleView[]>([]);
  const loading = ref(false);
  const error = ref("");
  const auditLogId = ref("");
  const busyRuleId = ref("");
  const businessTypeFilter = ref<"all" | R8ApprovalBusinessType>("all");
  const editingRuleId = ref("");
  const ruleForm = ref<RuleFormState>(defaultRuleForm());

  const canMaintainRules = computed(() => session.roleId === "admin");
  const readonlyReason = computed(() => {
    if (session.roleId === "admin") return "";
    if (session.roleId === "auditor") return "审计角色只读，可核对规则状态和版本，不可启停或编辑。";
    return "当前角色只允许查看授权范围内规则，不具备维护审批规则权限。";
  });

  const businessTypeOptions = computed<BusinessTypeOption[]>(() => {
    const seen = new Set(rules.value.map((rule) => rule.businessType));
    return Array.from(seen).map((value) => ({ value, label: r8BusinessTypeLabels[value] ?? value }));
  });

  const allBusinessTypeOptions = computed<BusinessTypeOption[]>(() => {
    const seen = new Set<R8ApprovalBusinessType>([...Object.keys(r8BusinessTypeLabels), ...rules.value.map((rule) => rule.businessType)] as R8ApprovalBusinessType[]);
    return Array.from(seen).map((value) => ({ value, label: r8BusinessTypeLabels[value] ?? value }));
  });

  const filteredRules = computed(() => rules.value.filter((rule) => businessTypeFilter.value === "all" || rule.businessType === businessTypeFilter.value));
  const summaryItems = computed<SummaryCardItem[]>(() => [
    { label: "规则总数", value: rules.value.length, meta: "审批规则库" },
    { label: "启用规则", value: rules.value.filter((item) => item.status === "enabled").length, meta: "可匹配业务" },
    { label: "停用规则", value: rules.value.filter((item) => item.status === "disabled").length, meta: "保留版本" },
    { label: "当前权限", value: canMaintainRules.value ? "可维护" : "只读", meta: session.roleId || "未登录" }
  ]);

  function defaultRuleForm(): RuleFormState {
    return {
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
    ruleForm.value = defaultRuleForm();
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
      const result = editingRuleId.value ? await updateApprovalRule(editingRuleId.value, payload) : await createApprovalRule(payload);
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

  return {
    allBusinessTypeOptions,
    auditLogId,
    businessTypeFilter,
    businessTypeOptions,
    busyRuleId,
    canMaintainRules,
    editRule,
    editingRuleId,
    error,
    filteredRules,
    load,
    loading,
    readonlyReason,
    resetRuleForm,
    ruleForm,
    rules,
    saveRule,
    summaryItems,
    toggleRule
  };
}
