import { computed, onMounted, ref } from "vue";
import { apiGet } from "../../api/http";
import type {
  ApprovalRuleRow,
  BpmnDefinitionRow,
  BpmnPilotChangeLogRow,
  BpmnPilotHealthRow,
  BpmnPilotRow,
  BpmnPilotRunRow,
  OrganizationRow,
  UserRow
} from "./types";

export function usePermissionsPage() {
  const menus = ref<string[]>([]);
  const actions = ref<string[]>([]);
  const users = ref<UserRow[]>([]);
  const organizations = ref<OrganizationRow[]>([]);
  const approvalRules = ref<ApprovalRuleRow[]>([]);
  const bpmnDefinitions = ref<BpmnDefinitionRow[]>([]);
  const bpmnPilots = ref<BpmnPilotRow[]>([]);
  const bpmnPilotRuns = ref<BpmnPilotRunRow[]>([]);
  const bpmnPilotHealth = ref<BpmnPilotHealthRow[]>([]);
  const bpmnPilotChangeLogs = ref<BpmnPilotChangeLogRow[]>([]);
  const adminLoadError = ref("");
  const loading = ref(true);

  const bpmnHealthSummary = computed(() => {
    const rows = bpmnPilotHealth.value;
    const runCount = rows.reduce((sum, row) => sum + row.runCount, 0);
    const compatibleCount = rows.reduce((sum, row) => sum + row.compatibleCount, 0);
    const fallbackCount = rows.reduce((sum, row) => sum + row.fallbackCount + row.failedCount, 0);
    return {
      pilotCount: rows.length,
      compatibleRate: runCount === 0 ? null : compatibleCount / runCount,
      fallbackCount,
      attentionCount: rows.filter((row) => row.needsAttention).length
    };
  });

  const summaryItems = computed(() => [
    { label: "菜单范围", value: menus.value.length, meta: "当前角色可见" },
    { label: "动作权限", value: actions.value.length, meta: "接口授权动作" },
    { label: "审批规则", value: approvalRules.value.length, meta: "规则库" },
    { label: "BPMN 试点", value: bpmnHealthSummary.value.pilotCount, meta: "灰度治理" },
    { label: "兼容率", value: bpmnHealthSummary.value.compatibleRate === null ? "-" : `${Math.round(bpmnHealthSummary.value.compatibleRate * 100)}%`, meta: "试点运行" },
    { label: "需关注", value: bpmnHealthSummary.value.attentionCount, meta: "回退或失败" }
  ]);

  function orgName(orgId: string) {
    return organizations.value.find((item) => item.id === orgId)?.name ?? "组织";
  }

  onMounted(async () => {
    loading.value = true;
    menus.value = (await apiGet<{ menus: string[] }>("/api/me/menus")).menus;
    actions.value = (await apiGet<{ actions: string[] }>("/api/me/actions")).actions;
    approvalRules.value = (await apiGet<{ approvalRules: ApprovalRuleRow[] }>("/api/workflow/approval-rules")).approvalRules;
    bpmnDefinitions.value = (await apiGet<{ bpmnDefinitions: BpmnDefinitionRow[] }>("/api/bpmn/definitions").catch(() => ({ bpmnDefinitions: [] }))).bpmnDefinitions;
    bpmnPilots.value = (await apiGet<{ bpmnPilots: BpmnPilotRow[] }>("/api/bpmn/pilots").catch(() => ({ bpmnPilots: [] }))).bpmnPilots;
    bpmnPilotHealth.value = (await apiGet<{ bpmnPilotHealth: BpmnPilotHealthRow[] }>("/api/bpmn/pilot-health").catch(() => ({ bpmnPilotHealth: [] }))).bpmnPilotHealth;
    bpmnPilotRuns.value = (await apiGet<{ bpmnPilotRuns: BpmnPilotRunRow[] }>("/api/bpmn/pilot-runs").catch(() => ({ bpmnPilotRuns: [] }))).bpmnPilotRuns;
    bpmnPilotChangeLogs.value = (await apiGet<{ bpmnPilotChangeLogs: BpmnPilotChangeLogRow[] }>("/api/bpmn/pilot-change-logs").catch(() => ({ bpmnPilotChangeLogs: [] }))).bpmnPilotChangeLogs;
    organizations.value = (await apiGet<{ organizations: OrganizationRow[] }>("/api/organizations").catch(() => ({ organizations: [] }))).organizations;
    try {
      users.value = (await apiGet<{ users: UserRow[] }>("/api/users")).users;
    } catch (error) {
      adminLoadError.value = (error as Error).message;
    } finally {
      loading.value = false;
    }
  });

  return {
    actions,
    adminLoadError,
    approvalRules,
    bpmnDefinitions,
    bpmnHealthSummary,
    bpmnPilotChangeLogs,
    bpmnPilotHealth,
    bpmnPilotRuns,
    bpmnPilots,
    loading,
    menus,
    orgName,
    summaryItems,
    users
  };
}
