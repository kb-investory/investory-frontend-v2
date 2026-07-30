<script setup>
import { reactive } from 'vue'

import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseTextField from '@/shared/components/inputs/BaseTextField.vue'

const emit = defineEmits(['submit'])
const form = reactive({ email: '', password: '' })

function handleSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="login-form" @submit.prevent="handleSubmit">
    <BaseTextField v-model="form.email" label="이메일" type="email" required />
    <BaseTextField v-model="form.password" label="비밀번호" type="password" required />
    <BaseButton type="submit" full-width>로그인</BaseButton>
  </form>
</template>

<style scoped>
.login-form {
  display: grid;
  width: min(100%, 420px);
  gap: 16px;
}
</style>
