<script setup>
import { computed, ref, watch } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  selectedPeriod: {
    type: String,
    default: '2026-07',
  },
})

const emit = defineEmits(['close', 'select'])

const tempYear = ref(2026)
const tempMonth = ref(7)

watch(
  () => props.selectedPeriod,
  (newVal) => {
    if (newVal && newVal.includes('-')) {
      const [y, m] = newVal.split('-')
      tempYear.value = Number(y) || 2026
      tempMonth.value = Number(m) || 7
    }
  },
  { immediate: true },
)

function changeYear(delta) {
  tempYear.value += delta
}

function selectMonth(m) {
  tempMonth.value = m
}

function handleScroll(e) {
  if (e.deltaY > 0) {
    if (tempMonth.value < 12) tempMonth.value += 1
  } else if (e.deltaY < 0) {
    if (tempMonth.value > 1) tempMonth.value -= 1
  }
}

const visibleMonths = computed(() => {
  const current = tempMonth.value
  return [
    { month: current - 2, opacity: 0.25, size: '14px', top: '8px' },
    { month: current - 1, opacity: 0.55, size: '16px', top: '43px' },
    { month: current, opacity: 1, size: '20px', top: '78px', isSelected: true },
    { month: current + 1, opacity: 0.55, size: '16px', top: '121px' },
    { month: current + 2, opacity: 0.25, size: '14px', top: '156px' },
  ]
})

function applySelection() {
  const formatted = `${tempYear.value}-${String(tempMonth.value).padStart(2, '0')}`
  emit('select', formatted)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="month-picker-overlay" @click.self="emit('close')">
      <div class="month-picker-modal" role="dialog" aria-modal="true" aria-label="월 선택 모달">
        <!-- 모달 헤더 -->
        <header class="modal-header">
          <div class="header-titles">
            <h2 class="modal-title">월 선택</h2>
            <p class="modal-description">조회할 투자 일지 기간을 선택하세요</p>
          </div>
          <button class="close-btn" type="button" aria-label="닫기" @click="emit('close')">
            <svg
              viewBox="0 0 14 14"
              width="20"
              height="20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.34619 2.93945q-0.25293 0.08545-0.37939 0.30762-0.04102 0.08545-0.04102 0.25293 0 0.16748 0.04102 0.25293 0.04443 0.08203 1.62353 1.66455l1.58252 1.58252-1.58252 1.58252q-1.5791 1.58252-1.62353 1.66797-0.04102 0.08203-0.04102 0.23584 0 0.15381 0.03418 0.23926 0.0376 0.08203 0.1333 0.18115 0.09912 0.0957 0.18115 0.1333 0.08545 0.03418 0.23926 0.03418 0.15381 0 0.23584-0.04102 0.08545-0.04443 1.66797-1.62353l1.58252-1.58252 1.58252 1.58252q1.58252 1.5791 1.66455 1.62353 0.08545 0.04102 0.23926 0.04102 0.15381 0 0.23584-0.03418 0.08545-0.0376 0.18115-0.1333 0.09912-0.09912 0.1333-0.18115 0.0376-0.08545 0.0376-0.23926 0-0.15381-0.04443-0.23584-0.04101-0.08545-1.62012-1.66797l-1.58252-1.58252 1.58252-1.58252q1.5791-1.58252 1.62012-1.66455 0.04443-0.08545 0.04443-0.25293 0-0.16748-0.04102-0.25293-0.09912-0.16748-0.28027-0.2666-0.05811-0.02734-0.09912-0.04102-0.04102-0.01367-0.15381-0.01367-0.11279 0-0.15381 0.01367-0.04101 0.01367-0.11279 0.04102-0.09912 0.05811-1.66455 1.62695l-1.56885 1.56543-2.82666-2.81299q-0.31104-0.29395-0.42041-0.37939-0.08545-0.05469-0.19824-0.05469l-0.02735 0q-0.14014 0-0.18115 0.01367z"
                fill="#666662"
              />
            </svg>
          </button>
        </header>

        <!-- 연도 선택 -->
        <div class="year-selector">
          <button
            class="year-arrow-btn"
            type="button"
            aria-label="이전 연도"
            @click="changeYear(-1)"
          >
            <AppIcon name="chevron-left" :size="18" />
          </button>
          <span class="year-text">{{ tempYear }}년</span>
          <button
            class="year-arrow-btn"
            type="button"
            aria-label="다음 연도"
            @click="changeYear(1)"
          >
            <AppIcon name="chevron-right" :size="18" />
          </button>
        </div>

        <!-- 월 휠 피커 (위/아래 스크롤 및 클릭) -->
        <div class="wheel-picker-container" @wheel.prevent="handleScroll">
          <!-- 선택 월 하이라이트 배경 -->
          <div class="wheel-highlight-bg" />

          <!-- 휠 아이템 목록 -->
          <template v-for="item in visibleMonths" :key="item.month">
            <div
              v-if="item.month >= 1 && item.month <= 12"
              class="wheel-month-item"
              :class="{ 'wheel-month-item--selected': item.isSelected }"
              :style="{
                opacity: item.opacity,
                fontSize: item.size,
                top: item.top,
              }"
              @click="selectMonth(item.month)"
            >
              {{ item.month }}월
            </div>
          </template>

          <!-- 상/하단 페이드 -->
          <div class="wheel-fade-top" />
          <div class="wheel-fade-bottom" />
        </div>

        <!-- 휠 조작 안내 -->
        <div class="wheel-guide">
          <svg
            viewBox="0 0 14 14"
            width="13"
            height="13"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6.84619 0.60156q-0.08545 0.01367-0.15723 0.06494-0.06836 0.04785-1.28515 1.26465l-0.16748 0.16748q-0.62891 0.646-0.81348 0.82715-0.23584 0.25293-0.29394 0.34863-0.04102 0.07178-0.04102 0.19825l0 0.02734q0 0.23926 0.18115 0.42041 0.11279 0.11279 0.28028 0.14697 0.16748 0.03418 0.32129-0.0205 0.07178-0.02734 0.19824-0.14014 0.12646-0.11279 0.61523-0.60156 0.71436-0.71436 0.72803-0.71436 0.01367 0 0.01367 4.40918 0 4.40918-0.01367 4.40918-0.01367 0-0.72803-0.70068-0.50244-0.50244-0.62207-0.61524-0.11963-0.11279-0.1914-0.14014-0.0957-0.02734-0.22901-0.02734-0.1333 0-0.21875 0.04102-0.22217 0.11279-0.30078 0.33838-0.0752 0.22217 0.00684 0.43408 0.04443 0.06836 0.25293 0.28711 0.2085 0.21533 1.03564 1.04248 1.22021 1.23047 1.30225 1.27148 0.12646 0.07178 0.28027 0.07178 0.15381 0 0.28027-0.07178 0.08203-0.04102 1.30225-1.27148l0.18115-0.16748q0.62891-0.646 0.81348-0.82715 0.23584-0.25293 0.29394-0.34863 0.04102-0.07178 0.04102-0.19825l0-0.02734q0-0.12646-0.04102-0.23926-0.09912-0.2085-0.31787-0.29053-0.21533-0.08545-0.42383-0.01709-0.07178 0.02734-0.1914 0.14014-0.11963 0.11279-0.62207 0.61524-0.71436 0.70068-0.72803 0.70068-0.01367 0-0.01367-4.40918 0-4.40918 0.01367-4.40918 0.01367 0 0.72803 0.70068 0.48877 0.50244 0.61523 0.61524 0.12646 0.11279 0.19824 0.14014 0.15381 0.05469 0.32129 0.0205 0.16748-0.03418 0.28028-0.14697 0.18115-0.18115 0.18115-0.42041l0-0.02734q0-0.12646-0.04102-0.19825-0.05811-0.0957-0.29394-0.34863-0.18457-0.18115-0.81348-0.82715l-0.18115-0.16748q-1.22021-1.23047-1.28857-1.26465-0.06836-0.0376-0.16065-0.06494-0.09229-0.02734-0.14014-0.02734-0.04785 0-0.14697 0.02734z"
              fill="#94948E"
            />
          </svg>
          <span class="guide-text">위아래로 밀어 월을 선택하세요</span>
        </div>

        <!-- 모달 액션 -->
        <footer class="modal-actions">
          <button class="btn-cancel" type="button" @click="emit('close')">취소</button>
          <button class="btn-apply" type="button" @click="applySelection">
            {{ tempYear }}년 {{ tempMonth }}월 보기
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.month-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #18181766;
}

.month-picker-modal {
  display: flex;
  width: 342px;
  height: 416px;
  flex-direction: column;
  gap: 12px;
  padding: 18px 18px 16px;
  border-radius: 20px;
  box-shadow: 0 12px 32px rgb(24 24 23 / 22%);
  background: #ffffff;
}

/* 모달 헤더 */
.modal-header {
  display: flex;
  width: 100%;
  height: 44px;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.modal-title {
  margin: 0;
  color: #181817;
  font-family: var(--font-sans);
  font-size: 19px;
  font-weight: 700;
}

.modal-description {
  margin: 0;
  color: #94948e;
  font-family: var(--font-sans);
  font-size: 10px;
}

.close-btn {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  cursor: pointer;
}

/* 연도 선택 */
.year-selector {
  display: flex;
  width: 100%;
  height: 40px;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.year-arrow-btn {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: #666662;
  cursor: pointer;
}

.year-text {
  color: #181817;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
}

/* 월 휠 피커 */
.wheel-picker-container {
  position: relative;
  width: 100%;
  height: 190px;
  overflow: hidden;
  flex-shrink: 0;
  user-select: none;
  cursor: grab;
}

.wheel-highlight-bg {
  position: absolute;
  top: 73px;
  left: 0;
  width: 306px;
  height: 44px;
  border-radius: 10px;
  background: #f4f4f1;
  z-index: 0;
}

.wheel-month-item {
  position: absolute;
  left: 0;
  width: 306px;
  color: #666662;
  font-family: var(--font-sans);
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  transition: all 0.2s ease;
  cursor: pointer;
}

.wheel-month-item--selected {
  color: #181817;
  font-weight: 700;
}

.wheel-fade-top {
  position: absolute;
  top: 0;
  left: 0;
  width: 306px;
  height: 38px;
  background: linear-gradient(180deg, #ffffff 0%, #ffffff00 100%);
  pointer-events: none;
  z-index: 6;
}

.wheel-fade-bottom {
  position: absolute;
  top: 152px;
  left: 0;
  width: 306px;
  height: 38px;
  background: linear-gradient(0deg, #ffffff 0%, #ffffff00 100%);
  pointer-events: none;
  z-index: 7;
}

/* 휠 조작 안내 */
.wheel-guide {
  display: flex;
  width: 100%;
  height: 24px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-shrink: 0;
}

.guide-text {
  color: #94948e;
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 500;
}

/* 액션 버튼 */
.modal-actions {
  display: flex;
  width: 100%;
  height: 50px;
  align-items: flex-start;
  gap: 10px;
  flex-shrink: 0;
}

.btn-cancel {
  display: flex;
  width: 92px;
  height: 100%;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e5e0;
  border-radius: 12px;
  background: #ffffff;
  color: #666662;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-apply {
  display: flex;
  height: 100%;
  flex: 1;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 12px;
  background: #e8b931;
  color: #181817;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-apply:hover {
  opacity: 0.9;
}
</style>
