import simulationData from '@/mocks/data/simulation.json'
import {
  liveDailyPerformance,
  liveSimulatedTrades,
} from '@/mocks/data/liveSimulationPerformance.js'

function clone(value) {
  return structuredClone(value)
}

const compileJobAttempts = new Map()
const MOCK_COMPILE_PROGRESS = [18, 36, 54, 72, 88, 100]

export async function getSimulationOverview() {
  return clone(simulationData.overview)
}

export async function getLatestSimulationResult() {
  return clone({
    ...simulationData.latest,
    dailyPerformance: liveDailyPerformance,
    simulatedTrades: liveSimulatedTrades,
    totalTradesCount: liveSimulatedTrades.length,
  })
}

export async function compileSimulationBot() {
  const response = clone(simulationData.compileResponse)
  compileJobAttempts.set(response.jobId, 0)
  return response
}

export async function getSimulationBotCompileJob(jobId) {
  const attempts = (compileJobAttempts.get(jobId) ?? 0) + 1
  compileJobAttempts.set(jobId, attempts)

  const job = clone(simulationData.compileJobs[jobId] ?? simulationData.compileJobs.JOB_794FF6CC)
  const progressIndex = Math.min(attempts - 1, MOCK_COMPILE_PROGRESS.length - 1)
  const progressPercent = MOCK_COMPILE_PROGRESS[progressIndex]

  if (progressPercent === 100) {
    return {
      ...job,
      status: 'COMPLETED',
      progressPercent: 100,
      message: 'AI 원칙 봇 전략 생성이 완료되었습니다.',
    }
  }

  return {
    ...job,
    status: 'RUNNING',
    progressPercent,
    message: '최근 거래 기록과 투자 원칙을 분석하고 있습니다.',
  }
}

export async function getSimulationComparators() {
  return clone(simulationData.comparators)
}

export async function runSimulation() {
  return {
    ...clone(simulationData.run),
    dailySnapshots: clone(liveDailyPerformance),
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
