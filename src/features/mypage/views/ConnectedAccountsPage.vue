<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import AccountDetailModal from '@/features/mypage/components/AccountDetailModal.vue'
import { useMypageStore } from '@/features/mypage/stores/mypageStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const router = useRouter()
const mypageStore = useMypageStore()
const notice = ref('')
const detailOpen = ref(false)
const disconnecting = ref(false)

const overallStatus = computed(() => {
  if (!mypageStore.accounts.length) return '미연결'
  if (mypageStore.errorAccountCount) return '확인 필요'
  return '정상'
})
const syncStatusLabel = computed(() => {
  if (mypageStore.syncing) return '전체 계좌 동기화 중'
  if (mypageStore.errorAccountCount) return '일부 계좌 확인 필요'
  return '모든 계좌 동기화 완료'
})

function formatSyncTime(value, { includeDate = false } = {}) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    ...(includeDate ? { month: '2-digit', day: '2-digit' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

async function openAccount(account) {
  detailOpen.value = true
  mypageStore.accountDetail = null
  await mypageStore.fetchAccountDetail(account.accountId)
}

function closeAccountDetail() {
  if (disconnecting.value) return
  detailOpen.value = false
}

async function syncAccountDetail() {
  const accountId = mypageStore.accountDetail?.accountId
  if (!accountId) return
  const result = await mypageStore.syncAccountDetail(accountId)
  if (result) notice.value = `${result.brokerName} 계좌를 최신 상태로 동기화했어요.`
}

async function disconnectSelectedBroker() {
  const account = mypageStore.accountDetail
  if (!account || disconnecting.value) return
  disconnecting.value = true
  try {
    await mypageStore.disconnectBroker(account.brokerId)
    detailOpen.value = false
    notice.value = `${account.brokerName} 연결을 해제했어요. 기존 투자 일지는 보존됩니다.`
  } catch (error) {
    notice.value = error instanceof Error ? error.message : '증권사 연결을 해제하지 못했어요.'
  } finally {
    disconnecting.value = false
  }
}

async function retryAccount(account) {
  notice.value = ''
  await mypageStore.retryAccount(account.accountId)
  notice.value = `${account.brokerName} 계좌 동기화를 완료했어요.`
}

onMounted(() => mypageStore.fetchAccounts())
</script>

<template>
  <div class="accounts-page">
    <header class="accounts-app-bar">
      <button
        type="button"
        aria-label="마이페이지로 돌아가기"
        @click="router.push({ name: ROUTE_NAMES.MYPAGE })"
      >
        <AppIcon name="chevron-left" :size="18" />
      </button>
      <strong>연결 계좌 관리</strong>
      <span />
    </header>

    <BaseLoading v-if="mypageStore.loading" class="accounts-loading" />

    <main v-else class="accounts-content">
      <header class="accounts-hero">
        <h1>내 자산을 한곳에서 확인하세요</h1>
        <p>연결된 계좌의 잔고와 거래 내역을 안전하게 동기화합니다.</p>
      </header>

      <section v-if="mypageStore.accounts.length" class="account-summary">
        <header>
          <span><i /> {{ syncStatusLabel }}</span>
          <button
            type="button"
            :disabled="mypageStore.syncing"
            aria-label="전체 연결 계좌 새로고침"
            @click="mypageStore.syncAllAccounts()"
          >
            <AppIcon name="refresh-cw" :size="15" :class="{ spinning: mypageStore.syncing }" />
          </button>
        </header>
        <div>
          <dl>
            <dt>연결 계좌</dt>
            <dd>{{ mypageStore.accounts.length }}개</dd>
          </dl>
          <dl>
            <dt>상태</dt>
            <dd>{{ overallStatus }}</dd>
          </dl>
          <dl>
            <dt>마지막 업데이트</dt>
            <dd>{{ formatSyncTime(mypageStore.lastSyncedAt) }}</dd>
          </dl>
        </div>
        <p v-if="mypageStore.syncing" role="status">자산과 거래 데이터를 동기화하고 있어요...</p>
        <p
          v-else-if="
            mypageStore.lastSyncResult?.assetsRefreshed &&
            mypageStore.lastSyncResult?.transactionsRefreshed
          "
          role="status"
        >
          자산과 거래 데이터를 최신 상태로 갱신했어요.
        </p>
      </section>

      <template v-if="mypageStore.accounts.length">
        <section class="account-list-section">
          <header>
            <h2>연결 계좌</h2>
            <span>
              정상 {{ mypageStore.healthyAccountCount }} · 확인 필요
              {{ mypageStore.errorAccountCount }}
            </span>
          </header>

          <div class="account-list">
            <article
              v-for="account in mypageStore.accounts"
              :key="account.accountId"
              class="account-card"
              :class="`account-card--${account.status.toLowerCase()}`"
              tabindex="0"
              role="button"
              :aria-label="`${account.brokerName} ${account.accountType} 상세 보기`"
              @click="openAccount(account)"
              @keydown.enter="openAccount(account)"
            >
              <span class="account-card__icon"><AppIcon name="landmark" :size="17" /></span>
              <div class="account-card__main">
                <div>
                  <strong>{{ account.brokerName }}</strong>
                  <span>{{ account.statusLabel }}</span>
                </div>
                <p>{{ account.accountType }} · {{ account.accountNumber }}</p>
                <small
                  >업데이트 {{ formatSyncTime(account.lastSyncedAt, { includeDate: true }) }}</small
                >
                <em v-if="account.syncErrorReason">{{ account.syncErrorReason }}</em>
                <div v-if="account.status === 'SYNC_ERROR'" class="account-card__actions">
                  <button
                    type="button"
                    :disabled="mypageStore.retryingAccountId === account.accountId"
                    @click.stop="retryAccount(account)"
                  >
                    {{
                      mypageStore.retryingAccountId === account.accountId
                        ? '재시도 중'
                        : '다시 시도'
                    }}
                  </button>
                </div>
              </div>
              <div class="account-card__right">
                <AppIcon name="chevron-right" :size="14" />
              </div>
            </article>
          </div>
        </section>

        <button
          type="button"
          class="add-account-button"
          @click="router.push({ name: ROUTE_NAMES.BROKER_CONNECT })"
        >
          <AppIcon name="plus" :size="15" /> 계좌 추가
        </button>
      </template>

      <section v-else class="accounts-empty">
        <span><AppIcon name="wallet-cards" :size="28" /></span>
        <h2>연결된 계좌가 없어요</h2>
        <p>증권사 계좌를 연결하면 자산과 거래 내역을 한곳에서 확인할 수 있어요.</p>
        <button type="button" @click="router.push({ name: ROUTE_NAMES.BROKER_CONNECT })">
          계좌 연결하기 <AppIcon name="arrow-right" :size="15" />
        </button>
      </section>

      <section class="security-notice">
        <span><AppIcon name="shield-check" :size="19" /></span>
        <div>
          <strong>안전하게 보호하고 있어요</strong>
          <p>계좌 비밀번호는 저장하지 않으며, 모든 금융 정보는 암호화하여 전송합니다.</p>
        </div>
      </section>

      <p v-if="notice" class="account-notice" role="status">{{ notice }}</p>
    </main>

    <AccountDetailModal
      v-if="detailOpen"
      :account="mypageStore.accountDetail"
      :loading="mypageStore.loadingAccountDetail"
      :syncing="mypageStore.syncingAccountDetail"
      :disconnecting="disconnecting"
      @close="closeAccountDetail"
      @sync="syncAccountDetail"
      @disconnect="disconnectSelectedBroker"
    />
  </div>
</template>

<style scoped>
.accounts-page {
  min-height: 100%;
  background: #fff;
  color: #263a3f;
}
.accounts-app-bar {
  position: sticky;
  z-index: 81;
  top: 0;
  display: grid;
  min-height: 64px;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  padding: 12px 16px 10px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);
}
.accounts-app-bar button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #e0e7e7;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}
.accounts-app-bar strong {
  font-size: var(--font-size-body);
  text-align: center;
}
.accounts-loading {
  min-height: 520px;
}
.accounts-content {
  display: grid;
  gap: 12px;
  padding: 8px 18px 18px;
}
.accounts-hero h1 {
  margin: 0;
  font-size: var(--font-size-body);
  letter-spacing: -0.04em;
}
.accounts-hero p {
  margin: 5px 0 0;
  color: #849194;
  font-size: var(--font-size-caption);
}
.account-summary {
  overflow: hidden;
  border-radius: 12px;
  background: #1f3e47;
  color: #fff;
}
.account-summary > header {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
}
.account-summary > header span {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-caption);
}
.account-summary > header i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #16c5ba;
}
.account-summary > header button {
  border: 0;
  background: transparent;
  color: #1bc7bd;
  cursor: pointer;
}
.account-summary > div {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
.account-summary dl {
  margin: 0;
  padding: 10px;
  border-right: 1px solid rgba(255, 255, 255, 0.18);
}
.account-summary dl:last-child {
  border-right: 0;
}
.account-summary dt {
  color: #c6d3d5;
  font-size: var(--font-size-caption);
}
.account-summary dd {
  margin: 4px 0 0;
  font-size: var(--font-size-caption);
  font-weight: 750;
}
.account-summary > p {
  margin: 0;
  padding: 7px 10px;
  background: rgba(10, 142, 136, 0.2);
  font-size: var(--font-size-caption);
  text-align: center;
}
.spinning {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.account-list-section {
  display: grid;
  gap: 7px;
}
.account-list-section > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.account-list-section h2 {
  margin: 0;
  font-size: var(--font-size-body);
}
.account-list-section header span {
  color: #78878a;
  font-size: var(--font-size-caption);
}
.account-list {
  overflow: hidden;
  border: 1px solid #dfe7e7;
  border-radius: 12px;
}
.account-card {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 26px;
  gap: 9px;
  padding: 11px;
  border-bottom: 1px solid #edf1f1;
  background: #fff;
  cursor: pointer;
}
.account-card:last-child {
  border-bottom: 0;
}
.account-card__icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: #eaf7f6;
  color: #178d88;
}
.account-card__main {
  min-width: 0;
}
.account-card__main > div:first-child {
  display: flex;
  align-items: center;
  gap: 6px;
}
.account-card__main strong {
  font-size: var(--font-size-body);
}
.account-card__main > div:first-child span {
  padding: 3px 5px;
  border-radius: 5px;
  background: #dff5f2;
  color: #078d88;
  font-size: var(--font-size-caption);
  font-weight: 800;
}
.account-card--sync_error .account-card__main > div:first-child span,
.account-card--auth_expired .account-card__main > div:first-child span {
  background: #fff0e5;
  color: #d67324;
}
.account-card p {
  margin: 4px 0 0;
  color: #68777a;
  font-size: var(--font-size-caption);
}
.account-card small {
  display: block;
  margin-top: 3px;
  color: #97a1a3;
  font-size: var(--font-size-caption);
}
.account-card em {
  display: block;
  margin-top: 5px;
  color: #d85e4f;
  font-size: var(--font-size-caption);
  font-style: normal;
}
.account-card__actions {
  margin-top: 6px;
}
.account-card__actions button {
  padding: 4px 7px;
  border: 0;
  border-radius: 6px;
  background: #e9f7f6;
  color: #087f7c;
  cursor: pointer;
  font-size: var(--font-size-caption);
}
.account-card__right {
  display: grid;
  place-items: center;
  color: #839194;
}
.add-account-button {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #dfe7e7;
  border-radius: 11px;
  background: #f8fafa;
  color: #078d88;
  cursor: pointer;
  font-size: var(--font-size-caption);
  font-weight: 750;
}
.security-notice {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 8px;
  padding: 11px;
  border: 1px solid #cce6e4;
  border-radius: 11px;
  background: #eef8f7;
  color: #078d88;
}
.security-notice strong {
  font-size: var(--font-size-body);
}
.security-notice p {
  margin: 4px 0 0;
  color: #718184;
  font-size: var(--font-size-caption);
  line-height: 1.5;
}
.accounts-empty {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border: 1px solid #cce5e3;
  border-radius: 14px;
  background: #f2faf9;
  text-align: center;
}
.accounts-empty > span {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 50%;
  background: #fff;
  color: #078d88;
}
.accounts-empty h2 {
  margin: 13px 0 5px;
  font-size: var(--font-size-body);
}
.accounts-empty p {
  margin: 0;
  color: #7c8b8e;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}
.accounts-empty button {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 6px;
  margin-top: 15px;
  padding: 0 18px;
  border: 0;
  border-radius: 9px;
  background: #183b43;
  color: #fff;
  cursor: pointer;
}
.account-notice {
  margin: 0;
  color: #078d88;
  font-size: var(--font-size-caption);
  text-align: center;
}
</style>
