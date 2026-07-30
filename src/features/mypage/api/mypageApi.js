export async function getProfile() {
  return {
    userId: 1,
    oauthProvider: 'KAKAO',
    email: 'investor@investory.com',
    nickname: '성공투자자',
    name: '성공투자자',
    userStatus: 'ACTIVE',
    createdAt: '2026-07-01T10:00:00+09:00',
    brokerConnections: [
      {
        connectionId: 15,
        brokerId: 1,
        brokerCode: 'MIRAE',
        brokerName: '미래에셋증권',
        connectionStatus: 'CONNECTED',
        connectedAt: '2026-07-29T13:40:00',
        lastSyncedAt: '2026-07-29T13:45:03',
        accountCount: 2,
      },
    ],
  }
}
