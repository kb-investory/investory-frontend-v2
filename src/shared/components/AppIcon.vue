<script setup>
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarRange,
  ChartPie,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Ellipsis,
  Database,
  History,
  House,
  LoaderCircle,
  Lock,
  LockKeyhole,
  MessageCircle,
  Minus,
  Notebook,
  Pencil,
  Play,
  Plus,
  Radar,
  RotateCcw,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  User,
  Users,
  X,
} from '@lucide/vue'

const iconComponents = {
  activity: Activity,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  'bar-chart': BarChart3,
  'book-open': BookOpen,
  'calendar-range': CalendarRange,
  'chart-pie': ChartPie,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-check': CircleCheck,
  ellipsis: Ellipsis,
  database: Database,
  history: History,
  home: House,
  house: House,
  'loader-circle': LoaderCircle,
  lock: Lock,
  'lock-keyhole': LockKeyhole,
  'message-circle': MessageCircle,
  minus: Minus,
  notebook: Notebook,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  radar: Radar,
  'rotate-ccw': RotateCcw,
  scale: Scale,
  search: Search,
  settings: Settings,
  'shield-check': ShieldCheck,
  sparkles: Sparkles,
  target: Target,
  'trending-up': TrendingUp,
  'triangle-alert': TriangleAlert,
  user: User,
  users: Users,
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
