<script setup>
defineProps({
  tendency: { type: Object, required: true },
})
</script>

<template>
  <div class="tendency-card">
    <h3>{{ tendency.name }}</h3>
    <p>{{ tendency.description }}</p>
  </div>
</template>

<style scoped>
.tendency-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
</style>
