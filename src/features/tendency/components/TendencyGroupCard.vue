<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  label: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  results: {
    type: Array,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    default: 'selection',
  },
})

defineEmits(['select'])
</script>

<template>
  <section class="group-card" :class="`group-card--${variant}`">
    <header class="group-card__header">
      <span class="group-card__icon">
        <AppIcon :name="icon" :size="17" />
      </span>
      <div>
        <p class="group-card__label">{{ label }}</p>
        <h2 class="group-card__summary">{{ summary }}</h2>
      </div>
    </header>

    <div class="group-card__results">
      <button
        v-for="result in results"
        :key="result.dimension.code"
        type="button"
        class="result-card"
        :class="`result-card--${result.dimension.tone}`"
        :aria-label="`${result.dimension.name} ${result.type.name} 상세 보기`"
        @click="$emit('select', result)"
      >
        <span class="result-card__dimension">{{ result.dimension.name }}</span>
        <strong class="result-card__type">{{ result.type.name }}</strong>
      </button>
    </div>
  </section>
</template>

<style scoped>
.group-card {
  display: grid;
  gap: 14px;
  padding: 16px 12px 14px;
  border: 1px solid #dfe7e7;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 3px 12px rgba(24, 39, 45, 0.035);
}

.group-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-card__icon {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #0b8f8b;
  color: #ffffff;
}

.group-card--behavior .group-card__icon {
  background: #18272d;
  color: #53e0d7;
}

.group-card__label,
.group-card__summary {
  margin: 0;
}

.group-card__label {
  margin-bottom: 2px;
  color: #74746f;
  font-size: var(--font-size-caption);
  line-height: 1.3;
}

.group-card__summary {
  color: #181817;
  font-family: var(--font-heading);
  font-size: var(--font-size-body);
  font-weight: 750;
  line-height: 1.35;
  letter-spacing: -0.035em;
}

.group-card__results {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.result-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 76px;
  padding: 9px 7px;
  border: 1px solid transparent;
  border-radius: 9px;
  cursor: pointer;
  text-align: center;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.result-card:hover,
.result-card:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgba(24, 39, 45, 0.1);
  outline: none;
}

.result-card__dimension {
  display: flex;
  width: 100%;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  color: currentColor;
  font-size: var(--font-size-caption);
  font-weight: 600;
  line-height: 1.3;
  word-break: keep-all;
}

.result-card__type {
  display: block;
  width: 100%;
  margin-top: 4px;
  color: currentColor;
  font-size: var(--font-size-caption);
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.04em;
  word-break: keep-all;
}

.result-card--amber {
  border-color: #f3cf72;
  background: #fff7df;
  color: #9a6900;
}

.result-card--blue {
  border-color: #9fc9fa;
  background: #edf6ff;
  color: #246bbb;
}

.result-card--green {
  border-color: #9edcc4;
  background: #ecfaf4;
  color: #22785c;
}

.result-card--violet {
  border-color: #c8b4f3;
  background: #f5f0ff;
  color: #6950aa;
}

.result-card--red {
  border-color: #f4b1b3;
  background: #fff0f0;
  color: #c54a50;
}

.result-card--emerald {
  border-color: #a6ddb8;
  background: #edfaf1;
  color: #2c8050;
}

.result-card--orange {
  border-color: #f2bf9f;
  background: #fff4ec;
  color: #bd6331;
}

.result-card--indigo {
  border-color: #aebded;
  background: #f0f3ff;
  color: #4d65b1;
}
</style>
