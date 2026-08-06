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
    <span class="running-monkey__sprite" />
  </span>
</template>

<style scoped>
.running-monkey {
  position: relative;
  display: block;
  width: var(--running-monkey-size);
  height: var(--running-monkey-size);
  flex: 0 0 var(--running-monkey-size);
  overflow: hidden;
  animation: monkey-run-bob 360ms ease-in-out infinite alternate;
}

.running-monkey__sprite {
  position: absolute;
  inset: 0 auto 0 0;
  width: 600%;
  height: 100%;
  background: url('/assets/icons/monkey-run-sprite.png') 0 0 / 100% 100% no-repeat;
  animation: monkey-run-cycle 720ms steps(6, end) infinite;
  will-change: transform;
}

@keyframes monkey-run-cycle {
  to {
    transform: translateX(-100%);
  }
}

@keyframes monkey-run-bob {
  to {
    transform: translateY(-2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .running-monkey,
  .running-monkey__sprite {
    animation: none;
  }
}
</style>
