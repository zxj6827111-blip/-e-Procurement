<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { apiGet } from "../../api/http";
import { DataTable, EnterpriseSurface, FilterBar, PaginationBar, StatusTag } from "../../components/base";
import { formatDateTime, labelAuditAction, labelAuditReason, labelObjectType, labelStatus } from "../../utils/status-labels";

interface AuditLog {
  id: string;
  action: string;
  objectType: string;
  result: string;
  reason?: string;
  createdAt?: string;
}

const logs = ref<AuditLog[]>([]);
const keyword = ref("");
const resultFilter = ref("all");

const columns = [
  { key: "id", label: "日志编号" },
  { key: "action", label: "审计动作" },
  { key: "objectType", label: "业务对象" },
  { key: "result", label: "处理结果" },
  { key: "reason", label: "原因说明" }
];

const orderedLogs = computed(() =>
  [...logs.value].sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime())
);

const filteredLogs = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  return orderedLogs.value.filter((item) => {
    const resultMatched = resultFilter.value === "all" || item.result === resultFilter.value;
    const text = [
      item.id,
      labelAuditAction(item.action),
      labelObjectType(item.objectType),
      labelStatus(item.result),
      labelAuditReason(item.reason)
    ]
      .join(" ")
      .toLowerCase();
    return resultMatched && (!query || text.includes(query));
  });
});

const summaryItems = computed(() => [
  { label: "近期流水", value: orderedLogs.value.length, meta: "当前角色可见" },
  { label: "拒绝记录", value: orderedLogs.value.filter((item) => item.result === "denied").length, meta: "越权或拒绝" },
  { label: "审计对象", value: new Set(orderedLogs.value.map((item) => item.objectType)).size, meta: "对象类型数" },
  { label: "当前筛选", value: filteredLogs.value.length, meta: "命中记录" }
]);

onMounted(async () => {
  logs.value = (await apiGet<{ auditLogs: AuditLog[] }>("/api/audit-logs")).auditLogs.slice(-24).reverse();
});
</script>

<template>
  <section class="eds-section g-hotel-page g-hotel-audit-page">
    <header class="g-hotel-page-header">
      <div>
        <p>纪检审计 / 操作留痕</p>
        <h2><span aria-hidden="true">审</span>审计操作日志</h2>
        <small>按时间流水和明细表格追踪敏感操作、越权尝试与归档行为。</small>
      </div>
      <div class="g-hotel-page-actions">
        <StatusTag :tone="filteredLogs.length ? 'success' : 'default'">命中 {{ filteredLogs.length }} 条</StatusTag>
      </div>
    </header>

    <FilterBar class="g-hotel-filter-bar">
      <label>
        关键词
        <input v-model="keyword" placeholder="搜索动作、对象、结果或原因" />
      </label>
      <label>
        结果
        <select v-model="resultFilter">
          <option value="all">全部结果</option>
          <option value="allowed">允许</option>
          <option value="denied">拒绝</option>
          <option value="recorded">已记录</option>
        </select>
      </label>
    </FilterBar>

    <div class="eds-audit-matrix g-hotel-governance-grid">
      <EnterpriseSurface class="g-hotel-table-card eds-audit-waterfall-surface" title="操作流水时间线" description="按时间序列查看异常密度，快速定位敏感动作和归档痕迹。">
        <div v-if="filteredLogs.length" class="eds-waterfall-log">
          <article v-for="row in filteredLogs.slice(0, 14)" :key="row.id" class="eds-waterfall-log-item">
            <span class="eds-waterfall-log-time">{{ row.createdAt ? formatDateTime(row.createdAt).slice(5, 16) : "最近" }}</span>
            <div class="eds-waterfall-log-main">
              <strong>{{ labelAuditAction(row.action) }}</strong>
              <span>{{ labelObjectType(row.objectType) }} / {{ labelStatus(row.result) }} / {{ labelAuditReason(row.reason) }}</span>
            </div>
          </article>
        </div>

        <div v-else class="eds-state">
          <span class="eds-state-icon" aria-hidden="true"></span>
          <h3>暂无匹配的操作流水</h3>
          <p>调整关键词或结果筛选后再查看。</p>
        </div>
      </EnterpriseSurface>

      <div class="eds-audit-right">
        <EnterpriseSurface class="g-hotel-ledger-card" title="审计监督概览" description="汇总近期流水、拒绝记录、审计对象和当前筛选命中数。">
          <div class="eds-ledger-strip">
            <div v-for="item in summaryItems" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small class="eds-meta">{{ item.meta }}</small>
            </div>
          </div>
        </EnterpriseSurface>

        <EnterpriseSurface class="g-hotel-table-card eds-audit-table-surface" title="日志明细表" :description="`当前筛选命中 ${filteredLogs.length} 条记录。`">
          <DataTable :columns="columns" :rows="filteredLogs" row-key="id" empty-text="暂无匹配的审计日志。">
            <template #action="{ row }">{{ labelAuditAction(row.action) }}</template>
            <template #objectType="{ row }">{{ labelObjectType(row.objectType) }}</template>
            <template #result="{ row }">
              <StatusTag :tone="row.result === 'denied' ? 'error' : 'success'">{{ labelStatus(row.result) }}</StatusTag>
            </template>
            <template #reason="{ row }">{{ labelAuditReason(row.reason) }}</template>
          </DataTable>
          <PaginationBar :total="filteredLogs.length" />
        </EnterpriseSurface>
      </div>
    </div>
  </section>
</template>
