<script setup>
import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const updating = ref(false)
const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({ immediate: true })

function closePrompt() {
  needRefresh.value = false
  offlineReady.value = false
}

async function updateApp() {
  updating.value = true
  try {
    await updateServiceWorker(true)
  } finally {
    updating.value = false
  }
}
</script>

<template>
  <Transition name="pwa-prompt">
    <aside
      v-if="needRefresh || offlineReady"
      class="pwa-update-prompt"
      role="dialog"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-description"
    >
      <div class="pwa-update-prompt__copy">
        <strong id="pwa-update-title">
          {{ needRefresh ? '새 버전이 준비됐어요' : '오프라인 준비가 끝났어요' }}
        </strong>
        <p id="pwa-update-description">
          {{
            needRefresh
              ? '업데이트하면 최신 기능을 바로 사용할 수 있어요.'
              : '앱 기본 화면은 오프라인에서도 열 수 있어요. 투자 데이터는 연결 후 표시됩니다.'
          }}
        </p>
      </div>

      <div class="pwa-update-prompt__actions">
        <button v-if="needRefresh" type="button" :disabled="updating" @click="updateApp">
          {{ updating ? '업데이트 중' : '지금 업데이트' }}
        </button>
        <button type="button" class="pwa-update-prompt__dismiss" @click="closePrompt">
          {{ needRefresh ? '나중에' : '확인' }}
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.pwa-update-prompt {
  position: fixed;
  right: 16px;
  bottom: max(20px, env(safe-area-inset-bottom));
  left: 16px;
  z-index: 200;
  display: flex;
  width: min(430px, calc(100vw - 32px));
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid rgb(8 127 124 / 18%);
  border-radius: 18px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 16px 44px rgb(38 58 67 / 18%);
  backdrop-filter: blur(12px);
}

.pwa-update-prompt__copy {
  min-width: 0;
}

.pwa-update-prompt__copy strong {
  display: block;
  color: #263a43;
  font-size: 14px;
  font-weight: 800;
}

.pwa-update-prompt__copy p {
  margin: 4px 0 0;
  color: #666662;
  font-size: 12px;
  line-height: 1.45;
  word-break: keep-all;
}

.pwa-update-prompt__actions {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 4px;
}

.pwa-update-prompt__actions button {
  min-height: 34px;
  border: 0;
  border-radius: 10px;
  padding: 0 12px;
  color: #ffffff;
  background: #087f7c;
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
  cursor: pointer;
}

.pwa-update-prompt__actions button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.pwa-update-prompt__actions .pwa-update-prompt__dismiss {
  color: #687b82;
  background: transparent;
}

.pwa-prompt-enter-active,
.pwa-prompt-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.pwa-prompt-enter-from,
.pwa-prompt-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 420px) {
  .pwa-update-prompt {
    align-items: stretch;
    flex-direction: column;
  }

  .pwa-update-prompt__actions {
    flex-direction: row;
  }

  .pwa-update-prompt__actions button {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pwa-prompt-enter-active,
  .pwa-prompt-leave-active {
    transition: none;
  }
}
</style>
