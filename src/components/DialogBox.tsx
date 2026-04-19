import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { useSpeech } from '../hooks/useSpeech'

export function DialogBox() {
  const dialogText = useGameStore((s) => s.dialogText)
  const dialogSpeaker = useGameStore((s) => s.dialogSpeaker)
  const phase = useGameStore((s) => s.phase)
  const resources = useGameStore((s) => s.resources)
  const speechEnabled = useGameStore((s) => s.speechEnabled)
  const npc = useGameStore((s) => s.npc)

  const { speakIntro, speakDialogue, speak, stop } = useSpeech()

  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const lastSpokenTextRef = useRef<string | null>(null)
  const prevPhaseRef = useRef<string>('idle')
  const prevSpeechEnabledRef = useRef(true)
  const justEnabledRef = useRef(false)

  // 语音开关：关闭时停止播放，开启时从头开始朗读当前文字
  useEffect(() => {
    if (!prevSpeechEnabledRef.current && speechEnabled) {
      // 从关闭切换到开启，标记后让主效果触发朗读
      justEnabledRef.current = true
      lastSpokenTextRef.current = null
    } else if (prevSpeechEnabledRef.current && !speechEnabled) {
      // 从开启切换到关闭，停止播放
      stop()
    }
    prevSpeechEnabledRef.current = speechEnabled
  }, [speechEnabled, stop])

  // 重置打字机效果
  useEffect(() => {
    setDisplayedText('')
    setCurrentIndex(0)
  }, [dialogText])

  // 打字机效果
  useEffect(() => {
    if (currentIndex < dialogText.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + dialogText[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, 30)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, dialogText])

  // 页面加载时立即朗读初始文字
  useEffect(() => {
    if (!speechEnabled) return
    const text = dialogText
    const speaker = dialogSpeaker
    if (!text || !speaker.includes('//') || speaker.includes('ERROR') || text.includes('未检测到')) return
    lastSpokenTextRef.current = text
    // 延迟 300ms 等语音系统初始化完成后再朗读
    const timer = setTimeout(() => {
      stop()
      speak(text, 'narrator')
    }, 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 仅在挂载时执行一次

  // 统一语音触发 - 当对话框内容或阶段变化时
  useEffect(() => {
    if (!speechEnabled) return
    if (!dialogText) return

    // 从关闭切换到开启：跳过 ref 检查，重新朗读当前文字
    if (justEnabledRef.current) {
      justEnabledRef.current = false
    } else if (dialogText === lastSpokenTextRef.current) {
      return
    }

    // 治愈成功阶段：使用角色声音，直接朗读 store 中的 dialogText
    if (phase === 'success' && npc) {
      lastSpokenTextRef.current = dialogText
      prevPhaseRef.current = 'success'
      setTimeout(() => {
        if (phase === 'success' && lastSpokenTextRef.current === dialogText) {
          stop()
          speakDialogue(npc.id, dialogText)
        }
      }, 1500)
      return
    }

    // 失败阶段：旁白朗读
    if (phase === 'failed') {
      lastSpokenTextRef.current = dialogText
      prevPhaseRef.current = 'failed'
      setTimeout(() => {
        if (lastSpokenTextRef.current === dialogText && phase === 'failed') {
          stop()
          speakIntro(dialogText)
        }
      }, 200)
      return
    }

    // 访客到达：旁白朗读 intro
    if (dialogSpeaker.startsWith('SIGNAL //')) {
      lastSpokenTextRef.current = dialogText
      setTimeout(() => {
        if (lastSpokenTextRef.current === dialogText) {
          stop()
          speakIntro(dialogText)
        }
      }, 200)
      return
    }

    // 系统消息：旁白朗读（跳过错误提示）
    if (dialogSpeaker.includes('//')) {
      if (dialogSpeaker.includes('ERROR') || dialogText.includes('未检测到')) return
      lastSpokenTextRef.current = dialogText
      setTimeout(() => {
        if (lastSpokenTextRef.current === dialogText) {
          stop()
          speakIntro(dialogText)
        }
      }, 200)
      return
    }
  }, [dialogText, dialogSpeaker, phase, npc, speechEnabled, justEnabledRef, speakIntro, speakDialogue, stop])

  // 刚从成功/失败阶段切到 idle 时，朗读系统待机文字
  useEffect(() => {
    if (phase === 'idle' && (prevPhaseRef.current === 'success' || prevPhaseRef.current === 'failed')) {
      prevPhaseRef.current = 'idle'
      lastSpokenTextRef.current = null
      // 等 dialogText 稳定后再读
      setTimeout(() => {
        const text = useGameStore.getState().dialogText
        const speaker = useGameStore.getState().dialogSpeaker
        if (speaker.includes('//') && !speaker.includes('ERROR') && !text.includes('未检测到')) {
          stop()
          speakIntro(text)
        }
      }, 100)
    }
  }, [phase, stop])

  const isEmergency = phase === 'emergency'
  const isGameOver = phase === 'gameover'
  const isScanning = phase === 'scanning'

  return (
    <div
      className={`relative bg-panel-bg/80 backdrop-blur-md border rounded-lg p-5 glow-border ${
        isEmergency
          ? 'border-alert-orange/30'
          : isGameOver
            ? 'border-red-500/30'
            : 'border-panel-border'
      }`}
    >
      {/* Emergency flash */}
      <AnimatePresence>
        {isEmergency && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ backgroundColor: 'rgba(255, 140, 0, 0.03)' }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      {/* Decorative corner */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-glow/30 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-glow/30 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-glow/30 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-glow/30 rounded-br-lg" />

      {/* Dialog content */}
      <div className="relative min-h-[3.5rem] flex items-start gap-4">
        {/* Speaker icon */}
        <motion.div
          className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center mt-0.5 ${
            isEmergency
              ? 'border-alert-orange/40'
              : isGameOver
                ? 'border-red-500/40'
                : 'border-cyan-glow/30'
          }`}
          animate={isEmergency ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isEmergency ? 'bg-alert-orange/70 animate-pulse' : isGameOver ? 'bg-red-400/70' : 'bg-cyan-glow/60'
            }`}
          />
        </motion.div>

        <div className="flex-1">
          <div
            className={`text-[12px] font-mono mb-2 tracking-wider ${
              isEmergency
                ? 'text-alert-orange/70'
                : isGameOver
                  ? 'text-red-400/70'
                  : 'text-cyan-glow/60'
            }`}
          >
            {dialogSpeaker}
          </div>
          <p className="text-[15px] text-text-primary leading-relaxed">
            {displayedText}
            <motion.span
              className={`inline-block w-0.5 h-5 ml-1 align-middle ${
                isEmergency ? 'bg-alert-orange/70' : 'bg-cyan-glow/70'
              }`}
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </p>
        </div>
      </div>

      {/* Bottom status line */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-5">
          <span className="text-[11px] text-text-secondary font-mono tracking-wider">
            电力: <span className={resources.energy < 20 ? 'text-alert-orange/80' : 'text-cyan-glow/60'}>
              {resources.energy.toFixed(1)}%
            </span>
          </span>
          <span className="text-[11px] text-text-secondary font-mono tracking-wider">
            状态: <span className="text-cyan-glow/60">{getPhaseLabel(phase)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isEmergency ? 'bg-alert-orange/70 animate-pulse' : 'bg-cyan-glow/50 animate-pulse'
            }`}
          />
          <span className="text-[11px] text-text-secondary font-mono">
            {isScanning ? '扫描中...' : isEmergency ? '紧急模式' : '通信频道开放'}
          </span>
        </div>
      </div>
    </div>
  )
}

function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    idle: '待机',
    scanning: '扫描中',
    arrived: '访客抵达',
    mixing: '调制中',
    brewing: '执行调制',
    success: '调制成功',
    failed: '调制失败',
    emergency: '电力危机',
    gameover: '系统离线',
  }
  return labels[phase] || phase
}
