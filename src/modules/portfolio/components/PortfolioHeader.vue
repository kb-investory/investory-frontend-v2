<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePortfolioStore } from '@/modules/portfolio/stores/portfolioStore'
import AppIcon from '@/shared/components/AppIcon.vue'

const props = defineProps({
  title: {
    type: String,
    default: '자산',
  },
})

const emit = defineEmits(['select-account', 'action-click'])

const portfolioStore = usePortfolioStore()
const isDropdownOpen = ref(false)
const dropdownRef = ref(null)

const summaryData = computed(() => {
  return (
    portfolioStore.summary || {
      statusBadge: '현재 상태',
      headline: '손실 종목을 한 번 점검할 때예요',
      totalAmount: 25430000,
      totalProfit: -1960000,
      nextAction: '손실 비중 확인',
    }
  )
})

const accountsList = computed(() => {
  if (portfolioStore.accounts && portfolioStore.accounts.length > 0) {
    return portfolioStore.accounts
  }
  return [
    { id: 'ALL', name: '전체 계좌' },
    { id: 'ACC_01', name: 'KB증권 주식계좌' },
    { id: 'ACC_02', name: '한국투자 ISA계좌' },
  ]
})

const selectedAccountName = computed(() => {
  return portfolioStore.selectedAccount?.name || '전체 계좌'
})

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value
}

function closeDropdown() {
  isDropdownOpen.value = false
}

async function handleAccountSelect(accountId) {
  closeDropdown()
  await portfolioStore.selectAccount(accountId)
  emit('select-account', accountId)
}

function handleActionClick() {
  emit('action-click', summaryData.value.nextAction)
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown()
  }
}

function handleKeyDown(event) {
  if (event.key === 'Escape') {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
})

function formatCurrency(value) {
  if (value === undefined || value === null) return '0원'
  return `${Math.abs(value).toLocaleString('ko-KR')}원`
}

function formatProfitCurrency(value) {
  if (value === undefined || value === null) return '0원'
  const prefix = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${prefix}${Math.abs(value).toLocaleString('ko-KR')}원`
}
</script>

<template>
  <header class="portfolio-header">
    <!-- Top Bar: Title & Account Dropdown -->
    <div class="header-top-bar">
      <h1 class="header-title">{{ props.title }}</h1>

      <div ref="dropdownRef" class="account-dropdown-wrapper">
        <button
          type="button"
          class="account-dropdown-btn"
          :aria-expanded="isDropdownOpen"
          aria-haspopup="listbox"
          @click="toggleDropdown"
        >
          <span class="account-name">{{ selectedAccountName }}</span>
          <AppIcon
            name="chevron-down"
            size="16"
            class="dropdown-icon"
            :class="{ open: isDropdownOpen }"
          />
        </button>

        <!-- Dropdown Menu -->
        <transition name="dropdown-fade">
          <ul v-if="isDropdownOpen" class="account-dropdown-menu" role="listbox" tabindex="-1">
            <li
              v-for="acc in accountsList"
              :key="acc.id"
              class="account-dropdown-item"
              :class="{ active: acc.id === portfolioStore.selectedAccountId }"
              role="option"
              :aria-selected="acc.id === portfolioStore.selectedAccountId"
              @click="handleAccountSelect(acc.id)"
            >
              <span>{{ acc.name }}</span>
              <AppIcon
                v-if="acc.id === portfolioStore.selectedAccountId"
                name="check"
                size="16"
                class="check-icon"
              />
            </li>
          </ul>
        </transition>
      </div>
    </div>

    <!-- Summary Card Container -->
    <div class="summary-card">
      <div class="summary-card-header">
        <div class="yellow-accent-bar"></div>
        <div class="header-text-content">
          <span class="status-badge">{{ summaryData.statusBadge || '현재 상태' }}</span>
          <h2 class="analysis-headline">{{ summaryData.headline }}</h2>
        </div>
      </div>

      <div class="metrics-grid">
        <!-- 총 평가금액 -->
        <div class="metric-item">
          <span class="metric-label">총 평가금액</span>
          <strong class="metric-value">{{ formatCurrency(summaryData.totalAmount) }}</strong>
        </div>

        <!-- 누적 손익 -->
        <div class="metric-item">
          <span class="metric-label">누적 손익</span>
          <strong
            class="metric-value profit-value"
            :class="{
              negative: summaryData.totalProfit < 0,
              positive: summaryData.totalProfit > 0,
            }"
          >
            {{ formatProfitCurrency(summaryData.totalProfit) }}
          </strong>
        </div>

        <!-- 다음 행동 -->
        <div class="metric-item action-item" @click="handleActionClick">
          <span class="metric-label">다음 행동</span>
          <strong class="metric-value action-value">
            {{ summaryData.nextAction }}
          </strong>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.portfolio-header {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  margin-bottom: 24px;
}

.header-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-title {
  margin: 0;
  color: #111111;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

/* Account Dropdown */
.account-dropdown-wrapper {
  position: relative;
}

.account-dropdown-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #e5e5e0;
  border-radius: 10px;
  background: #ffffff;
  color: #111111;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.account-dropdown-btn:hover {
  background: #f9f9f6;
  border-color: #d1d1cc;
}

.dropdown-icon {
  color: #888880;
  transition: transform 0.2s ease;
}

.dropdown-icon.open {
  transform: rotate(180deg);
}

.account-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 50;
  min-width: 180px;
  margin: 0;
  padding: 6px 0;
  list-style: none;
  background: #ffffff;
  border: 1px solid #e5e5e0;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
}

.account-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  color: #333330;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.account-dropdown-item:hover {
  background: #f9f9f6;
}

.account-dropdown-item.active {
  color: #d97706;
  font-weight: 700;
  background: #fffbeb;
}

.check-icon {
  color: #d97706;
}

/* Transitions */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Summary Card */
.summary-card {
  padding: 20px;
  background: #f5f5f5;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.summary-card-header {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 20px;
}

.yellow-accent-bar {
  width: 4px;
  background-color: #facc15; /* 높이는 원래대로 두고 색상만 변경 */
  border-radius: 2px;
  flex-shrink: 0;
}

.header-text-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-badge {
  display: inline-block;
  color: #d97706;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.analysis-headline {
  margin: 0;
  color: #111111;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: -0.4px;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e5;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  color: #71716a;
  font-size: 13px;
  font-weight: 500;
}

.metric-value {
  color: #111111;
  font-size: 16px;
  font-weight: 700;
}

.profit-value.negative {
  color: #2563eb;
}

.profit-value.positive {
  color: #dc2626;
}

.action-item {
  cursor: pointer;
  user-select: none;
}

.action-value {
  color: #b8860b;
  transition: opacity 0.15s ease;
}

.action-item:hover .action-value {
  opacity: 0.85;
  text-decoration: underline;
}
</style>
