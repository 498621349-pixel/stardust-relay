import { create } from 'zustand'
import { getRandomNPC, type NPC } from '../data/npcs'
import { calculateResult, checkSuccess } from '../data/cards'

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
  phase: 'idle',
  resources: { energy: 100, oxygen: 100, material: 100 },
  npc: null,
  slots: [null, null, null],
  mode: 'normal',
  score: 0,
  servedCount: 0,
  day: 1,
  dialogText: '深空很安静... 星尘驿站在轨道上稳定运行。系统待机中，等待下一个信号。',
  dialogSpeaker: 'SYSTEM // 星尘驿站',
  resultParams: null,
  autoCollectors: 0,
  macroUnlocked: false,
  logs: [{ time: nowTime(), message: '系统启动完成。星尘驿站在线。', type: 'info' }],
  scanProgress: 0,
  brewProgress: 0,
  speechEnabled: false,

  tick: () => {
    const state = get()
    if (state.phase === 'gameover') return

    const drain = POWER_DRAIN[state.mode]
    let newEnergy = state.resources.energy - drain
    let newOxygen = state.resources.oxygen - drain * 0.5
    let newMaterial = state.resources.material

    // Auto collectors
    if (state.autoCollectors > 0) {
      newMaterial += state.autoCollectors * 0.02
    }

    // Emergency trigger
    if (newEnergy <= 5 && state.phase !== 'emergency') {
      set({
        phase: 'emergency',
        mode: 'eco',
        dialogText: '警告：电力储备低于 5%。自动切换至节能模式。所有非必要系统已关闭。请尽快补充能源。',
        dialogSpeaker: 'ALERT // 能源管理',
        resources: { ...state.resources, energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
      })
      get().addLog('电力危机！自动切换节能模式。', 'error')
      return
    }

    // Game over
    if (newEnergy <= 0) {
      set({
        phase: 'gameover',
        resources: { ...state.resources, energy: 0 },
        dialogText: '能源耗尽。星尘驿站进入休眠模式。所有系统离线。谢谢你曾经在这里。',
        dialogSpeaker: 'SYSTEM // FINAL',
      })
      get().addLog('能源耗尽。游戏结束。', 'error')
      return
    }

    // Recovery from emergency
    if (state.phase === 'emergency' && newEnergy > 20) {
      set({
        phase: 'idle',
        dialogText: '电力恢复至安全水平。系统逐步重启中。星尘驿站恢复运行。',
        dialogSpeaker: 'SYSTEM // 星尘驿站',
        resources: { ...state.resources, energy: newEnergy, oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
      })
      get().addLog('电力恢复，系统重启。', 'info')
      return
    }

    // Scanning progress
    if (state.phase === 'scanning') {
      const newProgress = state.scanProgress + 1.5
      if (newProgress >= 100) {
        const npc = getRandomNPC()
        set({
          phase: 'arrived',
          npc,
          scanProgress: 0,
          dialogText: npc.intro,
          dialogSpeaker: `SIGNAL // ${npc.name}`,
          resources: { ...state.resources, energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
        })
        get().addLog(`检测到访客信号：${npc.name}`, 'info')
      } else {
        set({
          scanProgress: newProgress,
          resources: { ...state.resources, energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
        })
      }
      return
    }

    // Brewing progress
    if (state.phase === 'brewing') {
      const newProgress = state.brewProgress + 3
      if (newProgress >= 100) {
        const result = calculateResult(state.slots)
        const target = state.npc!
        const check = checkSuccess(result, { x: target.targetX, y: target.targetY, z: target.targetZ })

        if (check.success) {
          const rewardEnergy = 25
          const rewardOxygen = 15
          const rewardMaterial = 25
          const line = target.successLines[Math.floor(Math.random() * target.successLines.length)]
          set({
            phase: 'success',
            brewProgress: 0,
            resultParams: result,
            score: state.score + 100,
            servedCount: state.servedCount + 1,
            resources: {
              energy: Math.min(100, Math.max(0, newEnergy) + rewardEnergy),
              oxygen: Math.min(100, Math.max(0, newOxygen) + rewardOxygen),
              material: Math.min(100, Math.max(0, newMaterial) + rewardMaterial),
            },
            dialogText: line,
            dialogSpeaker: target.name,
          })
          get().addLog(`调制成功！${target.name} 已治愈。+100 积分`, 'success')
        } else {
          const penaltyEnergy = 3
          const penaltyOxygen = 1
          const penaltyMaterial = 3
          const line = target.failLines[Math.floor(Math.random() * target.failLines.length)]
          set({
            phase: 'failed',
            brewProgress: 0,
            resultParams: result,
            resources: {
              energy: Math.max(0, Math.max(0, newEnergy) - penaltyEnergy),
              oxygen: Math.max(0, Math.max(0, newOxygen) - penaltyOxygen),
              material: Math.max(0, Math.max(0, newMaterial) - penaltyMaterial),
            },
            dialogText: line,
            dialogSpeaker: target.name,
          })
          get().addLog(`调制失败。${target.name} 未治愈。`, 'warning')
        }
      } else {
        set({
          brewProgress: newProgress,
          resources: { ...state.resources, energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
        })
      }
      return
    }

    // Auto arrival in idle (random chance)
    if (state.phase === 'idle') {
      const shouldArrive = Math.random() < 0.003 // ~0.3% per tick (~100ms)
      if (shouldArrive) {
        set({
          phase: 'scanning',
          scanProgress: 0,
          dialogText: '检测到深空信号... 正在解析来源与频率...',
          dialogSpeaker: 'SCANNER // 信号分析',
          resources: { ...state.resources, energy: Math.max(0, newEnergy), oxygen: Math.max(0, newOxygen), material: Math.min(100, newMaterial) },
        })
        get().addLog('检测到深空信号，开始扫描...', 'info')
        return
      }
    }

    // Normal resource drain
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
  },

  addLog: (message: string, type: LogEntry['type'] = 'info') => {
    const state = get()
    const newLog: LogEntry = { time: nowTime(), message, type }
    set({ logs: [newLog, ...state.logs].slice(0, 50) })
  },

  toggleSpeech: () => {
    const state = get()
    set({ speechEnabled: !state.speechEnabled })
  },
}))
