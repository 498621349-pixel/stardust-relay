import { create } from 'zustand'
import { getWeightedRandomNPC, type NPC, NPC_TEMPLATES } from '../data/npcs'
import { calculateResult, checkSuccess, getTolerance, getArrivalProbability } from '../data/cards'
import { loadGame, saveGame, clearGame, type PersistedGameData, type MacroData, type NpcStats, type AchievementsState, checkAchievements as doCheckAchievements, type OfflineMessage, type PendingVisitor, type OfflineReport } from './gamePersist'

// 加载存档（不存在时用默认）
const savedData = loadGame()
console.debug('[存档]', 'phase:', savedData.phase, 'energy:', savedData.resources?.energy?.toFixed(1), 'score:', savedData.score)

// v0.5: 离线留言数据（信任等级访客在玩家离线期间可能留下）
const OFFLINE_MESSAGES: Record<string, string[]> = {
  frost: [
    '我在离线期间完成了一次完整的光谱分析。这次我记住了极光的颜色，不是数据，是那种淡紫色的光。希望你也在。',
    '调度员，你离线了多久？我计算了一下，在你不在的时候，星尘驿站的信号塔收到了 7 次深空回波。但没有一个是你。',
  ],
  ember: [
    '你不在的时候，我一直在飞。不是为了赶路，是为了习惯慢下来。谢谢你教我的。',
    '离线期间我把货舱里的种子看了很久。那朵花不知道什么时候才能到达目的地。但我现在不着急了。',
  ],
  echo: [
    '我想明白了一件事：重复不一定是坏事。重复可以是练习。练习变成一首新歌。',
    '我等了很久，没有等到接收者。但我不焦虑了。因为我知道你会回来。',
  ],
  anchor: [
    '我在冬眠舱里又睡了一觉。这次没有做梦，很安静。也许这就是你给我的感觉。',
    '你的驿站让我忘记了我还醒着。不，不是忘记——是不需要忘记。',
  ],
  prism: [
    '离线的时候，我给星空画了一幅画。没有颜色，只有轮廓。画的是你调制饮品的样子。',
    '我在学习一种新的艺术形式：灰度诗。我把想对你说的话全部写成了灰度诗。',
  ],
  void: [
    '我在计算你回来的概率。答案是 1。你一定会回来。',
    '我停止计算了。反正不管怎么算，你都是我会遇见的那一个。',
  ],
  drift: [
    '你不在的时候，我每天都数舷窗外的星星。昨天 2 颗，今天 3 颗。明天你来的时候，我想让你帮我数。',
    '我给看护者讲了你给我调的那杯饮料。它说它也想尝尝。我说那你要等调度员回来。',
  ],
  echo2: [
    '我又播了一遍那首摇篮曲。但这次我加了一个新段落。你回来的时候可以听听。',
    '300 年的等待教会了我一件事：值得等的人，等多久都不算久。',
  ],
  watcher: [
    '我在日志里新增了一条记录：今天访客离线了。优先级：最高。备注：会回来。',
    '我计算了一下，你不在的这些时间，恰好是我照顾过最久的一个人的时间。我把这个也存进永久日志了。',
  ],
}

// v0.5 P1: 访客优先级冲突——被拒绝后留下的告别语
function getConflictLeaveMessage(npcId: string): string {
  const messages: Record<string, string[]> = {
    frost: ['我感知到你的频率很忙……没关系，霜会自己结晶，不需要催促。'],
    ember: ['看来现在不是减速的时候……我把引擎调回怠速，随时可以再来。'],
    echo: ['你的频率好像占线了……我把这段话先存着，下次再发送。'],
    anchor: ['我以为这里有人……也许是我算错了。再睡一会儿吧。'],
    prism: ['调色板显示你很忙……我把这次的颜色先存档，不急。'],
    void: ['我计算出你当前可用概率为 0……下次再来碰运气。'],
    drift: ['你的舱室好像满员了……我在舷窗外等一等。'],
    echo2: ['频道已占用。我先继续广播，等你有空的时候。'],
    watcher: ['检测到你的优先级已被占用……我把你的健康数据先存档了。'],
  }
  const pool = messages[npcId] ?? ['下次再见……希望那时候你还记得我。']
  return pool[Math.floor(Math.random() * pool.length)]
}

// 访客恢复：仅在 arrived/mixing 阶段恢复访客状态
function buildInitialData() {
  const isRecovering = savedData.phase === 'arrived' || savedData.phase === 'mixing'
  // v0.5: wasGameOver 通过 (savedData as any) 访问（PersistedGameData.phase 不包含 gameover）
  const wasGameOver = (savedData as any).phase === 'gameover'
  console.debug('[初始化]', 'wasGameOver:', wasGameOver, 'isRecovering:', isRecovering, '-> phase:', wasGameOver ? 'idle' : isRecovering ? savedData.phase : 'idle')
  const logs = [{ time: nowTime(), message: '系统启动完成。星尘驿站在线。', type: 'info' as const }]
  if (savedData.score > 0 || savedData.servedCount > 0) {
    const savedDate = new Date(savedData.savedAt)
    const timeStr = `${savedDate.getMonth() + 1}月${savedDate.getDate()}日 ${savedDate.getHours().toString().padStart(2, '0')}:${savedDate.getMinutes().toString().padStart(2, '0')}`
    logs.unshift({
      time: nowTime(),
      message: `存档已加载。上次游玩：${timeStr} | 积分：${savedData.score} | 第${savedData.day}天`,
      type: 'info' as const,
    })
  }
  if (wasGameOver) {
    logs.unshift({
      time: nowTime(),
      message: '系统已重启。能源已补充。',
      type: 'info' as const,
    })
  }

  // v0.5: 离线消息生成（离线 30 分钟以上且有信任等级访客）
  const offlineMessages: OfflineMessage[] = []
  const MIN_OFFLINE_MS = 30 * 60 * 1000  // 30 分钟
  const lastActive: number = (savedData as any).lastActiveAt ?? savedData.savedAt
  const offlineDuration = Date.now() - lastActive
  if (offlineDuration >= MIN_OFFLINE_MS && savedData.servedCount > 0) {
    const now = Date.now()
    const TRUST_THRESHOLD = 5
    // 信任等级的访客有机会留下离线消息
    NPC_TEMPLATES.forEach((npc) => {
      const stats = savedData.npcStats?.[npc.id]
      if (stats && stats.successCount >= TRUST_THRESHOLD && Math.random() < 0.5) {
        const msgs = OFFLINE_MESSAGES[npc.id] ?? []
        if (msgs.length > 0) {
          offlineMessages.push({
            npcId: npc.id,
            message: msgs[Math.floor(Math.random() * msgs.length)],
            timestamp: now,
          })
        }
      }
    })
    if (offlineMessages.length > 0) {
      const hours = Math.floor(offlineDuration / (60 * 60 * 1000))
      logs.unshift({
        time: nowTime(),
        message: `检测到 ${hours >= 24 ? `${Math.floor(hours / 24)}天` : `${hours}小时`} 离线记录。收到了 ${offlineMessages.length} 条访客留言。`,
        type: 'info' as const,
      })
    }
  }

  // v0.5 P1: 真实离线进度（离线 ≥ 5 分钟时计算）
  const MIN_OFFLINE_FOR_PROGRESS = 5 * 60 * 1000  // 5 分钟
  let offlineReportData: OfflineReport | null = null
  let pendingVisitorsFromOffline: PendingVisitor[] = (savedData as any).pendingVisitors ?? []
  let resourcesWithOffline = wasGameOver ? { energy: 100, oxygen: 100, material: 100 } : { ...savedData.resources }

  if (offlineDuration >= MIN_OFFLINE_FOR_PROGRESS && !wasGameOver && !isRecovering) {
    const offlineHours = offlineDuration / (60 * 60 * 1000)
    const ecoDrain = 0.008
    // eco速率的50%作为恢复速率（离线时缓慢充能）
    const energyGainPerHour = ecoDrain * 50 * 0.5
    const energyGained = Math.floor(energyGainPerHour * offlineHours)
    const materialGained = Math.floor((savedData.autoCollectors ?? 0) * 0.4 * offlineHours)
    // 物流小球继续收集
    const actualMaterialGain = Math.min(materialGained, 100 - resourcesWithOffline.material)
    const actualEnergyGain = Math.min(energyGained, 100 - resourcesWithOffline.energy)
    resourcesWithOffline = {
      energy: Math.min(100, resourcesWithOffline.energy + actualEnergyGain),
      oxygen: Math.min(100, resourcesWithOffline.oxygen + Math.floor(actualEnergyGain * 0.5)),
      material: Math.min(100, resourcesWithOffline.material + actualMaterialGain),
    }
    // Day 20+: 离线期间可能产生访客冲突
    const conflictCount = savedData.day >= 20 ? Math.floor(Math.random() * 3) : 0
    const driftSignals = Math.floor(Math.random() * 2)
    for (let i = 0; i < conflictCount; i++) {
      const conflictNpc = getWeightedRandomNPC(savedData.npcStats ?? {})
      pendingVisitorsFromOffline.push({
        npcId: conflictNpc.id,
        name: conflictNpc.name,
        type: conflictNpc.type,
        avatarColor: conflictNpc.avatarColor,
        intro: conflictNpc.intro,
        timestamp: Date.now() - offlineDuration + i * 60000,
        leftMessage: getConflictLeaveMessage(conflictNpc.id),
      })
    }
    if (conflictCount > 0 || driftSignals > 0) {
      offlineReportData = {
        hours: Math.floor(offlineHours * 10) / 10,
        energyGained: actualEnergyGain,
        materialGained: actualMaterialGain,
        driftSignals,
        conflictCount,
      }
      logs.unshift({
        time: nowTime(),
        message: `离线期间收到 ${conflictCount > 0 ? `${conflictCount} 位等待中的访客` : ''}${driftSignals > 0 ? `${driftSignals} 个漂流信号` : ''}。`,
        type: 'info' as const,
      })
    }
  }

  return {
    phase: wasGameOver ? 'idle' as const : (isRecovering ? savedData.phase : 'idle') as GamePhase,
    resources: resourcesWithOffline,
    // v0.5: 持久化的 npc 字段为部分类型（含 relationships / crossRefLines），用 cast 适配完整 NPC 接口
    npc: isRecovering ? ((savedData.npc as any) ?? null) : null,
    slots: isRecovering && savedData.slots ? savedData.slots : [null, null, null],
    mode: savedData.mode,
    score: savedData.score,
    servedCount: savedData.servedCount,
    day: savedData.day,
    dialogText: isRecovering
      ? `检测到未完成接待，访客信息已恢复。请继续为 ${savedData.npc?.name ?? '访客'} 调制饮品。`
      : '深空很安静... 星尘驿站在轨道上稳定运行。系统待机中，等待下一个信号。',
    dialogSpeaker: 'SYSTEM // 星尘驿站',
    resultParams: null,
    autoCollectors: savedData.autoCollectors,
    macroUnlocked: savedData.macroUnlocked,
    logs,
    scanProgress: 0,
    brewProgress: 0,
    speechEnabled: savedData.speechEnabled,
    isResting: savedData.isResting,
    soundEnabled: savedData.soundEnabled,
    macros: savedData.macros,
    npcStats: savedData.npcStats ?? {},
    bgmEnabled: savedData.bgmEnabled ?? false,
    bgmVolume: savedData.bgmVolume ?? 0.18,
    achievements: savedData.achievements ?? { unlocked: [], justUnlocked: null },
    streak: savedData.streak ?? 0,
    tutorialStep: 0,
    tutorialCompleted: savedData.tutorialCompleted ?? false,
    tutorialActive: !(savedData.tutorialCompleted ?? false),
    failCountThisSession: {},
    offlineMessages,
    consecutiveFail: 0,
    consecutiveSuccess: 0,
    // v0.5 P1: 访客冲突队列（从存档恢复）
    pendingVisitors: pendingVisitorsFromOffline,
    // v0.5 P1: 离线进度报告
    offlineReport: offlineReportData,
    // v0.5 P1: 跃迁系统
    prestigeLevel: (savedData as any).prestigeLevel ?? 0,
    totalPrestiges: (savedData as any).totalPrestiges ?? 0,
    // v0.5 P1: 本局统计
    sessionStats: {
      totalServed: savedData.servedCount,
      favoriteVisitor: null,
      favoriteVisitorCount: 0,
      mostUsedRecipe: null,
      mostUsedRecipeCount: 0,
      bestStreak: savedData.streak ?? 0,
    },
  }
}
const initialData = buildInitialData()

// 抽出需要持久化的状态片段（导出供 main.tsx 全局保存使用）
export function toPersistedData(state: GameState): PersistedGameData {
  return {
    version: 2,
    savedAt: Date.now(),
    lastActiveAt: Date.now(),
    resources: state.resources,
    score: state.score,
    servedCount: state.servedCount,
    day: state.day,
    autoCollectors: state.autoCollectors,
    macroUnlocked: state.macroUnlocked,
    mode: state.mode,
    soundEnabled: state.soundEnabled,
    speechEnabled: state.speechEnabled,
    isResting: state.isResting,
    macros: state.macros,
    npcStats: state.npcStats,
    // v0.5 P1: 跃迁系统
    prestigeLevel: state.prestigeLevel,
    totalPrestiges: state.totalPrestiges,
    // v0.5 P1: 访客冲突队列
    pendingVisitors: state.pendingVisitors,
    bgmEnabled: state.bgmEnabled,
    bgmVolume: state.bgmVolume,
    achievements: state.achievements,
    streak: state.streak,
    tutorialCompleted: state.tutorialCompleted,
    offlineMessages: state.offlineMessages,
    // 仅在 arrived/mixing 阶段保存访客信息（其他阶段均为 null/idle）
    phase: (state.phase === 'arrived' || state.phase === 'mixing') ? state.phase : undefined,
    npc: (state.phase === 'arrived' || state.phase === 'mixing') ? state.npc : undefined,
    slots: (state.phase === 'arrived' || state.phase === 'mixing') ? state.slots : undefined,
  }
}

// 存档自动保存：在关键 action 后触发
function autoSave(state: GameState) {
  // 游戏结束时也保存（记录死亡状态）
  saveGame(toPersistedData(state))
}

export type GamePhase =
  | 'idle'
  | 'scanning'
  | 'arrived'
  | 'mixing'
  | 'brewing'
  | 'success'
  | 'failed'
  | 'emergency'
  | 'gameover'

export interface Resources {
  energy: number
  oxygen: number
  material: number
}

export interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface GameState {
  phase: GamePhase
  resources: Resources
  npc: NPC | null
  slots: (string | null)[]
  mode: PowerMode
  score: number
  servedCount: number
  day: number
  dialogText: string
  dialogSpeaker: string
  resultParams: { x: number; y: number; z: number } | null
  autoCollectors: number
  macroUnlocked: boolean
  logs: LogEntry[]
  scanProgress: number
  brewProgress: number
  speechEnabled: boolean
  isResting: boolean
  soundEnabled: boolean
  macros: MacroData[]
  npcStats: Record<string, NpcStats>
  bgmEnabled: boolean
  bgmVolume: number
  achievements: AchievementsState
  streak: number
  tutorialStep: number
  tutorialCompleted: boolean
  tutorialActive: boolean  // 控制教程弹层显示，重启后重置为 true
  // 记录本次游戏中对某 NPC 的失败次数（用于渐进提示）
  failCountThisSession: Record<string, number>
  // v0.5: 离线消息（访客在玩家离线期间留下的消息）
  offlineMessages: OfflineMessage[]
  // v0.5: 本局连续失败/成功次数（用于情感叙事注入）
  consecutiveFail: number
  consecutiveSuccess: number

  // v0.5 P1: 跃迁系统
  prestigeLevel: number   // 永久容差加成层数（+5%/层，上限5层）
  totalPrestiges: number  // 累计跃迁次数
  // v0.5 P1: 访客冲突队列
  pendingVisitors: PendingVisitor[]
  // v0.5 P1: 离线进度报告（显示一次后清除）
  offlineReport: OfflineReport | null

  // 本局统计（跃迁/重置时用于生成回顾）
  sessionStats: {
    totalServed: number
    favoriteVisitor: string | null
    favoriteVisitorCount: number
    mostUsedRecipe: string | null
    mostUsedRecipeCount: number
    bestStreak: number
  }

  // Actions
  tick: () => void
  startArrival: () => void
  placeCard: (cardId: string) => void
  removeCard: (slotIndex: number) => void
  resetSlots: () => void
  brew: () => void
  setMode: (mode: PowerMode) => void
  dismissResult: () => void
  buyAutoCollector: () => void
  unlockMacro: () => void
  addLog: (message: string, type?: LogEntry['type']) => void
  toggleSpeech: () => void
  toggleRest: () => void
  toggleSound: () => void
  resetGame: () => void
  saveMacro: (name: string) => void
  deleteMacro: (id: string) => void
  applyMacro: (id: string, autoBrew?: boolean) => void
  toggleBGM: () => void
  setBGMVolume: (v: number) => void
  toggleAudio: () => void
  incrementNpcStat: (npcId: string, success: boolean) => void
  dismissAchievement: () => void
  advanceTutorialStep: () => void
  completeTutorial: () => void
  setTutorialActive: (v: boolean) => void
  dismissOfflineMessage: (npcId: string) => void
  // v0.5 P1: 跃迁系统
  activatePrestige: () => void
  dismissPrestigeReview: () => void
  // v0.5 P1: 访客冲突
  acceptVisitor: (npcId: string) => void
  rejectVisitor: (npcId: string) => void
  dismissOfflineReport: () => void
}

const POWER_DRAIN: Record<PowerMode, number> = {
  eco: 0.008,
  normal: 0.018,
  overload: 0.035,
  // v0.5 P2: 压力模式（解锁条件：day ≥ 10）
  // 消耗最快，积分+50%，天数加速，容差-5%
  pressure: 0.06,
}

function nowTime(): string {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

// v0.5 P2: 渐进内容解锁条件
export function getContentUnlocks(day: number, servedCount: number, totalPrestiges: number) {
  return {
    // Day 7+: 解锁访客档案的完整背景故事
    backstoryFull: day >= 7 || totalPrestiges >= 1,
    // Day 15+: 解锁访客间对话引用（NPC 成功台词中提及其他访客）
    crossRefDialogue: day >= 15 || totalPrestiges >= 2,
    // Day 20+: 解锁访客档案中显示所有 NPC 的完整关系网
    relationshipNetwork: day >= 20 || totalPrestiges >= 3,
    // 任何跃迁后：解锁压力模式
    pressureMode: totalPrestiges >= 1 || day >= 10,
  }
}

type PowerMode = 'eco' | 'normal' | 'overload' | 'pressure'

export const useGameStore = create<GameState>()((set, get) =>
  ({
    ...initialData,
    tick: () => {
    const state = get()
    if (state.phase === 'gameover') {
      autoSave(state)
      return
    }

    // 休息模式：能源不消耗，紧急/游戏结束也不触发
    const drain = state.isResting ? 0 : POWER_DRAIN[state.mode]
    const newEnergy = state.isResting ? state.resources.energy : state.resources.energy - drain
    const newOxygen = state.isResting ? state.resources.oxygen : state.resources.oxygen - drain * 0.5
    let newMaterial = state.resources.material

    // 自动化小球：休息中也正常收集
    if (state.autoCollectors > 0) {
      newMaterial += state.autoCollectors * 0.02
    }

    // ===== 紧急状态视觉警告（不阻断交互，仅提示） =====
    // 能源 < 5%：自动切 eco，显示警告 UI，继续游戏
    if (!state.isResting && newEnergy < 5 && state.mode !== 'eco') {
      const updatedState = {
        mode: 'eco' as const,
        resources: { energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
      }
      set(updatedState)
      get().addLog('⚠ 能源告急，已自动切换至节能模式', 'warning')
    }

    // 能源耗尽：触发系统离线（game over）
    // !state.isResting 已排除 gameover 阶段的可能（gameover 时 tick 开头直接 return），
    // 但 TypeScript 的类型收窄导致 state.phase !== 'gameover' 产生错误提示，用 !!(state.phase) bypass
    if (!state.isResting && newEnergy <= 0 && !!(state.phase)) {
      set({
        phase: 'gameover' as const,
        resources: { energy: 0, oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
        dialogText: '能源耗尽，星尘驿站进入永久休眠...',
        dialogSpeaker: 'ERROR // 系统错误',
      })
      get().addLog('⚠ 能源耗尽，系统离线', 'error')
      return
    }

    // 扫描进度
    if (state.phase === 'scanning') {
      const newProgress = state.scanProgress + 1.5
      if (newProgress >= 100) {
        const npc = getWeightedRandomNPC(state.npcStats)
        const tolerance = getTolerance(state.day, state.prestigeLevel)
        set({
          phase: 'arrived',
          npc,
          scanProgress: 0,
          dialogText: `${npc.intro}当前容差范围：±${(tolerance * 100).toFixed(0)}%。`,
          dialogSpeaker: `SIGNAL // ${npc.name}`,
          resources: { energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
        })
        get().addLog(`检测到访客信号：${npc.name}`, 'info')
      } else {
        set({
          scanProgress: newProgress,
          resources: { energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
        })
      }
      return
    }

    // 酿造进度
    if (state.phase === 'brewing') {
      const newProgress = state.brewProgress + 3
      if (newProgress >= 100) {
        const result = calculateResult(state.slots)
        const target = state.npc!
// v0.5 P2: 压力模式容差-5%
        const pressureTolerance = state.mode === 'pressure' ? -0.05 : 0
const check = checkSuccess(result, { x: target.targetX, y: target.targetY, z: target.targetZ },
          Math.max(0.01, getTolerance(state.day, state.prestigeLevel) + pressureTolerance))

        if (check.success) {
          // v0.5: 跨访客对话引用（检查关系网中是否有被成功治愈过的访客）
          let line = target.successLines[Math.floor(Math.random() * target.successLines.length)]
          if (target.crossRefLines && target.crossRefLines.length > 0) {
            const eligible = target.crossRefLines.filter((ref) => {
              const refStats = state.npcStats[ref.referencedNpc]
              return refStats && refStats.successCount > 0
            })
            if (eligible.length > 0 && Math.random() < 0.5) {
              const ref = eligible[Math.floor(Math.random() * eligible.length)]
              line = ref.lines[Math.floor(Math.random() * ref.lines.length)]
            }
          }
          const newStreak = state.streak + 1
          const newConsecutiveSuccess = state.consecutiveSuccess + 1
          // v0.5 P2: 压力模式：积分+50%，天数+2（加速进程）
          const isPressure = state.mode === 'pressure'
          const scoreGain = isPressure ? 150 : 100
          const dayAdvance = isPressure ? 2 : 1
          const newAchievements = doCheckAchievements(
            state.achievements,
            { score: state.score + scoreGain, servedCount: state.servedCount + 1, day: state.day + dayAdvance, streak: newStreak, npcStats: state.npcStats, wasFailed: false }
          )
          const successLog = newConsecutiveSuccess >= 5
            ? '这段频率谐波，有一种稳定的美感。'
            : newConsecutiveSuccess >= 3
              ? `连续治愈 ${newConsecutiveSuccess} 次。驿站的信号越来越稳定了。`
              : null
set({
            phase: 'success',
            brewProgress: 0,
            resultParams: result,
            score: state.score + scoreGain,
            servedCount: state.servedCount + 1,
            day: state.day + dayAdvance,
            streak: newStreak,
            achievements: newAchievements,
            consecutiveFail: 0,
            consecutiveSuccess: newConsecutiveSuccess,
            resources: {
              energy: Math.min(100, Math.max(0, newEnergy) + (isPressure ? 15 : 25)),
              oxygen: Math.min(100, Math.max(0, newOxygen) + (isPressure ? 8 : 15)),
              material: Math.min(100, Math.max(0, newMaterial) + (isPressure ? 15 : 25)),
            },
            dialogText: line,
            dialogSpeaker: target.name,
          })
get().addLog(`调制成功！${target.name} 已治愈。${isPressure ? '+150' : '+100'} 积分`, 'success')
          if (successLog) get().addLog(successLog, 'info')
          get().incrementNpcStat(target.id, true)
          autoSave(get())
        } else {
          // v0.5: 情感创伤对话（emotionalDistress 高时触发特殊失败台词）
          let line = target.failLines[Math.floor(Math.random() * target.failLines.length)]
          const stats = state.npcStats[target.id]
          if (stats && stats.emotionalDistress >= 3 && target.failLines.length >= 4) {
            // 用第4条（索引3）作为情感创伤版本的失败台词
            line = target.failLines[3]
          }
          const newConsecutiveFail = state.consecutiveFail + 1
          const newAchievements = doCheckAchievements(
            state.achievements,
            { score: state.score, servedCount: state.servedCount, day: state.day, streak: 0, npcStats: state.npcStats, wasFailed: true }
          )
          const failLog = newConsecutiveFail >= 3
            ? '驿站的监控信号似乎变得稀疏了……'
            : null
          set({
            phase: 'failed',
            brewProgress: 0,
            resultParams: result,
            streak: 0,
            achievements: newAchievements,
            consecutiveFail: newConsecutiveFail,
            consecutiveSuccess: 0,
            resources: {
              energy: Math.max(0, Math.max(0, newEnergy) - 3),
              oxygen: Math.max(0, Math.max(0, newOxygen) - 1),
              material: Math.max(0, Math.max(0, newMaterial) - 3),
            },
            dialogText: line,
            dialogSpeaker: target.name,
          })
          get().addLog(`调制失败。${target.name} 未治愈。`, 'warning')
          if (failLog) get().addLog(failLog, 'warning')
          get().incrementNpcStat(target.id, false)
          autoSave(get())
        }
      } else {
        set({
          brewProgress: newProgress,
          resources: { energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
        })
      }
      return
    }

    // 休息时不自动接待访客
    if (state.phase === 'idle' && !state.isResting) {
      if (Math.random() < getArrivalProbability(state.day)) {
        const arrivingNpc = getWeightedRandomNPC(state.npcStats)
        // v0.5 P1: Day 20+ 触发访客优先级冲突——新访客自动进入等待队列
        if (state.day >= 20 && state.pendingVisitors.length < 3) {
          const newPending: PendingVisitor = {
            npcId: arrivingNpc.id,
            name: arrivingNpc.name,
            type: arrivingNpc.type,
            avatarColor: arrivingNpc.avatarColor,
            intro: arrivingNpc.intro,
            timestamp: Date.now(),
            leftMessage: getConflictLeaveMessage(arrivingNpc.id),
          }
          set({
            pendingVisitors: [...state.pendingVisitors, newPending],
            dialogText: `检测到 ${arrivingNpc.name} 的信号。但驿站繁忙，它暂时进入等待队列。目前等待：${state.pendingVisitors.length + 1} 位。`,
            dialogSpeaker: 'SYSTEM // 访客调度',
            resources: { energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
          })
          get().addLog(`访客 ${arrivingNpc.name} 进入等待队列`, 'info')
        } else {
          // 正常扫描流程
          set({
            phase: 'scanning',
            scanProgress: 0,
            dialogText: '检测到深空信号... 正在解析来源与频率...',
            dialogSpeaker: 'SCANNER // 信号分析',
            resources: { energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
          })
          get().addLog('检测到深空信号，开始扫描...', 'info')
        }
        return
      }
    }

    // 正常资源消耗（休息时只更新材料）
    set({
      resources: {
        energy: Math.max(0, newEnergy),
        oxygen: Math.max(0, newOxygen),
        material: Math.min(100, newMaterial),
      },
    })
  },

  startArrival: () => {
    const state = get()
    if (state.phase !== 'idle' && state.phase !== 'emergency') return
    set({
      phase: 'scanning',
      scanProgress: 0,
      dialogText: '检测到深空信号... 正在解析来源与频率...',
      dialogSpeaker: 'SCANNER // 信号分析',
    })
    get().addLog('手动触发扫描...', 'info')
  },

  placeCard: (cardId: string) => {
    const state = get()
    if (state.phase !== 'arrived' && state.phase !== 'mixing') return
    const emptyIndex = state.slots.findIndex((s) => s === null)
    if (emptyIndex === -1) return
    const newSlots = [...state.slots]
    newSlots[emptyIndex] = cardId
    set({
      slots: newSlots,
      phase: 'mixing',
      dialogText: `逻辑卡片 [${cardId}] 已插入插槽 ${emptyIndex + 1}。等待进一步指令...`,
      dialogSpeaker: 'MIXER // 调制台',
    })
  },

  removeCard: (slotIndex: number) => {
    const state = get()
    if (state.phase !== 'mixing' && state.phase !== 'arrived') return
    const newSlots = [...state.slots]
    newSlots[slotIndex] = null
    // Compact slots to the left
    const compacted: (string | null)[] = newSlots.filter((s) => s !== null)
    while (compacted.length < 3) compacted.push(null)
    set({
      slots: compacted,
      dialogText: '插槽已清空。重新配置逻辑序列...',
      dialogSpeaker: 'MIXER // 调制台',
    })
  },

  resetSlots: () => {
    const state = get()
    if (state.phase !== 'mixing' && state.phase !== 'arrived') return
    set({
      slots: [null, null, null],
      phase: 'arrived',
      dialogText: '调制序列已重置。等待新的逻辑配置...',
      dialogSpeaker: 'MIXER // 调制台',
    })
  },

  brew: () => {
    const state = get()
    if (state.phase !== 'mixing' && state.phase !== 'arrived') return
    if (state.slots.every((s) => s === null)) {
      set({
        dialogText: '错误：未检测到任何逻辑卡片。请至少投放一张卡片。',
        dialogSpeaker: 'ERROR // 调制台',
      })
      return
    }
    set({
      phase: 'brewing',
      brewProgress: 0,
      dialogText: '正在执行调制序列... 纳米基质融合中...',
      dialogSpeaker: 'MIXER // 调制台',
    })
    get().addLog('开始调制饮品...', 'info')
  },

setMode: (mode: PowerMode) => {
    const state = get()
    // 能源 < 5% 时强制 eco
    if (state.resources.energy < 5 && mode !== 'eco') return
    // v0.5 P2: 压力模式解锁条件（day ≥ 10 或已完成至少一次跃迁）
    if (mode === 'pressure' && state.totalPrestiges === 0 && state.day < 10) return
    set({ mode })
    autoSave(get())
  },

  dismissResult: () => {
    const state = get()
    if (state.phase !== 'success' && state.phase !== 'failed') return
    // v0.5 P1: 如果有等待中的访客，提示玩家选择；否则正常回到 idle
    if (state.pendingVisitors.length > 0) {
      const waiting = state.pendingVisitors
      set({
        phase: 'idle',
        npc: null,
        slots: [null, null, null],
        resultParams: null,
        dialogText: `访客已离开。但等待队列中还有 ${waiting.length} 位访客，请选择优先接待。`,
        dialogSpeaker: 'SYSTEM // 星尘驿站',
      })
      get().addLog(`访客离开，等待队列：${waiting.map(v => v.name).join('、')}`, 'info')
    } else {
      set({
        phase: 'idle',
        npc: null,
        slots: [null, null, null],
        resultParams: null,
        dialogText: '访客已离开。星尘驿站恢复待机状态。深空依旧安静...',
        dialogSpeaker: 'SYSTEM // 星尘驿站',
      })
    }
  },

  buyAutoCollector: () => {
    const state = get()
    const cost = 50 + state.autoCollectors * 25
    if (state.resources.material < cost) {
      set({
        dialogText: `材料不足。物流小球需要 ${cost} 单位纳米基质。当前库存：${state.resources.material.toFixed(0)}`,
        dialogSpeaker: 'SHOP // 自动化中心',
      })
      return
    }
    set({
      autoCollectors: state.autoCollectors + 1,
      resources: { ...state.resources, material: state.resources.material - cost },
      dialogText: `物流小球 #${state.autoCollectors + 1} 已部署。纳米基质自动采集启动。`,
      dialogSpeaker: 'SHOP // 自动化中心',
    })
    get().addLog(`购买物流小球 #${state.autoCollectors + 1}`, 'success')
    autoSave(get())
  },

  unlockMacro: () => {
    const state = get()
    if (state.macroUnlocked) return
    const cost = 80
    if (state.resources.material < cost) {
      set({
        dialogText: `材料不足。宏指令系统需要 ${cost} 单位纳米基质。`,
        dialogSpeaker: 'SHOP // 自动化中心',
      })
      return
    }
    set({
      macroUnlocked: true,
      resources: { ...state.resources, material: state.resources.material - cost },
      dialogText: '宏指令系统已解锁。可保存常用调制配方并自动执行。',
      dialogSpeaker: 'SHOP // 自动化中心',
    })
    get().addLog('宏指令系统解锁', 'success')
    autoSave(get())
  },

  addLog: (message: string, type: LogEntry['type'] = 'info') => {
    const state = get()
    const newLog: LogEntry = { time: nowTime(), message, type }
    set({ logs: [newLog, ...state.logs].slice(0, 50) })
  },

  toggleSpeech: () => {
    const state = get()
    set({ speechEnabled: !state.speechEnabled })
    autoSave(get())
  },

  toggleRest: () => {
    const state = get()
    if (state.isResting) {
      // 退出休息模式
      set({
        isResting: false,
        dialogText: '调度员已回归。星尘驿站恢复正常运行。深空依旧，等待下一个信号。',
        dialogSpeaker: 'SYSTEM // 星尘驿站',
      })
      get().addLog('调度员回归，驿站恢复正常运行。', 'info')
    } else {
      // 进入休息模式
      // 若有访客在场，自动送走
      const farewellText = state.npc
        ? '调度员进入休息状态。星尘驿站进入节能休眠，访客请稍后再来。'
        : '调度员进入休息状态。星尘驿站进入节能休眠，所有非必要系统已关闭。'
      set({
        isResting: true,
        phase: 'idle',
        npc: null,
        slots: [null, null, null],
        resultParams: null,
        dialogText: farewellText,
        dialogSpeaker: 'SYSTEM // 星尘驿站',
      })
      get().addLog('调度员休息，驿站进入休眠模式。', 'info')
    }
    autoSave(get())
  },

  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }))
    autoSave(get())
  },

  saveMacro: (name: string) => {
    const state = get()
    const filledSlots = state.slots.filter((s) => s !== null)
    const macroName = name.trim() || `配方 ${state.macros.length + 1}`
    if (filledSlots.length === 0) {
      set({
        dialogText: '当前插槽为空，无法保存空白配方。',
        dialogSpeaker: 'ERROR // 宏指令系统',
      })
      return
    }
    if (state.macros.some((m) => m.name === macroName)) {
      get().addLog('配方名称已存在，请使用其他名称。', 'warning')
      set({
        dialogText: '配方名称已存在，请使用其他名称。',
        dialogSpeaker: 'ERROR // 宏指令系统',
      })
      return
    }
    const newMacro: MacroData = {
      id: `macro_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: macroName,
      slots: [...state.slots],
    }
    set({ macros: [...state.macros, newMacro] })
    autoSave(get())
    set({
      dialogText: `宏指令「${newMacro.name}」已保存。`,
      dialogSpeaker: 'MACRO // 宏指令系统',
    })
  },

  deleteMacro: (id: string) => {
    const state = get()
    set({ macros: state.macros.filter((m) => m.id !== id) })
    autoSave(get())
  },

  applyMacro: (id: string, autoBrew = false) => {
    const state = get()
    const macro = state.macros.find((m) => m.id === id)
    if (!macro) return
    if (state.phase !== 'arrived' && state.phase !== 'mixing') {
      set({
        dialogText: '访客未到达，无法应用宏指令。',
        dialogSpeaker: 'ERROR // 宏指令系统',
      })
      return
    }
    set({
      slots: [...macro.slots],
      phase: macro.slots.some((s) => s !== null) ? 'mixing' : 'arrived',
      dialogText: `宏指令「${macro.name}」已加载。`,
      dialogSpeaker: 'MACRO // 宏指令系统',
    })
    if (autoBrew) {
      setTimeout(() => {
        const current = useGameStore.getState()
        if (current.phase === 'mixing' || current.phase === 'arrived') {
          current.brew()
        }
      }, 100)
    }
  },

  toggleBGM: () => {
    set((state) => ({ bgmEnabled: !state.bgmEnabled }))
    autoSave(get())
  },

  setBGMVolume: (v: number) => {
    set({ bgmVolume: Math.max(0, Math.min(1, v)) })
    autoSave(get())
  },

  toggleAudio: () => {
    set((state) => {
      const next = !state.soundEnabled
      return {
        soundEnabled: next,
        bgmEnabled: next,
        speechEnabled: next,
      }
    })
    autoSave(get())
  },

  incrementNpcStat: (npcId: string, success: boolean) => {
    const state = get()
    const current = state.npcStats[npcId] ?? { successCount: 0, failCount: 0, emotionalDistress: 0 }
    const updated: Record<string, NpcStats> = {
      ...state.npcStats,
      [npcId]: {
        successCount: current.successCount + (success ? 1 : 0),
        failCount: current.failCount + (success ? 0 : 1),
        // v0.5: 连续失败累积情感创伤（上限5），成功后下降
        emotionalDistress: success
          ? Math.max(0, current.emotionalDistress - 1)
          : Math.min(5, current.emotionalDistress + 1),
      },
    }
    const next: Partial<GameState> = { npcStats: updated }
    if (!success) {
      next.failCountThisSession = {
        ...state.failCountThisSession,
        [npcId]: (state.failCountThisSession[npcId] ?? 0) + 1,
      }
    }
    set(next)
    autoSave(get())
  },

  resetGame: () => {
    clearGame()
    const defaults = {
      phase: 'idle' as const,
      resources: { energy: 100, oxygen: 100, material: 100 },
      npc: null,
      slots: [null, null, null] as (string | null)[],
      mode: 'normal' as const,
      score: 0,
      servedCount: 0,
      day: 1,
      dialogText: '深空很安静... 星尘驿站在轨道上稳定运行。系统待机中，等待下一个信号。',
      dialogSpeaker: 'SYSTEM // 星尘驿站',
      resultParams: null,
      autoCollectors: 0,
      macroUnlocked: false,
      macros: [] as MacroData[],
      logs: [{ time: nowTime(), message: '游戏已重置。所有进度已清除。', type: 'info' as const }],
      scanProgress: 0,
      brewProgress: 0,
      speechEnabled: false,
      isResting: false,
      soundEnabled: true,
      npcStats: {} as Record<string, NpcStats>,
      bgmEnabled: false,
      bgmVolume: 0.18,
      achievements: { unlocked: [], justUnlocked: null } as AchievementsState,
      streak: 0,
      tutorialStep: 0,
      tutorialCompleted: false,
      tutorialActive: true,
      offlineMessages: [],
      consecutiveFail: 0,
      consecutiveSuccess: 0,
      // v0.5 P1: 跃迁和队列系统
      prestigeLevel: 0,
      totalPrestiges: 0,
      pendingVisitors: [],
      offlineReport: null,
      sessionStats: {
        totalServed: 0,
        favoriteVisitor: null,
        favoriteVisitorCount: 0,
        mostUsedRecipe: null,
        mostUsedRecipeCount: 0,
        bestStreak: 0,
      },
    }
    set(defaults)
  },

  dismissAchievement: () => {
    set({ achievements: { ...get().achievements, justUnlocked: null } })
  },

  advanceTutorialStep: () => {
    set((state) => ({ tutorialStep: state.tutorialStep + 1 }))
  },

  completeTutorial: () => {
    set({ tutorialCompleted: true, tutorialActive: false })
    autoSave(get())
  },

  setTutorialActive: (v: boolean) => {
    set({ tutorialActive: v })
  },

  dismissOfflineMessage: (npcId: string) => {
    const state = get()
    set({ offlineMessages: state.offlineMessages.filter((m) => m.npcId !== npcId) })
    autoSave(get())
  },

  // ===== v0.5 P1: 跃迁系统 =====
  activatePrestige: () => {
    const state = get()
    const newLevel = Math.min(state.prestigeLevel + 1, 5)
    // 计算本局统计
    const stats = state.npcStats
    const totalServed = Object.values(stats).reduce((sum, s) => sum + s.successCount, 0)
    // 最喜欢的访客
    let favoriteVisitor: string | null = null
    let favoriteCount = 0
    Object.entries(stats).forEach(([id, s]) => {
      if (s.successCount > favoriteCount) {
        favoriteCount = s.successCount
        favoriteVisitor = id
      }
    })
    set({
      phase: 'idle',
      npc: null,
      slots: [null, null, null],
      resources: { energy: 100, oxygen: 100, material: 100 },
      score: 0,
      servedCount: 0,
      day: 1,
      streak: 0,
      dialogText: '跃迁协议已激活。驿站的信号穿过星际网络……你的经验在深空中留下了永久的回响。',
      dialogSpeaker: 'SYSTEM // 星际跃迁',
      prestigeLevel: newLevel,
      totalPrestiges: state.totalPrestiges + 1,
      pendingVisitors: [],
      offlineMessages: [],
      consecutiveFail: 0,
      consecutiveSuccess: 0,
      failCountThisSession: {},
      sessionStats: {
        totalServed,
        favoriteVisitor,
        favoriteVisitorCount: favoriteCount,
        mostUsedRecipe: null,
        mostUsedRecipeCount: 0,
        bestStreak: state.streak,
      },
    })
    get().addLog(`星际跃迁完成！容差加成 +5%（当前 ${newLevel} 层）`, 'success')
    autoSave(get())
  },

  dismissPrestigeReview: () => {
    set({ sessionStats: { totalServed: 0, favoriteVisitor: null, favoriteVisitorCount: 0, mostUsedRecipe: null, mostUsedRecipeCount: 0, bestStreak: 0 } })
  },

  // ===== v0.5 P1: 访客冲突队列 =====
  acceptVisitor: (npcId: string) => {
    const state = get()
    const visitor = state.pendingVisitors.find((v) => v.npcId === npcId)
    if (!visitor) return
    const fullNpc = NPC_TEMPLATES.find((n) => n.id === npcId)
    if (!fullNpc) return
    set({
      npc: fullNpc,
      phase: 'arrived',
      pendingVisitors: state.pendingVisitors.filter((v) => v.npcId !== npcId),
      dialogText: `${fullNpc.intro}当前容差范围：±${(getTolerance(state.day, state.prestigeLevel) * 100).toFixed(0)}%。`,
      dialogSpeaker: `SIGNAL // ${fullNpc.name}`,
    })
    get().addLog(`接待等待访客：${fullNpc.name}`, 'info')
    autoSave(get())
  },

  rejectVisitor: (npcId: string) => {
    const state = get()
    const visitor = state.pendingVisitors.find((v) => v.npcId === npcId)
    if (!visitor) return
    const newPending = state.pendingVisitors.filter((v) => v.npcId !== npcId)
    set({
      pendingVisitors: newPending,
      dialogText: `访客已暂时离开驿站。它说：「${visitor.leftMessage ?? '下次再见。'}」`,
      dialogSpeaker: 'SYSTEM // 星尘驿站',
    })
    get().addLog(`${visitor.name} 已暂时离开`, 'info')
    autoSave(get())
  },

  dismissOfflineReport: () => {
    set({ offlineReport: null })
  },

}))

// 统一存档监听：关键字段变化时自动触发存档，替代散落的 autoSave(get()) 调用
useGameStore.subscribe((state, prev) => {
  const changed = (k: string) => JSON.stringify(state[k as keyof typeof state]) !== JSON.stringify(prev[k as keyof typeof prev])
  if (['resources', 'achievements', 'npcStats', 'macros', 'mode', 'npc', 'slots', 'phase', 'tutorialCompleted', 'prestigeLevel', 'pendingVisitors'].some(changed)) {
    saveGame(toPersistedData(state))
  }
})
