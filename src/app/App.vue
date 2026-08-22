<script setup>
import DefaultLayout from '@/app/layouts/DefaultLayout.vue'
import PwaInstallPrompt from '@/shared/components/feedback/PwaInstallPrompt.vue'
import PwaUpdatePrompt from '@/shared/components/feedback/PwaUpdatePrompt.vue'
</script>

<template>
  <DefaultLayout />
  <PwaInstallPrompt />
  <PwaUpdatePrompt />
</template>
