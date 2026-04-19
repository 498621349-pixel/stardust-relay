import { useCallback, useRef, useEffect } from 'react'

// 语音参数配置 - 优化为更自然的语速和音调
interface VoiceConfig {
  rate: number  // 语速 0.1 - 10，推荐 0.8-1.3
  pitch: number // 音调 0 - 2，推荐 0.9-1.3
  volume: number // 音量 0-1
}

const VOICE_CONFIGS: Record<string, VoiceConfig> = {
  narrator: { rate: 1.05, pitch: 1.1, volume: 1 },   // 旁白 - 自然流畅
  frost: { rate: 0.95, pitch: 0.95, volume: 1 },      // 深空探索AI - 冷静理性，略低
  ember: { rate: 1.15, pitch: 1.25, volume: 1 },      // 货运飞船驾驶员 - 热情活力，略高
  echo: { rate: 1.0, pitch: 1.05, volume: 1 },         // 通讯中继站AI - 平稳清晰
  anchor: { rate: 0.9, pitch: 0.85, volume: 1 },     // 冬眠宇航员 - 缓慢低沉
  prism: { rate: 1.1, pitch: 1.2, volume: 1 },         // 艺术生成AI - 活泼跳跃
}

export function useSpeech() {
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const isSpeakingRef = useRef(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const pendingSpeechRef = useRef<{ text: string; voiceType: string } | null>(null)

  // 内部执行朗读
  const doSpeak = useCallback((text: string, voiceType: string) => {
    if (!synthRef.current) return
    synthRef.current.cancel()

    const voices = voicesRef.current
    let selectedVoice = voices.find(v => v.lang.includes('zh') && v.localService)
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang.includes('zh'))
    if (!selectedVoice) selectedVoice = voices.find(v => v.default) || voices[0]

    const utterance = new SpeechSynthesisUtterance(text)
    const config = VOICE_CONFIGS[voiceType] || VOICE_CONFIGS.narrator
    utterance.rate = config.rate
    utterance.pitch = config.pitch
    utterance.volume = config.volume
    utterance.lang = 'zh-CN'
    if (selectedVoice) utterance.voice = selectedVoice

    utterance.onstart = () => { isSpeakingRef.current = true }
    utterance.onend = () => { isSpeakingRef.current = false }
    utterance.onerror = () => { isSpeakingRef.current = false }

    synthRef.current.speak(utterance)
    isSpeakingRef.current = true
  }, [])

  // 加载语音列表
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis

      const loadVoices = () => {
        const voices = synthRef.current?.getVoices() || []
        voicesRef.current = voices
        // 语音列表加载好后，如果有待处理的朗读，立即执行
        if (pendingSpeechRef.current && voices.length > 0) {
          const { text, voiceType } = pendingSpeechRef.current
          pendingSpeechRef.current = null
          doSpeak(text, voiceType)
        }
      }

      loadVoices()

      if (synthRef.current && synthRef.current.getVoices().length === 0) {
        synthRef.current.addEventListener('voiceschanged', loadVoices)
        setTimeout(() => { loadVoices() }, 200)
      }

      return () => {
        synthRef.current?.removeEventListener('voiceschanged', loadVoices)
      }
    }
  }, [doSpeak])

  // 停止当前朗读
  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
      isSpeakingRef.current = false
    }
    pendingSpeechRef.current = null
  }, [])

  // 朗读文本
  const speak = useCallback((text: string, voiceType: string = 'narrator') => {
    if (!synthRef.current) return
    // 如果语音列表还没加载，缓存本次朗读请求，等加载好再执行
    if (voicesRef.current.length === 0) {
      pendingSpeechRef.current = { text, voiceType }
      return
    }
    doSpeak(text, voiceType)
  }, [doSpeak])

  // 检查是否正在朗读
  const isSpeaking = useCallback(() => {
    return isSpeakingRef.current
  }, [])

  // 朗读旁白（访客介绍）
  const speakIntro = useCallback((text: string) => {
    speak(text, 'narrator')
  }, [speak])

  // 朗读角色台词
  const speakDialogue = useCallback((npcId: string, text: string) => {
    speak(text, npcId)
  }, [speak])

  return {
    speak,
    speakIntro,
    speakDialogue,
    stop,
    isSpeaking,
  }
}
