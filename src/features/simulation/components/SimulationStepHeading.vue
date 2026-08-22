<script setup>
defineProps({
  step: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="step-heading">
    <span class="step-heading__num" aria-hidden="true">{{ step }}</span>
    <strong class="step-heading__title">{{ title }}</strong>
    <span v-if="$slots.meta" class="step-heading__meta"><slot name="meta" /></span>
  </div>
</template>

<style scoped>
/* 두 단계가 한 화면에 이어지므로 번호로 순서를 드러낸다. */
.step-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-heading__num {
  display: grid;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 7px;
  color: #ffffff;
  background: #087f7c;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.step-heading__title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #20373f;
  font-size: var(--font-size-body);
  font-weight: 800;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-heading__meta {
  flex: 0 0 auto;
  padding: 4px 9px;
  border-radius: 999px;
  color: #087f7c;
  background: #effaf9;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
</style>
