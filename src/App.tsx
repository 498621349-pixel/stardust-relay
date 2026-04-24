import { motion, AnimatePresence } from 'framer-motion'
import { HolographicPanel } from './components/HolographicPanel'
import { SpaceView } from './components/SpaceView'
import { ResourcePanel } from './components/ResourcePanel'
import { NPCScanner } from './components/NPCScanner'
import { LogicMixer } from './components/LogicMixer'
import { DialogBox } from './components/DialogBox'
import { GameLog } from './components/GameLog'
import { useGameLoop } from './hooks/useGameLoop'
import { useSpeech } from './hooks/useSpeech'
import { useSound } from './hooks/useSound'
import { useBGM } from './hooks/useBGM'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useGameStore } from './store/gameStore'
import { AchievementUI, AchievementBadge } from './components/AchievementUI'
import { RotateCcw, Volume2, VolumeX, Moon, Sun, Music, Music2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { GamePhase } from './store/gameStore'

function GameOverOverlay() {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center bg-deep-space/90 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
    >
      <div className="text-center">
        <motion.div
          className="text-[32px] font-mono text-text-dim/40 mb-4 tracking-[0.3em]"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          SYSTEM OFFLINE
        </motion.div>
        <div className="text-[14px] font-mono text-text-dim/30 mb-8">
          能源耗尽。星尘驿站进入永久休眠。
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 mx-auto px-4 py-2 rounded border border-cyan-glow/20 text-cyan-glow/40 text-[11px] font-mono tracking-wider hover:border-cyan-glow/40 hover:text-cyan-glow/60 transition-all"
        >
          <RotateCcw size={12} />
          重启系统
        </button>
      </div>
    </motion.div>
  )
}

function App() {
  useGameLoop()
  useKeyboardShortcuts()

  const phase = useGameStore((s) => s.phase)
  const speechEnabled = useGameStore((s) => s.speechEnabled)
  const isResting = useGameStore((s) => s.isResting)
  const soundEnabled = useGameStore((s) => s.soundEnabled)
  const bgmEnabled = useGameStore((s) => s.bgmEnabled)
  const toggleSpeech = useGameStore((s) => s.toggleSpeech)
  const toggleRest = useGameStore((s) => s.toggleRest)
  const toggleSound = useGameStore((s) => s.toggleSound)
  const toggleBGM = useGameStore((s) => s.toggleBGM)
  const { isSpeaking } = useSpeech()
  const { play, setEnabled } = useSound()
  const resources = useGameStore((s) => s.resources)
  const { setVibe, toggleBGM: bgmToggle, isPlaying } = useBGM()

  // 同步音效开关状态
  useEffect(() => {
    setEnabled(soundEnabled)
  }, [soundEnabled, setEnabled])

  // BGM 开关与相位切换
  useEffect(() => {
    if (!bgmEnabled) {
      if (isPlaying()) bgmToggle()
    } else {
      if (!isPlaying()) bgmToggle()
    }
  }, [bgmEnabled]) // eslint-disable-line

  // 根据游戏状态切换 BGM 氛围
  useEffect(() => {
    const nextVibe: 'idle' | 'active' | 'resting' =
      isResting ? 'resting'
      : phase === 'arrived' || phase === 'mixing' || phase === 'brewing' ? 'active'
      : 'idle'
    setVibe(nextVibe)
  }, [phase, isResting]) // eslint-disable-line

  const isGameOver = phase === 'gameover'

  // 追踪 phase 跳转，触发一次性音效
  const prevPhaseRef = useRef<GamePhase>(phase)
  const prevEnergyRef = useRef(resources.energy)
  useEffect(() => {
    if (phase !== prevPhaseRef.current) {
      if (phase === 'arrived') play('arrival')
      else if (phase === 'gameover') play('gameover')
      prevPhaseRef.current = phase
    }
    // 能源 <5% 预警音效（仅在进入临界时触发一次）
    if (prevEnergyRef.current >= 5 && resources.energy < 5 && soundEnabled) {
      play('emergency_critical')
    }
    prevEnergyRef.current = resources.energy
  }, [phase, resources.energy, play, soundEnabled])

  return (
    <div className="w-screen h-screen bg-deep-space overflow-hidden relative">
      {/* Background grid effect */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 242, 255, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 242, 255, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(10, 14, 20, 0.6) 100%)',
        }}
      />

      {/* Main layout */}
      <div className="relative z-10 w-full h-full flex flex-col p-2 sm:p-4 gap-2 sm:gap-3">
        {/* Top section: Space View */}
        <HolographicPanel className="flex-shrink-0 h-[18vh] sm:h-[22vh]" delay={0} intensity="low">
          <SpaceView />
        </HolographicPanel>

        {/* Middle section: Three-column layout */}
        <div className="flex-1 flex gap-2 sm:gap-3 min-h-0">
          {/* Left: Resources + Log — hidden on mobile */}
          <div className="hidden md:flex w-[160px] lg:w-[220px] flex-shrink-0 flex flex-col gap-2 sm:gap-3">
            <div className="flex-[2] min-h-0">
              <HolographicPanel className="h-full" delay={0.2} intensity="medium">
                <ResourcePanel />
              </HolographicPanel>
            </div>
            <div className="flex-1 min-h-0 hidden lg:flex">
              <HolographicPanel className="h-full" delay={0.25} intensity="low">
                <GameLog />
              </HolographicPanel>
            </div>
          </div>

          {/* Center: Logic Mixer */}
          <div className="flex-1 min-w-0">
            <HolographicPanel className="h-full" delay={0.4} intensity="medium">
              <LogicMixer />
            </HolographicPanel>
          </div>

          {/* Right: NPC Scanner — hidden on mobile */}
          <div className="hidden md:flex w-[180px] lg:w-[240px] flex-shrink-0">
            <HolographicPanel className="h-full" delay={0.3} intensity="medium">
              <NPCScanner />
            </HolographicPanel>
          </div>
        </div>

        {/* Bottom: Dialog Box */}
        <HolographicPanel className="flex-shrink-0" delay={0.5} intensity="low">
          <DialogBox />
        </HolographicPanel>
      </div>

      {/* Control buttons - right-aligned — icon-only on mobile */}
      <div className="absolute top-2 right-2 sm:top-8 sm:right-8 z-50 flex flex-col gap-1 sm:gap-2">
        <AchievementBadge />
        {/* BGM toggle button */}
        <motion.button
          className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-all ${
            bgmEnabled
              ? 'border-purple-400/40 bg-purple-400/10 text-purple-400/90'
              : 'border-white/10 bg-white/5 text-text-dim hover:border-white/20'
          }`}
          onClick={toggleBGM}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Music2 size={16} />
          <span className="text-[9px] sm:text-[11px] font-mono hidden sm:inline">{bgmEnabled ? 'BGM' : 'BGM关'}</span>
        </motion.button>

        {/* Sound toggle button */}
        <motion.button
          className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-all ${
            soundEnabled
              ? 'border-cyan-glow/40 bg-cyan-glow/10 text-cyan-glow'
              : 'border-white/10 bg-white/5 text-text-dim hover:border-white/20'
          }`}
          onClick={toggleSound}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Music size={16} />
          <span className="text-[9px] sm:text-[11px] font-mono hidden sm:inline">{soundEnabled ? '音效' : '静音'}</span>
        </motion.button>

        {/* Speech toggle button */}
        <motion.button
          className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-all ${
            speechEnabled
              ? 'border-cyan-glow/40 bg-cyan-glow/10 text-cyan-glow'
              : 'border-white/10 bg-white/5 text-text-dim hover:border-white/20'
          }`}
          onClick={toggleSpeech}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {speechEnabled ? (
            <>
              <Volume2 size={16} className={isSpeaking() ? 'animate-pulse' : ''} />
              <span className="text-[9px] sm:text-[11px] font-mono hidden sm:inline">语音开</span>
            </>
          ) : (
            <>
              <VolumeX size={16} />
              <span className="text-[9px] sm:text-[11px] font-mono hidden sm:inline">静音</span>
            </>
          )}
        </motion.button>

        {/* Rest toggle button */}
        <motion.button
          className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-all ${
            isResting
              ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-400'
              : 'border-white/10 bg-white/5 text-text-dim hover:border-white/20'
          }`}
          onClick={toggleRest}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isResting ? (
            <>
              <Moon size={16} />
              <span className="text-[9px] sm:text-[11px] font-mono hidden sm:inline">休息中</span>
            </>
          ) : (
            <>
              <Sun size={16} />
              <span className="text-[9px] sm:text-[11px] font-mono hidden sm:inline">休息</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Achievement popup */}
      <AchievementUI />

      {/* Game Over overlay */}
      <AnimatePresence>
        {isGameOver && <GameOverOverlay />}
      </AnimatePresence>
    </div>
  )
}

export default App
