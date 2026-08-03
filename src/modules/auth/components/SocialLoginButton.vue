<script setup>
import { computed } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'

const providerConfig = Object.freeze({
  naver: {
    name: '네이버',
    label: '네이버로 계속하기',
    mark: 'N',
  },
  kakao: {
    name: '카카오',
    label: '카카오로 계속하기',
    icon: 'message-circle',
  },
  google: {
    name: 'Google',
    label: 'Google로 계속하기',
    mark: 'G',
  },
})

const props = defineProps({
  provider: {
    type: String,
    required: true,
    validator: (value) => ['naver', 'kakao', 'google'].includes(value),
  },
  state: {
    type: String,
    default: 'idle',
    validator: (value) => ['idle', 'loading', 'success', 'error'].includes(value),
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['select'])

const config = computed(() => providerConfig[props.provider])
const buttonLabel = computed(() => {
  if (props.state === 'loading') {
    return `${config.value.name} 연결 중`
  }

  if (props.state === 'success') {
    return `${config.value.name}로 이동합니다`
  }

  return config.value.label
})
</script>

<template>
  <button
    class="social-login-button"
    :class="[`social-login-button--${provider}`, `social-login-button--${state}`]"
    type="button"
    :disabled="disabled"
    :aria-busy="state === 'loading'"
    @click="$emit('select', provider)"
  >
    <AppIcon
      v-if="state === 'loading'"
      class="social-login-button__spinner"
      name="loader-circle"
      :size="20"
    />
    <AppIcon v-else-if="state === 'success'" name="circle-check" :size="20" />
    <AppIcon v-else-if="config.icon" :name="config.icon" :size="20" />
    <span v-else class="social-login-button__mark" aria-hidden="true">{{ config.mark }}</span>
    <span>{{ buttonLabel }}</span>
  </button>
</template>

<style scoped>
.social-login-button {
  display: inline-flex;
  width: 100%;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition:
    filter 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.social-login-button:hover:not(:disabled) {
  filter: brightness(0.97);
  transform: translateY(-1px);
}

.social-login-button:active:not(:disabled) {
  transform: translateY(0);
}

.social-login-button:focus-visible {
  outline: 3px solid var(--color-primary-soft);
  outline-offset: 2px;
}

.social-login-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.social-login-button--naver {
  background: var(--color-brand-naver);
  color: var(--color-surface);
}

.social-login-button--kakao {
  background: var(--color-brand-kakao);
  color: var(--color-heading);
}

.social-login-button--google {
  border-color: var(--color-border);
  background: var(--color-surface);
  color: var(--color-heading);
}

.social-login-button--success {
  box-shadow: 0 0 0 2px var(--color-success-soft);
}

.social-login-button__mark {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  font-family: var(--font-brand);
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}

.social-login-button--google .social-login-button__mark {
  color: var(--color-brand-google);
}

.social-login-button__spinner {
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .social-login-button {
    transition: none;
  }

  .social-login-button__spinner {
    animation-duration: 1400ms;
  }
}
</style>
