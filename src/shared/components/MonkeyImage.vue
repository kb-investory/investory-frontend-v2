<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: [Number, String],
    default: 22,
  },
})

const cssSize = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <span class="monkey-image" :style="{ '--monkey-size': cssSize }" aria-hidden="true">
    <img src="/assets/icons/monkey.png" alt="" />
  </span>
</template>

<style scoped>
.monkey-image {
  position: relative;
  display: block;
  width: var(--monkey-size);
  height: var(--monkey-size);
  flex: 0 0 var(--monkey-size);
  overflow: hidden;
}

.monkey-image img {
  position: absolute;
  top: calc(var(--monkey-size) * -0.302);
  left: calc(var(--monkey-size) * -0.753);
  width: calc(var(--monkey-size) * 2.563);
  height: calc(var(--monkey-size) * 1.578);
  max-width: none;
}
</style>
