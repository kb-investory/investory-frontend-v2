<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseBadge from '@/shared/components/badges/BaseBadge.vue'

defineProps({
  journal: {
    type: Object,
    required: true,
  },
})

function formatMood(mood) {
  const map = {
    CAUTIOUS: '신중',
    CONFIDENT: '확신',
    ANXIOUS: '불안',
    CALM: '평온',
  }
  return map[mood] || mood || '기록'
}
</script>

<template>
  <article class="journal-card">
    <header class="journal-card__meta">
      <span class="journal-card__date">
        <span class="journal-card__marker" />
        <time>{{ journal.journalDate || journal.createdAt }}</time>
      </span>
      <BaseBadge :label="journal.type || formatMood(journal.marketMood)" />
    </header>

    <h2>{{ journal.title || `${journal.journalDate || '일지'} 매매 기록` }}</h2>

    <div class="journal-card__judgment">
      <span />
      <p>{{ journal.marketThought || journal.judgment || journal.content }}</p>
    </div>

    <div v-if="journal.reasons?.length" class="journal-card__reasons">
      <strong>판단 근거</strong>
      <ul>
        <li v-for="reason in journal.reasons" :key="reason">{{ reason }}</li>
      </ul>
    </div>

    <footer v-if="journal.reviewCondition || journal.tradeCount" class="journal-card__condition">
      <span>
        <small>관련 기록 수</small>
        <strong>{{ journal.reviewCondition || `${journal.tradeCount || 0}건 거래` }}</strong>
      </span>
      <AppIcon name="arrow-up-right" :size="18" />
    </footer>
  </article>
</template>

<style scoped>
.journal-card {
  display: grid;
  gap: 9px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.journal-card__meta,
.journal-card__date,
.journal-card__condition {
  display: flex;
  align-items: center;
}

.journal-card__meta,
.journal-card__condition {
  justify-content: space-between;
}

.journal-card__date {
  gap: 7px;
}

.journal-card__marker {
  width: 8px;
  height: 8px;
  border: 1px solid var(--color-primary-strong);
  border-radius: 50%;
  background: var(--color-primary);
}

time {
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 600;
}

h2,
p,
ul {
  margin: 0;
}

h2 {
  font-size: var(--font-size-body);
  color: var(--color-heading);
}

.journal-card__judgment {
  display: flex;
  min-height: 54px;
  align-items: stretch;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--color-primary-subtle);
}

.journal-card__judgment > span {
  width: 3px;
  border-radius: 2px;
  background: var(--color-primary);
}

.journal-card__judgment p {
  flex: 1;
  font-size: var(--font-size-caption);
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-heading);
}

.journal-card__reasons {
  display: grid;
  gap: 4px;
}

.journal-card__reasons strong {
  font-size: var(--font-size-caption);
}

.journal-card__reasons ul {
  padding-left: 17px;
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.journal-card__condition {
  padding-top: 10px;
  border-top: 1px solid var(--color-border-subtle);
  color: var(--color-text-muted);
}

.journal-card__condition > span {
  display: grid;
  gap: 3px;
}

.journal-card__condition small {
  color: var(--color-text-subtle);
  font-size: var(--font-size-caption);
  font-weight: 600;
}

.journal-card__condition strong {
  color: var(--color-heading);
  font-size: var(--font-size-caption);
  font-weight: 500;
}
</style>
