/**
 * 程序化环境音乐生成器（Web Audio API）
 *
 * 风格：深空宇宙 + 温暖治愈
 * 音阶：C 小五声音阶（无导音程，温暖无压迫感）
 * 和声：慢速三和弦变换，每 16 秒切换一次
 *
 * 三种氛围：
 * - idle / resting：极轻缓的 pads，极低音量，营造寂静感
 * - active（访客在场）：更明亮的音色，音量略微提升
 *
 * 直接订阅 gameStore.soundEnabled，自动启停，无需外部调用。
 */

import { useRef, useCallback, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

export type BGMVibe = 'idle' | 'active' | 'resting'

interface BGMNode {
  osc: OscillatorNode
  gain: GainNode
}

interface BGMConfig {
  setVibe: (v: BGMVibe) => void
  toggleBGM: () => void
  setVolume: (v: number) => void
  isPlaying: () => boolean
  start: () => void
  stop: () => void
}

// 模块级常量
const CHORDS: number[][] = [
  [65.41, 77.78, 98.0, 130.81],
  [87.31, 103.83, 130.81, 174.61],
  [98.0, 116.54, 146.83, 174.61],
  [77.78, 98.0, 116.54, 155.56],
]
const VIBE_VOLUME: Record<BGMVibe, number> = { idle: 0.08, active: 0.14, resting: 0.05 }

export function useBGM(): BGMConfig {
  const ctxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const nodesRef = useRef<BGMNode[]>([])
  const vibeRef = useRef<BGMVibe>('idle')
  const isPlayingRef = useRef(false)
  const volumeRef = useRef(0.18)
  const chordIndexRef = useRef(0)
  const chordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 跟踪 soundEnabled，避免 effect 重复触发
  const prevSoundEnabledRef = useRef<boolean | null>(null)

  // 直接订阅 soundEnabled，变化时自动启停
  const soundEnabled = useGameStore((s) => s.soundEnabled)
  useEffect(() => {
    if (prevSoundEnabledRef.current === soundEnabled) return
    prevSoundEnabledRef.current = soundEnabled

    if (soundEnabled) {
      doStart()
    } else {
      doStop()
    }
  }, [soundEnabled])

  async function getCtx(): Promise<AudioContext> {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctxRef.current = new AudioCtx()
    }
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume()
    }
    return ctxRef.current
  }

  const startChord = useCallback(async (index: number) => {
    nodesRef.current.forEach(({ osc }) => { try { osc.stop() } catch { /* already stopped */ } })
    nodesRef.current = []

    const chord = CHORDS[index % CHORDS.length]
    const baseVol = VIBE_VOLUME[vibeRef.current]
    const ctx = await getCtx()
    if (!masterGainRef.current) return

    chord.forEach((freq) => {
      const osc1 = ctx.createOscillator()
      const g1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.value = freq
      g1.gain.setValueAtTime(0, ctx.currentTime)
      g1.gain.setTargetAtTime(baseVol * 0.5, ctx.currentTime, 0.1)
      osc1.connect(g1); g1.connect(masterGainRef.current!)
      osc1.start()
      nodesRef.current.push({ osc: osc1, gain: g1 })

      const osc2 = ctx.createOscillator()
      const g2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.value = freq * 2
      osc2.detune.value = 8
      g2.gain.setValueAtTime(0, ctx.currentTime)
      g2.gain.setTargetAtTime(baseVol * 0.15, ctx.currentTime, 0.1)
      osc2.connect(g2); g2.connect(masterGainRef.current!)
      osc2.start()
      nodesRef.current.push({ osc: osc2, gain: g2 })
    })

    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, ctx.currentTime)
      g.gain.setTargetAtTime(baseVol * 0.3, ctx.currentTime, 0.1)
      osc.connect(g); g.connect(masterGainRef.current!)
      osc.start()
      nodesRef.current.push({ osc, gain: g })
    })

    chord.slice(0, 2).forEach((freq) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq * 4
      osc.detune.value = -5
      g.gain.setValueAtTime(0, ctx.currentTime)
      g.gain.setTargetAtTime(baseVol * 0.04, ctx.currentTime, 0.1)
      osc.connect(g); g.connect(masterGainRef.current!)
      osc.start()
      nodesRef.current.push({ osc, gain: g })
    })
  }, [])

  async function doStart() {
    if (isPlayingRef.current) return
    isPlayingRef.current = true
    const ctx = await getCtx()
    masterGainRef.current = ctx.createGain()
    masterGainRef.current.gain.setValueAtTime(0, ctx.currentTime)
    masterGainRef.current.gain.setTargetAtTime(volumeRef.current, ctx.currentTime, 0.1)
    masterGainRef.current.connect(ctx.destination)
    await startChord(chordIndexRef.current)
    chordTimerRef.current = setInterval(async () => {
      chordIndexRef.current = (chordIndexRef.current + 1) % CHORDS.length
      await startChord(chordIndexRef.current)
    }, 16000)
  }

  async function doStop() {
    isPlayingRef.current = false
    if (chordTimerRef.current) {
      clearInterval(chordTimerRef.current)
      chordTimerRef.current = null
    }
    if (masterGainRef.current) {
      try {
        const ctx = await getCtx()
        masterGainRef.current.gain.setTargetAtTime(0, ctx.currentTime, 0.1)
      } catch { /* ctx closed */ }
    }
    const nodes = [...nodesRef.current]
    nodesRef.current = []
    setTimeout(() => {
      nodes.forEach(({ osc }) => { try { osc.stop() } catch { /* already stopped */ } })
      try {
        if (masterGainRef.current) {
          masterGainRef.current.disconnect()
          masterGainRef.current = null
        }
      } catch { /* already disconnected */ }
    }, 300)
  }

  const setVibe = useCallback(async (v: BGMVibe) => {
    vibeRef.current = v
    if (!isPlayingRef.current || !masterGainRef.current) return
    const ctx = await getCtx()
    const ratio = VIBE_VOLUME[v] / 0.12
    masterGainRef.current.gain.setTargetAtTime(volumeRef.current * ratio, ctx.currentTime, 0.1)
  }, [])

  const toggleBGM = useCallback(async () => {
    if (isPlayingRef.current) {
      await doStop()
    } else {
      await doStart()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setVolume = useCallback(async (v: number) => {
    volumeRef.current = v
    if (!masterGainRef.current || !isPlayingRef.current) return
    const ctx = await getCtx()
    const ratio = VIBE_VOLUME[vibeRef.current] / 0.12
    masterGainRef.current.gain.setTargetAtTime(v * ratio, ctx.currentTime, 0.1)
  }, [])

  const isPlaying = useCallback(() => isPlayingRef.current, [])

  const start = useCallback(async () => { await doStart() }, []) // eslint-disable-line
  const stop = useCallback(async () => { await doStop() }, []) // eslint-disable-line

  useEffect(() => {
    return () => {
      doStop()
      try {
        if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null }
      } catch { /* already closed */ }
    }
  }, [])

  return { setVibe, toggleBGM, setVolume, isPlaying, start, stop }
}
