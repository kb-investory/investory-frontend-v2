export async function getSimulationSessions() {
  return [
    {
      sessionId: 1001,
      botName: '원칙 수호 AI 봇',
      strategyType: 'DISCIPLINED_TRADING',
      initialBalance: 10000000,
      currentBalance: 10850000,
      returnRate: 8.5,
      status: 'RUNNING',
    },
  ]
}

export async function sendSimulationPrompt(sessionId, prompt) {
  return {
    messageId: Date.now(),
    sessionId,
    sender: 'BOT',
    content: `'${prompt}'에 기반하여 과거 3년 데이터 시뮬레이션을 수행했습니다. 원칙 준수 시 기대 수익률 +12.4%로 계산됩니다.`,
    createdAt: new Date().toISOString(),
  }
}
