<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

const INSTALL_PROMPT_KEY = 'investory:pwa-install-prompt-seen:v1'
const PROMPT_DELAY_MS = 900

const installPromptEvent = shallowRef(null)
const showPrompt = ref(false)
const installing = ref(false)
const installFailed = ref(false)
const primaryButton = ref(null)
let promptTimer = null

const isIosDevice =
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
const canInstallDirectly = computed(() => Boolean(installPromptEvent.value))
const needsIosInstructions = computed(() => isIosDevice && !canInstallDirectly.value)
const needsBrowserInstructions = computed(
  () => !isIosDevice && !canInstallDirectly.value && !installFailed.value,
)

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
}

function hasSeenPrompt() {
  try {
    return window.localStorage.getItem(INSTALL_PROMPT_KEY) === 'true'
  } catch {
    return false
  }
}

function rememberPrompt() {
  try {
    window.localStorage.setItem(INSTALL_PROMPT_KEY, 'true')
  } catch {
    // 저장소를 사용할 수 없는 환경에서는 현재 세션에서만 모달을 닫는다.
  }
}

function schedulePrompt() {
  if (showPrompt.value || promptTimer || hasSeenPrompt() || isStandalone()) return

  promptTimer = window.setTimeout(() => {
    promptTimer = null
    rememberPrompt()
    showPrompt.value = true
  }, PROMPT_DELAY_MS)
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault()
  if (hasSeenPrompt() || isStandalone()) return

  installPromptEvent.value = event
  schedulePrompt()
}

function closePrompt() {
  rememberPrompt()
  showPrompt.value = false
}

async function installApp() {
  const promptEvent = installPromptEvent.value
  if (!promptEvent) return

  installing.value = true
  installFailed.value = false
  try {
    await promptEvent.prompt()
    await promptEvent.userChoice
    installPromptEvent.value = null
    showPrompt.value = false
  } catch {
    installFailed.value = true
    installPromptEvent.value = null
  } finally {
    installing.value = false
  }
}

function handleAppInstalled() {
  rememberPrompt()
  installPromptEvent.value = null
  showPrompt.value = false
}

function handleKeydown(event) {
  if (event.key === 'Escape' && showPrompt.value) closePrompt()
}

watch(showPrompt, async (isVisible) => {
  if (!isVisible) return
  await nextTick()
  primaryButton.value?.focus()
})

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
  window.addEventListener('keydown', handleKeydown)

  schedulePrompt()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
  window.removeEventListener('keydown', handleKeydown)
  if (promptTimer) window.clearTimeout(promptTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="pwa-install">
      <div v-if="showPrompt" class="pwa-install-backdrop" @click.self="closePrompt">
        <section
          class="pwa-install-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          aria-describedby="pwa-install-description"
        >
          <button
            type="button"
            class="pwa-install-modal__close"
            aria-label="설치 안내 닫기"
            @click="closePrompt"
          >
            ×
          </button>

          <img src="/pwa-192x192.png" alt="" class="pwa-install-modal__icon" />
          <span class="pwa-install-modal__eyebrow">INVESTORY APP</span>
          <h2 id="pwa-install-title">홈 화면에서 더 빠르게 만나요</h2>
          <p id="pwa-install-description">
            투자 기록과 시뮬레이션을 앱처럼 바로 열어보세요. 기본 화면은 오프라인에서도 열 수
            있어요.
          </p>

          <div class="pwa-install-modal__benefits" aria-label="앱 설치 장점">
            <span>빠른 실행</span>
            <span>전체 화면</span>
            <span>기본 화면 오프라인 지원</span>
          </div>

          <div v-if="needsIosInstructions" class="pwa-install-modal__ios-guide">
            Safari 하단의 <strong>공유</strong> 버튼을 누른 뒤 <strong>홈 화면에 추가</strong>를
            선택해주세요.
          </div>
          <div v-else-if="needsBrowserInstructions" class="pwa-install-modal__ios-guide">
            브라우저 메뉴에서 <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를
            선택해주세요.
          </div>

          <p v-if="installFailed" class="pwa-install-modal__error">
            설치 창을 열지 못했어요. 브라우저 메뉴의 ‘앱 설치’를 이용해주세요.
          </p>

          <div class="pwa-install-modal__actions">
            <button
              v-if="canInstallDirectly && !installFailed"
              ref="primaryButton"
              type="button"
              class="pwa-install-modal__primary"
              :disabled="installing"
              @click="installApp"
            >
              {{ installing ? '설치 창 여는 중' : '앱으로 설치하기' }}
            </button>
            <button
              v-else
              ref="primaryButton"
              type="button"
              class="pwa-install-modal__primary"
              @click="closePrompt"
            >
              확인했어요
            </button>
            <button type="button" class="pwa-install-modal__secondary" @click="closePrompt">
              다음에 할게요
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pwa-install-backdrop {
  position: fixed;
  z-index: 240;
  display: grid;
  padding: 24px;
  background: rgb(20 35 41 / 52%);
  inset: 0;
  place-items: center;
  backdrop-filter: blur(5px);
}

.pwa-install-modal {
  position: relative;
  width: min(100%, 390px);
  overflow: hidden;
  border: 1px solid rgb(8 127 124 / 14%);
  border-radius: 28px;
  padding: 30px 24px 22px;
  background: radial-gradient(circle at 50% 0%, rgb(210 239 237 / 90%), transparent 42%), #ffffff;
  box-shadow: 0 24px 70px rgb(17 35 42 / 28%);
  text-align: center;
}

.pwa-install-modal__close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  padding: 0;
  color: #687b82;
  background: rgb(255 255 255 / 78%);
  font: inherit;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  place-items: center;
}

.pwa-install-modal__icon {
  display: block;
  width: 94px;
  height: 94px;
  margin: 0 auto 16px;
  border-radius: 24px;
  box-shadow: 0 12px 28px rgb(8 127 124 / 18%);
}

.pwa-install-modal__eyebrow {
  color: #087f7c;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.pwa-install-modal h2 {
  margin: 7px 0 0;
  color: #263a43;
  font-size: 24px;
  font-weight: 850;
  letter-spacing: -0.035em;
}

.pwa-install-modal > p {
  margin: 12px auto 0;
  color: #66777d;
  font-size: 14px;
  line-height: 1.65;
  word-break: keep-all;
}

.pwa-install-modal__benefits {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px;
  margin-top: 18px;
}

.pwa-install-modal__benefits span {
  padding: 7px 10px;
  border-radius: 999px;
  color: #476169;
  background: #f0f7f6;
  font-size: 11px;
  font-weight: 750;
}

.pwa-install-modal__ios-guide {
  margin-top: 18px;
  border-radius: 14px;
  padding: 13px 14px;
  color: #52676f;
  background: #f5fbfb;
  font-size: 13px;
  line-height: 1.55;
}

.pwa-install-modal__ios-guide strong {
  color: #087f7c;
}

.pwa-install-modal > .pwa-install-modal__error {
  color: #b5533d;
  font-size: 12px;
}

.pwa-install-modal__actions {
  display: grid;
  gap: 8px;
  margin-top: 22px;
}

.pwa-install-modal__actions button {
  min-height: 48px;
  border: 0;
  border-radius: 14px;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.pwa-install-modal__primary {
  color: #ffffff;
  background: #087f7c;
  box-shadow: 0 9px 20px rgb(8 127 124 / 22%);
}

.pwa-install-modal__primary:disabled {
  cursor: wait;
  opacity: 0.68;
}

.pwa-install-modal__secondary {
  color: #687b82;
  background: transparent;
}

.pwa-install-enter-active,
.pwa-install-leave-active {
  transition: opacity 180ms ease;
}

.pwa-install-enter-active .pwa-install-modal,
.pwa-install-leave-active .pwa-install-modal {
  transition: transform 180ms ease;
}

.pwa-install-enter-from,
.pwa-install-leave-to {
  opacity: 0;
}

.pwa-install-enter-from .pwa-install-modal,
.pwa-install-leave-to .pwa-install-modal {
  transform: translateY(14px) scale(0.98);
}

@media (max-width: 420px) {
  .pwa-install-backdrop {
    padding: 18px;
  }

  .pwa-install-modal {
    border-radius: 24px;
    padding: 28px 20px 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pwa-install-enter-active,
  .pwa-install-leave-active,
  .pwa-install-enter-active .pwa-install-modal,
  .pwa-install-leave-active .pwa-install-modal {
    transition: none;
  }
}
</style>
