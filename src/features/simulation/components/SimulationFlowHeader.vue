<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
  step: {
    type: String,
    default: '',
  },
})

defineEmits(['back'])
</script>

<template>
  <header class="simulation-flow-header">
    <button type="button" class="simulation-flow-header__back" aria-label="뒤로가기" @click="$emit('back')">
      <AppIcon name="chevron-left" :size="20" />
    </button>

    <h1>{{ title }}</h1>

    <span v-if="step" class="simulation-flow-header__step">{{ step }}</span>
    <span v-else class="simulation-flow-header__spacer" aria-hidden="true"></span>
  </header>
</template>

<style scoped>
.simulation-flow-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  width: 100%;
  height: 66px;
  align-items: center;
  padding: 0 16px;
  background: #ffffff;
}

.simulation-flow-header__back {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #263a43;
  cursor: pointer;
}

.simulation-flow-header__back:hover {
  background: #f3f6f6;
}

h1 {
  margin: 0;
  overflow: hidden;
  color: #181817;
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 700;
  line-height: normal;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.simulation-flow-header__step {
  display: inline-flex;
  width: fit-content;
  min-width: 44px;
  height: 28px;
  align-items: center;
  justify-content: center;
  justify-self: end;
  padding: 0 9px;
  border-radius: 14px;
  background: #263a43;
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.simulation-flow-header__spacer {
  width: 44px;
  height: 28px;
}
</style>
