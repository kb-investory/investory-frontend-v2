<script setup>
import { onMounted } from 'vue'

import PortfolioAssetComposition from '@/modules/portfolio/components/PortfolioAssetComposition.vue'
import PortfolioHeader from '@/modules/portfolio/components/PortfolioHeader.vue'
import PortfolioHoldings from '@/modules/portfolio/components/PortfolioHoldings.vue'
import { usePortfolioStore } from '@/modules/portfolio/stores/portfolioStore'

const portfolioStore = usePortfolioStore()

onMounted(async () => {
  await Promise.all([
    portfolioStore.fetchAccounts(),
    portfolioStore.fetchSummary(),
    portfolioStore.fetchPortfolios(),
    portfolioStore.fetchAnalysis(),
  ])
})
</script>

<template>
  <section class="page-section">
    <PortfolioHeader />
    <PortfolioAssetComposition />
    <PortfolioHoldings />
  </section>
</template>
