import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  getSimulationSessions,
  sendSimulationPrompt,
} from '@/features/simulation/api/simulationApi'

export const useSimulationStore = defineStore('simulation', () => {
  const sessions = ref([])
  const messages = ref([])
  const loading = ref(false)

  async function fetchMessages() {
    loading.value = true
    try {
      sessions.value = await getSimulationSessions()
      messages.value = [
        {
          id: 1,
          sender: 'bot',
          content:
            '투자 원칙 시뮬레이션에 오신 것을 환영합니다. 시뮬레이션 조언 또는 매매 시나리오를 작성해주세요.',
        },
      ]
    } finally {
      loading.value = false
    }
  }

  async function sendMessage(text) {
    messages.value.push({ id: Date.now(), sender: 'user', content: text })
    loading.value = true
    try {
      const response = await sendSimulationPrompt(1001, text)
      messages.value.push({
        id: response.messageId,
        sender: 'bot',
        content: response.content,
      })
    } finally {
      loading.value = false
    }
  }

  return {
    sessions,
    messages,
    loading,
    fetchMessages,
    sendMessage,
  }
})
