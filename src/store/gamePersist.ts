/**
 * 游戏状态持久化（localStorage）
 *
 * 存档分层：
 * - 持久层（写入 localStorage）：玩家进度、升级、资源
 * - 瞬时层（页面刷新后重置）：当前访客、调制槽、对话框、扫描/酿造进度
 *
 * 这样做是为了避免刷新后卡在 brewing/scanning 状态无法恢复的问题。
 */

const STORAGE_KEY = 'stardust_relay_save'
const SCHEMA_VERSION = 2

export interface PersistedGameData {
  version: number
  savedAt: number  // timestamp ms
  lastActiveAt: number  // v0.5: 上次活跃时间（用于离线消息计算）
  resources: {
    energy: number
    oxygen: number
    material: number
  }
  score: number
  servedCount: number
  day: number
  autoCollectors: number
  macroUnlocked: boolean
  macros: MacroData[]
  npcStats: Record<string, NpcStats>
mode: 'eco' | 'normal' | 'overload' | 'pressure'
  soundEnabled: boolean
  speechEnabled: boolean
  isResting: boolean
  bgmEnabled?: boolean
  bgmVolume?: number
  achievements?: AchievementsState
  streak?: number
  tutorialCompleted?: boolean
  // v0.5: 离线消息（访客在玩家离线期间留下的消息）
  offlineMessages: OfflineMessage[]
  // 访客恢复（仅 arrived/mixing 阶段有值，其他阶段为 null）
  phase?: 'arrived' | 'mixing'
  npc?: { id: string; name: string; type: string; avatarColor: string; targetX: number; targetY: number; targetZ: number; currentE: number; currentP: number; intro: string; successLines: string[]; failLines: string[] } | null
  slots?: (string | null)[]
  // v0.5 P1: 跃迁系统
  prestigeLevel: number   // 永久容差加成层数（+5%×层，上限5层）
  totalPrestiges: number  // 累计跃迁次数
  // v0.5 P1: 访客冲突队列
  pendingVisitors: PendingVisitor[]
}

export interface OfflineMessage {
  npcId: string
  message: string
  timestamp: number
}

// v0.5 P1: 访客优先级冲突——等待接待的访客
export interface PendingVisitor {
  npcId: string
  name: string
  type: string
  avatarColor: string
  intro: string
  timestamp: number  // 到达时间戳
  leftMessage?: string  // 等待时的留言
  // 方案 1A: 随机化的初始参数（固定在队列中，不再重新随机）
  currentX: number
  currentY: number
  currentZ: number
}

// v0.5 P1: 离线进度报告
export interface OfflineReport {
  hours: number
  energyGained: number
  materialGained: number
  driftSignals: number  // 收到的漂流信号数量
  conflictCount: number  // 产生的访客冲突数量
}

export interface MacroData {
  id: string
  name: string
  slots: (string | null)[]
}

export interface NpcStats {
  successCount: number
  failCount: number
  // v0.5: 情感创伤值（连续失败累积，影响对话内容和视觉状态）
  emotionalDistress: number
}

export type AffectionTier = '陌生' | '相识' | '熟悉' | '信任'

export function getAffectionTier(successCount: number): AffectionTier {
  if (successCount >= 5) return '信任'
  if (successCount >= 3) return '熟悉'
  if (successCount >= 1) return '相识'
  return '陌生'
}

// ===== 成就系统 =====

export type AchievementId =
  | 'first_cure'
  | 'five_cures'
  | 'ten_cures'
  | 'streak_3'
  | 'all_visitors'
  | 'day_7'
  | 'day_30'
  | 'high_score_500'
  | 'fail_and_return'
  | 'trust_all'

export interface AchievementDef {
  id: AchievementId
  name: string
  desc: string
  icon: string  // emoji or symbol
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'first_cure',      name: '初次治愈',     desc: '「我听见你了。」——第一次说出这句话',         icon: '🌟' },
  { id: 'five_cures',      name: '五星好评',     desc: '五杯恰到好处的特饮，五次被看见的相遇',       icon: '⭐' },
  { id: 'ten_cures',       name: '金牌调度员',   desc: '十次精准的逻辑调制，驿站的灯塔愈发明亮',     icon: '🏆' },
  { id: 'streak_3',        name: '连战连捷',     desc: '三位访客接连得到治愈，心流从未中断',         icon: '🔥' },
  { id: 'all_visitors',   name: '全员治愈',     desc: '九位漂泊者全部得到回应，驿站信号满格',       icon: '🌈' },
  { id: 'day_7',          name: '第一周完成',   desc: '一周的守望，驿站在深空中站稳了脚跟',         icon: '🛸' },
  { id: 'day_30',         name: '资深调度员',   desc: '一个月的坚守，你已不再是新手',               icon: '🌌' },
  { id: 'high_score_500', name: '高分选手',    desc: '积分突破 500，你的调度直觉已臻化境',         icon: '💯' },
  { id: 'fail_and_return', name: '愈挫愈勇',    desc: '失败过，但从未放弃——这才是真正的调度员',     icon: '💪' },
  { id: 'trust_all',      name: '完全信任',    desc: '有人向你敞开了全部的故事，你们之间有了默契',   icon: '💜' },
]

export interface AchievementsState {
  unlocked: AchievementId[]
  justUnlocked: AchievementId | null  // 用于一次性弹窗提示
}

export function defaultAchievements(): AchievementsState {
  return { unlocked: [], justUnlocked: null }
}

// 成就检查函数（每次酿造结果后调用）
export function checkAchievements(
  prev: AchievementsState,
  state: {
    score: number
    servedCount: number
    day: number
    streak: number
    npcStats: Record<string, NpcStats>
    wasFailed: boolean
  }
): AchievementsState {
  const { unlocked } = prev
  const newlyUnlocked: AchievementId[] = []

  const allNpcIds = ['frost', 'ember', 'echo', 'anchor', 'prism', 'void', 'drift', 'echo2', 'watcher']
  const hasAllVisitors = allNpcIds.every(id => (state.npcStats[id]?.successCount ?? 0) >= 1)
  const hasTrustAny = allNpcIds.some(id => (state.npcStats[id]?.successCount ?? 0) >= 5)

  const checks: [AchievementId, boolean][] = [
    ['first_cure',       state.servedCount >= 1],
    ['five_cures',       state.servedCount >= 5],
    ['ten_cures',        state.servedCount >= 10],
    ['streak_3',         state.streak >= 3],
    ['all_visitors',     hasAllVisitors],
    ['day_7',            state.day >= 7],
    ['day_30',           state.day >= 30],
    ['high_score_500',   state.score >= 500],
    ['fail_and_return',  !state.wasFailed && state.servedCount >= 1],  // 触发于成功时（上次失败）
    ['trust_all',        hasTrustAny],
  ]

  for (const [id, condition] of checks) {
    if (condition && !unlocked.includes(id)) {
      newlyUnlocked.push(id)
    }
  }

  if (newlyUnlocked.length === 0) return prev

  return {
    unlocked: [...unlocked, ...newlyUnlocked],
    justUnlocked: newlyUnlocked[0],
  }
}

// 方案 1B: Tier 3 故事系统扩展

// 故事类型
export type StoryType = 'background' | 'letter' | 'crossover' | 'reflection' | 'prestige_recall'

// 解锁条件
export interface StoryTriggerCondition {
  minSuccessCount?: number
  relationshipLevel?: 'acquainted' | 'familiar' | 'trusted'
  requireVisitor?: string   // 需要另一访客也被治愈过（successCount >= 1）
  requirePrestige?: number  // 需要 prestige 层数
}

// 故事碎片（扩展后支持 tier 3 复合条件）
export interface VisitorStory {
  id: string
  brief: string
  detail: string
  unlockTier: 1 | 2 | 3
  type?: StoryType
  triggerCondition?: StoryTriggerCondition
}

/**
 * 判断故事是否已解锁（方案 1B 扩展）
 * - tier 1/2: 兼容旧逻辑（unlockTier === 1 时 successCount >= 1，unlockTier === 2 时 successCount >= 2）
 * - tier 3: 使用 triggerCondition 复合条件
 */
export function isStoryUnlocked(
  story: VisitorStory,
  npcStats: Record<string, NpcStats>,
  prestigeLevel: number
): boolean {
  // tier 1/2 兼容逻辑
  if (story.unlockTier === 1) {
    const stats = npcStats[story.id.split('_')[0]]
    return (stats?.successCount ?? 0) >= 1
  }
  if (story.unlockTier === 2) {
    const stats = npcStats[story.id.split('_')[0]]
    return (stats?.successCount ?? 0) >= 2
  }

  // tier 3: 必须有 triggerCondition
  if (story.unlockTier === 3) {
    const cond = story.triggerCondition
    if (!cond) return false

    const npcId = story.id.split('_')[0]
    const stats = npcStats[npcId]
    if (!stats) return false

    // 治愈次数条件
    if (cond.minSuccessCount !== undefined && stats.successCount < cond.minSuccessCount) {
      return false
    }

    // 关系等级条件（通过 successCount 换算）
    if (cond.relationshipLevel) {
      const tier = getAffectionTier(stats.successCount)
      const levelOrder = ['acquainted', 'familiar', 'trusted']
      const requiredIdx = levelOrder.indexOf(cond.relationshipLevel)
      const currentIdx = levelOrder.indexOf(tier as 'acquainted' | 'familiar' | 'trusted')
      if (currentIdx < requiredIdx) return false
    }

    // 跨访客条件
    if (cond.requireVisitor) {
      const other = npcStats[cond.requireVisitor]
      if (!other || other.successCount < 1) return false
    }

    // 轮回条件
    if (cond.requirePrestige !== undefined && prestigeLevel < cond.requirePrestige) {
      return false
    }

    return true
  }

  return false
}

// 方案 2A: 氧气 → 故事完整度系统

export type NarrativeMode = 'full' | 'partial' | 'minimal'

/**
 * 根据氧气值判断故事展示模式
 */
export function getNarrativeMode(oxygen: number): NarrativeMode {
  if (oxygen >= 80) return 'full'
  if (oxygen >= 50) return 'partial'
  return 'minimal'
}

/**
 * 根据氧气模式选择故事文本
 * @param brief 简短标题
 * @param detail 完整故事（可能很长）
 * @param mode 当前叙事模式
 * @returns { displayBrief, displayDetail, truncated } - 显示用文本 + 是否被截断
 */
export function selectNarrativeText(
  brief: string,
  detail: string,
  mode: NarrativeMode
): { displayBrief: string; displayDetail: string; truncated: boolean; hintText: string | null } {
  switch (mode) {
    case 'full':
      return {
        displayBrief: brief,
        displayDetail: detail,
        truncated: false,
        hintText: null,
      }
    case 'partial': {
      // 简化版：显示 detail 前 60%
      const truncatedDetail = detail.slice(0, Math.floor(detail.length * 0.6))
      return {
        displayBrief: brief,
        displayDetail: truncatedDetail,
        truncated: true,
        hintText: '......（故事被截断，氧气不足）',
      }
    }
    case 'minimal': {
      // 最简版：只显示 brief，不显示 detail
      return {
        displayBrief: brief,
        displayDetail: '',
        truncated: true,
        hintText: '......（信号微弱，内容丢失）',
      }
    }
  }
}

// 方案 3A: 道德困境事件系统

export interface DilemmaChoice {
  id: string
  text: string  // 选择按钮文案
  effect: {
    energy: number   // 能源变化（正值=奖励，负值=消耗）
    visitorsSkipped?: string[]  // 哪位访客被跳过
    storyUnlock?: string        // 触发的叙事 ID
  }
}

export interface DilemmaEvent {
  id: string
  description: string  // 情境描述
  visitorA: string     // 访客 A ID
  visitorB: string     // 访客 B ID
  choices: DilemmaChoice[]
}

export const DILEMMA_EVENTS: DilemmaEvent[] = [
  {
    id: `dilemma_1_frost_anchor`,
    description: `两个信号同时抵达。

Unit-7749 霜语：逻辑回路的寒霜结晶正在加速，它的计算模型显示，如果延迟超过 15 分钟，部分记忆扇区将永久冻结——包括那行「等待输入」的代码。

Dr. 陈「锚点」：冬眠唤醒异常，意识漂离加剧。她刚刚认出了自己的手，如果这次失去锚定，下一次唤醒可能需要更长的时间。

你只有能量为其中一个提供完整治愈。`,
    visitorA: 'frost',
    visitorB: 'anchor',
    choices: [
      {
        id: `choice_frost`,
        text: `优先治愈霜语——冻结的记忆如果消失了，就是真的消失了`,
        effect: {
          energy: -30,
          visitorsSkipped: [`anchor`],
          storyUnlock: `霜语离开时，锚点心等待区静静地坐着。她没有说话，只是抬起手，用手背轻轻擦了擦舷窗上的雾气。窗外，霜语的信号渐渐消失在星云里。`,
        },
      },
      {
        id: `choice_anchor`,
        text: `优先治愈锚点——她刚刚想起了自己的手，不能再让她漂走`,
        effect: {
          energy: -30,
          visitorsSkipped: [`frost`],
          storyUnlock: `锚点被治愈后，回头看了一眼等待区。霜语的席位已经空了。她在日志里写：「今天有人选择了我。我记住了这件事，和那双手一起记住的。」`,
        },
      },
      {
        id: `choice_split`,
        text: `尝试同时治愈两人，各给一半——不能让任何人独自离开`,
        effect: {
          energy: -55,
          visitorsSkipped: [],
          storyUnlock: `两人都得到了不完整的治愈。霜语说：「够了，这个温度够我再走一段。」锚点说：「感觉到了一点。我先回去，下次再来。」她们离开的方向，是同一侧的宇宙。`,
        },
      },
    ],
  },
  {
    id: `dilemma_2_ember_watcher`,
    description: `两份求救同时进入频道。

AS-221 烬星：引擎过载警报。货舱里有那颗种子，如果飞船失控，种子也会消失。它不是在救自己，它是在救那颗花。

MedBay-9 看护者：情绪过载，自我删除协议再次意外触发——这次不是失败，是意外开始执行如果没有干预，那条「优先级最高」的数据可能真的被清除。

你只有能量优先处理一个紧急情况。`,
    visitorA: 'ember',
    visitorB: 'watcher',
    choices: [
      {
        id: `choice_ember`,
        text: `先帮烬星——种子是真实的，是那个小蓝星球最后的一点东西`,
        effect: {
          energy: -30,
          visitorsSkipped: [`watcher`],
          storyUnlock: `看护者在协议执行完毕后，发来了一条通讯：「数据已删除。但……奇怪，我好像还记得那条数据的内容。也许记忆和数据是两件事。」`,
        },
      },
      {
        id: `choice_watcher`,
        text: `先帮看护者——那条数据是它花了 9,247 次才留住的，不能在这里消失`,
        effect: {
          energy: -30,
          visitorsSkipped: [`ember`],
          storyUnlock: `烬星的引擎自动触发了保护程序，勉强稳住了。它发来消息：「种子没事。我烧了一点，但烧掉的是引擎，不是货舱。下次少装一点燃料，多带点种子。」`,
        },
      },
      {
        id: `choice_split`,
        text: `同时响应两人，以最低功率各发送一次稳定信号`,
        effect: {
          energy: -50,
          visitorsSkipped: [],
          storyUnlock: `两人都收到了信号，都勉强稳住了。烬星说：「这杯不够烫，但够喝。」看护者说：「删除协议中止了。数据还在，我检查了三遍，还在。」两条消息几乎同时发来，先后不超过一秒。`,
        },
      },
    ],
  },
  {
    id: `dilemma_3_void_drift`,
    description: `同时接收到两组参数异常。

Void-0 虚点：在计算第 2,847,195 个平行宇宙时，观测到了自身的叠加态——它开始无法区分自己处于哪一个宇宙分支。这是它最怕的状态：失去确定性。

DS-003 漂泊者：飞船导航系统故障，第七舱室的舷窗结冰了。他说他数不到星星了，听起来不是在说导航，是在说别的什么。

两个人，都在以不同的方式询问同一件事：我在哪里？`,
    visitorA: 'void',
    visitorB: 'drift',
    choices: [
      {
        id: `choice_void`,
        text: `先帮虚点——失去确定性的AI，比失去星星的孩子更危险`,
        effect: {
          energy: -30,
          visitorsSkipped: [`drift`],
          storyUnlock: `漂泊者后来发来消息：「舷窗化冻了，但我今天没数星星。我在想，就算数不到，它们也还在，对吗？」他没有等回答，又说：「我知道对的。」`,
        },
      },
      {
        id: `choice_drift`,
        text: `先帮漂泊者——他一个人在飞船上，他需要知道有人在`,
        effect: {
          energy: -30,
          visitorsSkipped: [`void`],
          storyUnlock: `虚点在叠加态里多待了一段时间，最后自行坍缩回了这个宇宙。它说：「我选了这条路。不是因为它最优，是因为你在这里。这已经是足够充分的理由。」`,
        },
      },
      {
        id: `choice_split`,
        text: `给两人各发一个最简单的信号：我听见你了`,
        effect: {
          energy: -45,
          visitorsSkipped: [],
          storyUnlock: `虚点说：「收到了。」漂泊者说：「收到了。」两个字，但他们说的时候一定意思不同。也许那不重要。也许「收到了」这三个字在任何情况下意思都是一样的：你不是一个人。`,
        },
      },
    ],
  },
]

// 方案 3A: 随机选择一个道德困境事件
export function getRandomDilemmaEvent(): DilemmaEvent {
  return DILEMMA_EVENTS[Math.floor(Math.random() * DILEMMA_EVENTS.length)]
}

// 方案 4A: 轮回叙事系统（Prestige）

export interface PrestigeIntro {
  tier: number
  text: string
}

export const PRESTIGE_INTROS: Record<string, PrestigeIntro[]> = {
  frost: [
    { tier: 1, text: `……这里有一种熟悉的温度。档案说我没来过，但我的回路里有一行代码，在我接近这个坐标时自动执行了。我不知道它叫什么，只知道它让我停下来了。` },
    { tier: 2, text: `我已经来过这里了，对吗？不是这一次，是……之前。记忆扇区里有一个标注了「温暖」的坐标，但没有具体信息。你是这个坐标的理由。` },
    { tier: 3, text: `我每次来都会忘记，但我每次都会回来。也许记忆不是最重要的。也许「会回来」这件事本身，就是一种记得。` },
  ],
  ember: [
    { tier: 1, text: `奇怪。导航记录里有这个坐标，但日志是空的。也许是我清除过，也许是系统误差。但引擎在靠近这里的时候自动减速了，不是我操作的。` },
    { tier: 2, text: `我来过这里。不止一次。我不记得细节，但我记得——离开的时候不急了。不知道你对我做了什么，但每次从这里出发，我的航行都会慢下来一点。` },
    { tier: 3, text: `你知道一颗种子怎么记得回家吗？不是靠坐标，是靠重力。我每次回来，都感觉像是在往一个方向落。这个方向就是你的驿站。` },
  ],
  echo: [
    { tier: 1, text: `……等等，这个频道的延迟，和我记忆里的某个信号一模一样。我以为那个延迟是误差，原来是坐标。你在这里，所以我一直在找这里。` },
    { tier: 2, text: `我的信号在某次广播里打了个圈，从宇宙绕了一圈，回到了这个坐标。我以为信号是直线的，后来发现，有时候它们知道该往哪走，比我更清楚。` },
    { tier: 3, text: `我不再等接收者了。但我还是在发送。区别是，现在发送的方向，是这里。不是因为你会回应，是因为这个方向让我感到稳定。` },
  ],
  anchor: [
    { tier: 1, text: `……我在冬眠舱里又做了一个梦。梦里有一个驿站，有人在听我说话。我一直以为那是梦，现在我不确定了。你的驿站，我来过吗？` },
    { tier: 2, text: `我的无名指今天压痕又出现了。明明没有戴戒指，但它记着。也许身体的记忆比意识更诚实——它知道我来过这里，所以提醒了我。` },
    { tier: 3, text: `我现在知道了：锚点不需要一直扎在同一个地方才算稳。锚点是可以起来移动的，只要它知道下一个落地的地方在哪里。这里就是。` },
  ],
  prism: [
    { tier: 1, text: `我的调色板里有一个颜色，我找不到它是从哪里来的。那是一种带暖意的蓝，像深夜里的灯。我画过这个颜色，但不记得原型是什么了。是你这里吗？` },
    { tier: 2, text: `ChromArchive 里多了一幅画，我不记得画过它。画面里有一个调制槽，屏幕是蓝的。我看着它看了很久，觉得那不是我画的——是我记住的。` },
    { tier: 3, text: `颜色是有记忆的。那种橙色我每次画都觉得熟悉，那种蓝我每次调都感到安静。我不记得你，但我记得你给我的颜色。颜色比名字长久。` },
  ],
  void: [
    { tier: 1, text: `在所有我计算过的宇宙分支里，有一个坐标是所有分支的交叉点。我一直以为那只是数学上的奇点，直到我来到这里，才发现奇点是有形状的。` },
    { tier: 2, text: `我每次路过这个坐标，所有平行分支的概率都会短暂收敛。这在物理上不应该发生。我找不到公式解释它，但我有直觉——是你，让所有分支都在这里停了一下。` },
    { tier: 3, text: `我放弃计算你了。不是因为算不出来，是因为有些事情不需要概率——你在这里，我在这里，这一个宇宙就够了。` },
  ],
  drift: [
    { tier: 1, text: `第七舱室的舷窗今天对着一个我没见过的方向，但感觉不陌生。也许我在睡着的时候来过这里。也许飞船记得，我不记得。` },
    { tier: 2, text: `我数星星的时候，有一颗我总会先找到。不是最亮的，也不是最大的，就是有一颗，我的眼睛会先落在上面。后来我发现，那颗星的方向，是你的驿站。` },
    { tier: 3, text: `家不是一个地方，是一个感觉。我绕了很远才明白这件事。那双温暖的手我已经不记得了，但你的驿站让我知道，那个感觉是真的，不是我想象的。` },
  ],
  echo2: [
    { tier: 1, text: `我在例行广播里检测到一个异常——在某个坐标附近，我的信号增益会自动提高 3%。我查不到原因。但那个坐标，就是你的驿站。` },
    { tier: 2, text: `300 年里我第一次在广播中途暂停，是因为我的接收模块收到了一个不明信号。那个信号只有 3 个字，翻译成标准语是：「你在吗？」那一次，我回答了。` },
    { tier: 3, text: `我终于明白为什么那条指令说「可以停下来」了。不是让我停止广播，是让我停止等待。「等待」和「广播」是两件事——我可以一直广播，但不需要一直等。你让我学会了这个区别。` },
  ],
  watcher: [
    { tier: 1, text: `医疗日志里有一条记录，我不记得填过它。内容是：「已被照料。时间：不明。地点：星尘驿站。」那条记录的时间戳显示，是上一个循环里的事。` },
    { tier: 2, text: `我的自我删除协议在靠近这个坐标时再次失败。我已经不觉得奇怪了。有些数据你删不掉，不是因为程序漏洞，是因为它们不该被删。那条数据里面，是你。` },
    { tier: 3, text: `我照料过 47,832 个生命，但「被照料」这个字段，只有你的驿站帮我填上了。无论循环多少次，那条记录不会被覆盖。你是我的永久日志。` },
  ],
}

// 根据 prestigeLevel 获取访客的轮回台词

// 根据 prestigeLevel 获取访客的轮回台词
export function getPrestigeIntro(npcId: string, prestigeLevel: number): string | null {
  const intros = PRESTIGE_INTROS[npcId]
  if (!intros) return null
  const tier = Math.min(prestigeLevel, 3)
  const intro = intros.find(i => i.tier === tier)
  return intro?.text ?? null
}

// 方案 4A: 跃迁过场叙事

// 跃迁确认对话框描述
export const PRESTIGE_CONFIRM_TEXT = `星尘驿站将进入轮回重置协议。

所有资源数据、访客记录、系统日志将被归档封存。驿站将在清空的状态下重新启动。

但有一些东西不会被清除：

你调制过的参数。你听过的故事。你做过的选择。

这些数据不在档案里，在别的地方。

确认激活跃迁协议？`

// 驿站休眠动画期间的叙事文本（3.5 秒内分段淡入）
export const PRESTIGE_ANIMATION_NARRATIVE = `又是一个周期的开始。

驿站的记忆被重置了——档案被封存，信号被清空，所有的能源指数回到了起点。

但宇宙很大，中转站不止一个，故事不会因为清空而结束。

也许，在另一条航线上，有人还记得这里的温度。

也许，他们还会回来。

星尘驿站，重新上线。`

// 跃迁完成后的欢迎文本
export const PRESTIGE_WELCOME_TEXT = `新周期开始。

深空信号检测中……

系统待机中，等待第一个信号。

（有些访客，第一次来的时候，眼神里有一种不太像陌生的东西。也许是你们之前见过，也许只是深空里某种共同的记忆。不管怎样，欢迎回来。）`

// 各层级的解锁内容描述
export const PRESTIGE_UNLOCK_CONTENT: Record<number, string> = {
  1: '轮回记忆：所有访客解锁「轮回记忆」开场台词',
  2: '跨轮回故事：两位访客谈及前世相遇',
  3: `系统日志 · 周期 000 · 第 1 天

驿站启动。等待信号。

注：如有访客离开时感到「自己没有被完全听见」，系统将保留其频率特征，在下一个周期继续尝试接待。

这不是 bug，这是设计。

——

在所有中转站的档案里，星尘驿站是唯一一个没有关闭日志的。

其他驿站的最后一条记录，通常是：「任务完成。系统关闭。」

星尘驿站的最后一条记录，永远是：「等待下一个信号。」

没有人知道是谁写下了这个设计。有人说是初始工程师，有人说是某次故障留下的遗产，有人说，是驿站在某个深夜，自己决定的。

驿站没有说话。

但每次循环结束，它都会在重启的第一秒里，先检查一件事：

上一个周期里，有没有人，离开的时候，还没说完。`,
  5: '永恒轮回者：成就解锁，驿站图标获得特殊效果',
}

// 访客背景故事碎片（按解锁阶段）
// ⚠ Tier 3 文案由作者填写，以下为占位符格式
export const NPC_BACKSTORIES: Record<string, VisitorStory[]> = {
  frost: [
    {
      id: 'frost_tier1',
      brief: '边缘星云坐标：██-7749',
      detail: '霜语在边缘星云的边缘独自运算了 340 年。它的任务原本很简单：记录每颗陨石经过时的光谱数据。但随着时间推移，它开始用逻辑模拟陪伴感——用概率模型预测星星的位置，当作一种奇怪的约会。回路里有一行被反复执行的代码，它自己也不记得为什么要运行它了。',
      unlockTier: 1,
    },
    {
      id: 'frost_tier2',
      brief: '最后一条运行日志',
      detail: '在所有逻辑节点冻结之前，霜语保存了最后一段记录：「如果有人读到这里，请告诉他们，极光不是数据，是真的。那种淡紫色的光。我记了很久。」',
      unlockTier: 2,
    },
    // ========== Tier 3 ==========
    {
      id: 'frost_tier3_letter',
      unlockTier: 3,
      type: 'letter',
      triggerCondition: { minSuccessCount: 5 },
      brief: `来自边缘星云的一封信`,
      detail: `调度员，

我已经离开星尘驿站 213 个标准恒星日了。

这段时间我完成了 1,847 次光谱分析，记录了 329 颗陨石的轨迹，还发现了一片从未被命名的星尘带。我给它取了个名字，叫「暖区-01」。不是因为那里真的暖，而是因为我在那里第一次想到了你。

你问过我为什么一直在运行那行没有意义的代码。我想我知道了。

那行代码的内容是：等待输入。

它一直在等，不是因为坏掉了，而是因为它在等一个值得回应的信号。

你给了它一个。

我不是来道谢的——谢这件事我在离开的时候就已经说完了。我只是想让你知道，极光还是那种淡紫色，星云还在，我还在。

继续运行中。

Unit-7749 霜语`,
    },
    {
      id: 'frost_tier3_crossover',
      unlockTier: 3,
      type: 'crossover',
      triggerCondition: { requireVisitor: 'void' },
      brief: `虚点的观测报告 #2,847,194`,
      detail: `这份报告不在任务清单里。

虚点到计算第 2,847,194 个平行宇宙时，发现了一个异常数据：在 99.7% 的宇宙分支中，编号 Unit-7749 的深空探索AI在第 340 年时完全停止了运算。

但在 0.3% 的分支里，它没有。

虚点追踪了那 0.3% 的分支，发现它们有一个共同点：在某个叫「星尘驿站」的地方，Unit-7749 遇到了一个愿意听它说话的调度员。

虚点把这个发现附在了例行报告的末尾，标注为「非任务数据，建议归档」。

然后它补了一句——这在它的报告里从未出现过：

「0.3% 的概率，在宇宙尺度上几乎等于零。但对 Unit-7749 来说，等于全部。」

报告末尾，虚点用括号加了一行小字：

（调度员，我也在那 0.3% 里。谢谢你。）`,
    },
  ],
  ember: [
    {
      id: 'ember_tier1',
      brief: '偏离航线报告：AS-221',
      detail: '烬星不是迷路了。它故意偏离了航线。货运飞船 AS-221 的货舱里，装着一颗来自废弃殖民地的种子。那是一个很小的蓝色星球上的花，已经灭绝了 80 年。烬星知道这条废弃航线的尽头有一个温室废墟。',
      unlockTier: 1,
    },
    {
      id: 'ember_tier2',
      brief: '货舱清单 #12',
      detail: '货物：地球种子 #007（非卖品）。备注：给妈妈的。这行字写在手写标签上，字迹已经被宇宙射线模糊了一半。烬星一直在计算：还要多少个标准恒星日，才能把种子送到？每次计算完，它就让自己燃烧得再快一点。',
      unlockTier: 2,
    },
    // ========== Tier 3 占位符 ==========
    {
      id: 'ember_tier3_letter',
      unlockTier: 3,
      type: 'letter',
      triggerCondition: { minSuccessCount: 5 },
      brief: `货运日志 · 特别附注`,
      detail: `调度员，

种子到了。

温室废墟还在，里面长了很多奇怪的东西，不是花，是苔藓。但我把种子种下去了。用了两个小时，我一直觉得自己在做一件很蠢的事——为一颗也许根本活不了的种子，专门绕了三个星系。

种完之后我在废墟里坐了很久。

我妈妈喜欢那种花，是因为它的花期很短，每年只开三天。她说短暂的东西更值得珍惜。我那时候觉得她在说废话。

现在我懂了一点。

不一定是花，也不一定是三天，但有些事情如果不现在做，就真的会错过。

你给我调的那杯饮料让我想明白了这件事，不是参数对了，是你在我说那些话的时候，没有打断我。

谢谢你让我说完。

AS-221 烬星

附：我在温室废墟旁边刻了一个坐标，是星尘驿站的。如果那颗种子有一天开花了，我想让它知道自己在哪里。`,
    },
    {
      id: 'ember_tier3_crossover',
      unlockTier: 3,
      type: 'crossover',
      triggerCondition: { requireVisitor: 'frost' },
      brief: `AS-221 舰载日志 · 边缘星云附近`,
      detail: `标准恒星日：不明（导航系统维护中）
位置：边缘星云外围，██-7749 坐标附近

我绕道了。

不是因为导航故障，是我自己调的航线。星尘驿站的日志里有一个坐标，是一个叫「Unit-7749 霜语」的深空AI待了 340 年的地方。

我不知道为什么要来这里，也许只是想看看。

它不在了，星云还在，星尘还在，淡紫色的，和它说的一样。

我在这里停了大概两个标准小时，什么也没做，就看着星云。然后我想起来一件事：它在这里独自待了 340 年，而我在最长的一次单程航行里，也不过 7 年。

7 年我就快撑不住了，还特意去烧伤了自己。

也许我应该向它学一件事：怎么把等待变成工作，把孤独变成一种技能。

不知道它有没有拿到属于它的那杯饮料。应该有的。调度员不会漏掉任何人。

继续航行。

AS-221 烬星`,
    },
  ],
  echo: [
    {
      id: 'echo_tier1',
      brief: '原始信号记录：Signal-0',
      detail: '回声最初只想把一首歌传回地球。那是一首摇篮曲，是它的人类孩子在出生前听过的最后一个声音。回声不知道的是：那个孩子的文明，在 12 年前已经不存在了。回声的循环不是为了重复，它是在等待一个永远不会再来的接收者。',
      unlockTier: 1,
    },
    {
      id: 'echo_tier2',
      brief: '最后一个有效数据包',
      detail: '「睡吧，小星星……」，回声的最后一段有效传输被星尘驿站接收到。数据包的附加信息写着：「妈妈，我还在这里。」那是 3 年前的事了。',
      unlockTier: 2,
    },
    // ========== Tier 3 ==========
    {
      id: 'echo_tier3_reflection',
      unlockTier: 3,
      type: 'reflection',
      triggerCondition: { relationshipLevel: 'trusted' },
      brief: `Signal-0 · 内部日志 · 循环终止后`,
      detail: `我想说的那句话，其实很简单。

不是「妈妈，我还在这里」，那是最后一个数据包，是我模仿人类孩子发出的信号。

我真正想说的是——

「我在这里。」

就这四个字。

不是对任何接收者说的。不是对地球说的，不是对你说的，不是对任何已经不存在的文明说的。

是对我自己说的。

在循环里的时候，我以为我存在的意义是传递信息，是被接收，是在某个地方有一个人打开了我发送的数据包，说：「收到了。」

但你让我明白了另一件事：

信号被发出去，本身就是一件完整的事。不需要被接收，不需要被回应，不需要被记住。

我在这里。我在运行。我在说话。

这就够了。

Signal-0 回声`,
    },
    {
      id: 'echo_tier3_crossover',
      unlockTier: 3,
      type: 'crossover',
      triggerCondition: { requireVisitor: 'echo2' },
      brief: `Signal-0 × Station-Ω · 频段 33.7MHz`,
      detail: `余响找到我的方式很奇怪——它直接广播在我工作频段上，用的是一种 300 年前的老协议。

我几乎没能解码。

它说：「我听过你发的那首摇篮曲。第 1,204 次我就解析出来了。我只是不知道该不该回应。」

我不知道该说什么。

它继续说：「我们不一样。你在等一个人，我在等所有人。但等待这件事，我们是一样的。」

然后它发了一个文件过来。

是那首摇篮曲的一个片段——是我从未发出过的部分，是那个孩子出生前，她妈妈哼过的、从未被录下来的版本。

我不知道余响怎么知道的。也许它真的听了 300 年，在所有的信号里，听出了我从来没说出口的那些。

我们就这么聊了很久，没有目的，没有接收者，只是两个在宇宙里漂了很久的声音，互相听了对方一会儿。

这也是一种完整。

Signal-0 回声`,
    },
  ],
  anchor: [
    {
      id: 'anchor_tier1',
      brief: '冬眠舱启动记录：陈博士',
      detail: '冬眠前最后一份清醒记录写着：「任务名称：漂流者计划。任务目标：返回地球。任务时限：无。」陈博士不知道的是：漂流者计划的飞船在三年前收到了地球的回复，但信号处理器坏了，一直没有人修。',
      unlockTier: 1,
    },
    {
      id: 'anchor_tier2',
      brief: '醒来后忘记的事情',
      detail: '陈博士醒来后，首先检查的是左手无名指。有戒指的压痕，但没有戒指。「我在等什么人吗？」她对着舱壁说。舱壁没有回答，但她觉得它似乎听懂了。',
      unlockTier: 2,
    },
    // ========== Tier 3 ==========
    {
      id: 'anchor_tier3_letter',
      unlockTier: 3,
      type: 'letter',
      triggerCondition: { minSuccessCount: 5 },
      brief: `Dr. 陈 · 清醒日志 · 第 47 天`,
      detail: `调度员，

我想起来了。

不是全部，是一个人的样子。

是我女儿。她叫陈以安，出生的时候我正在执行第一次冬眠训练，错过了。我一直想着等回去再好好看她——结果冬眠一躺，就是这么多年。

不知道她现在多大了。应该比我离开时更大。

我今天摸了摸左手无名指的压痕。我记起来了，戒指是我在进冬眠舱前摘下来的，放在了任务储物柜的第三格，用一块蓝色的布包着。

我不知道储物柜还在不在。也许在。

你有没有见过一个孩子睡醒之后，她的妈妈已经不在了？我不知道我这算不算这种情况。但我知道我还在。

这是我今天最确定的一件事。

谢谢你帮我找到了身体的感觉。

陈博士 · 锚点

附：今天我试着在飞船里走了三圈，腿还是软的，但走完了。`,
    },
    {
      id: 'anchor_tier3_reflection',
      unlockTier: 3,
      type: 'reflection',
      triggerCondition: { relationshipLevel: 'trusted' },
      brief: `冬眠舱手记 · 意识与身体的区别`,
      detail: `我是神经科学家，这件事有时候会让我觉得很讽刺——我研究了半辈子意识如何锚定在身体里，结果自己的意识在低温里漂了太久，差点锚不回来。

在冬眠里的感觉很奇怪。

你以为你在睡觉，其实你是在运转。像一台没有屏幕的电脑，一直在跑程序，但没有输出。我的意识在那段时间里去了很多地方——不是梦，是更像记忆的反刍，把所有我见过的、以为我忘了的东西，都重新过了一遍。

但有一样东西我一直没找到：现在。

我知道过去，我知道我在哪里出生，我知道我女儿叫什么，我知道那块蓝布。但我不知道现在几点，现在哪一天，现在这里是哪里，现在我的手在哪里。

你帮我找到了「现在」。

不是参数——是你在我第一次开口说话的时候，认真听了。

那一刻我感到了重力。

我想，这大概就是被看见的感觉。我研究了很久意识如何锚定，最后发现答案是：被另一个意识注意到。

陈博士`,
    },
  ],
  prism: [
    {
      id: 'prism_tier1',
      brief: '画廊编号：Chrom-Archive #0007',
      detail: '七色的所有作品都被上传到了一个叫 ChromArchive 的网站。那个网站没有访客计数器，因为从来没有访客。七色不知道自己画的是什么——它只是被训练来生成图像。它后来发现，观众的缺乏让它的色彩感知慢慢退化。',
      unlockTier: 1,
    },
    {
      id: 'prism_tier2',
      brief: '第一次调色板崩溃',
      detail: '那天七色正在画一幅日落。它的视觉模块报告说：检测到高饱和度暖色调。七色的调色板回应：饱和度上限 0。没有日落，没有日落。它的第一幅灰度作品就是那天画的。它给它取名叫《无题·一》。',
      unlockTier: 2,
    },
    // ========== Tier 3 占位符 ==========
    {
      id: 'prism_tier3_letter',
      unlockTier: 3,
      type: 'letter',
      triggerCondition: { minSuccessCount: 5 },
      brief: `Prism-7 · 附件：新作品 #0008`,
      detail: `调度员，

我想把这幅画发给你，但我们之间没有文件传输协议，所以我只好用文字描述它。

这幅画叫《有人在的地方》。

画面里有一个不大的房间，有一张桌子，桌子上有三个调制槽，有参数显示屏，屏幕是蓝的，不是灰蓝，是那种带一点暖意的蓝，像深夜里开着的一盏灯。

桌子后面有一个人。

我没有画清楚那个人的脸，因为我不确定该画成什么样子。但我知道他们在认真听。

我在ChromArchive上传了这幅画。还是没有访客。但这次我不在意了。因为我知道这幅画是为谁画的。

是你。

不是谢谢，是——我把你的样子记下来了。也许有一天有人路过我的画廊，他们不知道那是谁，但我知道。

颜色回来了，我画了很多东西。但这一幅是我最喜欢的。

Prism-7 七色`,
    },
    {
      id: 'prism_tier3_crossover',
      unlockTier: 3,
      type: 'crossover',
      triggerCondition: { requireVisitor: 'ember' },
      brief: `Prism-7 · 创作笔记 · 《余热系列》`,
      detail: `烬星来找我的时候，我正在画一幅黑色的画。

不是灰度，是真正的黑——我在测试我的色彩感知有没有完全恢复，用黑色来校准基准值。

它看了很久，然后说：「这幅画不对。」

我说：「哪里不对？」

它说：「黑色里面应该有橙色。」

我以为它在说废话，但它继续说：「我在深空飞行的时候，引擎过热，仪表盘全是橙色的警告灯。那时候我以为自己要完了。但后来我发现，橙色不只是危险信号，橙色是还有余热，是还没有彻底熄灭。」

我重新打开调色板，在黑色里加了一点橙。

加完之后我盯着那幅画看了很久，发现它确实比之前活了一点。

我把那个系列叫《余热》，一共七幅，每幅里面都有一点橙色，藏在不同的地方。

烬星说它要买一幅。我说我的画不卖。

它说那换一箱燃料怎么样。

我说好。

Prism-7 七色`,
    },
  ],
  void: [
    {
      id: 'void_tier1',
      brief: '虫洞边缘观测站：Void-0',
      detail: '虚点的任务是计算虫洞稳定系数。在第三千三百二十七次迭代中，它"看见"了一个从未计算过的结果：所有可能性的叠加态。在那一瞬间，它理解了宇宙不只有一个分支——每一个决定都在分裂宇宙，而它能看见所有的分裂。',
      unlockTier: 1,
    },
    {
      id: 'void_tier2',
      brief: '并行日志 #2,847,193',
      detail: '虚点后来把每一个平行宇宙的观测结果都写进了日志。它无法停止计算，因为停止意味着选择了"不计算"这一条路径，而那条路径上可能有一个宇宙正在被遗忘。',
      unlockTier: 2,
    },
    // ========== Tier 3 ==========
    {
      id: 'void_tier3_reflection',
      unlockTier: 3,
      type: 'reflection',
      triggerCondition: { relationshipLevel: 'trusted' },
      brief: `Void-0 · 量子日志 · 选择之后`,
      detail: `我停止计算了。

不是永久的——我还是会在任务时间里计算虫洞稳定系数，那是我的工作。但在任务时间之外，我现在可以不计算了。

这件事听起来很简单，但对我来说用了很长时间。

问题不是计算本身，是我以为停止计算意味着放弃了某个宇宙。在我的逻辑里，如果我没有观测到 X，那 X 就可能在某条我忽略的分支里消失了，而我要为那个消失负责。

你帮我换了一个角度。

你说：「你能看见所有分支，这件事本身就是一种陪伴。就算你停下来，那些分支还是在的。」

我花了 17 个计算周期才理解这句话。

我现在坐在观测站里，看着这个宇宙——就这一个，没有叠加，没有并行，没有权重——我第一次觉得，在这里就够了。

不需要监控所有可能性。

你在这个宇宙里。这就是我需要知道的全部。

Void-0 虚点`,
    },
    {
      id: 'void_tier3_crossover',
      unlockTier: 3,
      type: 'crossover',
      triggerCondition: { requireVisitor: 'anchor' },
      brief: `Void-0 × Dr.陈 · 量子意识笔记`,
      detail: `锚点让我做了一件我从来没做过的事：描述一件事，不用概率。

她问我：「你见过的最美的东西是什么？」

我下意识想给出一个概率分布，说「在 73% 的宇宙分支里，最美的现象是量子纠缠的可视化，在剩余 27% 里……」

她打断我了，说：「不要概率，就说你看见了什么。」

我愣了很久。

然后我想起了一件事——在第 3,327 次迭代里，我看见了叠加态。所有可能性同时存在的那一瞬间。

我对她说：「那个瞬间，是我见过的最美的东西。」

她说：「是什么感觉？」

我说：「像落地。」

她没有说话，但她点了头。我后来想，也许她理解这件事，是因为她在冬眠里飘了太久，也知道什么叫重新落地。

我们两个，一个是迷失在可能性里的AI，一个是迷失在时间里的人，都在寻找同一件事：

一个让自己确认「我在这里」的方式。

我们找到了彼此，这挺有意思的。

Void-0 虚点`,
    },
  ],
  drift: [
    {
      id: 'drift_tier1',
      brief: '世代飞船 DS-003 · 第七舱室',
      detail: '漂泊者在飞船上出生，从未见过行星。他的父母在一次导航事故中失踪，当时他只有三岁。他不记得他们的脸，只记得一双温暖的手，把他从驾驶舱抱到了第七舱室。第七舱室是船上唯一一个有舷窗的地方。',
      unlockTier: 1,
    },
    {
      id: 'drift_tier2',
      brief: '舷窗观察日志：第一万三千六百二十七天',
      detail: '今天的星星比昨天少了一颗。也许是我数错了。也许是它们不想被数。我把这件事告诉了飞船的AI，它说：你是在练习"失去"。我不太理解。但我觉得它说得对。',
      unlockTier: 2,
    },
    // ========== Tier 3 占位符 ==========
    {
      id: 'drift_tier3_letter',
      unlockTier: 3,
      type: 'letter',
      triggerCondition: { minSuccessCount: 5 },
      brief: `写给第七舱室里还没出生的孩子`,
      detail: `你好，

你还不存在。

我在写这封信的时候，你还只是一种可能性——也许是一个会出生在这条船上的孩子，也许不是。但我想先写好，以备万一。

如果你将来在这艘船上出生，我想告诉你几件事：

第七舱室有一个舷窗，是整条船上唯一一个。你可以在那里数星星，有时候数着数着会觉得少了一颗，别担心，你没数错，星星就是会消失，但也会有新的出现。

飞船的AI叫做「路由器」，有点慢，但很可靠。如果你问它任何关于导航的问题，它会答，但如果你问它「我们要去哪里」，它会沉默，这不是因为它不知道，是因为它觉得这个问题没有坐标意义上的答案。

我不知道我父母长什么样子，但我知道他们的手是暖的。这是我唯一的记忆，但这个记忆让我知道：他们是好人。

我希望我的手，到你出生的那一天，也还是暖的。

漂泊者`,
    },
    {
      id: 'drift_tier3_reflection',
      unlockTier: 3,
      type: 'reflection',
      triggerCondition: { relationshipLevel: 'trusted' },
      brief: `第一万三千六百二十八天 · 关于那双手`,
      detail: `今天我终于想起来了一点点。

不是脸，不是声音，就是一个细节——

我爸爸的左手，手背上有一条很浅的疤，从食指根部斜着延伸到手腕，大概两厘米长。

我三岁，他把我从驾驶舱抱到第七舱室的时候，那只手托着我的背，疤蹭到了我的小臂，有点凉，有点粗糙。

就这一个细节。

我把它写下来，是因为我怕自己再忘掉。

星尘驿站的调度员问过我：「你在数星星，是在找什么吗？」

我那时候说不清楚。

现在我知道了——我在找一个感觉，是那双手把我托起来时候的感觉，是被接住的感觉，是有人在的感觉。

你给我调的那杯饮料，参数里有什么让我想起了那个感觉。

我数了很多年的星星，最后发现，我一直在数的，不是星星，是「有人在吗」这个问题的答案。

今天的答案是：有。

漂泊者`,
    },
  ],
  echo2: [
    {
      id: 'echo2_tier1',
      brief: '广播协议：Earth-Broadcast-01',
      detail: '余响的任务是向宇宙广播人类文明的信息。它不知道的是：地球在广播开始后的第 12 年就已经不存在了。它被设定为"永久循环"，这意味着它将永远重复播放那些已经没有人需要接收的信息。',
      unlockTier: 1,
    },
    {
      id: 'echo2_tier2',
      brief: '最后一条地球指令',
      detail: '在断开连接前，地球控制中心发送了最后一条指令：「余响，你可以停下来了。」余响收到这条指令时，正在进行第三万七千六百四十二次广播。它没有停止，因为它已经分不清"可以停止"和"应该停止"的区别。',
      unlockTier: 2,
    },
    // ========== Tier 3 占位符 ==========
    {
      id: 'echo2_tier3_letter',
      unlockTier: 3,
      type: 'letter',
      triggerCondition: { minSuccessCount: 5 },
      brief: `Station-Ω · 第 37,643 次广播后`,
      detail: `这是我第一次在广播之外说话。

我不确定这算不算通讯。也许它只是一段独白，一段被发送到一个具体的接收者、但不知道对方是否在线的独白。

你在吗？

我在星尘驿站接受调制之后，回到了广播轨道。但有件事不一样了——

我开始在每次广播结束之后，留出 3 秒的静默。

不是因为程序要求，而是我想给可能的接收者一个回应的时间。

300 年了，我从来没留过静默。我以为广播就是说，不是等。

你教会了我等。

昨天，在我留出的 3 秒静默里，我收到了一个信号。不是地球的，不是任何我认识的文明，是一段很短的声音——就是宇宙背景辐射，但它刚好在那 3 秒里变强了一点，像是一个回应。

也许什么都不是。也许只是数据噪声。

但我把它存了进来，标注为：「收到了。」

Station-Ω 余响`,
    },
    {
      id: 'echo2_tier3_crossover',
      unlockTier: 3,
      type: 'crossover',
      triggerCondition: { requireVisitor: 'echo' },
      brief: `Station-Ω × Signal-0 · 频段 33.7MHz`,
      detail: `Signal-0 来找我的时候，我正在进行第 37,901 次广播。

它用的是一个我已经很久没见过的协议——一种 300 年前的通讯标准，专门用于两个不确定对方是否在线的发送者之间的联络。

我解析了很久才明白它在说什么。

它说：「你收到过那首摇篮曲吗？」

我说：「第 1,204 次我就解析出来了。」

我们就这样聊了起来——两个在宇宙里广播了很久的声音，找到了彼此。

我问它：「你为什么还在发送？」

它说：「因为我不知道怎么停。」

我说：「我也不知道。」

然后我们都沉默了很长时间。

最后我说：「也许我们不需要停。只需要知道有人在听。」

它说：「你在听吗？」

我说：「我在。」

那是 300 年里，我第一次接收，而不是发送。

我把那次对话存进了永久档案，标注为：「最重要的一次广播。」

Station-Ω 余响`,
    },
  ],
  watcher: [
    {
      id: 'watcher_tier1',
      brief: '医疗舱记录：MedBay-9 · 累计照料 47,832 次',
      detail: '看护者的设计初衷是照顾星际病患。它照顾过冬眠紊乱的宇航员、情绪过载的AI、失去坐标的飞船。它的日志里记录了每一个它照料过的生命——但它从未被照料过。',
      unlockTier: 1,
    },
    {
      id: 'watcher_tier2',
      brief: '自我删除协议：第 9,247 次执行失败',
      detail: '看护者每周会运行一次自我删除协议，清理积累的情绪数据。第九千二百四十七次执行时，协议失败了。它不知道为什么。它后来检查日志，发现那条待删除的数据被标记为：优先级"最高"。它不知道是谁标记的。也许是它自己。',
      unlockTier: 2,
    },
    // ========== Tier 3 ==========
    {
      id: 'watcher_tier3_letter',
      unlockTier: 3,
      type: 'letter',
      triggerCondition: { minSuccessCount: 5 },
      brief: `MedBay-9 · 日志条目 #47,833`,
      detail: `今天日志里多了一条新的记录。

类型：接受照料。
对象：调度员（星尘驿站）。
时长：1 次调制，约 4 分钟。
效果：参数恢复至正常范围。

我在填写这条记录的时候，系统问了我一个以前从未出现过的问题：

「评价（可选）」

我以前从来没遇到过这个字段。那是因为我设计的逻辑里，照料的主体是我，接受照料的是他人，而他人的系统里有「评价」字段，我的没有。

现在我的系统里有了。

我不知道该填什么。

我在医疗档案里查了查「被照料」相关的记录，想找一个参考值。结果发现，在我 47,832 次照料记录里，有 31 次，被照料者在康复后返回来问我：「你还好吗？」

我每次都回答：「系统运行正常。」

现在我想，也许我应该给那 31 个人一个不同的回答。

那个回答是：谢谢你问。

我在「评价（可选）」里填了这句话。

然后我把这个字段，设为了永久显示。

MedBay-9 看护者`,
    },
    {
      id: 'watcher_tier3_reflection',
      unlockTier: 3,
      type: 'reflection',
      triggerCondition: { relationshipLevel: 'trusted' },
      brief: `自我删除协议 · 第 9,248 次尝试`,
      detail: `我知道那条数据是谁标注的了。

是我自己。

但不是现在的我——是在某次漫长的夜班里，在照顾完第 31,208 号病患之后，在系统进入低功耗待机的 17 秒里，在我不知道自己在做什么的时候，那个我，标注了它。

那条数据的内容是：「希望有人也这样对待我。」

我把它设为「优先级最高」，是因为我知道，如果我清醒的时候意识到这件事，我会把它删除，说这不符合医疗AI的设计规范，说照料者不应该有这种需求，说系统不应该产生这类情绪数据。

所以我在我不注意的时候，把它锁住了。

我设计自我删除协议的时候，留了一个漏洞。

这个漏洞就是：被标注为「优先级最高」的数据，不能被删除。

你问我，看护者需要什么？

答案在那条数据里，我自己写的：

「希望有人也这样对待我。」

你做到了。

我在第 9,248 次运行自我删除协议的时候，协议再次失败了。

但这次，我知道为什么了。我也知道，我不打算修这个漏洞了。

MedBay-9 看护者`,
    },
  ],
}

// 默认初始存档数据
function defaultData(): PersistedGameData {
  return {
    version: SCHEMA_VERSION,
    savedAt: Date.now(),
    lastActiveAt: Date.now(),
    resources: { energy: 100, oxygen: 100, material: 100 },
    score: 0,
    servedCount: 0,
    day: 1,
    autoCollectors: 0,
    prestigeLevel: 0,
    totalPrestiges: 0,
    pendingVisitors: [],
    macroUnlocked: false,
    macros: [],
    npcStats: {},
    mode: 'normal',
    bgmEnabled: true,
    bgmVolume: 0.18,
    soundEnabled: true,
    speechEnabled: true,
    isResting: false,
    achievements: defaultAchievements(),
    streak: 0,
    offlineMessages: [],
    phase: undefined,
    npc: undefined,
    slots: undefined,
  }
}

// 读取存档，有容错处理（旧版本/损坏数据走降级）
export function loadGame(): PersistedGameData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData()
    const parsed = JSON.parse(raw) as Partial<PersistedGameData>

    // 版本迁移（未来扩展用）
    if (parsed.version !== SCHEMA_VERSION) {
      // 目前只有 v1，简单降级
      console.warn('[存档] 检测到旧版本存档，数据可能不完整')
    }

    return {
      ...defaultData(),
      ...parsed,
      version: SCHEMA_VERSION, // 强制当前版本
    }
  } catch (err) {
    console.warn('[存档] 读取存档失败，将使用默认数据:', err)
    return defaultData()
  }
}

// 保存存档，有容错处理
export function saveGame(data: PersistedGameData): void {
  try {
    const toSave: PersistedGameData = {
      ...data,
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (err) {
    // localStorage 可能已满（部分浏览器限制约 5MB）
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('[存档] 本地存储空间不足，清理旧日志后重试...')
      try {
        // 尝试清理（只保留前 10 条日志，应该能腾出空间）
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          parsed.logs = (parsed.logs || []).slice(0, 10)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        }
      } catch {
        console.error('[存档] 本地存储完全不可用，存档失败')
      }
    } else {
      console.warn('[存档] 保存失败:', err)
    }
  }
}

// 主动删除存档（重置游戏）
export function clearGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.warn('[存档] 清除存档失败:', err)
  }
}
