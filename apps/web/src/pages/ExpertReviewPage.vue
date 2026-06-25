<script setup lang="ts">
import { onMounted, ref } from "vue";
import { apiGet, apiPost } from "../api/http";
import AuditLogRef from "../components/AuditLogRef.vue";
import ErrorAlert from "../components/ErrorAlert.vue";

interface Expert {
  id: string;
  name: string;
  category: string;
  status: string;
}

interface Assignment {
  id: string;
  expertId: string;
  expertName?: string;
  method: string;
  status: string;
  avoidanceConfirmed: boolean;
  disciplineConfirmed: boolean;
  confidentialityConfirmed: boolean;
}

const experts = ref<Expert[]>([]);
const assignments = ref<Assignment[]>([]);
const selectedProjectId = ref("p-award");
const expertId = ref("exp-1");
const replacementExpertId = ref("exp-3");
const selectedAssignmentId = ref("");
const reason = ref("按项目品类和回避规则抽取");
const auditLogId = ref("");
const error = ref("");

const assignmentStatusLabels: Record<string, string> = {
  assigned: "待专家确认",
  confirmed: "专家已确认",
  submitted_locked: "评分已提交",
  replaced: "已替换"
};

async function load() {
  experts.value = (await apiGet<{ experts: Expert[] }>("/api/experts")).experts;
  assignments.value = (await apiGet<{ assignments: Assignment[] }>(`/api/projects/${selectedProjectId.value}/expert-assignments`)).assignments;
  selectedAssignmentId.value ||= assignments.value[0]?.id ?? "";
}

async function run(action: () => Promise<{ auditLogId?: string; assignment?: Assignment; replacement?: Assignment }>) {
  error.value = "";
  try {
    const result = await action();
    auditLogId.value = result.auditLogId ?? "";
    selectedAssignmentId.value = result.assignment?.id ?? result.replacement?.id ?? selectedAssignmentId.value;
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "操作失败";
  }
}

onMounted(load);
</script>

<template>
  <section class="panel">
    <h2>专家抽取与评审管理</h2>
    <div class="form-grid">
      <label>
        项目
        <input v-model="selectedProjectId" />
      </label>
      <label>
        专家
        <select v-model="expertId">
          <option v-for="expert in experts" :key="expert.id" :value="expert.id">{{ expert.name }} / {{ expert.category }}</option>
        </select>
      </label>
      <label>
        抽取 / 指定理由
        <input v-model="reason" />
      </label>
      <button type="button" @click="run(() => apiPost(`/api/projects/${selectedProjectId}/expert-assignments/draw`, { count: 1, reason }))">抽取专家</button>
      <button type="button" @click="run(() => apiPost(`/api/projects/${selectedProjectId}/expert-assignments/appoint`, { expertId, reason }))">指定专家</button>
    </div>

    <div class="form-grid">
      <label>
        评审任务
        <select v-model="selectedAssignmentId">
          <option v-for="assignment in assignments" :key="assignment.id" :value="assignment.id">{{ assignment.id }} / {{ assignment.expertName || assignment.expertId }}</option>
        </select>
      </label>
      <label>
        替换专家
        <select v-model="replacementExpertId">
          <option v-for="expert in experts" :key="expert.id" :value="expert.id">{{ expert.name }}</option>
        </select>
      </label>
      <button
        type="button"
        :disabled="!selectedAssignmentId"
        @click="run(() => apiPost(`/api/expert-assignments/${selectedAssignmentId}/replace`, { replacementExpertId, reason }))"
      >
        替换
      </button>
    </div>

    <table>
      <thead>
        <tr>
          <th>专家</th>
          <th>产生方式</th>
          <th>状态</th>
          <th>回避确认</th>
          <th>纪律确认</th>
          <th>保密承诺</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="assignment in assignments" :key="assignment.id">
          <td>{{ assignment.expertName || assignment.expertId }}</td>
          <td>{{ assignment.method }}</td>
          <td>{{ assignmentStatusLabels[assignment.status] ?? assignment.status }}</td>
          <td>{{ assignment.avoidanceConfirmed ? "已确认" : "未确认" }}</td>
          <td>{{ assignment.disciplineConfirmed ? "已确认" : "未确认" }}</td>
          <td>{{ assignment.confidentialityConfirmed ? "已确认" : "未确认" }}</td>
        </tr>
      </tbody>
    </table>

    <AuditLogRef :audit-log-id="auditLogId" />
    <ErrorAlert v-if="error" :message="error" />
  </section>
</template>
