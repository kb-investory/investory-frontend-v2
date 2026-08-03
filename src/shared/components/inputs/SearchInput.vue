<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '종목명 또는 종목코드 검색',
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="search-input">
    <AppIcon name="search" :size="18" class="search-input__icon" />
    <input
      type="search"
      class="search-input__field"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<style scoped>
.search-input {
  display: flex;
  width: 100%;
  height: 48px;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border: 1px solid #087f7c;
  border-radius: 9999px;
  background: #ffffff;
}

.search-input__icon {
  color: #087f7c;
  flex-shrink: 0;
}

.search-input__field {
  width: 100%;
  border: none;
  background: transparent;
  color: #181817;
  font-family: var(--font-sans);
  font-size: 13px;
  outline: none;

  &::placeholder {
    color: #94948e;
  }
}
</style>
