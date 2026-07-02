<script setup lang="ts">
import { EnterpriseButton, EnterpriseSurface } from "../../components/base";

defineProps<{
  loading: boolean;
}>();

const username = defineModel<string>("username", { required: true });
const password = defineModel<string>("password", { required: true });

const emit = defineEmits<{
  login: [];
}>();
</script>

<template>
  <EnterpriseSurface title="账号密码登录" description="输入平台账号和密码进入采购业务系统。">
    <form class="eds-form-section" @submit.prevent="emit('login')">
      <label>
        账号
        <input v-model="username" autocomplete="username" />
      </label>
      <label>
        密码
        <input v-model="password" type="password" autocomplete="current-password" />
      </label>
      <EnterpriseButton native-type="submit" type="primary" :disabled="loading">登录</EnterpriseButton>
    </form>
  </EnterpriseSurface>
</template>
