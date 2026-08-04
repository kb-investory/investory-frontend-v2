import simulationData from '@/mocks/data/simulation.json'

function clone(value) {
  return structuredClone(value)
}

export async function getSimulationOverview() {
  return clone(simulationData.overview)
}

export async function getLatestSimulationResult() {
  return clone(simulationData.latest)
}

export async function compileSimulationBot() {
  return clone(simulationData.compileResponse)
}

export async function getSimulationBotCompileJob(jobId) {
  return clone(simulationData.compileJobs[jobId] ?? simulationData.compileJobs.JOB_794FF6CC)
}

export async function getSimulationComparators() {
  return clone(simulationData.comparators)
}

export async function runSimulation() {
  return {
    ...clone(simulationData.run),
    dailySnapshots: clone(simulationData.latest.dailyPerformance),
  }
}

export async function getSimulationDetail(simulationId) {
  return clone(simulationData.details[String(simulationId)] ?? simulationData.details['101'])
}

export async function getSimulationMessages() {
  return clone(simulationData.messages)
}

export async function sendSimulationMessage(text) {
  const userMessage = {
    id: Date.now(),
    sender: 'USER',
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
  simulationData.messages.push(userMessage)

  const botReply = {
    id: Date.now() + 1,
    sender: 'BOT',
    text: `'${text}' 의견을 반영했습니다. 원칙 준수율 기반으로 보조 분석 시뮬레이션을 진행합니다.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
  simulationData.messages.push(botReply)

  return [userMessage, botReply]
}

// Store compatibility aliases
export const getConversationMessages = getSimulationMessages
export const getSimulationSessions = getSimulationMessages
export const sendUserMessage = sendSimulationMessage
export const sendSimulationPrompt = sendSimulationMessage
