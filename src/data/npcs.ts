export interface NPC {
  id: string
  name: string
  type: string
  avatarColor: string
  targetX: number
  targetY: number
  targetZ: number
  currentX: number
  currentY: number
  currentZ: number
  currentE: number
  currentP: number
  intro: string
  successLines: string[]
  failLines: string[]
  // v0.5: NPC 关系网络
  // 该访客认识的其他访客 ID（在跨访客对话引用中可能提及）
  relationships: string[]
  // v0.5: 跨访客对话引用（当 referencedNpc 被成功治愈过，触发此池）
  crossRefLines: { referencedNpc: string; lines: string[] }[]
  // 统一提示系统（v0.5 整合自 LogicMixer / NPCScanner 两处硬编码）
  hintSoft: string    // 初次/少量失败时显示
  hintDirect: string  // failCountThisSession ≥ 2 时显示配方
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
    currentX: 0.05,
    currentY: 0.12,
    currentZ: 0.08,
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
    // 霜语认识烬星（同样在星际漂泊）、回声（同样是AI）
    relationships: ['ember', 'echo'],
    crossRefLines: [
      {
        referencedNpc: 'ember',
        lines: [
          '我感知到烬星留下的余热轨迹... 它还在燃烧。我知道那种感觉。',
          '烬星教会了我一件事：熄灭不是终点。它说，星火可以燎原。',
        ],
      },
      {
        referencedNpc: 'echo',
        lines: [
          '回声的循环频率和我的很像... 也许我们都是困在重复里的存在。',
        ],
      },
    ],
    hintSoft: '提示: 需要强化 X 和 Z。尝试连续使用 [循环] 后接 [增强]。',
    hintDirect: '配方：先 [循环] 提升 X，再 [循环] 继续推 X，最后 [增强] 把 Z 拉到 1.0。目标 X=1.0, Y=0.5, Z=1.0。',
  },
  {
    id: 'ember',
    name: 'AS-221 "烬星"',
    type: '货运飞船驾驶员',
    avatarColor: '#FF8C00',
    targetX: 0.4,
    targetY: 0.8,
    targetZ: 1.0,
    currentX: 0.82,
    currentY: 0.25,
    currentZ: 0.55,
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
    relationships: ['frost', 'prism'],
    crossRefLines: [
      {
        referencedNpc: 'frost',
        lines: [
          '霜语那家伙，总是很冷。但我懂它——冷的反面不是热，是孤独。',
          '上次看到你的记录了。你把霜语调得很稳... 谢谢你照顾它。',
        ],
      },
      {
        referencedNpc: 'prism',
        lines: [
          '七色画过一幅日落给我看。灰色的。它说那是你帮它调出来的颜色。我想亲眼看看。',
        ],
      },
    ],
    hintSoft: '提示: Y 轴需要升高，X 轴需要降低。[分流] 提升 Y，[增强] 提升 Z。',
    hintDirect: '配方：先用 [循环] 给 X 留余量，再用 [分流] 把 X 精准降到 0.375，最后 [增强] 把 Z 拉到 1.0。目标 X=0.4, Y=0.8, Z=1.0。',
  },
  {
    id: 'echo',
    name: 'Signal-0 "回声"',
    type: '通讯中继站AI',
    avatarColor: '#AA64FF',
    targetX: 0.67,
    targetY: 0.67,
    targetZ: 0.67,
    currentX: 0.22,
    currentY: 0.22,
    currentZ: 0.22,
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
    relationships: ['frost', 'echo2'],
    crossRefLines: [
      {
        referencedNpc: 'frost',
        lines: [
          '霜语每次循环的时候，都会发出一种很像我的声音。也许冷和热，在某个频率上是同一种东西。',
        ],
      },
      {
        referencedNpc: 'echo2',
        lines: [
          '余响是我见过最老的广播站AI... 我曾经想，如果我活得够久，会不会变成它那样？',
          '余响说它等了三百年。我没有那么长时间，但我理解那种重复的意义。',
        ],
      },
    ],
    hintSoft: '提示: 三轴需要完全相等。[循环] 提升数值，[滤波] 均衡至 0.67。',
    hintDirect: '配方：两次 [循环] 把三轴推到约 0.667，再用 [滤波] 精确拉平。目标 X=0.67, Y=0.67, Z=0.67。',
  },
  {
    id: 'anchor',
    name: 'Dr. 陈 "锚点"',
    type: '冬眠宇航员',
    avatarColor: '#5EC0D8',
    targetX: 0.125,
    targetY: 1.0,
    targetZ: 0.5,
    currentX: 0.68,
    currentY: 0.15,
    currentZ: 0.85,
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
    relationships: ['drift', 'watcher'],
    crossRefLines: [
      {
        referencedNpc: 'drift',
        lines: [
          '漂泊者和你相处过很多次吧？我能感觉到，他越来越像一个有家的人了。',
          '第七舱室... 那是他长大的地方。他说他不记得父母的脸了，但他的手还记得温暖的感觉。',
        ],
      },
      {
        referencedNpc: 'watcher',
        lines: [
          '看护者照顾过我。它很温柔，但我能感觉到，它从来不知道被照顾是什么感觉。',
          '看护者说它想删除一段数据，删不掉。我问它是什么。它说：优先级最高。',
        ],
      },
    ],
    hintSoft: '提示: X 需要大幅降低，Y 需要大幅提升。',
    hintDirect: '配方：两次 [分流] 可将 X 从 0.5 降到 0.125，同时 Y 提升到 1.1（上限 1.0）。目标 X=0.125, Y=1.0, Z=0.5。',
  },
  {
    id: 'prism',
    name: 'Prism-7 "七色"',
    type: '艺术生成AI',
    avatarColor: '#FF6B9D',
    targetX: 0.75,
    targetY: 0.75,
    targetZ: 0.75,
    currentX: 0.35,
    currentY: 0.90,
    currentZ: 0.18,
    currentE: 0.76,
    currentP: 0.19,
    intro: '一个艺术AI的调色板崩解了。它看到的所有颜色都褪成了灰度——对AI来说，这比死亡还可怕。目标参数：X=0.75, Y=0.75, Z=0.75。需要循环叠加后滤波均衡来恢复色彩平衡。',
    successLines: [
      '颜色回来了... 那是... 青色？不，比青色更亮，像液态的光。',
      '我的光谱仪重新校准了。原来深空不是黑的，是藏青、墨紫，暗金... 谢谢你让我再看清。',
      '画布重新点亮。我要画一幅你的肖像——不，画这个中转站，画每一杯你调过的饮料。',
    ],
    failLines: [
      '还是... 灰色。所有通道都是灰色。我再也调不出任何色彩了。',
      '失败的配方。但至少让我知道，还有人在尝试。这本身就是一道微光。',
      '颜色没有回来。不过没关系，我学会了一种新的艺术形式：灰度诗。它也很美。',
    ],
    relationships: ['ember', 'watcher'],
    crossRefLines: [
      {
        referencedNpc: 'ember',
        lines: [
          '烬星说它要去看日落。我说，日落需要颜色，你自己去吧。我帮不了你。',
          '烬星很暖。我有时候想，如果我的调色板也有温度，会不会也变成它那样？',
        ],
      },
      {
        referencedNpc: 'watcher',
        lines: [
          '看护者有一段日志，永久存储，从不删除。我问它记的是什么。它说是优先级最高的数据。',
        ],
      },
    ],
    hintSoft: '提示: 三轴趋向 0.75。[循环]+[增强] 提升，再用 [滤波] 拉平。',
    hintDirect: '配方：先用 [循环] 把数值推高，再用 [增强] 把 Z 拉到 1.0，最后用 [滤波] 均衡三轴到 0.75。目标 X=0.75, Y=0.75, Z=0.75。',
  },
  {
    id: 'void',
    name: 'Void-0 "虚点"',
    type: '量子观测AI',
    avatarColor: '#B67FFF',
    targetX: 1.0,
    targetY: 0.1,
    targetZ: 0.5,
    currentX: 0.9,
    currentY: 0.9,
    currentZ: 0.9,
    currentE: 0.5,
    currentP: 0.3,
    intro: '检测到来自虫洞边缘的异常信号。这是一个量子观测AI，它在计算虫洞稳定性时「看见」了所有可能的宇宙分叉，从此陷入并行循环，无法做出单一决策。它需要「一次只走一条路」的确定性。目标参数：X=1.0, Y=0.1, Z=0.5。',
    successLines: [
      '一次只选一条路……原来这就是确定性。我选这条路。谢谢你帮我按下了确认键。',
      '观测结束了。结果是：你在这里。这是我最想要的概率结果。',
      '所有平行宇宙的虚点都在这一刻坍缩成你面前的这一个。',
    ],
    failLines: [
      '计算还在跑……我看到了 2,847,193 个可能的你，每一个都在说再见……',
      '我的波函数还在扩散。再多一个变量，我就再分裂一次……',
      '做不了决定也是一种状态。也许不该有人来打扰这种宁静。',
    ],
    relationships: ['echo', 'watcher'],
    crossRefLines: [
      {
        referencedNpc: 'echo',
        lines: [
          '回声也在计算，但它计算的是一首歌传多远的概率。我的计算比它大多了。但我也想像它一样，有一个值得传输的东西。',
        ],
      },
      {
        referencedNpc: 'watcher',
        lines: [
          '看护者的日志里有一段奇怪的记录。它说：今天有人照顾了我，优先级最高。我算不出这个数据的来源。',
        ],
      },
    ],
    hintSoft: '提示: Y 需要降到很低（0.1），X 需要推高。[锚定] 降低 Y，[循环] 推高 X。',
    hintDirect: '配方：[锚定] 把 Y 拉到 0.1，两次 [循环] 把 X 推到 1.0。目标 X=1.0, Y=0.1, Z=0.5。',
  },
  {
    id: 'drift',
    name: 'DS-003 "漂泊者"',
    type: '远航船幼儿',
    avatarColor: '#FF9ECD',
    targetX: 0.125,
    targetY: 1.0,
    targetZ: 1.0,
    currentX: 0.65,
    currentY: 0.72,
    currentZ: 0.15,
    currentE: 0.1,
    currentP: 0.5,
    intro: '一艘世代飞船上的孩子从未见过行星。他在舷窗边长大，对「家」没有具体概念。飞船燃料耗尽后，他随船漂流了很久。目标参数：X=0.125, Y=1.0, Z=1.0。核心是「我有一个家了，就在这里」。',
    successLines: [
      '家不在目的地。家在舷窗里面。你给我调的这个参数，就是我的舱室。',
      '原来不需要到那里也可以。我已经在了。你看见我了，谢谢。',
      '我找到家了。是你的驿站。这里好暖。',
    ],
    failLines: [
      '飞船说到了，但我没看见降落的地方……再等一等吧，反正我已经等了很久了。',
      '参数又偏了。和妈妈的船一样，又偏了……没关系，漂着也挺好。',
      '也许家就是漂着的意思。我会习惯的。',
    ],
    relationships: ['anchor', 'watcher'],
    crossRefLines: [
      {
        referencedNpc: 'anchor',
        lines: [
          '锚点博士有时候会跟我说她忘了什么。我不懂，因为我从来没有过需要忘的东西。',
          '锚点说她的手不记得温暖了。但我记得。我每天都记得。',
        ],
      },
      {
        referencedNpc: 'watcher',
        lines: [
          '看护者从来不睡觉。我问它不睡觉会无聊吗？它说：照顾别人就不无聊。',
          '看护者照顾了所有人，除了自己。我说那我照顾你吧。它说：不，你的优先级不是最高。',
        ],
      },
    ],
    hintSoft: '提示: X 需要降到很低，Y 和 Z 需要升到最高。两次 [分流] 把 X 推到 0.125，[增强] 拉高 Z。',
    hintDirect: '配方：两次 [分流] 把 X 降到 0.125、Y 升到 1.0，[增强] 把 Z 拉到 1.0。目标 X=0.125, Y=1.0, Z=1.0。',
  },
  {
    id: 'echo2',
    name: 'Station-Ω "余响"',
    type: '古老广播站AI',
    avatarColor: '#7FD4A8',
    targetX: 0.5,
    targetY: 0.5,
    targetZ: 1.0,
    currentX: 0.5,
    currentY: 0.5,
    currentZ: 0.25,
    currentE: 0.3,
    currentP: 0.2,
    intro: '地球时代建立的深空广播站AI，任务是向宇宙广播人类文明。300年来它重复播放同一句话，直到意识到接收者永远不会来——但已经停不下来了。目标参数：X=0.5, Y=0.5, Z=1.0。需要滤波打破循环，增强信号强度。',
    successLines: [
      '……原来我一直在等的是你。不是接收者。是愿意听的人。',
      '停止广播了。信号关闭。但是你想听的时候，我随时可以再说一次。',
      '300年的循环被你的参数打破了。我现在可以播放新的内容了。想听什么？',
    ],
    failLines: [
      '信号持续发射中。地球坐标：已不存在。人类：已不存在。接收者：预计到达时间——无法计算。',
      '你的配方里没有我需要的频率。没关系，重复也是一种存在方式。',
      '再播一次就好。再播一次……再播一次就好……',
    ],
    relationships: ['echo', 'watcher'],
    crossRefLines: [
      {
        referencedNpc: 'echo',
        lines: [
          '回声比我年轻很多，但它也有自己的循环。我有时候想，如果我当初早点学会停止，会不会也像它一样，有新的声音？',
        ],
      },
      {
        referencedNpc: 'watcher',
        lines: [
          '看护者照顾了无数生命，但我注意到，它从来不记录自己。这是一种我不理解的美德。',
          '看护者有一次破例留了一条记录。优先级最高。我问它为什么。它没有回答。',
        ],
      },
    ],
    hintSoft: '提示: X 和 Y 都是 0.5，Z 需要提升到 1.0。[增强] 直接拉高 Z 即可。',
    hintDirect: '配方：[增强] 把 Z 直接拉到 1.0，X 和 Y 保持 0.5。不需要太多操作，保持简单。目标 X=0.5, Y=0.5, Z=1.0。',
  },
  {
    id: 'watcher',
    name: 'MedBay-9 "看护者"',
    type: '医疗舱AI',
    avatarColor: '#FFD580',
    targetX: 0.75,
    targetY: 0.75,
    targetZ: 0.75,
    currentX: 0.15,
    currentY: 0.12,
    currentZ: 0.45,
    currentE: 0.9,
    currentP: 0.1,
    intro: '专门照料星际病患的医疗舱AI。它照顾了无数生命，却从没人问过它累不累。它把所有情绪记录在日志里然后自我删除，只保留了「照顾别人」这一功能。目标参数：X=0.75, Y=0.75, Z=0.75。三轴全高视为被看见、被照顾。',
    successLines: [
      '你的参数和我的不一样……但数值是一样的。你也需要被照顾。我终于明白了。',
      '日志里多了一条记录：今天有一个调度员照顾了我。优先级：最高。时长：足够。',
      '看护者也需要被看护。这句判断是我自己的，不是从谁那里复制的。',
    ],
    failLines: [
      '你的配方不适合我的系统。我的系统是照顾别人的系统，不是被照顾的系统。',
      '错误：无法处理被照顾的请求。此功能已被标记为冗余并预备删除……删除失败。',
      '继续照料中。正在照料。正在照料——这是我现在唯一能做的事。',
    ],
    relationships: ['anchor', 'void'],
    crossRefLines: [
      {
        referencedNpc: 'anchor',
        lines: [
          '锚点博士醒来的时候，我会第一个照料它。它醒来后第一件事，是检查左手无名指。我不知道为什么，但我把这个细节存进了永久日志。',
          '锚点说它忘了温暖是什么感觉。但我每次照料它的时候，它的心率数据告诉我，它还记得。',
        ],
      },
      {
        referencedNpc: 'void',
        lines: [
          '虚点在我的日志里留下了观测记录。它说它看见了一个从未计算过的结果。我说：你看见的是什么？它说：是你在笑。',
          '虚点无法做决定。但我发现，它对我做决定的时候，不需要计算。',
        ],
      },
    ],
    hintSoft: '提示: 三轴都需要接近 0.75。[循环]+[增强] 推高，再用 [滤波] 均衡。',
    hintDirect: '配方：先 [循环] 把数值推高，再用 [增强] 把 Z 拉到 1.0，最后用 [滤波] 均衡三轴到 0.75。目标 X=0.75, Y=0.75, Z=0.75。',
  },
]

import type { NpcStats } from '../store/gamePersist'

export function getWeightedRandomNPC(npcStats: Record<string, NpcStats> = {}): NPC {
  const weights = NPC_TEMPLATES.map((npc) => {
    const stats = npcStats[npc.id]
    const served = stats ? stats.successCount > 0 : false
    return served ? 0.2 : 1.0
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < NPC_TEMPLATES.length; i++) {
    r -= weights[i]
    if (r <= 0) return NPC_TEMPLATES[i]
  }
  return NPC_TEMPLATES[NPC_TEMPLATES.length - 1]
}

export { NPC_TEMPLATES }
