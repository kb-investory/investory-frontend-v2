<script setup>
defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '오늘 시장을 보며 든 생각',
  },
  required: {
    type: Boolean,
    default: true,
  },
  placeholder: {
    type: String,
    default: '오늘 시장을 어떻게 바라봤는지, 어떤 감정을 느꼈는지 자유롭게 적어주세요.',
  },
  maxLength: {
    type: Number,
    default: 500,
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="base-textarea">
    <div class="base-textarea__header">
      <label class="base-textarea__label">
        {{ label }}
        <span v-if="required" class="base-textarea__required">*</span>
      </label>
      <span class="base-textarea__counter">
        {{ modelValue ? modelValue.length : 0 }} / {{ maxLength }}
      </span>
    </div>

    <div class="base-textarea__field-wrapper">
      <textarea
        class="base-textarea__field"
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxLength"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>
  </div>
</template>

<style scoped>
.base-textarea {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 8px;
}

.base-textarea__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.base-textarea__label {
  color: #181817;
  font-family: var(--font-sans);
  font-size: var(--font-size-body);
  font-weight: 700;
  line-height: 1.4;
}

.base-textarea__required {
  color: #e54d42;
  margin-left: 2px;
}

.base-textarea__counter {
  flex: 0 0 auto;
  color: #94948e;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  white-space: nowrap;
}

.base-textarea__field-wrapper {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #dce6e9;
  border-radius: 14px;
  background: #f9faf9;
}

.base-textarea__field {
  width: 100%;
  min-height: 120px;
  border: none;
  background: transparent;
  color: #181817;
  font-family: var(--font-sans);
  font-size: var(--font-size-body);
  line-height: 1.55;
  outline: none;
  resize: vertical;

  &::placeholder {
    color: #94948e;
  }
}
</style>
