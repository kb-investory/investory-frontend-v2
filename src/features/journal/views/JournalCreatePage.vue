<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { useJournalStore } from '@/features/journal/stores/journalStore'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseTextarea from '@/shared/components/inputs/BaseTextarea.vue'
import BaseToggle from '@/shared/components/inputs/BaseToggle.vue'
import SearchInput from '@/shared/components/inputs/SearchInput.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'

const router = useRouter()
const journalStore = useJournalStore()

const searchKeyword = ref('')
const marketThought = ref('')
const notifyToggle = ref(true)

function handleBack() {
  router.push({ name: ROUTE_NAMES.JOURNAL })
}

async function handleSubmit() {
  await journalStore.addJournal({
    journalDate: new Date().toISOString().split('T')[0],
    marketThought: marketThought.value || '오늘의 매매 기록 및 생각',
    marketMood: 'CONFIDENT',
  })
  await router.push({ name: ROUTE_NAMES.JOURNAL })
}
</script>

<template>
  <div class="mobile-page">
    <AppBar title="일지 작성" :show-close="false" @back="handleBack" />

    <div class="mobile-page__content">
      <SearchInput v-model="searchKeyword" placeholder="종목명 또는 종목코드 검색" />

      <BaseTextarea
        v-model="marketThought"
        label="오늘 시장을 보며 든 생각"
        :required="true"
        placeholder="오늘 시장을 어떻게 바라봤는지, 어떤 감정을 느꼈는지 자유롭게 적어주세요."
        :max-length="500"
      />

      <BaseToggle
        v-model="notifyToggle"
        label="알림 받기"
        description="오늘의 일지 마감 전에 알려드려요"
      />

      <BaseButton variant="primary" full-width @click="handleSubmit">
        일지 저장하고 완료하기 →
      </BaseButton>
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
</style>
