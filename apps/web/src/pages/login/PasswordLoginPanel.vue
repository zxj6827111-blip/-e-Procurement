<script setup lang="ts">
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
  <form class="eds-login-form g-hotel-login-form" @submit.prevent="emit('login')">
    <label>
      <span>系统账号</span>
      <div class="g-hotel-input-wrap">
        <span class="g-hotel-input-icon" aria-hidden="true">人</span>
        <input v-model="username" autocomplete="username" placeholder="请输入账号" />
      </div>
    </label>

    <label>
      <span class="g-hotel-password-row">
        登录密码
        <small class="g-hotel-login-help">请联系系统管理员重置</small>
      </span>
      <div class="g-hotel-input-wrap">
        <span class="g-hotel-input-icon" aria-hidden="true">锁</span>
        <input v-model="password" type="password" autocomplete="current-password" placeholder="请输入密码" />
      </div>
    </label>

    <button class="g-hotel-login-submit" type="submit" :disabled="loading">
      <span>{{ loading ? "正在登录..." : "安全登录系统" }}</span>
      <span aria-hidden="true">→</span>
    </button>
  </form>
</template>
