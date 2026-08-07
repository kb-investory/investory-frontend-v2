<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <article class="base-card">
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <slot />
  </article>
</template>

<style scoped>
.base-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

h3,
p {
  margin: 0;
}

h3 {
  color: var(--color-heading);
  font-family: var(--font-heading);
  font-size: var(--font-size-body);
  font-weight: 700;
}

p {
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  line-height: 1.4;
}
</style>
