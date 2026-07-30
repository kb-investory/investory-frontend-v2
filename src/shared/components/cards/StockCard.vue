<script setup>
defineProps({
  symbol: {
    type: String,
    default: 'S',
  },
  name: {
    type: String,
    default: '삼성전자',
  },
  quantity: {
    type: [Number, String],
    default: '10주',
  },
  avgPrice: {
    type: String,
    default: '105,500원',
  },
  valuation: {
    type: String,
    default: '10,172,889원',
  },
})
</script>

<template>
  <div class="stock-card">
    <div class="stock-card__icon-wrapper">
      <span class="stock-card__symbol">{{ symbol }}</span>
    </div>

    <div class="stock-card__info">
      <h3 class="stock-card__name">{{ name }}</h3>
      <p class="stock-card__meta">
        {{ quantity }} · 평단 {{ avgPrice }}
        <span class="stock-card__valuation">평가금액 <strong>{{ valuation }}</strong></span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.stock-card {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #dce6e9;
  border-radius: 14px;
  background: #ffffff;
}

.stock-card__icon-wrapper {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #2b52dd;
  color: #ffffff;
  flex-shrink: 0;
}

.stock-card__symbol {
  font-family: var(--font-heading);
  font-size: 15px;
  font-weight: 700;
}

.stock-card__info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stock-card__name {
  margin: 0;
  color: #18272d;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
}

.stock-card__meta {
  margin: 0;
  color: #94948e;
  font-family: var(--font-sans);
  font-size: 11px;

  .stock-card__valuation {
    margin-left: 6px;

    strong {
      color: #181817;
      font-weight: 700;
    }
  }
}
</style>
