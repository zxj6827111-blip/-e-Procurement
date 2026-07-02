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
          <td :colspan="columns.length">{{ emptyText ?? "暂无数据" }}</td>
        </tr>
        <tr v-for="(row, index) in rows" v-else :key="String(row[rowKey ?? 'id'] ?? index)">
          <td v-for="column in columns" :key="column.key">
            <slot :name="column.key" :row="row" :value="row[column.key]" :index="index">
              {{ row[column.key] ?? "-" }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
