<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import AppIcon from '@/shared/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()

const sectionContent = Object.freeze({
  notifications: {
    title: '알림 설정',
    icon: 'bell',
    description: '알림 설정 화면은 다음 작업에서 연결할 예정이에요.',
  },
  notices: {
    title: '공지사항',
    icon: 'megaphone',
    description: 'Investory의 새로운 소식을 준비하고 있어요.',
  },
  faq: {
    title: '자주 묻는 질문',
    icon: 'message-circle',
    description: '자주 묻는 질문과 답변을 준비하고 있어요.',
  },
  inquiry: {
    title: '문의하기',
    icon: 'headphones',
    description: '고객 지원 채널을 준비하고 있어요.',
  },
  help: {
    title: '마이페이지 도움말',
    icon: 'circle-help',
    description: '현재 마이페이지에서 사용할 수 있는 기능이에요.',
    items: [
      '프로필 이미지와 이름을 수정할 수 있어요.',
      '작성한 투자 일지 수와 로그인한 소셜 계정을 확인할 수 있어요.',
      '나의 6가지 투자성향과 최근 시뮬레이션 결과로 이동할 수 있어요.',
      '연결 계좌를 동기화하고 계좌별 자산·거래 요약을 확인할 수 있어요.',
      '증권사 단위로 연결된 계좌를 해제할 수 있어요.',
      '로그아웃과 회원 탈퇴를 진행할 수 있어요.',
    ],
  },
})

const content = computed(() => {
  if (route.name === ROUTE_NAMES.MYPAGE_ACCOUNT_DETAIL) {
    return {
      title: '계좌 상세',
      icon: 'landmark',
      description: `선택한 계좌(${route.params.accountId})의 상세 화면으로 연결됐어요.`,
    }
  }
  if (route.name === ROUTE_NAMES.MYPAGE_SIMULATION_DETAIL) {
    return {
      title: '시뮬레이션 결과',
      icon: 'trophy',
      description: `최근 시뮬레이션(${route.params.simulationId}) 결과 상세 화면으로 연결됐어요.`,
    }
  }
  return sectionContent[route.params.section] || sectionContent.help
})
</script>

<template>
  <div class="placeholder-page">
    <header>
      <button
        type="button"
        aria-label="마이페이지로 돌아가기"
        @click="router.push({ name: ROUTE_NAMES.MYPAGE })"
      >
        <AppIcon name="chevron-left" :size="18" />
      </button>
      <strong>{{ content.title }}</strong>
      <span />
    </header>
    <main>
      <span><AppIcon :name="content.icon" :size="28" /></span>
      <h1>{{ content.title }}</h1>
      <p>{{ content.description }}</p>
      <ul v-if="content.items" class="help-list">
        <li v-for="item in content.items" :key="item">
          <AppIcon name="circle-check" :size="15" />
          <span>{{ item }}</span>
        </li>
      </ul>
      <button type="button" @click="router.push({ name: ROUTE_NAMES.MYPAGE })">
        마이페이지로 돌아가기
      </button>
    </main>
  </div>
</template>

<style scoped>
.placeholder-page {
  min-height: 100%;
  background: #fff;
  color: #263a3f;
}
.placeholder-page > header {
  display: grid;
  min-height: 64px;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  padding: 12px 16px 10px;
}
.placeholder-page > header button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #e0e7e7;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}
.placeholder-page > header strong {
  text-align: center;
}
.placeholder-page main {
  display: flex;
  min-height: 520px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}
.placeholder-page main > span {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  border-radius: 50%;
  background: #eaf7f6;
  color: #078d88;
}
.placeholder-page h1 {
  margin: 15px 0 6px;
  font-size: 18px;
}
.placeholder-page p {
  margin: 0;
  color: #7b898c;
  font-size: 10px;
}
.help-list {
  display: grid;
  width: min(100%, 340px);
  gap: 8px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
  text-align: left;
}
.help-list li {
  display: grid;
  grid-template-columns: 20px 1fr;
  align-items: start;
  gap: 7px;
  padding: 11px 12px;
  border: 1px solid #dce8e8;
  border-radius: 10px;
  background: #f8fbfb;
  color: #536568;
  font-size: 9px;
  line-height: 1.5;
}
.help-list svg {
  margin-top: 1px;
  color: #078d88;
}
.placeholder-page main button {
  min-height: 42px;
  margin-top: 18px;
  padding: 0 18px;
  border: 0;
  border-radius: 9px;
  background: #193b43;
  color: #fff;
  cursor: pointer;
}
</style>
