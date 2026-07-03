<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: "当前角色不可访问",
    description: "该功能需要对应岗位或业务授权。请切换到授权账号，或联系集团采购管理员确认角色边界。"
  }
);
</script>

<template>
  <section class="eds-state eds-state-warning">
    <span class="eds-state-icon" aria-hidden="true">权</span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <div v-if="$slots.actions" class="eds-actions">
      <slot name="actions" />
    </div>
  </section>
</template>
