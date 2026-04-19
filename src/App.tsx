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
import { useGameStore } from './store/gameStore'
import { RotateCcw, Volume2, VolumeX } from 'lucide-react'

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

  const phase = useGameStore((s) => s.phase)
  const speechEnabled = useGameStore((s) => s.speechEnabled)
  const toggleSpeech = useGameStore((s) => s.toggleSpeech)
  const { isSpeaking } = useSpeech()

  const isGameOver = phase === 'gameover'

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
      <div className="relative z-10 w-full h-full flex flex-col p-4 gap-3">
        {/* Top section: Space View */}
        <HolographicPanel className="flex-shrink-0 h-[22vh]" delay={0} intensity="low">
          <SpaceView />
        </HolographicPanel>

        {/* Middle section: Three-column layout */}
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Left: Resources + Log */}
          <div className="w-[220px] flex-shrink-0 flex flex-col gap-3">
            <div className="flex-[2] min-h-0">
              <HolographicPanel className="h-full" delay={0.2} intensity="medium">
                <ResourcePanel />
              </HolographicPanel>
            </div>
            <div className="flex-1 min-h-0">
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

          {/* Right: NPC Scanner */}
          <div className="w-[240px] flex-shrink-0">
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

      {/* Corner decorations */}
      <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-cyan-glow/20 pointer-events-none" />
      <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-cyan-glow/20 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-cyan-glow/20 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-cyan-glow/20 pointer-events-none" />

      {/* Speech toggle button */}
      <motion.button
        className={`absolute top-12 right-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all ${
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
            <span className="text-[11px] font-mono">语音开</span>
          </>
        ) : (
          <>
            <VolumeX size={16} />
            <span className="text-[11px] font-mono">静音</span>
          </>
        )}
      </motion.button>

      {/* Game Over overlay */}
      <AnimatePresence>
        {isGameOver && <GameOverOverlay />}
      </AnimatePresence>
    </div>
  )
}

export default App
