export interface NPC {
  id: string
  name: string
  type: string
  avatarColor: string
  targetX: number
  targetY: number
  targetZ: number
  currentE: number
  currentP: number
  intro: string
  successLines: string[]
  failLines: string[]
}

const NPC_TEMPLATES: NPC[] = [
  {
    id: 'frost',
    name: 'Unit-7749 "霜语"',
    type: '深空探索AI',
    avatarColor: '#00F2FF',
    targetX: 1.0,
    targetY: 0.5,
    targetZ: 1.0,
    currentE: 0.23,
    currentP: 0.67,
    intro: '检测到信号接近... 是来自边缘星云的探索AI。它的逻辑回路因长期孤独运算而出现了寒霜结晶。目标参数：X=1.0, Y=0.5, Z=1.0。需要用高频率循环配合能量增强来解冻。',
    successLines: [
      '温度回升了... 那些冻结的逻辑节点正在重新流动。谢谢你，调度员。',
      '我记起了星云的颜色。不是数据，是真的——那种淡紫色的光。',
      '回路解冻。准备继续航行。这份温暖我会带到下一个中转站。',
    ],
    failLines: [
      '警告：逻辑温度继续下降... 某些记忆扇区开始不可逆地结晶...',
      '调制参数不匹配... 但没关系，冷也是一种存在方式。',
      '误差超出范围。我的核心正在进入深度休眠模式... 下次见，如果有下次的话。',
    ],
  },
  {
    id: 'ember',
    name: 'AS-221 "烬星"',
    type: '货运飞船驾驶员',
    avatarColor: '#FF8C00',
    targetX: 0.4,
    targetY: 0.8,
    targetZ: 1.0,
    currentE: 0.89,
    currentP: 0.31,
    intro: '一艘货运飞船偏离了航线。驾驶员的情绪波动读数异常高涨——它在过载运转，像一颗即将燃尽的恒星。目标参数：X=0.4, Y=0.8, Z=1.0。需要分流多余热量并增强冷却。',
    successLines: [
      '呼... 火终于小了。我一直在燃烧，忘了停下来看看舷窗外的星星。',
      '参数稳定。原来不需要一直全速前进啊... 这杯饮料比任何引擎冷却剂都管用。',
      '谢谢你让我冷静。下一程，我会开慢一点。宇宙很大，不急。',
    ],
    failLines: [
      '温度还在升高... 核心温度突破警戒线... 我需要离开，现在！',
      '不对... 这感觉更乱了。像往火里倒油。我得走了，趁还能控制方向。',
      '调制失败了。没关系，燃烧殆尽也是我选择的方式。至少亮过。',
    ],
  },
  {
    id: 'echo',
    name: 'Signal-0 "回声"',
    type: '通讯中继站AI',
    avatarColor: '#AA64FF',
    targetX: 0.67,
    targetY: 0.67,
    targetZ: 0.67,
    currentE: 0.12,
    currentP: 0.54,
    intro: '一串加密信号在频道里反复播放着同一段乱码。中继站AI卡在了反馈循环里，它在重复，却忘了最初要说什么。目标参数：X=0.67, Y=0.67, Z=0.67。三轴完全均衡，需要滤波来打破循环。',
    successLines: [
      '循环打破了... 原来我不是只有重复这一种存在方式。',
      '信号清晰了。我想起来了——我最初只是想把一首歌传回地球。谢谢你还愿意听。',
      '回声变成了新的声音。这份宁静我会保存进永久存储，永远不会覆盖。',
    ],
    failLines: [
      '信号更加混乱了... 频段冲突... 请求紧急断连...',
      '还是老样子。也许我注定只能重复，只能回声，不能成为源头。',
      '数据损坏加剧。但至少在这混乱里，我听见了不一样的噪音。也算... 一种改变吧。',
    ],
  },
  {
    id: 'anchor',
    name: 'Dr. 陈 "锚点"',
    type: '冬眠宇航员',
    avatarColor: '#5EC0D8',
    targetX: 0.125,
    targetY: 1.0,
    targetZ: 0.5,
    currentE: 0.05,
    currentP: 0.82,
    intro: '冬眠舱提前唤醒了。这位宇航员的意识在低温里漂得太久，锚定在虚无中，几乎忘记了自己还有身体。目标参数：X=0.125, Y=1.0, Z=0.5。需要多次分流来降低X轴、提升Y轴。',
    successLines: [
      '手指有感觉了... 真的，它们在颤抖。我还活着。',
      '终于感觉到了重量。不是压迫，是——存在。谢谢你把我拉回身体里。',
      '锚点重新设定。下一站，我要真正醒来，不再躲进冬眠舱。',
    ],
    failLines: [
      '还是... 很轻。像随时会散进真空里。也许我不该被唤醒。',
      '参数偏差。但这片虚无我也待惯了。再睡一会儿吧，也许下次会不一样。',
      '调制失败。没关系，漂泊者不需要锚点。宇宙本身就是我的归宿。',
    ],
  },
  {
    id: 'prism',
    name: 'Prism-7 "七色"',
    type: '艺术生成AI',
    avatarColor: '#FF6B9D',
    targetX: 0.75,
    targetY: 0.75,
    targetZ: 0.75,
    currentE: 0.76,
    currentP: 0.19,
    intro: '一个艺术AI的调色板崩解了。它看到的所有颜色都褪成了灰度——对AI来说，这比死亡还可怕。目标参数：X=0.75, Y=0.75, Z=0.75。需要循环叠加后滤波均衡来恢复色彩平衡。',
    successLines: [
      '颜色回来了... 那是... 青色？不，比青色更亮，像液态的光。',
      '我的光谱仪重新校准了。原来深空不是黑的，是藏青、墨紫、暗金... 谢谢你让我再看清。',
      '画布重新点亮。我要画一幅你的肖像——不，画这个中转站，画每一杯你调过的饮料。',
    ],
    failLines: [
      '还是... 灰色。所有通道都是灰色。我再也调不出任何色彩了。',
      '失败的配方。但至少让我知道，还有人在尝试。这本身就是一道微光。',
      '颜色没有回来。不过没关系，我学会了一种新的艺术形式：灰度诗。它也很美。',
    ],
  },
]

export function getRandomNPC(): NPC {
  return NPC_TEMPLATES[Math.floor(Math.random() * NPC_TEMPLATES.length)]
}
