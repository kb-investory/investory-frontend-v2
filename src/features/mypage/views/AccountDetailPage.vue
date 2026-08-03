<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { useMypageStore } from '@/features/mypage/stores/mypageStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import MobileStatusBar from '@/shared/components/MobileStatusBar.vue'

const route = useRoute()
const router = useRouter()
const mypageStore = useMypageStore()
const disconnectOpen = ref(false)
const disconnecting = ref(false)
const syncNotice = ref('')

const accountId = computed(() => Number(route.params.accountId))
const account = computed(() => mypageStore.accountDetail)
const isConnected = computed(() => account.value?.status === 'CONNECTED')

function formatCurrency(value) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatCompactCurrency(value) {
  const amount = Number(value || 0)
  if (amount >= 1000000) {
    return `₩${(amount / 1000000).toFixed(2).replace(/\.00$/, '')}M`
  }
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

async function syncAccount() {
  if (mypageStore.syncingAccountDetail) return
  syncNotice.value = ''
  const result = await mypageStore.syncAccountDetail(accountId.value)
  if (result) syncNotice.value = '계좌 데이터를 최신 상태로 반영했어요.'
}

function reconnectBroker() {
  router.push({
    name: ROUTE_NAMES.BROKER_LOGIN,
    query: { brokerId: account.value.brokerId, reconnect: 'true' },
  })
}

async function disconnectBroker() {
  if (!account.value || disconnecting.value) return
  disconnecting.value = true
  try {
    await mypageStore.disconnectAccount(account.value.accountId)
    await router.replace({ name: ROUTE_NAMES.MYPAGE_ACCOUNTS })
  } finally {
    disconnecting.value = false
  }
}

onMounted(() => mypageStore.fetchAccountDetail(accountId.value))
</script>

<template>
  <div class="account-detail-page">
    <MobileStatusBar />

    <header class="detail-app-bar">
      <button
        type="button"
        aria-label="연결 계좌 관리로 돌아가기"
        @click="router.push({ name: ROUTE_NAMES.MYPAGE_ACCOUNTS })"
      >
        <AppIcon name="chevron-left" :size="19" />
      </button>
      <strong>계좌 상세</strong>
      <span />
    </header>

    <BaseLoading v-if="mypageStore.loading" class="detail-loading" />

    <main v-else-if="account" class="detail-content">
      <section class="account-hero">
        <div class="account-hero__top">
          <span class="account-hero__icon"><AppIcon name="activity" :size="20" /></span>
          <div>
            <h1>{{ account.brokerName }}</h1>
            <p>{{ account.accountType }} · {{ account.accountNumber }}</p>
          </div>
          <span class="account-hero__status" :class="{ 'is-error': !isConnected }">
            <i /> {{ isConnected ? '연결 정상' : account.statusLabel }}
          </span>
        </div>
        <div class="account-hero__value">
          <small><AppIcon name="briefcase-business" :size="12" /> 주식 평가금액</small>
          <strong>{{ formatCurrency(account.marketValue) }}</strong>
        </div>
      </section>

      <section class="asset-summary-section">
        <h2>보유자산 요약</h2>
        <div class="asset-summary">
          <dl>
            <dt>주식 평가금액</dt>
            <dd>{{ formatCompactCurrency(account.marketValue) }}</dd>
          </dl>
          <dl>
            <dt>보유 종목</dt>
            <dd>{{ account.holdingCount }}개</dd>
          </dl>
        </div>
      </section>

      <section class="sync-card">
        <span><AppIcon name="refresh-cw" :size="19" /></span>
        <div>
          <strong>{{ isConnected ? '연결 상태가 정상이에요' : '연결 상태를 확인해주세요' }}</strong>
          <p>마지막 동기화 · {{ formatTime(account.lastSyncedAt, { withDay: true }) }}</p>
        </div>
        <button type="button" :disabled="mypageStore.syncingAccountDetail" @click="syncAccount">
          {{ mypageStore.syncingAccountDetail ? '동기화 중' : '동기화' }}
        </button>
      </section>

      <p v-if="syncNotice" class="sync-notice" role="status">{{ syncNotice }}</p>

      <section class="recent-section">
        <header>
          <h2>최근 데이터 요약</h2>
          <span>최신 거래 · 보유 스냅샷</span>
        </header>
        <div class="recent-list">
          <article>
            <span><AppIcon name="arrow-right" :size="16" /></span>
            <div>
              <strong>최근 거래</strong>
              <p>
                {{ formatTime(account.latestTrade?.tradedAt, { withDay: true }) }} ·
                {{ account.latestTrade?.securityName }} {{ account.latestTrade?.quantity }}주
                {{ account.latestTrade?.side === 'SELL' ? '매도' : '매수' }}
              </p>
            </div>
          </article>
          <article>
            <span><AppIcon name="history" :size="16" /></span>
            <div>
              <strong>보유자산 반영</strong>
              <p>
                {{ account.holdingSnapshot?.holdingCount }}개 종목 · 평가금액
                {{ formatCompactCurrency(account.holdingSnapshot?.marketValue) }}
              </p>
            </div>
          </article>
        </div>
      </section>

      <section class="connection-section">
        <h2>증권사 연결 관리</h2>
        <div class="connection-actions">
          <button type="button" @click="reconnectBroker">
            <AppIcon name="link" :size="17" />
            <span>{{ account.brokerName }} 재연결</span>
            <AppIcon name="chevron-right" :size="15" />
          </button>
          <button type="button" class="danger" @click="disconnectOpen = true">
            <AppIcon name="link-2-off" :size="17" />
            <span>{{ account.brokerName }} 연결 해제</span>
            <AppIcon name="chevron-right" :size="15" />
          </button>
        </div>
      </section>
    </main>

    <main v-else class="detail-empty">
      <AppIcon name="wallet-cards" :size="30" />
      <h1>계좌 정보를 찾을 수 없어요</h1>
      <button type="button" @click="router.push({ name: ROUTE_NAMES.MYPAGE_ACCOUNTS })">
        연결 계좌 관리로 돌아가기
      </button>
    </main>

    <div v-if="disconnectOpen" class="disconnect-overlay" @click.self="disconnectOpen = false">
      <section class="disconnect-dialog" role="dialog" aria-modal="true">
        <span><AppIcon name="link-2-off" :size="22" /></span>
        <h2>{{ account.brokerName }} 연결을 해제할까요?</h2>
        <p>같은 증권사에 연결된 계좌가 모두 해제돼요. 기존에 작성한 투자 일지는 보존됩니다.</p>
        <div>
          <button type="button" @click="disconnectOpen = false">취소</button>
          <button type="button" :disabled="disconnecting" @click="disconnectBroker">
            {{ disconnecting ? '해제 중...' : '연결 해제' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.account-detail-page {
  min-height: 100%;
  background: #ffffff;
  color: #263a3f;
}
.account-detail-page :deep(.mobile-status-bar) {
  height: 44px;
  padding: 0 18px;
  background: #ffffff;
  font-size: 10px;
}
.detail-app-bar {
  display: grid;
  min-height: 54px;
  grid-template-columns: 38px 1fr 38px;
  align-items: center;
  padding: 0 18px 8px;
}
.detail-app-bar button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid #dce7e8;
  border-radius: 50%;
  background: #ffffff;
  color: #456166;
  cursor: pointer;
}
.detail-app-bar strong {
  padding-left: 8px;
  font-size: 17px;
}
.detail-loading {
  min-height: 520px;
}
.detail-content {
  display: grid;
  gap: 13px;
  padding: 0 18px 24px;
}
.account-hero {
  display: grid;
  gap: 18px;
  padding: 15px;
  border-radius: 17px;
  background: #233f48;
  color: #ffffff;
  box-shadow: 0 5px 13px rgba(24, 58, 66, 0.16);
}
.account-hero__top {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}
.account-hero__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: #eaf9f8;
  color: #078f8a;
}
.account-hero h1 {
  margin: 0;
  font-size: 13px;
}
.account-hero p {
  margin: 4px 0 0;
  color: #c7d5d7;
  font-size: 7px;
}
.account-hero__status {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 999px;
  background: #0d726e;
  color: #dffffc;
  font-size: 7px;
  font-weight: 800;
}
.account-hero__status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #20d1c5;
}
.account-hero__status.is-error {
  background: #8e542e;
}
.account-hero__value {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.account-hero__value small {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #b9c9cc;
  font-size: 7px;
}
.account-hero__value strong {
  font-size: 21px;
  letter-spacing: -0.04em;
}
.asset-summary-section,
.recent-section,
.connection-section {
  display: grid;
  gap: 7px;
}
.asset-summary-section h2,
.recent-section h2,
.connection-section h2 {
  margin: 0;
  font-size: 10px;
}
.asset-summary {
  display: grid;
  overflow: hidden;
  grid-template-columns: repeat(2, 1fr);
  border: 1px solid #dce6e7;
  border-radius: 14px;
}
.asset-summary dl {
  margin: 0;
  padding: 14px 12px;
  border-right: 1px solid #e7eded;
}
.asset-summary dl:last-child {
  border-right: 0;
}
.asset-summary dt {
  color: #829093;
  font-size: 7px;
}
.asset-summary dd {
  margin: 7px 0 0;
  color: #078e89;
  font-size: 11px;
  font-weight: 850;
}
.sync-card {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #c9e4e2;
  border-radius: 14px;
  background: #edf8f7;
}
.sync-card > span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: #07968f;
  color: #ffffff;
}
.sync-card strong {
  font-size: 9px;
}
.sync-card p {
  margin: 4px 0 0;
  color: #78878a;
  font-size: 7px;
}
.sync-card button {
  min-height: 31px;
  padding: 0 11px;
  border: 1px solid #b9dcda;
  border-radius: 999px;
  background: #ffffff;
  color: #078d88;
  cursor: pointer;
  font-size: 8px;
  font-weight: 800;
}
.sync-card button:disabled {
  opacity: 0.55;
  cursor: wait;
}
.sync-notice {
  margin: -6px 0 0;
  color: #078d88;
  font-size: 7px;
  text-align: center;
}
.recent-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.recent-section header span {
  color: #929da0;
  font-size: 7px;
}
.recent-list,
.connection-actions {
  overflow: hidden;
  border: 1px solid #dce6e7;
  border-radius: 14px;
  background: #ffffff;
}
.recent-list article {
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: center;
  gap: 7px;
  padding: 11px;
  border-bottom: 1px solid #e8eeee;
}
.recent-list article:last-child {
  border-bottom: 0;
}
.recent-list article > span {
  color: #07918c;
}
.recent-list strong {
  font-size: 9px;
}
.recent-list p {
  margin: 3px 0 0;
  color: #758487;
  font-size: 7px;
}
.connection-actions button {
  display: grid;
  width: 100%;
  min-height: 48px;
  grid-template-columns: 25px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  border: 0;
  border-bottom: 1px solid #e8eeee;
  background: #ffffff;
  color: #3b5155;
  cursor: pointer;
  font-size: 9px;
  text-align: left;
}
.connection-actions button:last-child {
  border-bottom: 0;
}
.connection-actions button.danger {
  color: #ef4f55;
}
.detail-empty {
  display: flex;
  min-height: 520px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #718083;
  text-align: center;
}
.detail-empty h1 {
  font-size: 16px;
}
.detail-empty button {
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 9px;
  background: #193b43;
  color: #ffffff;
}
.disconnect-overlay {
  position: fixed;
  z-index: 300;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background: rgba(20, 32, 35, 0.55);
}
.disconnect-dialog {
  width: min(100%, 340px);
  padding: 20px;
  border-radius: 17px;
  background: #ffffff;
}
.disconnect-dialog > span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 12px;
  background: #fff0ee;
  color: #df514e;
}
.disconnect-dialog h2 {
  margin: 12px 0 6px;
  font-size: 16px;
}
.disconnect-dialog p {
  color: #718083;
  font-size: 9px;
  line-height: 1.6;
}
.disconnect-dialog > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 15px;
}
.disconnect-dialog button {
  min-height: 40px;
  border: 0;
  border-radius: 9px;
  background: #edf1f1;
  cursor: pointer;
}
.disconnect-dialog button:last-child {
  background: #e45354;
  color: #ffffff;
}
</style>
