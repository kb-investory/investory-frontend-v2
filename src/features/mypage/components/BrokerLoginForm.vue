<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
} from '@lucide/vue'

const props = defineProps({
  status: {
    type: String,
    default: 'idle',
    validator: (value) => ['idle', 'loading', 'success', 'error'].includes(value),
  },
  errorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['submit', 'continue'])

const loginId = ref('')
const password = ref('')
const showPassword = ref(false)
const agreed = ref(false)
const touched = reactive({
  loginId: false,
  password: false,
  agreement: false,
})

const loginIdError = computed(() => {
  if (!touched.loginId || loginId.value.trim()) {
    return ''
  }

  return '증권사 아이디를 입력해 주세요.'
})

const passwordError = computed(() => {
  if (!touched.password || password.value) {
    return ''
  }

  return '증권사 비밀번호를 입력해 주세요.'
})

const agreementError = computed(() => {
  if (!touched.agreement || agreed.value) {
    return ''
  }

  return '계좌 정보 조회를 위한 필수 동의가 필요해요.'
})

const isFormValid = computed(() => Boolean(loginId.value.trim() && password.value && agreed.value))
const isSubmitting = computed(() => props.status === 'loading')
const isSubmitDisabled = computed(() => {
  if (props.status === 'success') {
    return false
  }

  return !isFormValid.value || isSubmitting.value
})
const submitLabel = computed(() => {
  if (props.status === 'success') {
    return '보유 종목 확인하기'
  }

  return isSubmitting.value ? '로그인 중...' : '로그인하고 연결하기'
})

watch(
  () => props.status,
  (status) => {
    if (status === 'success') {
      password.value = ''
      touched.password = false
    }
  },
)

function validateForm() {
  touched.loginId = true
  touched.password = true
  touched.agreement = true
  return isFormValid.value
}

function handleSubmit() {
  if (props.status === 'success') {
    emit('continue')
    return
  }

  if (!validateForm()) {
    return
  }

  emit('submit', {
    loginId: loginId.value.trim(),
    password: password.value,
  })
}
</script>

<template>
  <form class="broker-login-form" novalidate @submit.prevent="handleSubmit">
    <div class="broker-login-form__fields">
      <label class="form-field">
        <span class="form-field__label">아이디</span>
        <input
          v-model="loginId"
          name="broker-login-id"
          autocomplete="username"
          placeholder="증권사 아이디 입력"
          :disabled="isSubmitting"
          :aria-invalid="Boolean(loginIdError)"
          @blur="touched.loginId = true"
        />
        <small v-if="loginIdError" role="alert">{{ loginIdError }}</small>
      </label>

      <label class="form-field">
        <span class="form-field__label">비밀번호</span>
        <span class="form-field__password">
          <input
            v-model="password"
            name="broker-password"
            autocomplete="current-password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="비밀번호 입력"
            :disabled="isSubmitting"
            :aria-invalid="Boolean(passwordError)"
            @blur="touched.password = true"
          />
          <button
            type="button"
            :aria-label="showPassword ? '비밀번호 숨기기' : '비밀번호 보기'"
            :disabled="isSubmitting"
            @click="showPassword = !showPassword"
          >
            <Eye v-if="showPassword" :size="20" />
            <EyeOff v-else :size="20" />
          </button>
        </span>
        <small v-if="passwordError" role="alert">{{ passwordError }}</small>
      </label>
    </div>

    <div class="agreement">
      <label class="agreement__row">
        <input
          v-model="agreed"
          type="checkbox"
          :disabled="isSubmitting"
          @blur="touched.agreement = true"
        />
        <span class="agreement__check" aria-hidden="true">
          <Check v-if="agreed" :size="13" />
        </span>
        <span class="agreement__copy">
          <strong><em>필수</em> 계좌 정보 조회 및 수집에 동의</strong>
          <small>보유 계좌와 거래 내역을 불러오기 위해 필요해요</small>
        </span>
        <ChevronRight :size="17" />
      </label>
      <small v-if="agreementError" class="agreement__error" role="alert">
        {{ agreementError }}
      </small>
    </div>

    <aside class="security-notice">
      <span class="security-notice__icon">
        <ShieldCheck :size="17" />
      </span>
      <p>
        <strong>로그인 정보는 저장하지 않아요</strong>
        <span>증권사 인증에만 사용하고 즉시 폐기합니다.</span>
      </p>
    </aside>

    <div
      v-if="status !== 'idle'"
      class="request-status"
      :class="`request-status--${status}`"
      :role="status === 'error' ? 'alert' : 'status'"
      aria-live="polite"
    >
      <LoaderCircle v-if="status === 'loading'" class="request-status__spinner" :size="18" />
      <CircleCheck v-else-if="status === 'success'" :size="18" />
      <TriangleAlert v-else :size="18" />
      <span v-if="status === 'loading'">증권사에 로그인하고 있어요.</span>
      <span v-else-if="status === 'success'"> 로그인에 성공했습니다. 계좌를 연결했어요. </span>
      <span v-else>{{ errorMessage || '증권사 로그인에 실패했습니다.' }}</span>
    </div>

    <div class="broker-login-form__action">
      <button class="submit-button" type="submit" :disabled="isSubmitDisabled">
        <span>{{ submitLabel }}</span>
        <LoaderCircle v-if="isSubmitting" class="submit-button__spinner" :size="18" />
        <ArrowRight v-else :size="18" />
      </button>
      <p>증권사에 따라 인증에 잠시 시간이 걸릴 수 있어요.</p>
    </div>
  </form>
</template>

<style scoped>
.broker-login-form {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 14px;
}

.broker-login-form__fields {
  display: grid;
  gap: 12px;
}

.form-field {
  display: grid;
  gap: 7px;
}

.form-field__label {
  color: var(--color-heading);
  font-size: var(--font-size-body);
  font-weight: 700;
}

.form-field > input,
.form-field__password {
  width: 100%;
  min-height: 52px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: #ffffff;
}

.form-field > input,
.form-field__password input {
  padding: 0 14px;
  outline: 0;
  color: var(--color-text);
  font-size: var(--font-size-body);
}

.form-field__password input {
  border: 0;
}

.form-field > input:focus,
.form-field__password:focus-within {
  border-color: var(--brand-teal);
  box-shadow: 0 0 0 3px var(--brand-teal-soft);
}

.form-field__password {
  display: grid;
  grid-template-columns: 1fr 44px;
  overflow: hidden;
}

.form-field__password input {
  width: 100%;
  min-width: 0;
}

.form-field__password button {
  display: grid;
  width: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-subtle);
  cursor: pointer;
}

.form-field small,
.agreement__error {
  color: #d33a45;
  font-size: var(--font-size-caption);
}

.agreement {
  display: grid;
  gap: 5px;
}

.agreement__row {
  display: grid;
  min-height: 58px;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
}

.agreement__row input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}

.agreement__check {
  display: grid;
  width: 19px;
  height: 19px;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: #ffffff;
  color: #ffffff;
}

.agreement__row input:checked + .agreement__check {
  border-color: var(--brand-teal);
  background: var(--brand-teal);
}

.agreement__copy {
  display: grid;
  gap: 2px;
}

.agreement__copy strong {
  font-size: var(--font-size-caption);
}

.agreement__copy em {
  margin-right: 4px;
  color: var(--brand-teal-deep);
  font-style: normal;
}

.agreement__copy small {
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
}

.agreement__row > :last-child {
  color: var(--color-text-subtle);
}

.security-notice {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 11px;
  border-radius: 8px;
  background: var(--brand-mist);
}

.security-notice__icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--brand-teal-deep);
}

.security-notice p {
  display: grid;
  gap: 2px;
  margin: 0;
}

.security-notice strong {
  font-size: var(--font-size-caption);
}

.security-notice p span {
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
}

.request-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: var(--font-size-caption);
  font-weight: 600;
}

.request-status--loading {
  background: var(--brand-teal-soft);
  color: var(--brand-teal-deep);
}

.request-status--success {
  background: #edf8f0;
  color: #24763a;
}

.request-status--error {
  background: var(--brand-red-soft);
  color: #d33a45;
}

.request-status__spinner,
.submit-button__spinner {
  animation: spin 700ms linear infinite;
}

.broker-login-form__action {
  display: grid;
  gap: 7px;
  margin-top: auto;
  padding-top: 4px;
}

.submit-button {
  display: inline-flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  border: 0;
  border-radius: 8px;
  background: #263a43;
  color: #ffffff;
  cursor: pointer;
  font-size: var(--font-size-body);
  font-weight: 700;
}

.submit-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.broker-login-form__action p {
  margin: 0;
  color: var(--color-text-subtle);
  font-size: var(--font-size-caption);
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
