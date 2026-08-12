<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: [Number, String],
    default: 36,
  },
})

const cssSize = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <span class="running-monkey" :style="{ '--running-monkey-size': cssSize }" aria-hidden="true">
    <span class="running-monkey__speed-lines" />
    <span class="running-monkey__dust" />
    <span class="running-monkey__viewport">
      <span class="running-monkey__sprite" />
    </span>
  </span>
</template>

<style scoped>
.running-monkey {
  position: relative;
  display: block;
  width: var(--running-monkey-size);
  height: var(--running-monkey-size);
  flex: 0 0 var(--running-monkey-size);
  overflow: visible;
  animation: monkey-run-bob 300ms ease-in-out infinite alternate;
  isolation: isolate;
}

.running-monkey__speed-lines,
.running-monkey__speed-lines::before,
.running-monkey__speed-lines::after {
  position: absolute;
  z-index: 0;
  left: -19px;
  border-radius: 999px;
  content: '';
}

.running-monkey__speed-lines {
  top: 17px;
  width: 23px;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgb(84 232 224 / 28%), #8cfbf4);
  box-shadow: 0 0 5px rgb(73 237 227 / 72%);
  animation: monkey-speed-lines 460ms ease-in-out infinite alternate;
}

.running-monkey__speed-lines::before {
  top: -9px;
  left: 4px;
  width: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgb(255 215 83 / 85%));
  box-shadow: 0 0 3px rgb(255 202 45 / 58%);
}

.running-monkey__speed-lines::after {
  top: -5px;
  left: 9px;
  width: 11px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgb(255 225 109 / 72%));
}

.running-monkey__dust,
.running-monkey__dust::before,
.running-monkey__dust::after {
  position: absolute;
  z-index: 0;
  background: #ffd54f;
  box-shadow: 0 0 5px rgb(255 204 40 / 76%);
  content: '';
}

.running-monkey__dust {
  bottom: 5px;
  left: -8px;
  width: 2px;
  height: 9px;
  animation: monkey-sparkle 820ms ease-in-out infinite;
}

.running-monkey__dust::before {
  top: 3px;
  left: -3px;
  width: 8px;
  height: 2px;
}

.running-monkey__dust::after {
  top: 2px;
  left: -2px;
  width: 6px;
  height: 6px;
  background: transparent;
  box-shadow:
    5px 5px 0 -2px rgb(255 210 60 / 82%),
    -5px 7px 0 -2px rgb(255 225 104 / 62%);
}

.running-monkey__viewport {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
}

.running-monkey__sprite {
  position: absolute;
  inset: 0 auto 0 0;
  width: 600%;
  height: 100%;
  background: url('/assets/icons/monkey-run-sprite.png') 0 0 / 100% 100% no-repeat;
  animation: monkey-run-cycle 600ms steps(6, end) infinite;
  will-change: transform;
}

@keyframes monkey-run-cycle {
  to {
    transform: translateX(-100%);
  }
}

@keyframes monkey-run-bob {
  to {
    transform: translateY(-2px) rotate(-1deg);
  }
}

@keyframes monkey-speed-lines {
  from {
    opacity: 0.58;
    transform: translateX(4px) scaleX(0.76);
  }

  to {
    opacity: 1;
    transform: translateX(0) scaleX(1);
  }
}

@keyframes monkey-sparkle {
  0% {
    opacity: 0.35;
    transform: translate(3px, 1px) scale(0.65) rotate(0deg);
  }

  48% {
    opacity: 1;
    transform: translate(0, 0) scale(1) rotate(90deg);
  }

  100% {
    opacity: 0.25;
    transform: translate(-3px, -1px) scale(0.72) rotate(180deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .running-monkey,
  .running-monkey__speed-lines,
  .running-monkey__dust,
  .running-monkey__sprite {
    animation: none;
  }

  .running-monkey__speed-lines,
  .running-monkey__dust {
    display: none;
  }
}
</style>
