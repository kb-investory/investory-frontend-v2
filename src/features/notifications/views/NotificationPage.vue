<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useNotificationStore } from '@/features/notifications/stores/notificationStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const NOTIFICATION_CLOCK_INTERVAL = 60 * 1000

const route = useRoute()
const router = useRouter()
const notificationStore = useNotificationStore()
const activeFilter = ref('all')
let notificationClockTimer

const visibleNotifications = computed(() =>
  activeFilter.value === 'unread'
    ? notificationStore.notifications.filter((notification) => !notification.read)
    : notificationStore.notifications,
)

async function openNotification(notification) {
  notificationStore.markAsRead(notification.id)
  await router.push(notification.destination)
}

onMounted(async () => {
  if (import.meta.env.DEV && route.query.preview === 'true') {
    notificationStore.loadPreview()
  } else {
    await notificationStore.fetchNotifications()
  }

  notificationClockTimer = window.setInterval(() => {
    void notificationStore.refreshForCurrentTime()
  }, NOTIFICATION_CLOCK_INTERVAL)
})

onBeforeUnmount(() => window.clearInterval(notificationClockTimer))
</script>

<template>
  <div class="notification-page">
    <header class="notification-app-bar">
      <button type="button" aria-label="홈으로 돌아가기" @click="router.back()">
        <AppIcon name="chevron-left" :size="18" />
      </button>
      <strong>알림</strong>
      <span />
    </header>

    <main class="notification-page__content">
      <section class="notification-summary" aria-label="오늘 알림 요약">
        <span class="notification-summary__icon">
          <AppIcon name="bell" :size="21" />
        </span>
        <div>
          <h2>오늘 확인할 소식</h2>
          <p>
            전체 {{ notificationStore.notifications.length }}개 · 읽지 않음
            {{ notificationStore.unreadCount }}개
          </p>
        </div>
      </section>

      <div class="notification-tabs" role="tablist" aria-label="알림 필터">
        <button
          type="button"
          role="tab"
          :aria-selected="activeFilter === 'all'"
          :class="{ 'is-active': activeFilter === 'all' }"
          @click="activeFilter = 'all'"
        >
          전체 {{ notificationStore.notifications.length }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeFilter === 'unread'"
          :class="{ 'is-active': activeFilter === 'unread' }"
          @click="activeFilter = 'unread'"
        >
          읽지 않음 {{ notificationStore.unreadCount }}
        </button>
      </div>

      <section v-if="notificationStore.loading" class="notification-state">
        <BaseLoading />
      </section>

      <section v-else-if="visibleNotifications.length" class="notification-list">
        <article
          v-for="notification in visibleNotifications"
          :key="notification.id"
          class="notification-card"
          :class="[
            `notification-card--${notification.tone}`,
            { 'notification-card--read': notification.read },
          ]"
        >
          <div class="notification-card__meta">
            <span class="notification-card__type-icon">
              <AppIcon :name="notification.icon" :size="17" />
            </span>
            <span class="notification-card__time">{{ notification.timeLabel }}</span>
            <span
              v-if="!notification.read"
              class="notification-card__unread"
              aria-label="읽지 않은 알림"
            />
          </div>

          <h3>{{ notification.title }}</h3>

          <div class="notification-card__footer">
            <p>{{ notification.description }}</p>
            <button type="button" @click="openNotification(notification)">
              {{ notification.actionLabel }}
              <AppIcon name="arrow-right" :size="13" />
            </button>
          </div>
        </article>
      </section>

      <section v-else class="notification-state notification-state--empty">
        <span><AppIcon name="bell" :size="22" /></span>
        <h2>
          {{ activeFilter === 'unread' ? '읽지 않은 알림이 없어요' : '새로운 알림이 없어요' }}
        </h2>
        <p>새로운 투자 기록이 생기면 이곳에서 알려드릴게요.</p>
      </section>

      <p v-if="notificationStore.error" class="notification-page__error" role="status">
        일부 알림을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.
      </p>
    </main>
  </div>
</template>

<style scoped>
.notification-page {
  min-height: 100%;
  background: #f5f9fb;
  color: #17344a;
}

.notification-app-bar {
  display: grid;
  min-height: 64px;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  padding: 12px 16px 10px;
  background: #ffffff;
}

.notification-app-bar button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #e1e8e8;
  border-radius: 50%;
  background: #ffffff;
  color: #263a3f;
  cursor: pointer;
}

.notification-app-bar strong {
  color: #263a3f;
  font-size: var(--font-size-body);
  text-align: center;
}

.notification-app-bar button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}

.notification-page__content {
  position: relative;
  display: grid;
  gap: 14px;
  padding: 8px 16px 28px;
}

.notification-summary {
  display: grid;
  min-height: 92px;
  grid-template-columns: 50px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #b9e4e2;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 12px 26px rgb(2 35 44 / 11%);
}

.notification-summary__icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 15px;
  background: linear-gradient(145deg, #e6f8f5, #d5f1ed);
  color: #078d88;
}

.notification-summary h2,
.notification-summary p {
  margin: 0;
}

.notification-summary h2 {
  color: #17344a;
  font-size: 19px;
  font-weight: 850;
  letter-spacing: -0.035em;
}

.notification-summary p {
  margin-top: 4px;
  color: #6c8392;
  font-size: 12px;
  font-weight: 650;
}

.notification-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 5px;
  border-radius: 15px;
  background: #e7eef3;
}

.notification-tabs button {
  min-height: 39px;
  padding: 0 12px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #6d8190;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.notification-tabs button.is-active {
  background: #143f59;
  color: #ffffff;
  box-shadow: 0 5px 12px rgb(20 63 89 / 18%);
}

.notification-list {
  display: grid;
  gap: 12px;
}

.notification-card {
  display: grid;
  gap: 10px;
  padding: 15px 14px 13px;
  border: 1px solid #c9dceb;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 6px 16px rgb(34 80 108 / 4%);
  transition:
    border-color 160ms ease,
    opacity 160ms ease;
}

.notification-card--read {
  border-color: #dce5ea;
  opacity: 0.72;
}

.notification-card__meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.notification-card__type-icon,
.notification-card__time {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.notification-card__type-icon {
  width: 34px;
  background: #e8f4fb;
  color: #1371a4;
}

.notification-card__time {
  padding: 0 10px;
  background: #edf5fb;
  color: #47728c;
  font-size: 11px;
  font-weight: 750;
}

.notification-card--teal .notification-card__type-icon,
.notification-card--teal .notification-card__time {
  background: #e2f6f2;
  color: #078d88;
}

.notification-card--slate .notification-card__type-icon,
.notification-card--slate .notification-card__time {
  background: #eef2f5;
  color: #294d63;
}

.notification-card__unread {
  width: 8px;
  height: 8px;
  margin-left: auto;
  border-radius: 50%;
  background: #3697ce;
  box-shadow: 0 0 0 3px rgb(54 151 206 / 9%);
}

.notification-card h3 {
  margin: 0;
  color: #15364d;
  font-size: 15px;
  font-weight: 850;
  letter-spacing: -0.025em;
  line-height: 1.35;
  word-break: keep-all;
}

.notification-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.notification-card__footer p {
  min-width: 0;
  flex: 1;
  margin: 0;
  color: #718797;
  font-size: 11px;
  line-height: 1.5;
  word-break: keep-all;
}

.notification-card__footer button {
  display: inline-flex;
  min-width: 76px;
  min-height: 34px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 10px;
  border: 1px solid #bad5e7;
  border-radius: 11px;
  background: #f1f8fc;
  color: #245c7b;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.notification-card__footer button:focus-visible,
.notification-tabs button:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}

.notification-state {
  display: grid;
  min-height: 240px;
  place-items: center;
}

.notification-state--empty {
  align-content: center;
  gap: 8px;
  padding: 30px 20px;
  border: 1px solid #d9e5eb;
  border-radius: 20px;
  background: #ffffff;
  text-align: center;
}

.notification-state--empty > span {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 15px;
  background: #e5f6f3;
  color: #078d88;
}

.notification-state--empty h2,
.notification-state--empty p {
  margin: 0;
}

.notification-state--empty h2 {
  font-size: 16px;
}

.notification-state--empty p,
.notification-page__error {
  color: #738894;
  font-size: 12px;
}

.notification-page__error {
  margin: 0;
  text-align: center;
}

@media (max-width: 360px) {
  .notification-card__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .notification-card__footer button {
    width: 100%;
  }
}
</style>
