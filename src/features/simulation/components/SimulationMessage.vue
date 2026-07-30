<script setup>
defineProps({
  message: { type: Object, required: true },
})
</script>

<template>
  <div class="simulation-message" :class="{ 'is-user': message.sender === 'user' }">
    <strong>{{ message.sender === 'user' ? '나' : 'AI 시뮬레이션 봇' }}</strong>
    <p>{{ message.content }}</p>
  </div>
</template>

<style scoped>
.simulation-message {
  padding: 12px 16px;
  margin-bottom: 12px;
  border-radius: 12px;
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
}

.simulation-message.is-user {
  background: var(--color-surface-teal);
  border-color: var(--color-primary-subtle);
}

strong {
  font-size: 12px;
  color: var(--color-primary);
}

p {
  margin: 4px 0 0;
}
</style>
