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
  // 라이브 화면은 그래프와 같은 짙은 배경을 쓰므로 헤더도 함께 어두워져야 한다.
  tone: {
    type: String,
    default: 'light',
  },
})

defineEmits(['back'])
</script>

<template>
  <header class="simulation-flow-header" :class="`simulation-flow-header--${tone}`">
    <button
      type="button"
      class="simulation-flow-header__back"
      aria-label="뒤로가기"
      @click="$emit('back')"
    >
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

.simulation-flow-header--dark {
  background: #1b333d;
}

.simulation-flow-header--dark .simulation-flow-header__back {
  border-color: rgb(255 255 255 / 14%) !important;
  color: #e8f1f2;
  background: rgb(255 255 255 / 7%) !important;
}

.simulation-flow-header--dark .simulation-flow-header__back:hover {
  background: rgb(255 255 255 / 13%) !important;
}

.simulation-flow-header--dark h1 {
  color: #f2f7f8;
}

.simulation-flow-header--dark .simulation-flow-header__step {
  color: #1b333d;
  background: #7fd8d6;
}

.simulation-flow-header__back {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #e1e8e8;
  border-radius: 50%;
  background: #ffffff;
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
  font-size: var(--font-size-title-md);
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
  font-size: var(--font-size-caption);
  font-weight: 700;
  white-space: nowrap;
}

.simulation-flow-header__spacer {
  width: 44px;
  height: 28px;
}
</style>
