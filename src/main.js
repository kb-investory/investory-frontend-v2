import '@/shared/styles/main.css'

import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'

import App from '@/app/App.vue'
import { pinia } from '@/app/providers/pinia'
import { queryClient } from '@/app/providers/queryClient'
import router from '@/app/router'
import { preloadJournalMoodImages } from '@/features/journal/config/journalMoodOptions'

void preloadJournalMoodImages()

const app = createApp(App)

app.use(pinia)
app.use(VueQueryPlugin, { queryClient })
app.use(router)

app.mount('#app')
