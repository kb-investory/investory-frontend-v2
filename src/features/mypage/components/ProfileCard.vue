<script setup>
defineProps({
  profile: { type: Object, required: true },
})
</script>

<template>
  <div class="profile-card">
    <h2>{{ profile.name }}</h2>
    <p>{{ profile.email }}</p>
  </div>
</template>

<style scoped>
.profile-card {
  padding: 20px;
  border-radius: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
</style>
