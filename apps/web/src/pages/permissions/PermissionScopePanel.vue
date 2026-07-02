<script setup lang="ts">
import { EnterpriseSurface, StatusTag } from "../../components/base";
import { actionText, menuText } from "./display";

defineProps<{
  menus: string[];
  actions: string[];
}>();
</script>

<template>
  <EnterpriseSurface title="角色权限范围" description="当前登录角色的菜单与动作授权由后端策略返回，前端只做可视化呈现。">
    <div class="eds-stack-tight">
      <p class="eds-meta">菜单范围</p>
      <div class="eds-actions">
        <StatusTag v-for="menu in menus" :key="menu" tone="primary">{{ menuText(menu) }}</StatusTag>
      </div>
    </div>
    <div class="eds-stack-tight">
      <p class="eds-meta">动作权限</p>
      <div class="eds-actions">
        <StatusTag v-for="action in actions" :key="action">{{ actionText(action) }}</StatusTag>
      </div>
    </div>
  </EnterpriseSurface>
</template>
