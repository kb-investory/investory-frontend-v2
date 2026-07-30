export async function getJournalEntries() {
  return {
    entries: [
      {
        journalId: 305,
        journalDate: '2026-07-29',
        marketMood: 'CAUTIOUS',
        tradeCount: 3,
        tradeNoteCount: 2,
        createdAt: '2026-07-29T18:20:00+09:00',
        editableUntilAt: '2026-07-30T00:00:00+09:00',
        isBackfilled: false,
        isEditable: true,
      },
      {
        journalId: 304,
        journalDate: '2026-07-28',
        marketMood: 'CONFIDENT',
        tradeCount: 1,
        tradeNoteCount: 1,
        createdAt: '2026-07-28T19:00:00+09:00',
        editableUntilAt: '2026-07-29T00:00:00+09:00',
        isBackfilled: false,
        isEditable: false,
      },
    ],
  }
}

export async function getJournalDetail(journalId) {
  return {
    journalDate: '2026-07-29',
    canCreate: false,
    journal: {
      journalId: journalId || 305,
      marketThought: '반도체 종목의 상승 흐름이 강했지만 추격매수는 주의해야 한다고 생각했다.',
      marketMood: 'CAUTIOUS',
      createdAt: '2026-07-29T18:20:00+09:00',
      updatedAt: '2026-07-29T19:10:00+09:00',
      editableUntilAt: '2026-07-30T00:00:00+09:00',
      isBackfilled: false,
      isEditable: true,
    },
    trades: [
      {
        tradeId: 501,
        securityId: 101,
        securityCode: '005930',
        securityName: '삼성전자',
        tradeSide: 'BUY',
        quantity: 10,
        unitPrice: 72000,
        tradedAt: '2026-07-29T10:15:00+09:00',
        note: {
          journalTradeNoteId: 701,
          rationaleText: 'HBM 시장의 장기 성장 가능성이 높다고 판단했다.',
          createdAt: '2026-07-29T18:20:00+09:00',
          updatedAt: '2026-07-29T19:10:00+09:00',
        },
      },
      {
        tradeId: 502,
        securityId: 102,
        securityCode: '000660',
        securityName: 'SK하이닉스',
        tradeSide: 'SELL',
        quantity: 3,
        unitPrice: 195000,
        tradedAt: '2026-07-29T14:10:00+09:00',
        note: null,
      },
    ],
  }
}

export async function getJournalOnDate(dateStr) {
  return {
    journalDate: dateStr,
    canCreate: true,
    journal: null,
    trades: [],
  }
}

export async function saveJournal(payload) {
  return {
    journalId: Date.now(),
    journalDate: payload?.journalDate || '2026-07-30',
    marketThought: payload?.marketThought || payload?.content || '',
    marketMood: payload?.marketMood || 'CONFIDENT',
    createdAt: new Date().toISOString(),
  }
}

export async function updateJournal(journalId, payload) {
  return {
    journalId,
    marketThought: payload?.marketThought || '',
    updatedAt: new Date().toISOString(),
  }
}

export async function deleteJournal(journalId) {
  return { success: true, deletedId: journalId }
}
