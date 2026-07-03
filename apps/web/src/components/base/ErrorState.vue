<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: "页面暂时无法加载",
    description: "请稍后重试；如果问题持续存在，请联系系统管理员并提供当前页面和操作时间。"
  }
);
</script>

<template>
  <section class="eds-state eds-state-error">
    <span class="eds-state-icon" aria-hidden="true">!</span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <div v-if="$slots.actions" class="eds-actions">
      <slot name="actions" />
    </div>
  </section>
</template>
