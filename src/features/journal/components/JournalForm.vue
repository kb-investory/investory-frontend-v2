<script setup>
import { reactive } from 'vue'

import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseTextarea from '@/shared/components/inputs/BaseTextarea.vue'
import BaseTextField from '@/shared/components/inputs/BaseTextField.vue'

const emit = defineEmits(['submit'])
const form = reactive({ title: '', content: '' })

function handleSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="journal-form" @submit.prevent="handleSubmit">
    <BaseTextField v-model="form.title" label="제목" required />
    <BaseTextarea v-model="form.content" label="내용" :rows="8" required />
    <BaseButton type="submit" full-width>저장</BaseButton>
  </form>
</template>

<style scoped>
.journal-form {
  display: grid;
  gap: 16px;
}
</style>
