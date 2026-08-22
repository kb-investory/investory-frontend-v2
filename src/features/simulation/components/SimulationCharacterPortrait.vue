<script setup>
import { computed } from 'vue'

const props = defineProps({
  variantType: {
    type: String,
    required: true,
  },
})

/**
 * 캐릭터 에셋 4종은 캔버스 비율(0.57~0.83)과 여백이 제각각이라
 * 같은 크기 상자에 object-fit으로 넣으면 캐릭터가 서로 다른 크기로 보인다.
 * 각 PNG의 실제 불투명 영역을 측정해 배율(scale)과 바닥 보정(lift)을 미리 계산해 둔다.
 *
 * scale: 불투명 영역 높이 비율(78.3~90.3%)을 상쇄해 인물 키를 맞추는 값
 * lift : 이미지 하단 투명 여백(%)만큼 아래로 내려 발끝을 카드 바닥선에 맞추는 값
 */
const PORTRAITS = {
  ACTUAL_USER: {
    src: '/assets/images/real-me.png',
    alt: '실제 나',
    scale: 1,
    lift: 14.5,
  },
  PERSONAL_BOT: {
    src: '/assets/images/my-bot.png',
    alt: '나의 투자봇',
    scale: 0.864,
    lift: 5.4,
  },
  FAMOUS_STRATEGY: {
    src: '/assets/images/famous-investor.png',
    alt: '유명 투자자',
    scale: 0.919,
    lift: 9.7,
  },
  RANDOM_BOT: {
    src: '/assets/images/monkey.png',
    alt: '원숭이',
    scale: 0.9,
    lift: 4.9,
  },
}

const portrait = computed(() => PORTRAITS[props.variantType] ?? PORTRAITS.ACTUAL_USER)
</script>

<template>
  <span class="character-portrait">
    <img
      class="character-portrait__img"
      :src="portrait.src"
      :alt="portrait.alt"
      loading="lazy"
      decoding="async"
      :style="{
        '--portrait-scale': portrait.scale,
        '--portrait-lift': `${portrait.lift}%`,
      }"
    />
  </span>
</template>

<style scoped>
.character-portrait {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.character-portrait__img {
  position: absolute;
  /* 발끝이 상자 맨 아래에 붙으면 바닥 그림자가 정강이 높이에 걸린다.
     호출부에서 발밑 여백을 지정할 수 있게 변수로 뺀다. */
  bottom: var(--portrait-baseline, 0);
  left: 50%;
  width: auto;
  height: calc(var(--portrait-scale, 1) * 100%);
  max-width: none;
  transform: translate(-50%, var(--portrait-lift, 0%));
  object-fit: contain;
}
</style>
