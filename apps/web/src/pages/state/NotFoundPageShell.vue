<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ErrorState, PageHeader } from "../../components/base";
</script>

<template>
  <section class="eds-section">
    <PageHeader
      eyebrow="页面状态"
      title="页面暂时无法加载"
      description="未找到对应业务页面，或当前地址已经失效。请返回工作台后重新进入采购业务。"
    />

    <ErrorState
      title="页面暂时无法加载"
      description="如果该地址来自外部链接，请确认链接是否完整；如果问题持续出现，请联系集团信息中心。"
    >
      <template #actions>
        <RouterLink class="eds-button eds-button-primary" to="/">返回工作台</RouterLink>
      </template>
    </ErrorState>
  </section>
</template>
