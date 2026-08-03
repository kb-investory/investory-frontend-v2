<script setup>
defineProps({
  item: {
    type: Object,
    required: true,
  },
  isLast: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <article class="timeline-item">
    <!-- 시각 -->
    <div class="timeline-item__time-col">
      <time class="timeline-item__time">{{ item.time }}</time>
    </div>

    <!-- 타임라인 수직선 및 마커 -->
    <div class="timeline-item__line-col">
      <div
        class="timeline-item__marker"
        :class="`timeline-item__marker--${item.actionType || 'buy'}`"
      />
      <div class="timeline-item__line" />
    </div>

    <!-- 일지 내용 -->
    <div class="timeline-item__content">
      <div class="timeline-item__meta">
        <span
          class="timeline-item__badge"
          :class="`timeline-item__badge--${item.actionType || 'buy'}`"
        >
          {{ item.actionTypeLabel }}
        </span>
      </div>

      <h3 class="timeline-item__title">{{ item.stock }} · {{ item.title }}</h3>

      <div class="timeline-item__metric">
        <span class="timeline-item__unit-price">
          평단 {{ item.formattedUnitPrice }}원 · 기록 이후
        </span>
        <span class="timeline-item__return-rate" :class="item.returnRateClass">
          {{ item.returnRate > 0 ? '+' : '' }}{{ item.returnRate }}%
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.timeline-item {
  display: flex;
  width: 100%;
  min-height: 86px;
  gap: 10px;
  align-items: stretch;
}

.timeline-item__time-col {
  display: flex;
  width: 40px;
  flex-shrink: 0;
  padding-top: 2px;
}

.timeline-item__time {
  color: var(--color-text-subtle);
  font-family: var(--font-mono);
  font-size: 10px;
}

.timeline-item__line-col {
  display: flex;
  width: 12px;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  align-self: stretch;
  gap: 3px;
  padding-top: 4px;
}

/* 마커 스타일 */
.timeline-item__marker {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
}

.timeline-item__marker--buy {
  border: 1px solid #a77900;
  background: #e8b931;
}

.timeline-item__marker--sell,
.timeline-item__marker--hold {
  border: 1.5px solid #181817;
  background: #ffffff;
}

/* 수직 연결선 */
.timeline-item__line {
  width: 1px;
  min-height: 20px;
  flex: 1;
  background: var(--color-border);
}

.timeline-item__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 9px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.timeline-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 배지 스타일 */
.timeline-item__badge {
  display: inline-block;
  padding: 3px 7px;
  border-radius: 5px;
  color: var(--color-heading);
  font-size: 10px;
  font-weight: 600;
}

.timeline-item__badge--buy {
  background: #fff2bd;
}

.timeline-item__badge--sell {
  background: #fff9e7;
}

.timeline-item__badge--hold {
  background: #f4f4f1;
}

.timeline-item__title {
  margin: 0;
  color: var(--color-heading);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.timeline-item__metric {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.timeline-item__unit-price {
  color: var(--color-text-muted);
}

.timeline-item__return-rate {
  font-family: Inter, system-ui, sans-serif;
  font-weight: 700;
}
</style>
