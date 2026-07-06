<script setup lang="ts">
import { computed } from "vue";
import { EnterpriseSurface, StatusTag } from "../../components/base";
import { actionText, menuText } from "./display";

const props = defineProps<{
  menus: string[];
  actions: string[];
}>();

const matrixRows = computed(() => {
  const total = Math.max(props.menus.length, props.actions.length);
  return Array.from({ length: total }, (_, index) => ({
    id: `${props.menus[index] ?? "menu"}-${props.actions[index] ?? "action"}-${index}`,
    menu: props.menus[index],
    action: props.actions[index]
  }));
});
</script>

<template>
  <EnterpriseSurface class="g-hotel-table-card" title="角色权限矩阵" description="当前登录角色的菜单授权与动作授权由后端策略返回，前端只做可视化呈现。">
    <div class="eds-permission-matrix-summary">
      <article>
        <span>菜单范围</span>
        <strong>{{ menus.length }}</strong>
        <small>可见业务入口</small>
      </article>
      <article>
        <span>动作权限</span>
        <strong>{{ actions.length }}</strong>
        <small>可执行操作点</small>
      </article>
      <article>
        <span>策略来源</span>
        <strong>RBAC</strong>
        <small>后端裁剪</small>
      </article>
    </div>

    <div class="eds-permission-matrix-table" role="table" aria-label="角色权限矩阵">
      <div class="eds-permission-matrix-row eds-permission-matrix-head" role="row">
        <span role="columnheader">序号</span>
        <span role="columnheader">菜单授权</span>
        <span role="columnheader">状态</span>
        <span role="columnheader">动作授权</span>
        <span role="columnheader">状态</span>
      </div>
      <div v-for="(row, index) in matrixRows" :key="row.id" class="eds-permission-matrix-row" role="row">
        <span role="cell">{{ String(index + 1).padStart(2, "0") }}</span>
        <strong role="cell">{{ row.menu ? menuText(row.menu) : "无对应菜单" }}</strong>
        <span role="cell">
          <StatusTag :tone="row.menu ? 'success' : 'default'">{{ row.menu ? "已授权" : "未配置" }}</StatusTag>
        </span>
        <strong role="cell">{{ row.action ? actionText(row.action) : "无对应动作" }}</strong>
        <span role="cell">
          <StatusTag :tone="row.action ? 'primary' : 'default'">{{ row.action ? "可执行" : "未配置" }}</StatusTag>
        </span>
      </div>
    </div>
  </EnterpriseSurface>
</template>
