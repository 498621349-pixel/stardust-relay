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
 */

import { useRef, useCallback, useEffect } from 'react'

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
}

// 模块级常量，避免 useCallback 依赖误报
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
  const resumingRef = useRef(false)

  function getCtx(): AudioContext {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctxRef.current = new AudioCtx()
    }
    if (ctxRef.current.state === 'suspended' && !resumingRef.current) {
      resumingRef.current = true
      ctxRef.current.resume().then(() => { resumingRef.current = false })
    }
    return ctxRef.current
  }

  const startChord = useCallback((index: number) => {
    // 清理旧节点
    nodesRef.current.forEach(({ osc }) => { try { osc.stop() } catch { /* already stopped */ } })
    nodesRef.current = []

    const chord = CHORDS[index % CHORDS.length]
    const vibe = vibeRef.current
    const baseVol = VIBE_VOLUME[vibe]
    const ctx = getCtx()
    if (!masterGainRef.current) return

    // 主音垫（正弦 + 双八度）
    chord.forEach((freq) => {
      const osc1 = ctx.createOscillator()
      const g1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.value = freq
      g1.gain.setValueAtTime(0, ctx.currentTime)
      g1.gain.setTargetAtTime(baseVol * 0.5, ctx.currentTime, 1.2)
      osc1.connect(g1); g1.connect(masterGainRef.current!)
      osc1.start()
      nodesRef.current.push({ osc: osc1, gain: g1 })

      const osc2 = ctx.createOscillator()
      const g2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.value = freq * 2
      osc2.detune.value = 8
      g2.gain.setValueAtTime(0, ctx.currentTime)
      g2.gain.setTargetAtTime(baseVol * 0.15, ctx.currentTime, 1.2)
      osc2.connect(g2); g2.connect(masterGainRef.current!)
      osc2.start()
      nodesRef.current.push({ osc: osc2, gain: g2 })
    })

    // 三角波次级垫
    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, ctx.currentTime)
      g.gain.setTargetAtTime(baseVol * 0.3, ctx.currentTime, 1.2)
      osc.connect(g); g.connect(masterGainRef.current!)
      osc.start()
      nodesRef.current.push({ osc, gain: g })
    })

    // 高频微光层（极轻）
    chord.slice(0, 2).forEach((freq) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq * 4
      osc.detune.value = -5
      g.gain.setValueAtTime(0, ctx.currentTime)
      g.gain.setTargetAtTime(baseVol * 0.04, ctx.currentTime, 1.2)
      osc.connect(g); g.connect(masterGainRef.current!)
      osc.start()
      nodesRef.current.push({ osc, gain: g })
    })
  }, [])

  const startPlaying = useCallback(() => {
    if (isPlayingRef.current) return
    isPlayingRef.current = true
    const ctx = getCtx()
    masterGainRef.current = ctx.createGain()
    masterGainRef.current.gain.setValueAtTime(0, ctx.currentTime)
    masterGainRef.current.gain.setTargetAtTime(volumeRef.current, ctx.currentTime, 1.0)
    masterGainRef.current.connect(ctx.destination)
    startChord(chordIndexRef.current)
    chordTimerRef.current = setInterval(() => {
      chordIndexRef.current = (chordIndexRef.current + 1) % CHORDS.length
      startChord(chordIndexRef.current)
    }, 16000)
  }, [startChord])

  const stopPlaying = useCallback(() => {
    isPlayingRef.current = false
    if (chordTimerRef.current) {
      clearInterval(chordTimerRef.current)
      chordTimerRef.current = null
    }
    if (masterGainRef.current) {
      try {
        const ctx = getCtx()
        masterGainRef.current!.gain.setTargetAtTime(0, ctx.currentTime, 1.0)
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
    }, 1200)
  }, [])

  const setVibe = useCallback((v: BGMVibe) => {
    vibeRef.current = v
    if (!isPlayingRef.current || !masterGainRef.current) return
    const ctx = getCtx()
    const ratio = VIBE_VOLUME[v] / 0.12
    masterGainRef.current.gain.setTargetAtTime(volumeRef.current * ratio, ctx.currentTime, 0.8)
  }, [])

  const toggleBGM = useCallback(() => {
    if (isPlayingRef.current) {
      stopPlaying()
    } else {
      startPlaying()
    }
  }, [startPlaying, stopPlaying])

  const setVolume = useCallback((v: number) => {
    volumeRef.current = v
    if (!masterGainRef.current || !isPlayingRef.current) return
    const ctx = getCtx()
    const ratio = VIBE_VOLUME[vibeRef.current] / 0.12
    masterGainRef.current.gain.setTargetAtTime(v * ratio, ctx.currentTime, 0.1)
  }, [])

  const isPlaying = useCallback(() => isPlayingRef.current, [])

  useEffect(() => {
    return () => {
      stopPlaying()
      try {
        if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null }
      } catch { /* already closed */ }
    }
  }, [stopPlaying])

  return { setVibe, toggleBGM, setVolume, isPlaying }
}
