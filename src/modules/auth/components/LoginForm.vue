<script setup>
import SocialLoginButton from '@/modules/auth/components/SocialLoginButton.vue'

const providers = ['naver', 'kakao', 'google']

const props = defineProps({
  activeProvider: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    default: 'idle',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select'])

function getButtonState(provider) {
  if (props.activeProvider !== provider) {
    return 'idle'
  }

  return props.status
}
</script>

<template>
  <div class="login-form" aria-label="소셜 로그인 선택">
    <SocialLoginButton
      v-for="provider in providers"
      :key="provider"
      :provider="provider"
      :state="getButtonState(provider)"
      :disabled="disabled"
      @select="emit('select', provider)"
    />
  </div>
</template>

<style scoped>
.login-form {
  display: grid;
  width: 100%;
  gap: 12px;
}
</style>
