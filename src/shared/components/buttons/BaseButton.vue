<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary', // 'primary' | 'secondary' | 'ghost'
  },
  fullWidth: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <button
    type="button"
    class="base-button"
    :class="[`base-button--${variant}`, { 'base-button--full-width': fullWidth }]"
    :disabled="disabled"
  >
    <span v-if="$slots.iconLeft" class="base-button__icon base-button__icon--left">
      <slot name="iconLeft" />
    </span>
    <span class="base-button__text">
      <slot />
    </span>
    <span v-if="$slots.iconRight || $slots.icon" class="base-button__icon base-button__icon--right">
      <slot name="iconRight"><slot name="icon" /></slot>
    </span>
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 700;
  line-height: normal;
  text-decoration: none;
  transition: all 0.15s ease;
}

.base-button--full-width {
  width: 100%;
}

/* Primary: Dark Teal */
.base-button--primary {
  background: #263a43;
  color: #ffffff;

  &:hover:not(:disabled) {
    background: #1e2d34;
  }
}

/* Secondary: Mint Light */
.base-button--secondary {
  background: #e8f7f6;
  color: #087f7c;

  &:hover:not(:disabled) {
    background: #d4f2f0;
  }
}

/* Ghost: Plain text with icon */
.base-button--ghost {
  height: 40px;
  padding: 0 12px;
  background: transparent;
  color: #666662;

  &:hover:not(:disabled) {
    background: #f3f6f6;
    color: #181817;
  }
}

.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-button__icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.base-button__text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
}
</style>
