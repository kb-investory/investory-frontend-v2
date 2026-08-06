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
  left: -13px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgb(242 183 40 / 92%));
  content: '';
}

.running-monkey__speed-lines {
  top: 10px;
  width: 20px;
  animation: monkey-speed-lines 300ms ease-out infinite alternate;
}

.running-monkey__speed-lines::before {
  top: 6px;
  left: 2px;
  width: 16px;
}

.running-monkey__speed-lines::after {
  top: 12px;
  left: 4px;
  width: 12px;
}

.running-monkey__dust,
.running-monkey__dust::before,
.running-monkey__dust::after {
  position: absolute;
  z-index: 0;
  border: 1px solid rgb(218 105 43 / 65%);
  border-radius: 50%;
  content: '';
}

.running-monkey__dust {
  bottom: 5px;
  left: -2px;
  width: 4px;
  height: 4px;
  animation: monkey-dust-puff 600ms ease-out infinite;
}

.running-monkey__dust::before {
  top: -3px;
  left: -4px;
  width: 3px;
  height: 3px;
}

.running-monkey__dust::after {
  top: 3px;
  left: 2px;
  width: 2px;
  height: 2px;
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
    opacity: 0.45;
    transform: translateX(4px) scaleX(0.65);
  }

  to {
    opacity: 1;
    transform: translateX(0) scaleX(1);
  }
}

@keyframes monkey-dust-puff {
  0% {
    opacity: 0;
    transform: translate(5px, 1px) scale(0.4);
  }

  35% {
    opacity: 0.8;
  }

  100% {
    opacity: 0;
    transform: translate(-5px, -2px) scale(1.2);
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
