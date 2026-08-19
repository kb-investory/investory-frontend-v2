<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '@/features/notifications/api/notificationApi'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import BaseToggle from '@/shared/components/inputs/BaseToggle.vue'

const router = useRouter()
const settings = ref(null)
const initialSnapshot = ref('')
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')

const currentSnapshot = computed(() => JSON.stringify(settings.value))
const hasChanges = computed(
  () => Boolean(settings.value) && currentSnapshot.value !== initialSnapshot.value,
)

async function loadSettings() {
  loading.value = true
  loadError.value = ''

  try {
    settings.value = await getNotificationSettings()
    initialSnapshot.value = currentSnapshot.value
  } catch {
    loadError.value = '알림 설정을 불러오지 못했어요.'
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  if (!hasChanges.value || saving.value) return

  saving.value = true
  saveError.value = ''

  try {
    settings.value = await updateNotificationSettings(settings.value)
    initialSnapshot.value = currentSnapshot.value
  } catch {
    saveError.value = '알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해주세요.'
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="notification-settings-page">
    <header class="notification-settings-app-bar">
      <button
        type="button"
        aria-label="마이페이지로 돌아가기"
        @click="router.push({ name: ROUTE_NAMES.MYPAGE })"
      >
        <AppIcon name="chevron-left" :size="18" />
      </button>
      <strong>알림 설정</strong>
      <span />
    </header>

    <BaseLoading v-if="loading" class="notification-settings-loading" />

    <section v-else-if="loadError" class="notification-settings-error-state" role="alert">
      <AppIcon name="rotate-ccw" :size="22" />
      <strong>{{ loadError }}</strong>
      <button type="button" @click="loadSettings">다시 불러오기</button>
    </section>

    <main v-else class="notification-settings-content">
      <section class="notification-settings-group">
        <BaseToggle
          v-model="settings.tendencyAnalyzedEnabled"
          label="투자성향 분석 완료"
          description="투자성향 분석이 끝나면 알려드려요."
        />
        <BaseToggle
          v-model="settings.tradeIngestedEnabled"
          label="거래 내역 반영"
          description="증권사 동기화로 새 거래가 적재되면 알려드려요."
        />
        <BaseToggle
          v-model="settings.simulationCompletedEnabled"
          label="모의투자 완료"
          description="모의투자 실행이 끝나면 알려드려요."
        />
      </section>

      <p v-if="saveError" class="notification-settings-error" role="alert">{{ saveError }}</p>
    </main>

    <footer v-if="!loading && !loadError" class="notification-settings-save-bar">
      <button type="button" :disabled="!hasChanges || saving" @click="saveSettings">
        {{ saving ? '저장하는 중...' : '변경사항 저장' }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.notification-settings-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  background: #ffffff;
  color: #263a3f;
}

.notification-settings-app-bar {
  display: grid;
  min-height: 64px;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  padding: 12px 16px 10px;
}

.notification-settings-app-bar button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #e0e7e7;
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
}

.notification-settings-app-bar strong {
  text-align: center;
  font-size: var(--font-size-body);
}

.notification-settings-app-bar button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}

.notification-settings-loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.notification-settings-content {
  display: grid;
  flex: 1;
  gap: 16px;
  padding: 12px 20px 28px;
}

.notification-settings-group {
  display: grid;
  gap: 4px;
  padding: 6px 4px;
  border: 1px solid #e5edee;
  border-radius: 16px;
  background: #fafcfc;
}

.notification-settings-group > * {
  padding: 12px 14px;
}

.notification-settings-group > *:not(:last-child) {
  border-bottom: 1px solid #eef3f3;
}

.notification-settings-error {
  margin: 0;
  color: #d0473e;
  font-size: var(--font-size-caption);
}

.notification-settings-error-state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
}

.notification-settings-error-state button {
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid #dce5e5;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
}

.notification-settings-save-bar {
  position: sticky;
  bottom: 0;
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(10px);
}

.notification-settings-save-bar button {
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 12px;
  background: #193b43;
  color: #ffffff;
  font-size: var(--font-size-body);
  font-weight: 700;
  cursor: pointer;
}

.notification-settings-save-bar button:disabled {
  background: #c6d0d0;
  cursor: default;
}
</style>
