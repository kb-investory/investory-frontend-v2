<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
})
</script>

<template>
  <div class="home-summary">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
  </div>
</template>

<style scoped>
.home-summary {
  padding: 24px;
  border-radius: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
</style>
