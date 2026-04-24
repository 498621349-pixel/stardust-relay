import { create } from 'zustand'
import { getRandomNPC, type NPC } from '../data/npcs'
import { calculateResult, checkSuccess, getTolerance, getArrivalProbability } from '../data/cards'
import { loadGame, saveGame, clearGame, type PersistedGameData, type MacroData, type NpcStats, type AchievementsState, checkAchievements as doCheckAchievements } from './gamePersist'

// 加载存档（不存在时用默认）
const savedData = loadGame()

// 初始状态由存档决定，但访客/对话框等瞬时状态始终从默认值开始
const initialState = {
  phase: 'idle' as const,
  resources: savedData.resources,
  npc: null,
  slots: [null, null, null] as (string | null)[],
  mode: savedData.mode,
  score: savedData.score,
  servedCount: savedData.servedCount,
  day: savedData.day,
  dialogText: '深空很安静... 星尘驿站在轨道上稳定运行。系统待机中，等待下一个信号。',
  dialogSpeaker: 'SYSTEM // 星尘驿站',
  resultParams: null,
  autoCollectors: savedData.autoCollectors,
  macroUnlocked: savedData.macroUnlocked,
  logs: [{ time: nowTime(), message: '系统启动完成。星尘驿站在线。', type: 'info' as const }],
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
}

// 读取存档后给出提示
if (savedData.score > 0 || savedData.servedCount > 0) {
  const savedDate = new Date(savedData.savedAt)
  const timeStr = `${savedDate.getMonth() + 1}月${savedDate.getDate()}日 ${savedDate.getHours().toString().padStart(2, '0')}:${savedDate.getMinutes().toString().padStart(2, '0')}`
  const idx = initialState.logs.findIndex(l => l.message === '系统启动完成。星尘驿站在线。')
  if (idx !== -1) {
    initialState.logs.splice(idx, 0, {
      time: nowTime(),
      message: `存档已加载。上次游玩：${timeStr} | 积分：${savedData.score} | 第${savedData.day}天`,
      type: 'info' as const,
    })
  }
}

// 抽出需要持久化的状态片段（导出供 main.tsx 全局保存使用）
export function toPersistedData(state: GameState): PersistedGameData {
  return {
    version: 1,
    savedAt: Date.now(),
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
    bgmEnabled: state.bgmEnabled,
    bgmVolume: state.bgmVolume,
    achievements: state.achievements,
    streak: state.streak,
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

export type PowerMode = 'eco' | 'normal' | 'overload'

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
  incrementNpcStat: (npcId: string, success: boolean) => void
  dismissAchievement: () => void
}

const POWER_DRAIN: Record<PowerMode, number> = {
  eco: 0.008,
  normal: 0.018,
  overload: 0.035,
}

function nowTime(): string {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

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

    // ===== 以下处理不受休息影响 =====
    // 紧急状态恢复（仅在非休息时生效）
    if (!state.isResting && state.phase === 'emergency' && newEnergy > 20) {
      set({
        phase: 'idle',
        dialogText: '电力恢复至安全水平。系统逐步重启中。星尘驿站恢复运行。',
        dialogSpeaker: 'SYSTEM // 星尘驿站',
        resources: { energy: newEnergy, oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
      })
      get().addLog('电力恢复，系统重启。', 'info')
      return
    }

    // 扫描进度
    if (state.phase === 'scanning') {
      const newProgress = state.scanProgress + 1.5
      if (newProgress >= 100) {
        const npc = getRandomNPC()
        const tolerance = getTolerance(state.day)
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
        const check = checkSuccess(result, { x: target.targetX, y: target.targetY, z: target.targetZ }, getTolerance(state.day))

        if (check.success) {
          const line = target.successLines[Math.floor(Math.random() * target.successLines.length)]
          const newStreak = state.streak + 1
          const newAchievements = doCheckAchievements(
            state.achievements,
            { score: state.score + 100, servedCount: state.servedCount + 1, day: state.day + 1, streak: newStreak, npcStats: state.npcStats, wasFailed: false }
          )
          set({
            phase: 'success',
            brewProgress: 0,
            resultParams: result,
            score: state.score + 100,
            servedCount: state.servedCount + 1,
            day: state.day + 1,
            streak: newStreak,
            achievements: newAchievements,
            resources: {
              energy: Math.min(100, Math.max(0, newEnergy) + 25),
              oxygen: Math.min(100, Math.max(0, newOxygen) + 15),
              material: Math.min(100, Math.max(0, newMaterial) + 25),
            },
            dialogText: line,
            dialogSpeaker: target.name,
          })
          get().addLog(`调制成功！${target.name} 已治愈。+100 积分`, 'success')
          get().incrementNpcStat(target.id, true)
          autoSave(get())
        } else {
          const line = target.failLines[Math.floor(Math.random() * target.failLines.length)]
          const newAchievements = doCheckAchievements(
            state.achievements,
            { score: state.score, servedCount: state.servedCount, day: state.day, streak: 0, npcStats: state.npcStats, wasFailed: true }
          )
          set({
            phase: 'failed',
            brewProgress: 0,
            resultParams: result,
            streak: 0,
            achievements: newAchievements,
            resources: {
              energy: Math.max(0, Math.max(0, newEnergy) - 3),
              oxygen: Math.max(0, Math.max(0, newOxygen) - 1),
              material: Math.max(0, Math.max(0, newMaterial) - 3),
            },
            dialogText: line,
            dialogSpeaker: target.name,
          })
          get().addLog(`调制失败。${target.name} 未治愈。`, 'warning')
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
        set({
          phase: 'scanning',
          scanProgress: 0,
          dialogText: '检测到深空信号... 正在解析来源与频率...',
          dialogSpeaker: 'SCANNER // 信号分析',
          resources: { energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
        })
        get().addLog('检测到深空信号，开始扫描...', 'info')
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
    if (state.phase === 'emergency' && mode !== 'eco') return
    set({ mode })
    autoSave(get())
  },

  dismissResult: () => {
    const state = get()
    if (state.phase !== 'success' && state.phase !== 'failed') return
    set({
      phase: 'idle',
      npc: null,
      slots: [null, null, null],
      resultParams: null,
      dialogText: '访客已离开。星尘驿站恢复待机状态。深空依旧安静...',
      dialogSpeaker: 'SYSTEM // 星尘驿站',
    })
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

  incrementNpcStat: (npcId: string, success: boolean) => {
    const state = get()
    const current = state.npcStats[npcId] ?? { successCount: 0, failCount: 0 }
    const updated: Record<string, NpcStats> = {
      ...state.npcStats,
      [npcId]: {
        successCount: current.successCount + (success ? 1 : 0),
        failCount: current.failCount + (success ? 0 : 1),
      },
    }
    set({ npcStats: updated })
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
    }
    set(defaults)
  },

  dismissAchievement: () => {
    set({ achievements: { ...get().achievements, justUnlocked: null } })
  },
}))

// 统一存档监听：关键字段变化时自动触发存档，替代散落的 autoSave(get()) 调用
useGameStore.subscribe((state, prev) => {
  const changed = (k: string) => JSON.stringify(state[k as keyof typeof state]) !== JSON.stringify(prev[k as keyof typeof prev])
  if (['resources', 'achievements', 'npcStats', 'macros', 'mode'].some(changed)) {
    saveGame(toPersistedData(state))
  }
})
