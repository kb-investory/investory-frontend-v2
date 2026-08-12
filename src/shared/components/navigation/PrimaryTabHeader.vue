<script setup>
import PrimaryAppHeader from '@/shared/components/navigation/PrimaryAppHeader.vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
  flatBottom: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <section class="primary-tab-header" :class="{ 'primary-tab-header--flat-bottom': flatBottom }">
    <PrimaryAppHeader
      class="primary-tab-header__app-bar"
      logo-src="/assets/logos/investory-logo-dark.png"
    >
      <template #right>
        <slot name="right" />
      </template>
    </PrimaryAppHeader>

    <div class="primary-tab-header__chart" aria-hidden="true">
      <span class="primary-tab-header__orbit primary-tab-header__orbit--outer" />
      <span class="primary-tab-header__orbit primary-tab-header__orbit--middle" />
      <span class="primary-tab-header__orbit primary-tab-header__orbit--inner" />
      <svg viewBox="0 0 172 96" fill="none">
        <path d="M8 84L58 59L88 68L143 21" />
        <path d="M127 22L145 17L141 36" />
      </svg>
    </div>

    <div class="primary-tab-header__title">
      <h1>{{ title }}</h1>
      <span aria-hidden="true" />
    </div>
  </section>
</template>

<style scoped>
.primary-tab-header {
  position: relative;
  overflow: hidden;
  width: 100%;
  min-height: 192px;
  padding-bottom: 32px;
  background:
    radial-gradient(circle at 88% 24%, rgb(13 154 153 / 20%), transparent 31%),
    linear-gradient(145deg, #02141d 0%, #03232c 62%, #06404a 100%);
}

.primary-tab-header::after {
  position: absolute;
  z-index: 1;
  right: 0;
  bottom: 0;
  left: 0;
  height: 40px;
  border-radius: 32px 32px 0 0;
  background: #ffffff;
  content: '';
}

.primary-tab-header--flat-bottom {
  padding-bottom: 32px;
}

.primary-tab-header--flat-bottom::after {
  display: none;
}

.primary-tab-header__app-bar {
  position: relative;
  z-index: 4;
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) 44px;
  /* 홈 헤더와 동일한 좌우 기준선에 로고와 우측 액션을 배치한다. */
  padding: 0 20px;
  background: transparent;
}

.primary-tab-header__app-bar :deep(.primary-app-header__side--left) {
  display: none;
}

.primary-tab-header__app-bar :deep(.primary-app-header__logo-link) {
  grid-column: 1;
}

.primary-tab-header__app-bar :deep(.primary-app-header__side--right) {
  grid-column: 2;
}

.primary-tab-header__app-bar :deep(.primary-app-header__logo-link) {
  width: 154px;
  justify-self: start;
}

.primary-tab-header__app-bar :deep(.primary-app-header__logo) {
  width: 146px;
  filter: drop-shadow(0 0 5px rgb(45 225 217 / 16%));
  object-position: left center;
}

.primary-tab-header__app-bar :deep(button),
.primary-tab-header__app-bar :deep(a:not(.primary-app-header__logo-link)) {
  border-color: rgb(67 222 217 / 34%);
  color: #ffffff;
  background: rgb(5 45 56 / 76%);
  box-shadow: 0 0 18px rgb(15 207 200 / 12%);
}

.primary-tab-header__chart {
  position: absolute;
  z-index: 2;
  right: 14px;
  bottom: 16px;
  width: 178px;
  height: 118px;
  opacity: 0.68;
  transform: scale(0.9);
  transform-origin: right bottom;
}

.primary-tab-header__orbit {
  position: absolute;
  top: 0;
  right: 0;
  border: 1px solid rgb(22 201 196 / 14%);
  border-radius: 50%;
}

.primary-tab-header__orbit--outer {
  width: 118px;
  height: 118px;
}

.primary-tab-header__orbit--middle {
  top: 18px;
  right: 18px;
  width: 82px;
  height: 82px;
}

.primary-tab-header__orbit--inner {
  top: 36px;
  right: 36px;
  width: 46px;
  height: 46px;
}

.primary-tab-header__chart svg {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 172px;
  height: 96px;
  stroke: #16c9c4;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4;
}

.primary-tab-header__title {
  position: relative;
  z-index: 3;
  display: flex;
  min-height: 68px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 26px;
}

.primary-tab-header__title h1 {
  margin: 0;
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-lg);
  font-weight: 750;
  letter-spacing: -0.04em;
}

.primary-tab-header__title > span {
  width: 48px;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #16c9c4 0 76%, rgb(22 201 196 / 28%) 76%);
}
</style>
