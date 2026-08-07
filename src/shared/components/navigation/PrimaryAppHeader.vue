<script setup>
import { RouterLink } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'

defineProps({
  logoSrc: {
    type: String,
    default: '/assets/logos/investory-logo-transparent.png',
  },
  logoAlt: {
    type: String,
    default: 'Investory 홈으로 이동',
  },
  bordered: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <header class="primary-app-header" :class="{ 'primary-app-header--bordered': bordered }">
    <div class="primary-app-header__side primary-app-header__side--left">
      <slot name="left" />
    </div>

    <RouterLink class="primary-app-header__logo-link" :to="{ name: ROUTE_NAMES.HOME }">
      <img class="primary-app-header__logo" :src="logoSrc" :alt="logoAlt" />
    </RouterLink>

    <div class="primary-app-header__side primary-app-header__side--right">
      <slot name="right" />
    </div>
  </header>
</template>

<style scoped>
.primary-app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: grid;
  width: 100%;
  height: 64px;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  padding: 0 20px;
  background: #ffffff;
}

.primary-app-header--bordered {
  border-bottom: 1px solid var(--border-subtle);
}

.primary-app-header__side {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
}

.primary-app-header__side--right {
  justify-content: flex-end;
}

.primary-app-header__logo-link {
  display: flex;
  width: min(136px, 100%);
  height: 48px;
  align-items: center;
  justify-content: center;
  justify-self: center;
  border-radius: 10px;
}

.primary-app-header__logo-link:focus-visible {
  outline: 2px solid var(--brand-teal-deep);
  outline-offset: 2px;
}

.primary-app-header__logo {
  display: block;
  width: 124px;
  height: 44px;
  object-fit: contain;
  object-position: center;
}

.primary-app-header :deep(button),
.primary-app-header :deep(a:not(.primary-app-header__logo-link)) {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #dce6e9;
  border-radius: 50%;
  background: #ffffff;
  color: var(--slate-strong);
  cursor: pointer;
}

.primary-app-header :deep(button:focus-visible),
.primary-app-header :deep(a:focus-visible) {
  outline: 2px solid var(--brand-teal-deep);
  outline-offset: 2px;
}
</style>
