<script setup lang="ts">
import EnterpriseSurface from "../../components/base/EnterpriseSurface.vue";

type StageState = "done" | "current" | "pending";

interface TimelineStage {
  label: string;
  state: StageState;
}

defineProps<{
  rows: Array<{
    id: string;
    title: string;
    meta: string;
    stages: TimelineStage[];
  }>;
}>();

function stageStateText(state: StageState) {
  if (state === "done") return "已完成";
  if (state === "current") return "处理中";
  return "未开始";
}
</script>

<template>
  <EnterpriseSurface title="项目甘特图" description="按需求、公告、报价、评审、定标、履约展示项目所处阶段。">
    <div class="eds-gantt-board">
      <div v-if="rows.length" class="eds-gantt-head">
        <span>项目</span>
        <div class="eds-gantt-stage-head">
          <span v-for="stage in rows[0]?.stages ?? []" :key="stage.label">{{ stage.label }}</span>
        </div>
      </div>

      <div v-if="rows.length" class="eds-gantt-list">
        <article v-for="row in rows" :key="row.id" class="eds-gantt-row">
          <div class="eds-gantt-project">
            <strong>{{ row.title }}</strong>
            <span>{{ row.meta }}</span>
          </div>

          <div class="eds-gantt-track">
            <div
              v-for="(stage, index) in row.stages"
              :key="`${row.id}-${stage.label}`"
              class="eds-gantt-cell"
              :class="[`is-${stage.state}`, `eds-gantt-cell-${index + 1}`]"
            >
              <span class="eds-gantt-dot" aria-hidden="true"></span>
              <span>{{ stageStateText(stage.state) }}</span>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="eds-state">
        <span class="eds-state-icon" aria-hidden="true"></span>
        <h3>暂无可展示的项目时间线</h3>
        <p>当角色可见项目进入实际招采流程后，这里会自动形成阶段甘特视图。</p>
      </div>
    </div>
  </EnterpriseSurface>
</template>
