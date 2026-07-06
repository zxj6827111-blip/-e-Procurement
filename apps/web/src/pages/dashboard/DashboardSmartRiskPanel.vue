<script setup lang="ts">
import { RouterLink } from "vue-router";

interface DashboardRiskItem {
  id: string;
  type: string;
  description: string;
  time: string;
  tone: "high" | "medium";
  to: string;
}

defineProps<{
  risks: DashboardRiskItem[];
}>();
</script>

<template>
  <section class="g-hotel-card g-hotel-risk-card">
    <header class="g-hotel-card-header">
      <div class="g-hotel-card-title-row">
        <span class="g-hotel-risk-icon" aria-hidden="true">盾</span>
        <h3>AI 智能风控预警</h3>
      </div>
      <span class="g-hotel-danger-badge">{{ risks.length }} 项高优风险</span>
    </header>

    <div v-if="risks.length" class="g-hotel-risk-list">
      <article v-for="risk in risks" :key="risk.id" class="g-hotel-risk-item">
        <header>
          <strong>
            <span :class="['g-hotel-risk-signal', `is-${risk.tone}`]" aria-hidden="true"></span>
            {{ risk.type }}
          </strong>
          <small>{{ risk.time }}</small>
        </header>
        <p>{{ risk.description }}</p>
        <footer>
          <RouterLink :to="risk.to">查看相关台账</RouterLink>
        </footer>
      </article>
    </div>

    <div v-else class="eds-state">
      <span class="eds-state-icon" aria-hidden="true"></span>
      <h3>暂无高优先风险</h3>
      <p>系统会根据审计日志、供应商状态、履约异常和项目阶段生成提醒。</p>
    </div>
  </section>
</template>
