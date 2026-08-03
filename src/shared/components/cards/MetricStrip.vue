<script setup>
defineProps({
  metrics: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <dl class="metric-strip">
    <div v-for="metric in metrics" :key="metric.label" class="metric-strip__item">
      <dt>{{ metric.label }}</dt>
      <dd :class="{ 'metric-strip__value--danger': metric.tone === 'danger' }">
        {{ metric.value }}
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.metric-strip {
  display: flex;
  width: 100%;
  min-height: 64px;
  margin: 0;
  border-block: 1px solid var(--color-border);
  background: var(--color-surface);
}

.metric-strip__item {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 0 12px;
}

.metric-strip__item + .metric-strip__item {
  border-left: 1px solid var(--color-border-subtle);
}

dt {
  color: var(--color-text-subtle);
  font-size: 10px;
}

dd {
  margin: 0;
  color: var(--color-heading);
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 700;
}

.metric-strip__value--danger {
  color: var(--color-danger);
}
</style>
