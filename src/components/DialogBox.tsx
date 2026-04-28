import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { useSpeech } from '../hooks/useSpeech'
import { useSound } from '../hooks/useSound'
import { NPC_TEMPLATES } from '../data/npcs'

function isSystemText(text: string, speaker: string): boolean {
  return !text || !speaker.includes('//') || speaker.includes('ERROR') || text.includes('未检测到')
}

// v0.5: 能源危机监控日志序列（依次显示，每条约 4 秒）
const EMERGENCY_LOG_SEQUENCE = [
  '能源储备：临界',
  '切换至备用回路... 失败',
  '主控系统：降频运行',
  '监测信号密度... 持续下降',
  '访客通道：功率不足，已延迟',
  '纳米基质合成：停止',
  '备用能源：剩余 12% ... 11% ...',
  '最后一条广播：正在发送...',
  '给调度员的话：',
]

export function DialogBox() {
  const dialogText = useGameStore((s) => s.dialogText)
  const dialogSpeaker = useGameStore((s) => s.dialogSpeaker)
  const phase = useGameStore((s) => s.phase)
  const resources = useGameStore((s) => s.resources)
  const speechEnabled = useGameStore((s) => s.speechEnabled)
  const npc = useGameStore((s) => s.npc)
  const soundEnabled = useGameStore((s) => s.soundEnabled)
  const offlineMessages = useGameStore((s) => s.offlineMessages)

  const { speakIntro, speakDialogue, stop } = useSpeech()
  const { play: playSound } = useSound()

  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const lastSpokenTextRef = useRef<string | null>(null)
  const prevPhaseRef = useRef<string>('idle')
  const prevSpeechEnabledRef = useRef(true)
  const justEnabledRef = useRef(false)
  const typewriterSkipRef = useRef(false)
  const emergencyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 语音开关：关闭时停止播放，开启时从头开始朗读当前文字
  useEffect(() => {
    if (!prevSpeechEnabledRef.current && speechEnabled) {
      justEnabledRef.current = true
      lastSpokenTextRef.current = null
    } else if (prevSpeechEnabledRef.current && !speechEnabled) {
      stop()
    }
    prevSpeechEnabledRef.current = speechEnabled
  }, [speechEnabled, stop])

  // 重置打字机效果（酿造/扫描等高频切换时直接跳完整文字）
  useEffect(() => {
    const isBrewingPhase = phase === 'brewing' || phase === 'scanning' || phase === 'mixing'
    if (isBrewingPhase) {
      // 高频阶段：直接显示完整文字，跳过打字动画
      setDisplayedText(dialogText)
      setCurrentIndex(dialogText.length)
      typewriterSkipRef.current = true
    } else {
      // 正常阶段：从头开始打字
      setDisplayedText('')
      setCurrentIndex(0)
      typewriterSkipRef.current = false
    }
  }, [dialogText, phase])

  // v0.5: 能源危机监控日志打字机效果
  useEffect(() => {
    if (currentIndex < dialogText.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + dialogText[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, 30)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, dialogText])

  // v0.5: 能源危机日志序列管理（能源 < 5% 且非 gameover 时触发）
  const [showEmergencyLog, setShowEmergencyLog] = useState(false)
  const [emergencyText, setEmergencyText] = useState('')
  const [emergencyIdx, setEmergencyIdx] = useState(0)

  // 进入/退出紧急日志模式
  useEffect(() => {
    const isLowEnergy = resources.energy < 5 && phase !== 'gameover'
    if (isLowEnergy) {
      setShowEmergencyLog(true)
      setEmergencyIdx(0)
      setEmergencyText('')
    } else {
      if (emergencyTimerRef.current) clearTimeout(emergencyTimerRef.current)
      setShowEmergencyLog(false)
      setEmergencyText('')
      setEmergencyIdx(0)
    }
    return () => {
      if (emergencyTimerRef.current) clearTimeout(emergencyTimerRef.current)
    }
  }, [resources.energy, phase])

  // 紧急日志逐行打字机
  useEffect(() => {
    if (!showEmergencyLog || emergencyIdx >= EMERGENCY_LOG_SEQUENCE.length) return

    const line = EMERGENCY_LOG_SEQUENCE[emergencyIdx]
    let charIdx = 0
    const type = () => {
      if (charIdx <= line.length) {
        setEmergencyText(line.slice(0, charIdx))
        charIdx++
        emergencyTimerRef.current = setTimeout(type, 25)
      } else {
        // 当前行打完，等待4秒后进入下一行
        emergencyTimerRef.current = setTimeout(() => {
          setEmergencyIdx((prev) => prev + 1)
        }, 4000)
      }
    }
    emergencyTimerRef.current = setTimeout(type, 200)
    return () => {
      if (emergencyTimerRef.current) clearTimeout(emergencyTimerRef.current)
    }
  }, [showEmergencyLog, emergencyIdx])

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
    if (!isSystemText(dialogText, dialogSpeaker)) {
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
        if (!isSystemText(text, speaker)) {
          stop()
          speakIntro(text)
        }
      }, 100)
    }
  }, [phase, stop])

  // 紧急状态进入时触发音效
  useEffect(() => {
    if (prevPhaseRef.current !== 'emergency' && phase === 'emergency' && soundEnabled) {
      playSound('emergency_critical')
    }
    prevPhaseRef.current = phase
  }, [phase, soundEnabled, playSound])

  const isGameOver = phase === 'gameover'
  const isLowWarning = resources.energy < 5 && !isGameOver

  return (
    <div
      className={`relative bg-panel-bg/80 backdrop-blur-md border rounded-lg p-5 glow-border ${
        isGameOver
          ? 'border-red-500/40'
          : isLowWarning
            ? 'border-red-500/50 animate-pulse'
            : 'border-panel-border'
      }`}
    >
      {/* Low energy warning flash */}
      <AnimatePresence>
        {isLowWarning && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ backgroundColor: 'rgba(255, 50, 50, 0.06)' }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      {/* Decorative corner */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-glow/30 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-glow/30 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-glow/30 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-glow/30 rounded-br-lg" />

      {/* v0.5: 离线消息（访客在玩家离线期间的留言，显示在对话框顶部） */}
      <AnimatePresence>
        {offlineMessages.length > 0 && phase === 'idle' && (
          <motion.div
            key="offline-messages"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 pb-4 border-b border-red-500/20 space-y-2"
          >
            <div className="text-[11px] font-mono text-red-400/60 tracking-wider mb-2">
              访客留言 · {offlineMessages.length} 条
            </div>
            {offlineMessages.map((msg) => {
              const npcTemplate = NPC_TEMPLATES.find((n) => n.id === msg.npcId)
              const npcName = npcTemplate?.name ?? msg.npcId
              return (
                <div key={msg.npcId} className="bg-black/20 rounded p-3 border border-red-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono text-red-400/60">
                      {npcName}
                    </span>
                    <button
                      onClick={() => useGameStore.getState().dismissOfflineMessage(msg.npcId)}
                      className="text-[10px] text-text-dim/40 hover:text-red-400/60 transition-colors cursor-pointer"
                    >
                      关闭
                    </button>
                  </div>
                  <p className="text-[13px] text-text-primary/90 italic leading-relaxed">"{msg.message}"</p>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog content */}
      <div className="relative min-h-[3.5rem] flex items-start gap-4">
        {/* Speaker icon */}
        <motion.div
          className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center mt-0.5 ${
            isLowWarning
              ? 'border-red-400/40'
              : isGameOver
                ? 'border-red-500/40'
                : 'border-cyan-glow/30'
          }`}
          animate={isLowWarning ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isLowWarning ? 'bg-red-400/70 animate-pulse' : isGameOver ? 'bg-red-400/70' : 'bg-cyan-glow/60'
            }`}
          />
        </motion.div>

        <div className="flex-1">
          <div
            className={`text-[12px] font-mono mb-2 tracking-wider ${
              isLowWarning
                ? 'text-red-400/70'
                : isGameOver
                  ? 'text-red-400/70'
                  : 'text-cyan-glow/60'
            }`}
          >
            {isLowWarning ? 'SYSTEM // 能源监控' : dialogSpeaker}
          </div>

          {/* v0.5: 能源危机日志（显示在正常文字之上） */}
          {showEmergencyLog && emergencyText && (
            <div className="space-y-1 mb-3 pb-3 border-b border-red-500/20">
              {EMERGENCY_LOG_SEQUENCE.slice(0, emergencyIdx).map((line, i) => (
                <div key={i} className="text-[12px] font-mono text-red-400/50 line-through opacity-60">
                  {line}
                </div>
              ))}
              <div className="text-[13px] font-mono text-red-400/80">
                {emergencyText}
                <motion.span
                  className="inline-block w-0.5 h-4 ml-1 align-middle bg-red-400/70"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              </div>
            </div>
          )}

          <p className="text-[15px] text-text-primary leading-relaxed">
            {showEmergencyLog ? displayedText : displayedText}
            <motion.span
              className={`inline-block w-0.5 h-5 ml-1 align-middle ${
                isLowWarning ? 'bg-red-400/70' : 'bg-cyan-glow/70'
              }`}
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </p>
        </div>
      </div>

      {/* Bottom status line — hidden on mobile */}
      <div className="hidden md:flex items-center justify-between mt-4 pt-3 border-t border-white/5">
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
              isLowWarning ? 'bg-red-400/70 animate-pulse' : 'bg-cyan-glow/50 animate-pulse'
            }`}
          />
          <span className={`text-[11px] font-mono ${isLowWarning ? 'text-red-400/70' : 'text-text-secondary'}`}>
            {isLowWarning ? '能源告急 · ' : ''}
            {phase === 'idle' && 'Space 开始扫描 · Esc 休息'}
            {phase === 'scanning' && '扫描中...'}
            {(phase === 'arrived' || phase === 'mixing') && 'Enter 酿造 · R 重置 · Esc 休息'}
            {phase === 'brewing' && '酿造中...'}
            {(phase === 'success' || phase === 'failed') && 'Space 继续扫描'}
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
