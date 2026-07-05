<script setup lang="ts">
export interface DataTableColumn {
  key: string;
  label: string;
}

defineProps<{
  columns: DataTableColumn[];
  rows: any[];
  rowKey?: string;
  emptyText?: string;
  emptyTitle?: string;
  emptyMode?: "default" | "compact";
}>();
</script>

<template>
  <div class="eds-table-wrap">
    <table class="eds-table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length">
            <div :class="['eds-state', emptyMode === 'compact' ? 'eds-state-compact' : '']">
              <span class="eds-state-icon" aria-hidden="true"></span>
              <h3>{{ emptyTitle ?? "暂无业务记录" }}</h3>
              <p>{{ emptyText ?? "当前没有符合条件的业务记录，请调整筛选条件或完成上一业务动作后再查看。" }}</p>
            </div>
          </td>
        </tr>
        <tr v-for="(row, index) in rows" v-else :key="String(row[rowKey ?? 'id'] ?? index)">
          <td v-for="column in columns" :key="column.key" :data-label="column.label">
            <slot :name="column.key" :row="row" :value="row[column.key]" :index="index">
              {{ row[column.key] ?? "-" }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
