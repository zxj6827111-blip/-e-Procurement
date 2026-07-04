<script setup lang="ts">
import { EnterpriseButton } from "../../components/base";

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
  <section class="eds-login-form">
    <EnterpriseButton type="primary" :disabled="loading" @click="emit('login')">使用统一身份登录</EnterpriseButton>

    <form class="eds-login-form" @submit.prevent="emit('login')">
      <label>
        账号
        <input v-model="username" autocomplete="username" />
      </label>
      <label>
        密码
        <input v-model="password" type="password" autocomplete="current-password" />
      </label>
      <EnterpriseButton native-type="submit" :disabled="loading">账号密码登录</EnterpriseButton>
    </form>
  </section>
</template>
