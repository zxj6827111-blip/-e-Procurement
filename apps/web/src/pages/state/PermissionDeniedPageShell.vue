<script setup lang="ts">
import { RouterLink } from "vue-router";
import { PageHeader, PermissionState } from "../../components/base";
</script>

<template>
  <section class="eds-section">
    <PageHeader
      eyebrow="权限边界"
      title="当前角色不可访问"
      description="当前账号没有访问该业务页面的岗位权限。请返回工作台，或切换到具备授权的验证角色。"
    />

    <PermissionState
      title="当前角色不可访问"
      description="系统已阻止本次直达访问。采购、供应商、专家、财务和审计岗位只能进入各自授权范围内的页面。"
    >
      <template #actions>
        <RouterLink class="eds-button eds-button-primary" to="/">返回工作台</RouterLink>
      </template>
    </PermissionState>
  </section>
</template>
