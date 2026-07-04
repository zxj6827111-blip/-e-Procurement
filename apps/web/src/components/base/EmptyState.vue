<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: "暂无业务记录",
    description: "当前没有符合条件的数据，请调整筛选条件或完成上一业务动作后再查看。"
  }
);
</script>

<template>
  <section class="eds-state">
    <span class="eds-state-icon" aria-hidden="true"></span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <div v-if="$slots.actions" class="eds-actions">
      <slot name="actions" />
    </div>
  </section>
</template>
