<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { EnterpriseButton, EnterpriseSurface } from "../../components/base";
import type { WorkbenchAction } from "./role-workbench";

const props = withDefaults(
  defineProps<{
    actions: WorkbenchAction[];
    riskSignals: string[];
    storageKey?: string;
    maxVisible?: number;
  }>(),
  {
    maxVisible: 6
  }
);

const isEditing = ref(false);
const selectedActionKeys = ref<string[]>([]);

function actionKey(action: WorkbenchAction) {
  return `${action.to}::${action.label}`;
}

function defaultSelection() {
  return props.actions.map(actionKey).slice(0, Math.min(4, props.maxVisible));
}

function persistSelection(keys: string[]) {
  if (!props.storageKey) return;
  localStorage.setItem(props.storageKey, JSON.stringify(keys));
}

function loadSelection() {
  const availableKeys = new Set(props.actions.map(actionKey));
  let nextKeys = defaultSelection();
  if (props.storageKey) {
    const saved = localStorage.getItem(props.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          nextKeys = parsed.map(String).filter((key) => availableKeys.has(key)).slice(0, props.maxVisible);
        }
      } catch {
        nextKeys = defaultSelection();
      }
    }
  }
  selectedActionKeys.value = nextKeys.length ? nextKeys : defaultSelection();
}

const visibleActions = computed(() => {
  const selected = new Set(selectedActionKeys.value);
  return props.actions.filter((action) => selected.has(actionKey(action))).slice(0, props.maxVisible);
});

function toggleAction(action: WorkbenchAction) {
  const key = actionKey(action);
  const exists = selectedActionKeys.value.includes(key);
  const nextKeys = exists
    ? selectedActionKeys.value.filter((item) => item !== key)
    : selectedActionKeys.value.length >= props.maxVisible
      ? selectedActionKeys.value
      : [...selectedActionKeys.value, key];
  selectedActionKeys.value = nextKeys;
  persistSelection(nextKeys);
}

watch(() => [props.actions.map(actionKey).join("|"), props.storageKey, String(props.maxVisible)], loadSelection, { immediate: true });

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

function quickActionIconPath(action: WorkbenchAction) {
  const key = `${action.label} ${action.to}`;
  if (/task|todo|my-tasks|待办/i.test(key)) return "M9 11l2 2 4-5M5 5h14M5 9h8M5 17h14";
  if (/message|messages|消息/i.test(key)) return "M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Zm4.5 10a2 2 0 0 0 3 0";
  if (/request|procurement-requests|申请/i.test(key)) return "M7 3h7l4 4v14H7V3Zm7 0v5h5M9 12h6M9 16h6";
  if (/project|workbench|项目|工作台/i.test(key)) return "M4 5h7v7H4V5Zm9 0h7v7h-7V5ZM4 14h7v5H4v-5Zm9 0h7v5h-7v-5Z";
  if (/supplier|供应商/i.test(key)) return "M7 20v-2a5 5 0 0 1 10 0v2M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z";
  if (/document|file|文件|材料/i.test(key)) return "M7 3h7l4 4v14H7V3Zm7 0v5h5M9 12h6M9 16h4";
  return "M5 5h6v6H5V5Zm8 0h6v6h-6V5ZM5 13h6v6H5v-6Zm8 0h6v6h-6v-6Z";
}
</script>

<template>
  <EnterpriseSurface title="快捷操作中心" description="围绕当前角色最常用的关键动作提供直达入口。">
    <template #actions>
      <EnterpriseButton type="text" size="sm" @click="isEditing = !isEditing">
        {{ isEditing ? "完成" : "自定义" }}
      </EnterpriseButton>
    </template>

    <div v-if="isEditing" class="eds-quick-action-editor">
      <p>选择要在工作台展示的快捷操作，最多 {{ props.maxVisible }} 个。</p>
      <EnterpriseButton
        v-for="action in props.actions"
        :key="actionKey(action)"
        native-type="button"
        :class="['eds-quick-action-option', selectedActionKeys.includes(actionKey(action)) ? 'active' : '']"
        @click="toggleAction(action)"
      >
        <span class="eds-quick-action-check" aria-hidden="true">{{ selectedActionKeys.includes(actionKey(action)) ? "✓" : "+" }}</span>
        <span>{{ action.label }}</span>
      </EnterpriseButton>
    </div>

    <div v-else class="eds-template-a-quick-grid g-hotel-quick-tile-grid">
      <RouterLink v-for="action in visibleActions" :key="action.to + action.label" class="eds-template-a-quick-card g-hotel-quick-tile" :to="action.to">
        <span class="g-hotel-quick-tile-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path :d="quickActionIconPath(action)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
          </svg>
        </span>
        <strong>{{ action.label }}</strong>
      </RouterLink>
      <div v-if="!visibleActions.length" class="eds-state eds-state-compact">
        <span class="eds-state-icon" aria-hidden="true"></span>
        <h3>暂无快捷操作</h3>
        <p>点击右上角自定义添加当前角色可用入口。</p>
      </div>
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
