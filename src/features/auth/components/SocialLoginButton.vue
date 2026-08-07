<script setup>
import { computed } from 'vue'
import { CircleCheck, LoaderCircle, MessageCircle } from '@lucide/vue'

const providerConfig = Object.freeze({
  naver: {
    name: '네이버',
    label: '네이버로 계속하기',
    mark: 'N',
  },
  kakao: {
    name: '카카오',
    label: '카카오로 계속하기',
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
    return `${config.value.name} 로그인 완료`
  }

  return config.value.label
})
</script>

<template>
  <button
    class="social-button"
    :class="[`social-button--${provider}`, `social-button--${state}`]"
    type="button"
    :disabled="disabled"
    :aria-busy="state === 'loading'"
    @click="$emit('select', provider)"
  >
    <LoaderCircle v-if="state === 'loading'" class="social-button__spinner" :size="20" />
    <CircleCheck v-else-if="state === 'success'" :size="20" />
    <MessageCircle v-else-if="provider === 'kakao'" :size="20" />
    <span v-else class="social-button__mark" aria-hidden="true">{{ config.mark }}</span>
    <span>{{ buttonLabel }}</span>
  </button>
</template>

<style scoped>
.social-button {
  display: inline-flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: var(--font-size-body);
  font-weight: 700;
  transition:
    filter 160ms ease,
    transform 160ms ease;
}

.social-button:hover:not(:disabled) {
  filter: brightness(0.97);
  transform: translateY(-1px);
}

.social-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.social-button--naver {
  background: #03c75a;
  color: #ffffff;
}

.social-button--kakao {
  background: #fee500;
  color: #181600;
}

.social-button--google {
  border-color: var(--color-border);
  background: #ffffff;
  color: var(--color-heading);
}

.social-button__mark {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  font-size: var(--font-size-body);
  font-weight: 800;
  line-height: 1;
}

.social-button--google .social-button__mark {
  color: #4285f4;
}

.social-button__spinner {
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
