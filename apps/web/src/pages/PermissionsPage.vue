<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet } from "../api/http";
import { labelStatus } from "../utils/status-labels";

type UserRow = { id: string; name: string; roleId: string; orgId: string; status?: string; departmentId?: string; position?: string };
type OrganizationRow = { id: string; name: string };
type ApprovalRuleRow = { id: string; ruleName: string; businessType: string; nodeRoleIds: string[]; actions: string[]; status: string; versionNo: number };
type BpmnDefinitionRow = { id: string; processCode: string; processName: string; businessType: string; versionNo: number; status: string; validationStatus: string; xmlSha256: string };
type BpmnPilotRow = {
  id: string;
  definitionId: string;
  pilotName: string;
  businessType: string;
  status: string;
  mode: string;
  fallbackTo: string;
  previousDefinitionId?: string;
  lastRollbackReason?: string;
  scope: { orgIds: string[]; businessIdCount: number; environments: string[] };
};
type BpmnPilotRunRow = {
  id: string;
  pilotId: string;
  eventCode: string;
  businessType: string;
  businessRef: string;
  status: string;
  stoppedReason: string;
  predictedNodeKey?: string;
  fallbackTo: string;
  createdAt: string;
};
type BpmnPilotHealthRow = {
  id: string;
  pilotId: string;
  pilotName: string;
  businessType: string;
  status: string;
  mode: string;
  fallbackTo: string;
  lastRollbackReason?: string;
  scope: { orgIds: string[]; businessIdCount: number; environments: string[] };
  runCount: number;
  compatibleCount: number;
  fallbackCount: number;
  failedCount: number;
  skippedCount: number;
  compatibilityRate: number | null;
  latestRunAt?: string;
  latestRunStatus?: string;
  latestStoppedReason?: string;
  latestPredictedNodeKey?: string;
  latestErrorCode?: string;
  latestFallbackAt?: string;
  latestFallbackReason?: string;
  latestFallbackErrorCode?: string;
  lastGovernanceAction?: string;
  lastGovernanceAt?: string;
  fallbackActive: boolean;
  needsAttention: boolean;
};
type BpmnPilotChangeLogRow = {
  id: string;
  pilotId: string;
  actionCode: string;
  actorRoleId?: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: string;
};

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

const menuLabels: Record<string, string> = {
  admin: "\u7CFB\u7EDF\u7BA1\u7406",
  config: "\u57FA\u7840\u914D\u7F6E",
  dashboard: "\u96C6\u56E2\u91C7\u8D2D\u9A7E\u9A76\u8231",
  myTasks: "\u5F85\u529E\u4EFB\u52A1",
  procurement: "\u91C7\u8D2D\u4E1A\u52A1",
  supplier: "\u4F9B\u5E94\u5546\u7BA1\u7406"
};

const actionLabels: Record<string, string> = {
  "audit:read": "\u67E5\u770B\u5BA1\u8BA1\u65E5\u5FD7",
  "bid:read": "\u67E5\u770B\u62A5\u4EF7",
  "bpmn:manage": "BPMN \u6D41\u7A0B\u914D\u7F6E",
  "config:manage": "\u7EF4\u62A4\u57FA\u7840\u914D\u7F6E",
  "file:download": "\u4E0B\u8F7D\u6587\u4EF6",
  "file:upload": "\u4E0A\u4F20\u6587\u4EF6",
  "project:maintain": "\u7EF4\u62A4\u91C7\u8D2D\u9879\u76EE",
  "request:accept": "\u627F\u63A5\u5DF2\u5BA1\u6279\u9700\u6C42",
  "request:maintain": "\u7EF4\u62A4\u91C7\u8D2D\u7533\u8BF7",
  "request:method-decision": "\u5224\u5B9A\u91C7\u8D2D\u65B9\u5F0F",
  "supplier:maintain": "\u7EF4\u62A4\u4F9B\u5E94\u5546\u8D44\u6599",
  apply: "\u63D0\u4EA4\u7533\u8BF7",
  approve: "\u5BA1\u6279\u901A\u8FC7",
  audit_read: "\u5BA1\u8BA1\u67E5\u9605",
  reject: "\u9A73\u56DE",
  request: "\u53D1\u8D77\u7533\u8BF7",
  return: "\u9000\u56DE\u4FEE\u6539",
  submit: "\u63D0\u4EA4"
};

const roleLabels: Record<string, string> = {
  admin: "\u7CFB\u7EDF\u7BA1\u7406\u5458",
  auditor: "\u7EAA\u68C0 / \u5BA1\u8BA1",
  buyer: "\u91C7\u8D2D\u7ECF\u529E",
  expert: "\u4E13\u5BB6",
  finance_reviewer: "\u8D22\u52A1\u5BA1\u6838",
  group_manager: "\u96C6\u56E2\u91C7\u8D2D\u7BA1\u7406",
  hotel_buyer: "\u9152\u5E97\u91C7\u8D2D",
  hotel_finance: "\u9152\u5E97\u8D22\u52A1",
  platform_operator: "\u5E73\u53F0\u8FD0\u8425",
  supplier: "\u4F9B\u5E94\u5546",
  supplier_admin: "\u4F9B\u5E94\u5546\u7BA1\u7406\u5458",
  supplier_quotation: "\u4F9B\u5E94\u5546\u62A5\u4EF7\u5458",
  system: "\u7CFB\u7EDF\u8D26\u53F7"
};

const businessTypeLabels: Record<string, string> = {
  archive: "\u6863\u6848\u5BA1\u8BA1",
  archive_supplement: "\u6863\u6848\u8865\u6863\u5BA1\u6279",
  award_approval: "\u5B9A\u6807\u5BA1\u6279",
  contract_preparation: "\u5408\u540C\u5165\u53E3",
  direct_purchase: "\u76F4\u91C7\u6D41\u7A0B",
  invoice: "\u53D1\u7968\u6D41\u7A0B",
  mall_order: "\u5546\u57CE\u8BA2\u5355\u5BA1\u6279",
  order_fulfillment: "\u5C65\u7EA6\u8BA2\u5355",
  payment: "\u4ED8\u6B3E\u6D41\u7A0B",
  price_approval: "\u4EF7\u683C\u5BA1\u6279",
  procurement_request: "\u91C7\u8D2D\u9700\u6C42\u5BA1\u6279",
  review_award: "\u8BC4\u5BA1\u5B9A\u6807",
  rfq: "\u8BE2\u4EF7\u6D41\u7A0B",
  settlement: "\u7ED3\u7B97\u6D41\u7A0B",
  supplier_onboarding: "\u4F9B\u5E94\u5546\u51C6\u5165",
  tender: "\u62DB\u6807\u6D41\u7A0B"
};

function orgName(orgId: string) {
  return organizations.value.find((item) => item.id === orgId)?.name ?? "\u7EC4\u7EC7";
}

function pilotScopeText(scope: BpmnPilotRow["scope"]) {
  const orgScope = scope.orgIds.length > 0 ? scope.orgIds.join(" / ") : "\u672A\u9650\u5B9A\u7EC4\u7EC7";
  const envScope = scope.environments.length > 0 ? scope.environments.join(" / ") : "\u5168\u73AF\u5883";
  return `${orgScope} / ${envScope} / ${scope.businessIdCount} \u4E2A\u6D4B\u8BD5\u5BF9\u8C61`;
}

function percent(value: number | null) {
  return value === null ? "-" : `${Math.round(value * 100)}%`;
}

function healthState(row: BpmnPilotHealthRow) {
  if (row.needsAttention) return "\u9700\u5173\u6CE8";
  if (row.runCount === 0) return "\u5F85\u89C2\u5BDF";
  return "\u5065\u5EB7";
}

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

function shortId(value?: string) {
  return value ? value.slice(0, 18) : "-";
}

function logSummary(log: BpmnPilotChangeLogRow) {
  const after = log.after ?? {};
  const count = typeof after.scopeBusinessIdCount === "number" ? after.scopeBusinessIdCount : "-";
  const env = Array.isArray(after.scopeEnvironments) ? after.scopeEnvironments.join(" / ") || "\u5168\u73AF\u5883" : "-";
  const reason = typeof after.reason === "string" && after.reason ? after.reason : typeof after.lastRollbackReason === "string" && after.lastRollbackReason ? after.lastRollbackReason : "-";
  return `${labelStatus(log.actionCode)} / ${env} / ${count} \u4E2A\u5BF9\u8C61 / ${reason}`;
}

onMounted(async () => {
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
  }
});
</script>

<template>
  <section class="panel">
    <h2>&#x6743;&#x9650;&#x4E0E;&#x57FA;&#x7840;&#x914D;&#x7F6E;</h2>
    <div class="list">
      <span v-for="menu in menus" :key="menu">{{ menuLabels[menu] ?? labelStatus(menu) }}</span>
    </div>
    <h3>&#x52A8;&#x4F5C;&#x6743;&#x9650;</h3>
    <div class="list">
      <span v-for="action in actions" :key="action">{{ actionLabels[action] ?? action }}</span>
    </div>
  </section>

  <section class="panel">
    <h2>&#x5BA1;&#x6279;&#x89C4;&#x5219;</h2>
    <table>
      <thead>
        <tr>
          <th>&#x89C4;&#x5219;</th>
          <th>&#x4E1A;&#x52A1;&#x7C7B;&#x578B;</th>
          <th>&#x8282;&#x70B9;&#x89D2;&#x8272;</th>
          <th>&#x52A8;&#x4F5C;</th>
          <th>&#x72B6;&#x6001;</th>
          <th>&#x7248;&#x672C;</th>
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

  <section class="panel">
    <h2>BPMN &#x6D41;&#x7A0B;&#x5B9A;&#x4E49;</h2>
    <table>
      <thead>
        <tr>
          <th>&#x6D41;&#x7A0B;</th>
          <th>&#x4E1A;&#x52A1;&#x7C7B;&#x578B;</th>
          <th>&#x7248;&#x672C;</th>
          <th>&#x72B6;&#x6001;</th>
          <th>&#x6821;&#x9A8C;</th>
          <th>XML &#x6458;&#x8981;</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="definition in bpmnDefinitions" :key="definition.id">
          <td>{{ definition.processName }} / {{ definition.processCode }}</td>
          <td>{{ businessTypeLabels[definition.businessType] ?? labelStatus(definition.businessType) }}</td>
          <td>{{ definition.versionNo }}</td>
          <td>{{ labelStatus(definition.status) }}</td>
          <td>{{ labelStatus(definition.validationStatus) }}</td>
          <td>{{ definition.xmlSha256.slice(0, 12) }}</td>
        </tr>
        <tr v-if="!bpmnDefinitions.length">
          <td colspan="6">&#x6682;&#x65E0; BPMN &#x5B9A;&#x4E49;</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="panel">
    <h2>BPMN &#x8BD5;&#x70B9;</h2>
    <table>
      <thead>
        <tr>
          <th>&#x8BD5;&#x70B9;</th>
          <th>&#x4E1A;&#x52A1;&#x7C7B;&#x578B;</th>
          <th>&#x6A21;&#x5F0F;</th>
          <th>&#x72B6;&#x6001;</th>
          <th>&#x8303;&#x56F4;</th>
          <th>&#x7248;&#x672C;&#x6CBB;&#x7406;</th>
          <th>&#x56DE;&#x9000;</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="pilot in bpmnPilots" :key="pilot.id">
          <td>{{ pilot.pilotName }}</td>
          <td>{{ businessTypeLabels[pilot.businessType] ?? labelStatus(pilot.businessType) }}</td>
          <td>{{ labelStatus(pilot.mode) }}</td>
          <td>{{ labelStatus(pilot.status) }}</td>
          <td>{{ pilotScopeText(pilot.scope) }}</td>
          <td>{{ shortId(pilot.definitionId) }} / {{ shortId(pilot.previousDefinitionId) }}</td>
          <td>{{ labelStatus(pilot.fallbackTo) }}</td>
        </tr>
        <tr v-if="!bpmnPilots.length">
          <td colspan="7">&#x6682;&#x65E0; BPMN &#x8BD5;&#x70B9;</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="panel">
    <div class="panel-head">
      <h2>BPMN &#x8BD5;&#x70B9;&#x5065;&#x5EB7;</h2>
      <div class="summary-strip">
        <span><strong>{{ bpmnHealthSummary.pilotCount }}</strong>&#x8BD5;&#x70B9;&#x6570;</span>
        <span><strong>{{ percent(bpmnHealthSummary.compatibleRate) }}</strong>&#x517C;&#x5BB9;&#x7387;</span>
        <span><strong>{{ bpmnHealthSummary.fallbackCount }}</strong>&#x56DE;&#x9000; / &#x5931;&#x8D25;</span>
        <span><strong>{{ bpmnHealthSummary.attentionCount }}</strong>&#x9700;&#x5173;&#x6CE8;</span>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>&#x8BD5;&#x70B9;</th>
          <th>&#x8303;&#x56F4;</th>
          <th>&#x517C;&#x5BB9;&#x7387;</th>
          <th>&#x8FD0;&#x884C;&#x7EDF;&#x8BA1;</th>
          <th>&#x6700;&#x8FD1;&#x8FD0;&#x884C;</th>
          <th>&#x56DE;&#x9000;&#x72B6;&#x6001;</th>
          <th>&#x5904;&#x7406;&#x72B6;&#x6001;</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in bpmnPilotHealth" :key="row.id">
          <td>{{ row.pilotName }} / {{ businessTypeLabels[row.businessType] ?? labelStatus(row.businessType) }}</td>
          <td>{{ pilotScopeText(row.scope) }}</td>
          <td>{{ percent(row.compatibilityRate) }}</td>
          <td>{{ row.compatibleCount }} &#x517C;&#x5BB9; / {{ row.fallbackCount }} &#x56DE;&#x9000; / {{ row.failedCount }} &#x5931;&#x8D25; / {{ row.skippedCount }} &#x8DF3;&#x8FC7;</td>
          <td>{{ row.latestRunStatus ? `${labelStatus(row.latestRunStatus)} / ${labelStatus(row.latestStoppedReason)} / ${row.latestRunAt ? new Date(row.latestRunAt).toLocaleString() : "-"}` : "-" }}</td>
          <td>{{ row.fallbackActive ? `${labelStatus(row.fallbackTo)} / ${labelStatus(row.latestFallbackReason ?? row.lastRollbackReason)}` : "\u672A\u89E6\u53D1" }}</td>
          <td>{{ healthState(row) }}</td>
        </tr>
        <tr v-if="!bpmnPilotHealth.length">
          <td colspan="7">&#x6682;&#x65E0;&#x8BD5;&#x70B9;&#x5065;&#x5EB7;&#x6570;&#x636E;</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="panel">
    <h2>BPMN &#x8BD5;&#x70B9;&#x6CBB;&#x7406;&#x65E5;&#x5FD7;</h2>
    <table>
      <thead>
        <tr>
          <th>&#x52A8;&#x4F5C;</th>
          <th>&#x8BD5;&#x70B9;</th>
          <th>&#x6267;&#x884C;&#x89D2;&#x8272;</th>
          <th>&#x6458;&#x8981;</th>
          <th>&#x65F6;&#x95F4;</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in bpmnPilotChangeLogs.slice(0, 8)" :key="log.id">
          <td>{{ labelStatus(log.actionCode) }}</td>
          <td>{{ shortId(log.pilotId) }}</td>
          <td>{{ log.actorRoleId ? roleLabels[log.actorRoleId] ?? labelStatus(log.actorRoleId) : "-" }}</td>
          <td>{{ logSummary(log) }}</td>
          <td>{{ new Date(log.createdAt).toLocaleString() }}</td>
        </tr>
        <tr v-if="!bpmnPilotChangeLogs.length">
          <td colspan="5">&#x6682;&#x65E0;&#x6CBB;&#x7406;&#x65E5;&#x5FD7;</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="panel">
    <h2>BPMN &#x8BD5;&#x70B9;&#x8FD0;&#x884C;</h2>
    <table>
      <thead>
        <tr>
          <th>&#x4E8B;&#x4EF6;</th>
          <th>&#x4E1A;&#x52A1;</th>
          <th>&#x72B6;&#x6001;</th>
          <th>&#x9884;&#x6D4B;&#x8282;&#x70B9;</th>
          <th>&#x505C;&#x6B62;&#x539F;&#x56E0;</th>
          <th>&#x56DE;&#x9000;</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="run in bpmnPilotRuns.slice().reverse().slice(0, 8)" :key="run.id">
          <td>{{ labelStatus(run.eventCode) }}</td>
          <td>{{ businessTypeLabels[run.businessType] ?? labelStatus(run.businessType) }} / {{ run.businessRef }}</td>
          <td>{{ labelStatus(run.status) }}</td>
          <td>{{ run.predictedNodeKey ? labelStatus(run.predictedNodeKey) : "-" }}</td>
          <td>{{ labelStatus(run.stoppedReason) }}</td>
          <td>{{ labelStatus(run.fallbackTo) }}</td>
        </tr>
        <tr v-if="!bpmnPilotRuns.length">
          <td colspan="6">&#x6682;&#x65E0;&#x8BD5;&#x70B9;&#x8FD0;&#x884C;&#x8BB0;&#x5F55;</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section v-if="users.length || adminLoadError" class="panel">
    <h2>&#x7EC4;&#x7EC7;&#x8D26;&#x53F7;</h2>
    <p v-if="adminLoadError">&#x5F53;&#x524D;&#x89D2;&#x8272;&#x53EA;&#x80FD;&#x67E5;&#x770B;&#x4E2A;&#x4EBA;&#x6743;&#x9650;&#x548C;&#x5BA1;&#x6279;&#x89C4;&#x5219;</p>
    <table v-else>
      <thead>
        <tr>
          <th>&#x4EBA;&#x5458;</th>
          <th>&#x89D2;&#x8272;</th>
          <th>&#x7EC4;&#x7EC7;</th>
          <th>&#x90E8;&#x95E8;</th>
          <th>&#x5C97;&#x4F4D;</th>
          <th>&#x72B6;&#x6001;</th>
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
