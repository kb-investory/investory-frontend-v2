<script setup>
import { useIsFetching, useIsMutating } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import DefaultLayout from '@/app/layouts/DefaultLayout.vue'
import { ROUTE_NAMES } from '@/app/router/route-names'
import { useAuthStore } from '@/features/auth/stores/authStore'
import PageLoading from '@/shared/components/feedback/PageLoading.vue'
import PwaInstallPrompt from '@/shared/components/feedback/PwaInstallPrompt.vue'
import PwaUpdatePrompt from '@/shared/components/feedback/PwaUpdatePrompt.vue'
import { isGlobalLoading } from '@/shared/services/globalLoading'

const route = useRoute()
const authStore = useAuthStore()
const fetchingCount = useIsFetching()
const mutatingCount = useIsMutating()

const isAppLoading = computed(
  () => isGlobalLoading.value || fetchingCount.value > 0 || mutatingCount.value > 0,
)

const canShowPwaInstallPrompt = computed(
  () => authStore.initialized && authStore.isAuthenticated && route.name === ROUTE_NAMES.HOME,
)
</script>

<template>
  <DefaultLayout />
  <PageLoading
    :active="isAppLoading"
    text="화면을 준비하고 있어요"
    slow-text="데이터를 불러오고 있어요. 조금만 기다려 주세요"
  />
  <PwaInstallPrompt :enabled="canShowPwaInstallPrompt" />
  <PwaUpdatePrompt />
</template>
