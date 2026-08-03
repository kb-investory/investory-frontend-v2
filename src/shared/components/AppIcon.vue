<script setup>
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  CalendarRange,
  ChartPie,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Ellipsis,
  Database,
  Headphones,
  History,
  House,
  Image as ImageIcon,
  Landmark,
  Link,
  Link2Off,
  LoaderCircle,
  Lock,
  LockKeyhole,
  LogOut,
  Megaphone,
  MessageCircle,
  Minus,
  Notebook,
  Pencil,
  Play,
  Plus,
  Radar,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  Trophy,
  User,
  UserRoundX,
  Users,
  WalletCards,
  X,
} from '@lucide/vue'

const iconComponents = {
  activity: Activity,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  'bar-chart': BarChart3,
  bell: Bell,
  'book-open': BookOpen,
  'briefcase-business': BriefcaseBusiness,
  camera: Camera,
  'calendar-range': CalendarRange,
  'chart-pie': ChartPie,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-check': CircleCheck,
  'circle-help': CircleHelp,
  ellipsis: Ellipsis,
  database: Database,
  headphones: Headphones,
  history: History,
  home: House,
  house: House,
  image: ImageIcon,
  landmark: Landmark,
  link: Link,
  'link-2-off': Link2Off,
  'loader-circle': LoaderCircle,
  lock: Lock,
  'lock-keyhole': LockKeyhole,
  'log-out': LogOut,
  megaphone: Megaphone,
  'message-circle': MessageCircle,
  minus: Minus,
  notebook: Notebook,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  radar: Radar,
  'refresh-cw': RefreshCw,
  'rotate-ccw': RotateCcw,
  scale: Scale,
  search: Search,
  settings: Settings,
  'shield-check': ShieldCheck,
  sparkles: Sparkles,
  target: Target,
  'trending-up': TrendingUp,
  'triangle-alert': TriangleAlert,
  trophy: Trophy,
  user: User,
  'user-round-x': UserRoundX,
  users: Users,
  'wallet-cards': WalletCards,
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
