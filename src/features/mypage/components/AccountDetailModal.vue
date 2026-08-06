<script setup>
import { computed, ref } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const props = defineProps({
  account: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  syncing: { type: Boolean, default: false },
  disconnecting: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'sync', 'disconnect'])
const disconnectConfirmOpen = ref(false)
const isConnected = computed(() => props.account?.status === 'CONNECTED')

function formatCurrency(value) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatCompactCurrency(value) {
  const amount = Number(value || 0)
  if (amount >= 1000000) return `₩${(amount / 1000000).toFixed(2).replace(/\.00$/, '')}M`
  return formatCurrency(amount)
}

function formatTime(value, { withDay = false } = {}) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const time = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
  if (!withDay) return time

  const today = new Date()
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  return `${isToday ? '오늘' : `${date.getMonth() + 1}.${date.getDate()}`} ${time}`
}
</script>

<template>
  <div class="detail-modal-overlay" role="presentation" @click.self="emit('close')">
    <section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
      <header class="detail-modal__header">
        <div>
          <h2 id="account-title">계좌 상세</h2>
          <p v-if="account">{{ account.brokerName }} · {{ account.accountType }}</p>
        </div>
        <button type="button" aria-label="계좌 상세 닫기" @click="emit('close')">
          <AppIcon name="x" :size="18" />
        </button>
      </header>

      <BaseLoading v-if="loading || !account" class="detail-modal__loading" />

      <div v-else class="detail-modal__content">
        <section class="account-hero">
          <div class="account-hero__top">
            <span class="account-hero__icon"><AppIcon name="activity" :size="19" /></span>
            <div>
              <h3>{{ account.brokerName }}</h3>
              <p>{{ account.accountType }} · {{ account.accountNumber }}</p>
            </div>
            <span class="account-hero__status" :class="{ 'is-error': !isConnected }">
              <i /> {{ isConnected ? '연결 정상' : account.statusLabel }}
            </span>
          </div>
          <div class="account-hero__value">
            <small><AppIcon name="briefcase-business" :size="11" /> 주식 평가금액</small>
            <strong>{{ formatCurrency(account.marketValue) }}</strong>
          </div>
          <div class="account-hero__holding">
            <span>보유 종목</span>
            <strong>{{ account.holdingCount }}개</strong>
          </div>
        </section>

        <section class="sync-card">
          <span><AppIcon name="refresh-cw" :size="18" /></span>
          <div>
            <strong>{{
              isConnected ? '연결 상태가 정상이에요' : '연결 상태를 확인해주세요'
            }}</strong>
            <p>마지막 동기화 · {{ formatTime(account.lastSyncedAt, { withDay: true }) }}</p>
          </div>
          <button type="button" :disabled="syncing" @click="emit('sync')">
            {{ syncing ? '동기화 중' : '동기화' }}
          </button>
        </section>

        <section class="recent-section">
          <header>
            <h3>최근 거래</h3>
            <span v-if="account.latestTrade">
              {{ formatTime(account.latestTrade.tradedAt, { withDay: true }) }} 기준
            </span>
          </header>
          <article v-if="account.latestTrade">
            <span><AppIcon name="arrow-right" :size="16" /></span>
            <div>
              <strong>
                {{ account.latestTrade.securityName }} {{ account.latestTrade.quantity }}주
                {{ account.latestTrade.side === 'SELL' ? '매도' : '매수' }}
              </strong>
              <p>
                {{ formatTime(account.latestTrade.tradedAt, { withDay: true }) }} ·
                {{ account.latestTrade.side === 'SELL' ? '매도' : '매수' }} 체결 · 평가금액
                {{ formatCompactCurrency(account.marketValue) }}
              </p>
            </div>
          </article>
          <p v-else class="recent-section__empty">최근 거래 내역이 아직 없어요.</p>
        </section>

        <section class="connection-section">
          <h3>증권사 연결 관리</h3>
          <button type="button" @click="disconnectConfirmOpen = true">
            <AppIcon name="link-2-off" :size="16" />
            <span>{{ account.brokerName }} 연결 해제</span>
            <AppIcon name="chevron-right" :size="14" />
          </button>
        </section>
      </div>
    </section>

    <div
      v-if="disconnectConfirmOpen"
      class="disconnect-overlay"
      @click.self="disconnectConfirmOpen = false"
    >
      <section class="disconnect-dialog" role="alertdialog" aria-modal="true">
        <span><AppIcon name="link-2-off" :size="21" /></span>
        <h2>{{ account.brokerName }} 연결을 해제할까요?</h2>
        <p>같은 증권사에 연결된 계좌가 모두 해제되며, 기존 투자 일지는 보존됩니다.</p>
        <div>
          <button type="button" @click="disconnectConfirmOpen = false">취소</button>
          <button type="button" :disabled="disconnecting" @click="emit('disconnect')">
            {{ disconnecting ? '해제 중...' : '연결 해제' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.detail-modal-overlay {
  position: fixed;
  z-index: 250;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 74px 16px 78px;
  background: rgba(30, 49, 53, 0.68);
}
.detail-modal {
  width: min(100%, 354px);
  max-height: 100%;
  overflow: auto;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 50px rgba(10, 25, 28, 0.28);
  scrollbar-width: none;
}
.detail-modal::-webkit-scrollbar {
  display: none;
}
.detail-modal__header {
  position: sticky;
  z-index: 2;
  top: 0;
  display: flex;
  min-height: 59px;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border-bottom: 1px solid #e8eeee;
  background: #fff;
}
.detail-modal__header h2,
.detail-modal__header p {
  margin: 0;
}
.detail-modal__header h2 {
  font-size: 15px;
}
.detail-modal__header p {
  margin-top: 3px;
  color: #879396;
  font-size: 7px;
}
.detail-modal__header button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #f2f5f5;
  color: #6c797c;
  cursor: pointer;
}
.detail-modal__loading {
  min-height: 330px;
}
.detail-modal__content {
  display: grid;
  gap: 10px;
  padding: 12px 14px 15px;
}
.account-hero {
  display: grid;
  gap: 13px;
  padding: 14px;
  border-radius: 15px;
  background: #223f47;
  color: #fff;
}
.account-hero__top {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}
.account-hero__icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: #e9f8f7;
  color: #078f8a;
}
.account-hero h3,
.account-hero p {
  margin: 0;
}
.account-hero h3 {
  font-size: 12px;
}
.account-hero p {
  margin-top: 3px;
  color: #d4e0e1;
  font-size: 7px;
}
.account-hero__status {
  display: inline-flex;
  min-height: 21px;
  align-items: center;
  gap: 4px;
  padding: 0 7px;
  border-radius: 999px;
  background: #0d6e6b;
  color: #dffbf8;
  font-size: 7px;
  font-weight: 750;
}
.account-hero__status i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #27d0c4;
}
.account-hero__status.is-error {
  background: #874d36;
}
.account-hero__value {
  display: flex;
  align-items: end;
  justify-content: space-between;
}
.account-hero__value small {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #b8c8ca;
  font-size: 7px;
}
.account-hero__value strong {
  font-size: 18px;
}
.account-hero__holding {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  color: #b8c8ca;
  font-size: 7px;
}
.account-hero__holding strong {
  color: #fff;
}
.sync-card {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid #cde7e5;
  border-radius: 12px;
  background: #eef9f8;
}
.sync-card > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: #07948e;
  color: #fff;
}
.sync-card strong {
  font-size: 8px;
}
.sync-card p {
  margin: 3px 0 0;
  color: #78878a;
  font-size: 6px;
}
.sync-card button {
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid #bddfdd;
  border-radius: 999px;
  background: #fff;
  color: #078d88;
  cursor: pointer;
  font-size: 7px;
  font-weight: 800;
}
.recent-section,
.connection-section {
  display: grid;
  gap: 6px;
}
.recent-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.recent-section h3,
.connection-section h3 {
  margin: 0;
  font-size: 9px;
}
.recent-section > header span {
  color: #8b9799;
  font-size: 6px;
}
.recent-section article,
.connection-section button {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 9px;
  border: 1px solid #e0e8e8;
  border-radius: 11px;
  background: #fff;
}
.recent-section article > span {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 8px;
  background: #e9f8f7;
  color: #078d88;
}
.recent-section__empty {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  margin: 0;
  border: 1px solid #e0e8e8;
  border-radius: 11px;
  background: #fff;
  color: #8b9799;
  font-size: 7px;
}
.recent-section strong {
  font-size: 8px;
}
.recent-section p {
  margin: 3px 0 0;
  color: #7c898c;
  font-size: 6px;
}
.connection-section button {
  width: 100%;
  border: 1px solid #f0dfdf;
  color: #e05054;
  cursor: pointer;
  font-size: 8px;
  text-align: left;
}
.disconnect-overlay {
  position: absolute;
  z-index: 3;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(25, 39, 42, 0.6);
}
.disconnect-dialog {
  width: min(100%, 310px);
  padding: 18px;
  border-radius: 16px;
  background: #fff;
}
.disconnect-dialog > span {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 11px;
  background: #fff0ee;
  color: #df514e;
}
.disconnect-dialog h2 {
  margin: 11px 0 5px;
  font-size: 15px;
}
.disconnect-dialog p {
  margin: 0;
  color: #718083;
  font-size: 9px;
  line-height: 1.55;
}
.disconnect-dialog > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 14px;
}
.disconnect-dialog button {
  min-height: 38px;
  border: 0;
  border-radius: 9px;
  background: #edf1f1;
  cursor: pointer;
}
.disconnect-dialog button:last-child {
  background: #e45354;
  color: #fff;
}
</style>
