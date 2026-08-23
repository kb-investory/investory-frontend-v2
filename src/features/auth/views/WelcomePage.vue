<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import LoginForm from '@/features/auth/components/LoginForm.vue'
import { markWelcomeSeen } from '@/features/auth/services/welcomePreference'
import { useAuthStore } from '@/features/auth/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()
const isLoginStep = ref(false)

function showSocialLogin() {
  isLoginStep.value = true
}

function showIntroduction() {
  if (authStore.loading) return

  isLoginStep.value = false
}

async function handleSocialLogin(provider) {
  markWelcomeSeen()
  const response = await authStore.startOauthLogin(provider)
  if (!response?.testMode) return

  await router.replace({ name: ROUTE_NAMES.BROKER_CONNECT })
}
</script>

<template>
  <section class="welcome-page" :class="{ 'welcome-page--login': isLoginStep }">
    <main class="welcome-artboard">
      <img
        class="welcome-artwork"
        src="/assets/welcome/welcome-onboarding.png"
        alt="감이 아닌 원칙으로 쌓아가는 건강한 투자 습관, Investory"
      />

      <div class="welcome-motion-scene" aria-hidden="true">
        <video
          class="welcome-motion-video"
          autoplay
          loop
          muted
          playsinline
          preload="metadata"
          poster="/assets/welcome/welcome-onboarding.png"
        >
          <source src="/assets/welcome/welcome-character-walk.mp4" type="video/mp4" />
        </video>
      </div>

      <button
        v-if="!isLoginStep"
        class="welcome-start-button"
        type="button"
        aria-label="Investory 시작하기"
        @click="showSocialLogin"
      />

      <button
        v-else
        class="welcome-background-return"
        type="button"
        aria-label="소개 화면 보기"
        :disabled="authStore.loading"
        @click="showIntroduction"
      />

      <Transition name="login-panel">
        <section v-if="isLoginStep" class="welcome-login-panel" aria-label="소셜 계정 로그인">
          <LoginForm
            :active-provider="authStore.activeProvider"
            :status="authStore.oauthStatus"
            :disabled="authStore.loading"
            @select="handleSocialLogin"
          />
        </section>
      </Transition>
    </main>
  </section>
</template>

<style scoped>
.welcome-page {
  display: grid;
  min-height: 100svh;
  place-items: center;
  overflow: hidden;
  background: #031720;
}

.welcome-artboard {
  position: relative;
  width: min(92vw, 360px);
  height: min(100svh, 844px);
  min-height: 620px;
  overflow: hidden;
  background: #031720;
}

.welcome-artwork {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center -12px;
  user-select: none;
}

.welcome-motion-scene {
  position: absolute;
  z-index: 2;
  top: 37%;
  right: 0;
  left: 0;
  height: 36%;
  overflow: hidden;
  background: #031720;
  mask-image: linear-gradient(to bottom, transparent 0%, #000 9%, #000 90%, transparent 100%);
  pointer-events: none;
}

.welcome-motion-video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 68%;
  filter: saturate(0.94) contrast(1.04) brightness(0.92);
  transform: scale(1.035);
  user-select: none;
}

.welcome-motion-scene::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, rgb(3 23 32 / 36%), transparent 18% 82%, rgb(3 23 32 / 36%)),
    linear-gradient(to bottom, rgb(3 23 32 / 30%), transparent 20% 78%, rgb(3 23 32 / 32%));
}

.welcome-start-button {
  position: absolute;
  z-index: 3;
  right: 7%;
  bottom: 5.8%;
  left: 7%;
  height: 7.6%;
  min-height: 52px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.welcome-start-button:disabled {
  cursor: default;
}

.welcome-start-button:focus-visible {
  outline: 3px solid #ffffff;
  outline-offset: 4px;
}

.welcome-background-return {
  position: absolute;
  z-index: 4;
  inset: 0 0 28% 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.welcome-background-return:disabled {
  cursor: default;
}

.welcome-background-return:focus-visible {
  outline: 2px solid rgb(73 226 214 / 72%);
  outline-offset: -4px;
}

.welcome-login-panel {
  position: absolute;
  z-index: 5;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  min-height: 28%;
  align-content: center;
  padding: 8px 7% 20px;
  background:
    linear-gradient(to bottom, rgb(3 23 32 / 0%) 0%, rgb(3 23 32 / 96%) 5%, #031720 12%),
    radial-gradient(circle at 50% 58%, rgb(24 190 181 / 14%), transparent 58%);
  backdrop-filter: blur(5px);
}

.welcome-login-panel :deep(.login-form) {
  gap: 8px;
}

.welcome-login-panel :deep(.social-button) {
  min-height: 52px;
  box-shadow:
    0 12px 24px rgb(0 0 0 / 24%),
    0 0 20px rgb(55 225 216 / 7%);
}

.login-panel-enter-active,
.login-panel-leave-active {
  transition:
    opacity 260ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.login-panel-enter-from,
.login-panel-leave-to {
  opacity: 0;
  transform: translateY(28px);
}

@media (prefers-reduced-motion: reduce) {
  .welcome-motion-video {
    display: none;
  }

  .login-panel-enter-active,
  .login-panel-leave-active {
    transition: none;
  }
}

@media (min-width: 440px) {
  .welcome-page {
    background: #eaf0f1;
  }

  .welcome-artboard {
    border-radius: 28px;
    box-shadow: 0 24px 72px rgb(0 24 32 / 22%);
  }
}
</style>
