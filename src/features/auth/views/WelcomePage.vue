<script setup>
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { markWelcomeSeen } from '@/features/auth/services/welcomePreference'

const router = useRouter()

function startInvestory() {
  markWelcomeSeen()
  router.push({ name: ROUTE_NAMES.LOGIN })
}
</script>

<template>
  <section class="welcome-page">
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
        class="welcome-start-button"
        type="button"
        aria-label="Investory 시작하기"
        @click="startInvestory"
      />
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
  z-index: 1;
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

.welcome-start-button:focus-visible {
  outline: 3px solid #ffffff;
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .welcome-motion-video {
    display: none;
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
