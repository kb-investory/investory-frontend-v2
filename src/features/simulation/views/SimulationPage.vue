<script setup>
import { onMounted, ref } from 'vue'

import SimulationMessage from '@/features/simulation/components/SimulationMessage.vue'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import SearchInput from '@/shared/components/inputs/SearchInput.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'

const simulationStore = useSimulationStore()
const message = ref('')

onMounted(() => simulationStore.fetchMessages())

async function handleSubmit() {
  if (!message.value.trim()) return
  await simulationStore.sendMessage(message.value)
  message.value = ''
}
</script>

<template>
  <div class="mobile-page">
    <AppBar title="투자 시뮬레이션" :show-back="false" :show-close="false" />

    <div class="mobile-page__content">
      <div class="chat-container">
        <SimulationMessage v-for="msg in simulationStore.messages" :key="msg.id" :message="msg" />
      </div>

      <form class="chat-form" @submit.prevent="handleSubmit">
        <SearchInput v-model="message" placeholder="시뮬레이션 의견을 입력하세요..." />
        <BaseButton variant="primary" type="submit"> 전송 </BaseButton>
      </form>
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

.chat-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 320px;
}

.chat-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
