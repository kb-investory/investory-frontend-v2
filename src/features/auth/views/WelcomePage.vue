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
      <header class="welcome-copy">
        <img class="welcome-logo" src="/assets/logos/investory-logo-dark.png" alt="Investory" />
        <p class="welcome-tagline">기록이, 당신의 투자를 더 강하게 만듭니다</p>
        <h1 class="welcome-title">
          <span>감이 아닌,</span>
          <span>원칙으로 쌓아가는</span>
          <strong>건강한 투자 습관</strong>
        </h1>
      </header>

      <div class="welcome-motion-scene" aria-hidden="true">
        <video
          class="welcome-motion-video"
          autoplay
          loop
          muted
          playsinline
          preload="metadata"
          poster="/assets/welcome/welcome-character-walk.png"
        >
          <source src="/assets/welcome/welcome-character-walk.mp4" type="video/mp4" />
        </video>
        <div class="welcome-motion-cover"></div>
      </div>

      <ul v-if="!isLoginStep" class="welcome-features" aria-label="Investory 주요 기능">
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h9l3 3v15H6z" />
            <path d="M15 3v4h4M9 11h6M9 15h6" />
          </svg>
          <span>투자일지</span>
        </li>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20V10M9 20V5M14 20v-8M19 20V3" />
          </svg>
          <span>투자성향분석</span>
        </li>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="10" r="6" />
            <path d="m9 16-1 5 4-2 4 2-1-5M12 7v6M9 10h6" />
          </svg>
          <span>원칙추천</span>
        </li>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="8" cy="8" r="3" />
            <path d="M3 20c0-4 2-6 5-6s5 2 5 6M15 8h5M17.5 5.5v5M15 16l2 2 4-5" />
          </svg>
          <span>원칙 봇<br />시뮬레이션</span>
        </li>
      </ul>

      <button
        v-if="!isLoginStep"
        class="welcome-start-button"
        type="button"
        aria-label="Investory 시작하기"
        @click="showSocialLogin"
      >
        <span>시작하기</span>
        <span aria-hidden="true">→</span>
      </button>

      <p v-if="!isLoginStep" class="welcome-footer">
        더 나은 투자를 위한 첫 번째 기록, Investory와 함께하세요
      </p>

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
.welcome-motion-cover {
  position: absolute;
  z-index: 2;

  top: 18%;
  left: 8%;
  width: 30%;
  height: 5%;

  background: #000a0e;

  box-shadow: 0 0 12px 12px #000a0e;
  pointer-events: none;
}
.welcome-page {
  display: grid;
  min-height: 100svh;
  place-items: center;
  overflow: hidden;
  background: #031720;
}

.welcome-artboard {
  position: relative;
  width: min(100%, 390px);
  height: min(100svh, 844px);
  min-height: 620px;
  overflow: hidden;
  background: #001822;
}

.welcome-copy {
  position: absolute;
  z-index: 3;
  top: 2.5%;
  right: 7.4%;
  left: 7.4%;
  color: #fff;
  pointer-events: none;
}

.welcome-logo {
  display: block;
  width: 43%;
  max-width: 154px;
  height: auto;
  object-fit: contain;
  object-position: left center;
}

.welcome-tagline {
  margin: 9px 0 0;
  color: rgb(226 238 240 / 75%);
  font-size: clamp(10px, 2.8vw, 12px);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.025em;
}

.welcome-title {
  display: grid;
  margin: clamp(24px, 4.1svh, 35px) 0 0;
  font-size: clamp(27px, 7.7vw, 31px);
  font-weight: 800;
  line-height: 1.16;
  letter-spacing: -0.06em;
}

.welcome-title span,
.welcome-title strong {
  display: block;
}

.welcome-title strong {
  color: #71e8a1;
  font-weight: inherit;
}

.welcome-motion-scene {
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  left: 0;
  height: 74%;
  overflow: hidden;
  background: #001822;
  pointer-events: none;
}

.welcome-motion-video {
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 58%;
  mix-blend-mode: normal;
  filter: saturate(0.9) contrast(1.03) brightness(0.9);
  transform: scale(1.035);
  -webkit-mask-image: linear-gradient(
    to bottom,
    #000 0%,
    #000 76%,
    rgb(0 0 0 / 92%) 82%,
    rgb(0 0 0 / 48%) 91%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    #000 0%,
    #000 76%,
    rgb(0 0 0 / 92%) 82%,
    rgb(0 0 0 / 48%) 91%,
    transparent 100%
  );
  user-select: none;
}

.welcome-motion-scene::after {
  z-index: 3;
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      to bottom,
      rgb(0 24 34 / 76%) 0%,
      rgb(0 24 34 / 42%) 25%,
      rgb(0 24 34 / 10%) 47%,
      transparent 66%,
      rgb(0 24 34 / 26%) 84%,
      #001822 100%
    ),
    linear-gradient(
      to right,
      rgb(0 24 34 / 48%) 0%,
      transparent 17% 83%,
      rgb(0 24 34 / 48%) 100%
    );
}

.welcome-features {
  position: absolute;
  z-index: 3;
  right: 5.6%;
  bottom: 17.3%;
  left: 5.6%;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
  height: 13.7%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.welcome-features li {
  display: grid;
  min-width: 0;
  place-content: center;
  gap: 8px;
  border: 1px solid rgb(104 144 166 / 15%);
  border-radius: 20px;
  background: linear-gradient(145deg, rgb(25 46 62 / 78%), rgb(8 26 41 / 86%));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 4%);
  color: rgb(215 225 231 / 82%);
  text-align: center;
  backdrop-filter: blur(4px);
}

.welcome-features svg {
  width: clamp(23px, 6.8vw, 28px);
  height: clamp(23px, 6.8vw, 28px);
  margin: 0 auto;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.welcome-features span {
  font-size: clamp(9px, 2.6vw, 11px);
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.04em;
}

.welcome-start-button {
  position: absolute;
  z-index: 3;
  right: 7%;
  bottom: 6.2%;
  left: 7%;
  height: 7.6%;
  min-height: 52px;
  border: 0;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  background: linear-gradient(100deg, #38d6b7 0%, #9bf1bd 100%);
  box-shadow:
    0 12px 28px rgb(43 217 179 / 18%),
    inset 0 1px 0 rgb(255 255 255 / 38%);
  color: #041a27;
  font: inherit;
  font-size: clamp(17px, 4.8vw, 20px);
  font-weight: 800;
  cursor: pointer;
  transition:
    filter 180ms ease,
    transform 180ms ease;
}

.welcome-start-button:hover {
  filter: brightness(1.06);
}

.welcome-start-button:active {
  transform: scale(0.985);
}

.welcome-footer {
  position: absolute;
  z-index: 3;
  right: 4%;
  bottom: 1.7%;
  left: 4%;
  margin: 0;
  color: rgb(194 208 216 / 57%);
  font-size: clamp(8px, 2.35vw, 10px);
  font-weight: 500;
  line-height: 1.3;
  text-align: center;
  letter-spacing: -0.035em;
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
