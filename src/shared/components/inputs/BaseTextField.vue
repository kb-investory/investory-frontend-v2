<script setup>
const model = defineModel({ type: String, default: '' })

defineProps({
  label: {
    type: String,
    required: true,
  },
  placeholder: {
    type: String,
    default: '내용을 입력하세요',
  },
  type: {
    type: String,
    default: 'text',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <label class="text-field">
    <span class="text-field__label">{{ label }}</span>
    <input
      v-model="model"
      class="text-field__input"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
    />
  </label>
</template>

<style scoped>
.text-field {
  display: grid;
  width: 100%;
  gap: 7px;
}

.text-field__label {
  color: var(--color-heading);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
}

.text-field__input {
  width: 100%;
  height: 52px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  outline: none;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 14px;
}

.text-field__input::placeholder {
  color: var(--color-text-muted);
}

.text-field__input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-soft);
}
</style>
