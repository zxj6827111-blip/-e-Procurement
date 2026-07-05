<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseSurface } from "../../components/base";
import type { WorkbenchAction } from "./role-workbench";

const props = defineProps<{
  actions: WorkbenchAction[];
  riskSignals: string[];
}>();

function actionHint(label: string) {
  if (label.includes("采购申请")) return "发起或续办采购需求，直接进入当前角色的处理入口。";
  if (label.includes("项目")) return "回到项目主工作面板，查看当前阶段和关键节点。";
  if (label.includes("供应商")) return "进入供应商相关处理面，完成准入、核查或维护。";
  if (label.includes("结算")) return "进入财务或材料面板，继续处理付款与回补。";
  if (label.includes("报价")) return "直达报价响应面，处理暂存、提交或锁定动作。";
  if (label.includes("日志")) return "查看最近操作流水，快速追溯当前异常。";
  return "按角色直达最关键的业务动作，不再经过二级页面跳转。";
}

function actionSerial(index: number) {
  return String(index + 1).padStart(2, "0");
}
</script>

<template>
  <EnterpriseSurface title="快捷操作中心" description="围绕当前角色最常用的关键动作提供直达入口。">
    <div class="eds-template-a-quick-grid">
      <article v-for="(action, index) in props.actions" :key="action.to + action.label" class="eds-template-a-quick-card">
        <span class="eds-template-a-quick-index">{{ actionSerial(index) }}</span>
        <strong>{{ action.label }}</strong>
        <span>{{ actionHint(action.label) }}</span>
        <RouterLink class="eds-button eds-button-primary" :to="action.to">立即进入</RouterLink>
      </article>
    </div>

    <div v-if="props.riskSignals.length" class="eds-waterfall-shell">
      <header class="eds-page-header">
        <div>
          <h3>关键提醒</h3>
          <p>汇总当前角色需要主动跟进的风险点。</p>
        </div>
      </header>
      <div class="eds-risk-list">
        <div v-for="item in props.riskSignals" :key="item" class="eds-risk-list-item">
          <span class="eds-risk-dot" aria-hidden="true"></span>
          <span>{{ item }}</span>
        </div>
      </div>
    </div>
  </EnterpriseSurface>
</template>
