<script setup>
import { onMounted } from 'vue'

import ProfileCard from '@/features/mypage/components/ProfileCard.vue'
import { useMypageStore } from '@/features/mypage/stores/mypageStore'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import TimerProgressBar from '@/shared/components/feedback/TimerProgressBar.vue'
import ListRow from '@/shared/components/lists/ListRow.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'

const mypageStore = useMypageStore()

onMounted(() => mypageStore.fetchProfile())
</script>

<template>
  <div class="mobile-page">
    <AppBar title="내 정보" :show-back="false" :show-close="false" />

    <div class="mobile-page__content">
      <ProfileCard v-if="mypageStore.profile" :profile="mypageStore.profile" />
      <BaseLoading v-else />

      <div class="menu-group">
        <ListRow title="연결 계좌 관리" icon="landmark" />
        <ListRow title="알림 설정" icon="bell" />
        <ListRow title="원칙 관리 및 내역" icon="file-text" />
      </div>

      <TimerProgressBar
        label="오늘 일지 마감까지"
        timer-text="03:42:18"
        :percentage="45"
      />
    </div>
  </div>
</template>

<style scoped>
.mobile-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-page__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.menu-group {
  display: flex;
  flex-direction: column;
  padding: 8px 16px;
  border: 1px solid #dce6e9;
  border-radius: 14px;
  background: #ffffff;
}
</style>
