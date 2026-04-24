import { useCallback, useRef, useEffect } from 'react'

// 语音参数配置
interface VoiceConfig {
  rate: number
  pitch: number
  volume: number
}

const VOICE_CONFIGS: Record<string, VoiceConfig> = {
  narrator: { rate: 1.1, pitch: 1.15, volume: 1 },
  frost:    { rate: 1.0,  pitch: 1.0,  volume: 1 },
  ember:    { rate: 1.15, pitch: 1.3,  volume: 1 },
  echo:     { rate: 1.05, pitch: 1.1,  volume: 1 },
  anchor:   { rate: 0.9,  pitch: 0.9,  volume: 1 },
  prism:    { rate: 1.15, pitch: 1.25, volume: 1 },
}

export function useSpeech() {
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const isSpeakingRef = useRef(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const pendingSpeechRef = useRef<{ text: string; voiceType: string } | null>(null)

  // 从语音列表中挑选最优女声
  function selectBestChineseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null

    // macOS 中文女声名称列表（优先级从高到低）
    const femaleVoiceNames = [
      'tingting', 'sandy', 'shelley', 'flo', 'meijia', 'ting-ting', 'tingting',
      'yu-shu', 'yushu', 'kankyo', 'lin lin',
    ]
    const isLikelyMale = (name: string) => {
      const n = name.toLowerCase()
      return n.includes('male') || n.includes('男') || n.includes('eddy') ||
             n.includes('daniel') || n.includes('yannick') || n.includes('markus') ||
             n.includes('helena') || n.includes('reed') || n.includes('rocko') ||
             n.includes('grandpa') || n.includes('sinji')
    }

    // 优先级1: 本地 macOS 中文女声
    let v = voices.find(vo => vo.lang.includes('zh') && vo.localService && !isLikelyMale(vo.name))
    if (v) return v

    // 优先级2: 明确指定的女声名称（tingting/sandy等）
    for (const fn of femaleVoiceNames) {
      v = voices.find(vo => vo.name.toLowerCase().includes(fn) && vo.lang.includes('zh'))
      if (v) return v
    }

    // 优先级3: Google 中文女声
    v = voices.find(vo => vo.name.toLowerCase().includes('google') && vo.lang.includes('zh') && !isLikelyMale(vo.name))
    if (v) return v

    // 优先级4: Microsoft 中文女声
    v = voices.find(vo => vo.name.toLowerCase().includes('microsoft') && vo.lang.includes('zh') && !isLikelyMale(vo.name))
    if (v) return v

    // 优先级5: 任何中文语音（非男声）
    v = voices.find(vo => vo.lang.includes('zh') && !isLikelyMale(vo.name))
    if (v) return v

    // 优先级6: 任何中文语音
    v = voices.find(vo => vo.lang.includes('zh'))
    if (v) return v

    // 优先级7: 默认语音
    return voices.find(vo => vo.default) || voices[0]
  }

  // 内部执行朗读
  const doSpeak = useCallback((text: string, voiceType: string) => {
    if (!synthRef.current) return
    synthRef.current.cancel()

    const selectedVoice = selectBestChineseVoice(voicesRef.current)

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
        if (pendingSpeechRef.current && voices.length > 0) {
          const { text, voiceType } = pendingSpeechRef.current
          pendingSpeechRef.current = null
          doSpeak(text, voiceType)
        }
      }

      loadVoices()

      if (synthRef.current && synthRef.current.getVoices().length === 0) {
        synthRef.current.addEventListener('voiceschanged', loadVoices)
        setTimeout(() => { loadVoices() }, 300)
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
    if (voicesRef.current.length === 0) {
      pendingSpeechRef.current = { text, voiceType }
      return
    }
    doSpeak(text, voiceType)
  }, [doSpeak])

  const isSpeaking = useCallback(() => {
    return isSpeakingRef.current
  }, [])

  const speakIntro = useCallback((text: string) => {
    speak(text, 'narrator')
  }, [speak])

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
