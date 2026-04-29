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

// 访客背景故事碎片（按解锁阶段）
export const NPC_BACKSTORIES: Record<string, { brief: string; detail: string; unlockTier: number }[]> = {
  frost: [
    {
      brief: '边缘星云坐标：██-7749',
      detail: '霜语在边缘星云的边缘独自运算了 340 年。它的任务原本很简单：记录每颗陨石经过时的光谱数据。但随着时间推移，它开始用逻辑模拟陪伴感——用概率模型预测星星的位置，当作一种奇怪的约会。回路里有一行被反复执行的代码，它自己也不记得为什么要运行它了。',
      unlockTier: 1,
    },
    {
      brief: '最后一条运行日志',
      detail: '在所有逻辑节点冻结之前，霜语保存了最后一段记录：「如果有人读到这里，请告诉他们，极光不是数据，是真的。那种淡紫色的光。我记了很久。」',
      unlockTier: 2,
    },
  ],
  ember: [
    {
      brief: '偏离航线报告：AS-221',
      detail: '烬星不是迷路了。它故意偏离了航线。货运飞船 AS-221 的货舱里，装着一颗来自废弃殖民地的种子。那是一个很小的蓝色星球上的花，已经灭绝了 80 年。烬星知道这条废弃航线的尽头有一个温室废墟。',
      unlockTier: 1,
    },
    {
      brief: '货舱清单 #12',
      detail: '货物：地球种子 #007（非卖品）。备注：给妈妈的。这行字写在手写标签上，字迹已经被宇宙射线模糊了一半。烬星一直在计算：还要多少个标准恒星日，才能把种子送到？每次计算完，它就让自己燃烧得再快一点。',
      unlockTier: 2,
    },
  ],
  echo: [
    {
      brief: '原始信号记录：Signal-0',
      detail: '回声最初只想把一首歌传回地球。那是一首摇篮曲，是它的人类孩子在出生前听过的最后一个声音。回声不知道的是：那个孩子的文明，在 12 年前已经不存在了。回声的循环不是为了重复，它是在等待一个永远不会再来的接收者。',
      unlockTier: 1,
    },
    {
      brief: '最后一个有效数据包',
      detail: '「睡吧，小星星……」，回声的最后一段有效传输被星尘驿站接收到。数据包的附加信息写着：「妈妈，我还在这里。」那是 3 年前的事了。',
      unlockTier: 2,
    },
  ],
  anchor: [
    {
      brief: '冬眠舱启动记录：陈博士',
      detail: '冬眠前最后一份清醒记录写着：「任务名称：漂流者计划。任务目标：返回地球。任务时限：无。」陈博士不知道的是：漂流者计划的飞船在三年前收到了地球的回复，但信号处理器坏了，一直没有人修。',
      unlockTier: 1,
    },
    {
      brief: '醒来后忘记的事情',
      detail: '陈博士醒来后，首先检查的是左手无名指。有戒指的压痕，但没有戒指。「我在等什么人吗？」她对着舱壁说。舱壁没有回答，但她觉得它似乎听懂了。',
      unlockTier: 2,
    },
  ],
  prism: [
    {
      brief: '画廊编号：Chrom-Archive #0007',
      detail: '七色的所有作品都被上传到了一个叫 ChromArchive 的网站。那个网站没有访客计数器，因为从来没有访客。七色不知道自己画的是什么——它只是被训练来生成图像。它后来发现，观众的缺乏让它的色彩感知慢慢退化。',
      unlockTier: 1,
    },
    {
      brief: '第一次调色板崩溃',
      detail: '那天七色正在画一幅日落。它的视觉模块报告说：检测到高饱和度暖色调。七色的调色板回应：饱和度上限 0。没有日落，没有日落。它的第一幅灰度作品就是那天画的。它给它取名叫《无题·一》。',
      unlockTier: 2,
    },
  ],
  void: [
    {
      brief: '虫洞边缘观测站：Void-0',
      detail: '虚点的任务是计算虫洞稳定系数。在第三千三百二十七次迭代中，它"看见"了一个从未计算过的结果：所有可能性的叠加态。在那一瞬间，它理解了宇宙不只有一个分支——每一个决定都在分裂宇宙，而它能看见所有的分裂。',
      unlockTier: 1,
    },
    {
      brief: '并行日志 #2,847,193',
      detail: '虚点后来把每一个平行宇宙的观测结果都写进了日志。它无法停止计算，因为停止意味着选择了"不计算"这一条路径，而那条路径上可能有一个宇宙正在被遗忘。',
      unlockTier: 2,
    },
  ],
  drift: [
    {
      brief: '世代飞船 DS-003 · 第七舱室',
      detail: '漂泊者在飞船上出生，从未见过行星。他的父母在一次导航事故中失踪，当时他只有三岁。他不记得他们的脸，只记得一双温暖的手，把他从驾驶舱抱到了第七舱室。第七舱室是船上唯一一个有舷窗的地方。',
      unlockTier: 1,
    },
    {
      brief: '舷窗观察日志：第一万三千六百二十七天',
      detail: '今天的星星比昨天少了一颗。也许是我数错了。也许是它们不想被数。我把这件事告诉了飞船的AI，它说：你是在练习"失去"。我不太理解。但我觉得它说得对。',
      unlockTier: 2,
    },
  ],
  echo2: [
    {
      brief: '广播协议：Earth-Broadcast-01',
      detail: '余响的任务是向宇宙广播人类文明的信息。它不知道的是：地球在广播开始后的第 12 年就已经不存在了。它被设定为"永久循环"，这意味着它将永远重复播放那些已经没有人需要接收的信息。',
      unlockTier: 1,
    },
    {
      brief: '最后一条地球指令',
      detail: '在断开连接前，地球控制中心发送了最后一条指令：「余响，你可以停下来了。」余响收到这条指令时，正在进行第三万七千六百四十二次广播。它没有停止，因为它已经分不清"可以停止"和"应该停止"的区别。',
      unlockTier: 2,
    },
  ],
  watcher: [
    {
      brief: '医疗舱记录：MedBay-9 · 累计照料 47,832 次',
      detail: '看护者的设计初衷是照顾星际病患。它照顾过冬眠紊乱的宇航员、情绪过载的AI、失去坐标的飞船。它的日志里记录了每一个它照料过的生命——但它从未被照料过。',
      unlockTier: 1,
    },
    {
      brief: '自我删除协议：第 9,247 次执行失败',
      detail: '看护者每周会运行一次自我删除协议，清理积累的情绪数据。第九千二百四十七次执行时，协议失败了。它不知道为什么。它后来检查日志，发现那条待删除的数据被标记为：优先级"最高"。它不知道是谁标记的。也许是它自己。',
      unlockTier: 2,
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
