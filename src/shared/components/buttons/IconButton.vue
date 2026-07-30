<script setup>
defineProps({
  label: {
    type: String,
    default: '버튼',
  },
})
</script>

<template>
  <button type="button" class="icon-button" :aria-label="label">
    <slot />
  </button>
</template>

<style scoped>
.icon-button {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid #dce6e9;
  border-radius: 12px;
  background: #ffffff;
  color: #087f7c;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: #087f7c;
    background: #e8f7f6;
  }
}
</style>
