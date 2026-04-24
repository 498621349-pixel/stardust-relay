import { useCallback, useRef } from 'react'

// Web Audio API 音效合成器
// 风格：温暖治愈 + 深空科技感，用正弦波/三角波为主

export type SoundType =
  | 'cardPlace'
  | 'brewStart'
  | 'arrival'
  | 'success'
  | 'fail'
  | 'gameover'
  | 'emergency_critical'

interface SoundConfig {
  setEnabled: (v: boolean) => void
  play: (type: SoundType) => void
}

export function useSound(): SoundConfig {
  const ctxRef = useRef<AudioContext | null>(null)
  // 用 ref 存 enabled，确保 play 回调始终拿到最新值
  const enabledRef = useRef(true)
  // 追踪是否正在等待 resume，避免重复 await
  const resumingRef = useRef(false)

  async function getCtx(): Promise<AudioContext> {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctxRef.current = new AudioCtx()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended' && !resumingRef.current) {
      resumingRef.current = true
      await ctx.resume()
      resumingRef.current = false
    }
    return ctx
  }

  const setEnabled = useCallback((v: boolean) => {
    enabledRef.current = v
  }, [])

  const play = useCallback(async (type: SoundType) => {
    if (!enabledRef.current) return
    const ctx = await getCtx()
    const now = ctx.currentTime

    switch (type) {
      case 'cardPlace': playCardPlace(ctx, now); break
      case 'brewStart': playBrewStart(ctx, now); break
      case 'arrival': playArrival(ctx, now); break
      case 'success': playSuccess(ctx, now); break
      case 'fail': playFail(ctx, now); break
      case 'gameover': playGameover(ctx, now); break
      case 'emergency_critical': playEmergencyCritical(ctx, now); break
    }
  }, [])

  return { setEnabled, play }
}

// --- 音效合成函数 ---

/** 卡片放入：短促的电子 blip */
function playCardPlace(ctx: AudioContext, now: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.06)

  gain.gain.setValueAtTime(0.15, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

  osc.start(now)
  osc.stop(now + 0.12)
}

/** 开始调制：上升扫频 + 轻柔混响感 */
function playBrewStart(ctx: AudioContext, now: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()

  osc.connect(gain)
  osc2.connect(gain2)
  gain.connect(ctx.destination)
  gain2.connect(ctx.destination)

  osc.type = 'sine'
  osc.frequency.setValueAtTime(300, now)
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.3)

  osc2.type = 'triangle'
  osc2.frequency.setValueAtTime(450, now)
  osc2.frequency.exponentialRampToValueAtTime(1350, now + 0.3)

  gain.gain.setValueAtTime(0.12, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
  gain2.gain.setValueAtTime(0.06, now)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

  osc.start(now)
  osc.stop(now + 0.4)
  osc2.start(now)
  osc2.stop(now + 0.4)
}

/** 访客到达：轻柔的三音符叮咚 */
function playArrival(ctx: AudioContext, now: number) {
  const notes = [523.25, 659.25, 783.99] // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    const t = now + i * 0.12
    osc.frequency.setValueAtTime(freq, t)

    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.18, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)

    osc.start(t)
    osc.stop(t + 0.5)
  })
}

/** 治愈成功：温暖的上行琶音 + 泛音 */
function playSuccess(ctx: AudioContext, now: number) {
  // 主旋律：C5 → E5 → G5 → C6
  const melody = [523.25, 659.25, 783.99, 1046.5]
  melody.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    const t = now + i * 0.1
    osc.frequency.setValueAtTime(freq, t)

    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.2, t + 0.03)
    gain.gain.setValueAtTime(0.2, t + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)

    osc.start(t)
    osc.stop(t + 0.55)
  })

  // 高音泛音点缀
  const shimmer = [1046.5, 1318.5, 1567.98]
  shimmer.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'triangle'
    const t = now + 0.3 + i * 0.08
    osc.frequency.setValueAtTime(freq, t)

    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.07, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)

    osc.start(t)
    osc.stop(t + 0.4)
  })
}

/** 治愈失败：轻柔的下行音 */
function playFail(ctx: AudioContext, now: number) {
  const notes = [392, 349.23, 311.13] // G4 → F4 → Eb4
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = createGain(ctx)
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    const t = now + i * 0.15
    osc.frequency.setValueAtTime(freq, t)

    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.14, t + 0.03)
    gain.gain.setValueAtTime(0.14, t + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)

    osc.start(t)
    osc.stop(t + 0.5)
  })
}

/** 紧急警报：双音急促脉冲，用正弦波保持温暖基调 */
function playEmergencyCritical(ctx: AudioContext, now: number) {
  // 急促的双音警报，2 次
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now + i * 0.22)
    osc.frequency.setValueAtTime(660, now + i * 0.22 + 0.11)

    gain.gain.setValueAtTime(0, now + i * 0.22)
    gain.gain.linearRampToValueAtTime(0.12, now + i * 0.22 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.22 + 0.16)

    osc.start(now + i * 0.22)
    osc.stop(now + i * 0.22 + 0.16)
  }
}

function playGameover(ctx: AudioContext, now: number) {
  const osc = ctx.createOscillator()
  const gain = createGain(ctx)
  const osc2 = ctx.createOscillator()
  const gain2 = createGain(ctx)
  const osc3 = ctx.createOscillator()
  const gain3 = createGain(ctx)

  osc.connect(gain)
  osc2.connect(gain2)
  osc3.connect(gain3)
  gain.connect(ctx.destination)
  gain2.connect(ctx.destination)
  gain3.connect(ctx.destination)

  // 根音：低沉的持续音
  osc.type = 'sine'
  osc.frequency.setValueAtTime(130.81, now)
  osc.frequency.setValueAtTime(110, now + 0.5)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.22, now + 0.1)
  gain.gain.setValueAtTime(0.22, now + 0.6)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5)
  osc.start(now)
  osc.stop(now + 2.5)

  // 五度泛音
  osc2.type = 'triangle'
  osc2.frequency.setValueAtTime(196, now)
  gain2.gain.setValueAtTime(0, now)
  gain2.gain.linearRampToValueAtTime(0.1, now + 0.15)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 2)
  osc2.start(now)
  osc2.stop(now + 2)

  // 微弱的八度点缀
  osc3.type = 'sine'
  osc3.frequency.setValueAtTime(65.41, now)
  gain3.gain.setValueAtTime(0, now + 0.05)
  gain3.gain.linearRampToValueAtTime(0.08, now + 0.3)
  gain3.gain.exponentialRampToValueAtTime(0.001, now + 3)
  osc3.start(now + 0.05)
  osc3.stop(now + 3)
}

function createGain(ctx: AudioContext): GainNode {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, ctx.currentTime)
  return g
}
