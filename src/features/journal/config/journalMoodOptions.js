export const JOURNAL_MOOD_OPTIONS = Object.freeze([
  {
    value: 'ANXIOUS',
    label: '불안',
    color: '#3976d9',
    softColor: '#eaf2ff',
    image: '/assets/images/journal-moods/anxious.webp',
  },
  {
    value: 'CAUTIOUS',
    label: '경계',
    color: '#e0a012',
    softColor: '#fff7dc',
    image: '/assets/images/journal-moods/cautious.webp',
  },
  {
    value: 'CALM',
    label: '차분',
    color: '#139c83',
    softColor: '#e8f8f4',
    image: '/assets/images/journal-moods/calm.webp',
  },
  {
    value: 'CONFIDENT',
    label: '확신',
    color: '#e84a5f',
    softColor: '#fff0f2',
    image: '/assets/images/journal-moods/confident.webp',
  },
])

const moodImageCache = new Map()

function cacheMoodImage(source) {
  const cached = moodImageCache.get(source)
  if (cached) return cached.promise

  const image = new Image()
  image.decoding = 'async'

  const loadPromise = new Promise((resolve) => {
    image.addEventListener('load', resolve, { once: true })
    image.addEventListener('error', resolve, { once: true })
    image.src = source
  }).then(async () => {
    try {
      await image.decode()
    } catch {
      // 디코딩을 지원하지 않거나 실패해도 브라우저 HTTP 캐시는 그대로 활용합니다.
    }
  })

  moodImageCache.set(source, { image, promise: loadPromise })
  return loadPromise
}

export function preloadJournalMoodImages() {
  if (typeof Image === 'undefined') return Promise.resolve()

  return Promise.all(JOURNAL_MOOD_OPTIONS.map((option) => cacheMoodImage(option.image)))
}
