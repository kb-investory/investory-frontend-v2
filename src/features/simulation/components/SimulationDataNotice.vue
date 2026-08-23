<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'

const props = defineProps({
  eligibleDays: {
    type: Number,
    default: 0,
  },
  minRequiredDays: {
    type: Number,
    default: 90,
  },
  dataError: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])
const confirmButton = ref(null)

const hasEnoughDays = computed(() => props.eligibleDays >= props.minRequiredDays)
const noticeMessage = computed(() => {
  if (!hasEnoughDays.value) {
    return `시뮬레이션에는 최소 ${props.minRequiredDays}일의 실제 투자 데이터가 필요해요. 현재 ${props.eligibleDays}일이 준비됐어요.`
  }

  if (props.dataError) {
    return '시작 시점의 보유 종목과 평가금액을 아직 확인할 수 없어요. 계좌 데이터를 동기화한 뒤 다시 시도해주세요.'
  }

  return '시뮬레이션에 필요한 계좌 데이터가 아직 준비되지 않았어요. 잠시 후 다시 시도해주세요.'
})

function closeNotice() {
  emit('close')
}

function handleKeydown(event) {
  if (event.key === 'Escape') closeNotice()
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await nextTick()
  confirmButton.value?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div class="simulation-data-notice__backdrop" @click.self="closeNotice">
      <section
        class="simulation-data-notice"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="simulation-data-notice-title"
        aria-describedby="simulation-data-notice-description"
      >
        <span class="simulation-data-notice__icon" aria-hidden="true">
          <AppIcon :name="dataError ? 'triangle-alert' : 'calendar-range'" :size="24" />
        </span>

        <h2 id="simulation-data-notice-title">아직 시뮬레이션을 시작할 수 없어요</h2>
        <p id="simulation-data-notice-description">{{ noticeMessage }}</p>

        <button ref="confirmButton" type="button" @click="closeNotice">확인했어요</button>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.simulation-data-notice__backdrop {
  position: fixed;
  z-index: 260;
  display: grid;
  padding: 24px;
  background: rgb(20 35 41 / 52%);
  inset: 0;
  place-items: center;
  backdrop-filter: blur(5px);
}

.simulation-data-notice {
  display: flex;
  width: min(100%, 360px);
  flex-direction: column;
  align-items: center;
  padding: 26px 22px 20px;
  border: 1px solid rgb(8 127 124 / 16%);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgb(17 35 42 / 28%);
  text-align: center;
}

.simulation-data-notice__icon {
  display: grid;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  color: #087f7c;
  background: #eef9f8;
  place-items: center;
}

.simulation-data-notice h2 {
  margin: 16px 0 0;
  color: #263a43;
  font-size: 20px;
  font-weight: 850;
  letter-spacing: -0.035em;
}

.simulation-data-notice p {
  margin: 10px 0 0;
  color: #66777d;
  font-size: 14px;
  line-height: 1.6;
  word-break: keep-all;
}

.simulation-data-notice button {
  width: 100%;
  min-height: 48px;
  margin-top: 22px;
  border: 0;
  border-radius: 14px;
  color: #ffffff;
  background: #263a43;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.simulation-data-notice button:focus-visible {
  outline: 2px solid #087f7c;
  outline-offset: 2px;
}

@media (max-width: 420px) {
  .simulation-data-notice__backdrop {
    padding: 18px;
  }
}
</style>
