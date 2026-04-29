export interface TutorialStep {
  label: string
  title: string
  content: Array<{ text: string; highlight?: boolean }>
  highlights?: Array<{ text: string; color: string }>
  actionHint?: string
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    label: '序章',
    title: '欢迎来到星尘驿站',
    content: [
      {
        text: '你是这座深空轨道中转站的调度员。有人会迷路来到这里，他们需要的不是救助，而是被看见。',
        highlight: true,
      },
      {
        text: '你的任务：为他们调制一杯恰到好处的饮品。不是用食材，而是用逻辑参数。',
      },
    ],
    highlights: [
      { text: '能源 · 氧气 · 材料', color: '#00F2FF' },
      { text: '三种资源，维系驿站的运转', color: '#5EC0D8' },
    ],
    actionHint: '按 [Space] 键，开始扫描访客信号',
  },
  {
    label: '资源',
    title: '驿站的命脉',
    content: [
      {
        text: '能源驱动一切。消耗速度由功率模式决定：',
        highlight: true,
      },
      {
        text: '节能模式最慢，超载模式最快。氧气跟随能源消耗，材料则通过物流小球自动采集。',
      },
      {
        text: '休息模式暂停能源消耗，但访客也会暂时离开。',
      },
    ],
    highlights: [
      { text: 'eco 节能', color: '#00F2FF' },
      { text: 'normal 正常', color: '#5EC0D8' },
      { text: 'overload 超载', color: '#FF8C00' },
      { text: 'pressure 压力（跃迁后解锁）', color: '#FF4466' },
    ],
  },
  {
    label: '访客',
    title: '每一位都有自己的故事',
    content: [
      {
        text: '当访客到来时，屏幕上会显示他们的目标参数（X / Y / Z）和当前状态。',
        highlight: true,
      },
      {
        text: '你的工作是：调配逻辑卡片，让当前参数向目标参数靠拢。误差越小，调制越精准。',
      },
      {
        text: '不同访客有不同的目标值，需要不同的卡片组合来应对。',
      },
    ],
    highlights: [
      { text: 'X: 1.0  Y: 0.5  Z: 1.0', color: '#AA64FF' },
      { text: '目标参数 · 容差范围：±30%', color: '#0AC8B9' },
    ],
  },
  {
    label: '卡牌',
    title: '八张逻辑卡片',
    content: [
      {
        text: '卡片从左到右依次插入三个插槽，系统按顺序执行。初始参数是 {X:0.5, Y:0.5, Z:0.5}。',
        highlight: true,
      },
      {
        text: '每张卡片的效果不同，选择和顺序都会影响最终结果。特殊访客「漂泊者」需要四张卡片才能完成调制。',
      },
    ],
    highlights: [
      { text: '[循环] X×1.5', color: '#00F2FF' },
      { text: '[分流] X÷2, Y+0.3', color: '#5EC0D8' },
      { text: '[增强] Z×2.0', color: '#FF8C00' },
      { text: '[滤波] 三轴均衡', color: '#AA64FF' },
      { text: '[相位] X↔Z 互换', color: '#0AC8B9' },
      { text: '[震荡] 回摆50%', color: '#D4A017' },
      { text: '[锚定] Y-0.4', color: '#FFD700' },
      { text: '[半衰] Y×0.5', color: '#FF69B4' },
    ],
    actionHint: '尝试将卡片拖入插槽，或点击选中后再点击目标插槽',
  },
  {
    label: '调制',
    title: '按下酿造，启动计算',
    content: [
      {
        text: '三张卡片配置完成后，按 [Enter] 开始酿造。',
        highlight: true,
      },
      {
        text: '系统会计算最终参数，如果与目标参数的误差在容差范围内，访客就被治愈了。',
      },
      {
        text: '超出容差则调制失败，连击归零。不要气馁，每一次都是学习和探索的机会。',
      },
    ],
    highlights: [
      { text: '误差 ≤30% 即成功', color: '#00F2FF' },
      { text: '成功 +100分，失败 -3能源', color: '#FF8C00' },
    ],
    actionHint: '按 [Enter] 酿造，或按 [R] 重置插槽',
  },
  {
    label: '档案',
    title: '记住每一次相遇',
    content: [
      {
        text: '每次成功治愈，都会记录在访客档案里。',
        highlight: true,
      },
      {
        text: '连续治愈同一位访客，他们的好感度会提升——从陌生，到相识，到熟悉，到信任。',
      },
      {
        text: '当你与某位访客建立了足够的信任，他们的完整故事就会向你展开。',
      },
    ],
    highlights: [
      { text: '陌生 → 相识 → 熟悉 → 信任', color: '#AA64FF' },
      { text: '信任解锁完整背景故事', color: '#FFD700' },
    ],
    actionHint: '点击右上角 [档案] 按钮，查看访客记录与好感度',
  },
]