<script setup>
defineProps({
  subtitle: {
    type: String,
    default: '나의 선택을 과거 시장에서 다시 확인해요.',
  },
})
</script>

<template>
  <header class="simulation-header">
    <div class="header-top">
      <h1 class="header-title">시뮬레이션</h1>
      <div class="logo-wrapper">
        <img src="/assets/logos/investory-logo.png" alt="Investory" class="header-logo" />
      </div>
    </div>
    <p class="header-subtitle">{{ subtitle }}</p>
  </header>
</template>

<style scoped>
.simulation-header {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  padding: 12px 0 4px;
  background: transparent;
  box-sizing: border-box;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-title {
  margin: 0;
  font-family: 'Funnel Sans', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.4px;
  color: #181817;
  line-height: 1.2;
}

.logo-wrapper {
  width: 88px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;
}

.header-logo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.header-subtitle {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #666662;
  line-height: 1.4;
}
</style>
