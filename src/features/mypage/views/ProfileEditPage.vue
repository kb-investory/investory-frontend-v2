<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { useMypageStore } from '@/features/mypage/stores/mypageStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'

const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const NAME_PATTERN = /^[가-힣a-zA-Z0-9 ]+$/

const router = useRouter()
const mypageStore = useMypageStore()
const name = ref('')
const profileImageUrl = ref('')
const initialSnapshot = ref('')
const initialized = ref(false)
const imageMenuOpen = ref(false)
const cameraInput = ref(null)
const albumInput = ref(null)
const imageError = ref('')
const saveError = ref('')

const currentSnapshot = computed(() =>
  JSON.stringify({ name: name.value, profileImageUrl: profileImageUrl.value }),
)
const hasChanges = computed(
  () => initialized.value && currentSnapshot.value !== initialSnapshot.value,
)
const nameError = computed(() => {
  const value = name.value.trim()
  if (!value) return '이름을 입력해주세요.'
  if (value.length > 12) return '이름은 12자 이하로 입력해주세요.'
  if (!NAME_PATTERN.test(value)) return '한글, 영문, 숫자와 공백만 사용할 수 있어요.'
  return ''
})
const canSave = computed(
  () => hasChanges.value && !nameError.value && !imageError.value && !mypageStore.savingProfile,
)

function initializeForm() {
  if (!mypageStore.profile || initialized.value) return
  name.value = mypageStore.profile.name
  profileImageUrl.value = mypageStore.profile.profileImageUrl
  initialSnapshot.value = currentSnapshot.value
  initialized.value = true
}

function openFilePicker(type) {
  imageMenuOpen.value = false
  const input = type === 'camera' ? cameraInput.value : albumInput.value
  if (input) {
    input.value = ''
    input.click()
  }
}

function handleImage(event) {
  const file = event.target.files?.[0]
  if (!file) return
  imageError.value = ''

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    imageError.value = 'JPG, PNG, WEBP 이미지만 선택할 수 있어요.'
    return
  }
  if (file.size > MAX_IMAGE_SIZE) {
    imageError.value = '프로필 이미지는 2MB 이하만 사용할 수 있어요.'
    return
  }

  const reader = new FileReader()
  reader.addEventListener('load', () => {
    profileImageUrl.value = String(reader.result)
  })
  reader.addEventListener('error', () => {
    imageError.value = '이미지를 불러오지 못했어요.'
  })
  reader.readAsDataURL(file)
}

async function saveProfile() {
  if (!canSave.value) return
  saveError.value = ''
  try {
    await mypageStore.saveProfile({
      name: name.value,
      profileImageUrl: profileImageUrl.value,
    })
    initialSnapshot.value = currentSnapshot.value
    await router.replace({ name: ROUTE_NAMES.MYPAGE })
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '프로필을 저장하지 못했어요.'
  }
}

function handleBeforeUnload(event) {
  if (!hasChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(() => {
  if (!hasChanges.value) return true
  return window.confirm('저장하지 않은 수정사항이 있어요. 변경사항을 폐기할까요?')
})

onMounted(async () => {
  await mypageStore.fetchOverview()
  initializeForm()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))
</script>

<template>
  <div class="profile-edit-page">
    <header class="profile-app-bar">
      <button
        type="button"
        aria-label="마이페이지로 돌아가기"
        @click="router.push({ name: ROUTE_NAMES.MYPAGE })"
      >
        <AppIcon name="chevron-left" :size="18" />
      </button>
      <strong>프로필 수정</strong>
      <span />
    </header>

    <BaseLoading v-if="!initialized" class="profile-edit-loading" />

    <main v-else class="profile-edit-content">
      <section class="profile-preview">
        <div class="profile-preview__image">
          <img :src="profileImageUrl" :alt="`${name} 프로필 이미지`" />
          <button type="button" aria-label="프로필 이미지 변경" @click="imageMenuOpen = true">
            <AppIcon name="camera" :size="13" />
          </button>
        </div>
        <div>
          <small>PROFILE / 01</small>
          <h1>{{ name || '이름 입력' }}</h1>
          <p>이미지를 눌러 사진을 변경하세요</p>
        </div>
      </section>

      <p v-if="imageError" class="form-error" role="alert">{{ imageError }}</p>

      <section class="profile-form">
        <h2>기본 정보</h2>
        <label>
          <span>이름</span>
          <div class="profile-input" :class="{ 'profile-input--error': nameError }">
            <input v-model="name" type="text" maxlength="12" autocomplete="name" />
            <AppIcon name="pencil" :size="14" />
          </div>
          <small v-if="nameError" class="field-error">{{ nameError }}</small>
          <small v-else>{{ name.length }}/12</small>
        </label>
        <label>
          <span>이메일</span>
          <div class="profile-input profile-input--readonly">
            <input :value="mypageStore.profile.email" type="email" readonly />
            <strong>인증 완료</strong>
          </div>
        </label>
      </section>

      <p v-if="saveError" class="form-error" role="alert">{{ saveError }}</p>
    </main>

    <footer v-if="initialized" class="profile-save-bar">
      <button type="button" :disabled="!canSave" @click="saveProfile">
        {{ mypageStore.savingProfile ? '저장하는 중...' : '변경사항 저장' }}
      </button>
    </footer>

    <input
      ref="cameraInput"
      class="file-input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      capture="user"
      @change="handleImage"
    />
    <input
      ref="albumInput"
      class="file-input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      @change="handleImage"
    />

    <div v-if="imageMenuOpen" class="image-menu-overlay" @click.self="imageMenuOpen = false">
      <section
        class="image-menu"
        role="dialog"
        aria-modal="true"
        aria-label="프로필 이미지 변경 방법"
      >
        <h2>프로필 이미지 변경</h2>
        <button type="button" @click="openFilePicker('camera')">
          <AppIcon name="camera" :size="18" /> 카메라로 촬영
        </button>
        <button type="button" @click="openFilePicker('album')">
          <AppIcon name="image" :size="18" /> 앨범에서 선택
        </button>
        <button type="button" class="cancel" @click="imageMenuOpen = false">취소</button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-edit-page {
  min-height: 100%;
  background: #fff;
  color: #263a3f;
}
.profile-app-bar {
  display: grid;
  min-height: 64px;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  padding: 12px 16px 10px;
}
.profile-app-bar button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #e1e8e8;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}
.profile-app-bar strong {
  font-size: var(--font-size-body);
  text-align: center;
}
.profile-edit-loading {
  min-height: 500px;
}
.profile-edit-content {
  display: grid;
  gap: 12px;
  padding: 8px 18px 100px;
}
.profile-preview {
  display: grid;
  grid-template-columns: 62px 1fr;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid #bde2df;
  border-radius: 14px;
  background: #f0faf9;
}
.profile-preview__image {
  position: relative;
  width: 62px;
  height: 62px;
}
.profile-preview__image img {
  width: 62px;
  height: 62px;
  border-radius: 14px;
  background: #0d9792;
  object-fit: cover;
}
.profile-preview__image button {
  position: absolute;
  right: -6px;
  bottom: -5px;
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border: 1px solid #dce8e8;
  border-radius: 50%;
  background: #fff;
  color: #078d88;
  cursor: pointer;
}
.profile-preview small {
  color: #078d88;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 800;
  letter-spacing: 0.12em;
}
.profile-preview h1 {
  margin: 5px 0 2px;
  font-size: var(--font-size-body);
}
.profile-preview p {
  margin: 0;
  color: #7f8d90;
  font-size: var(--font-size-caption);
}
.profile-form {
  padding: 12px;
  border: 1px solid #dfe7e7;
  border-radius: 13px;
}
.profile-form h2 {
  margin: 0 0 9px;
  color: #67777a;
  font-size: var(--font-size-body);
}
.profile-form label {
  display: grid;
  gap: 5px;
  margin-bottom: 11px;
}
.profile-form label:last-child {
  margin-bottom: 0;
}
.profile-form label > span {
  color: #708083;
  font-size: var(--font-size-caption);
}
.profile-input {
  display: grid;
  min-height: 48px;
  grid-template-columns: 1fr auto;
  align-items: center;
  padding: 0 10px;
  border: 1px solid #e0e5e5;
  border-radius: 10px;
  background: #f7f8f8;
  color: #078d88;
}
.profile-input input {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #2d4044;
  font: inherit;
  font-size: var(--font-size-body);
  font-weight: 700;
}
.profile-input--readonly input {
  color: #566669;
  font-weight: 500;
}
.profile-input--readonly strong {
  padding: 4px 6px;
  border-radius: 6px;
  background: #e5f7f5;
  font-size: var(--font-size-caption);
}
.profile-input--error {
  border-color: #e56368;
}
.profile-form label > small {
  justify-self: end;
  color: #8a9698;
  font-size: var(--font-size-caption);
}
.profile-form .field-error {
  justify-self: start;
  color: #dc4e54;
}
.form-error {
  margin: 0;
  color: #dc4e54;
  font-size: var(--font-size-caption);
  text-align: center;
}
.profile-save-bar {
  position: fixed;
  z-index: 40;
  bottom: var(--mobile-frame-edge-offset, 0px);
  left: 50%;
  width: min(100%, 390px);
  padding: 10px 18px 18px;
  background: rgba(255, 255, 255, 0.97);
  transform: translateX(-50%);
}
.profile-save-bar button {
  width: 100%;
  min-height: 48px;
  border: 0;
  border-radius: 11px;
  background: #173941;
  color: #fff;
  cursor: pointer;
  font-weight: 800;
}
.profile-save-bar button:disabled {
  background: #d9e0e1;
  color: #9aa5a7;
  cursor: not-allowed;
}
.file-input {
  position: fixed;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
.image-menu-overlay {
  position: fixed;
  z-index: 300;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(20, 32, 35, 0.5);
}
.image-menu {
  display: grid;
  width: min(100%, 390px);
  gap: 7px;
  padding: 18px;
  border-radius: 18px 18px 0 0;
  background: #fff;
}
.image-menu h2 {
  margin: 0 0 5px;
  font-size: var(--font-size-body);
}
.image-menu button {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  background: #eef8f7;
  color: #245056;
  cursor: pointer;
}
.image-menu button.cancel {
  justify-content: center;
  background: #f2f4f4;
}
</style>
