<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import JournalCard from '@/features/journal/components/JournalCard.vue'
import { useJournalStore } from '@/features/journal/stores/journalStore'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'

const router = useRouter()
const journalStore = useJournalStore()

onMounted(() => journalStore.fetchJournals())

function navigateCreate() {
  router.push({ name: ROUTE_NAMES.JOURNAL_CREATE })
}
</script>

<template>
  <div class="mobile-page">
    <AppBar title="투자일지" :show-back="false" :show-close="false" />

    <div class="mobile-page__content">
      <BaseButton variant="primary" full-width @click="navigateCreate">
        새 투자일지 작성 →
      </BaseButton>

      <div v-if="journalStore.loading" class="loading-wrapper">
        <BaseLoading />
      </div>

      <div v-else class="journal-list">
        <JournalCard
          v-for="journal in journalStore.journals"
          :key="journal.journalId || journal.id"
          :journal="journal"
        />
      </div>
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

.journal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-wrapper {
  padding: 40px 0;
}
</style>
