<script setup>
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChartPie,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  History,
  House,
  Lock,
  Notebook,
  Pencil,
  Play,
  Plus,
  Radar,
  Search,
  Settings,
  Sparkles,
  User,
  X,
} from '@lucide/vue'

const iconComponents = {
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  'book-open': BookOpen,
  'chart-pie': ChartPie,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  ellipsis: Ellipsis,
  history: History,
  home: House,
  house: House,
  lock: Lock,
  notebook: Notebook,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  radar: Radar,
  search: Search,
  settings: Settings,
  sparkles: Sparkles,
  user: User,
  x: X,
}

defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: [Number, String],
    default: 20,
  },
})
</script>

<template>
  <component
    :is="iconComponents[name]"
    class="app-icon"
    :size="size"
    :stroke-width="1.8"
    aria-hidden="true"
  />
</template>

<style scoped>
.app-icon {
  display: block;
  flex: 0 0 auto;
}
</style>
