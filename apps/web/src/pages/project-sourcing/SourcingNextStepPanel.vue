<script setup lang="ts">
import { RouterLink } from "vue-router";
import { EnterpriseButton, EnterpriseSurface } from "../../components/base";

defineProps<{
  projectId: string;
}>();
</script>

<template>
  <EnterpriseSurface title="下一段业务">
    <div class="eds-form-section">
      <div>
        <span class="eds-meta">履约结算与归档</span>
        <strong>定标通过后进入订单、收货、结算、评价和归档子页。</strong>
      </div>
      <RouterLink :to="`/project-workbench/${encodeURIComponent(projectId)}/fulfillment`">
        <EnterpriseButton type="primary">进入履约结算</EnterpriseButton>
      </RouterLink>
    </div>
  </EnterpriseSurface>
</template>
