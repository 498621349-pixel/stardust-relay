import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { ACHIEVEMENT_DEFS } from '../store/gamePersist'
import { Trophy } from 'lucide-react'

export function AchievementUI() {
  const justUnlocked = useGameStore((s) => s.achievements.justUnlocked)
  const dismissAchievement = useGameStore((s) => s.dismissAchievement)

  useEffect(() => {
    if (!justUnlocked) return
    const timer = setTimeout(() => {
      dismissAchievement()
    }, 8000)
    return () => clearTimeout(timer)
  }, [justUnlocked, dismissAchievement])

  if (!justUnlocked) return null
  const def = ACHIEVEMENT_DEFS.find((d) => d.id === justUnlocked)
  if (!def) return null

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="pointer-events-auto bg-panel-bg border border-yellow-400/40 rounded-xl p-6 text-center shadow-[0_0_40px_rgba(255,215,0,0.3)]"
          style={{ background: 'linear-gradient(135deg, rgba(30,25,10,0.95), rgba(20,15,5,0.98))' }}
          initial={{ scale: 0.5, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: -20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="flex justify-center mb-3">
            <Trophy size={36} className="text-yellow-400" style={{ filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.6))' }} />
          </div>
          <div className="text-[10px] text-yellow-400/70 font-mono uppercase tracking-widest mb-2">成就解锁</div>
          <div className="text-[20px] mb-1">{def.icon}</div>
          <div className="text-[15px] font-mono font-medium text-yellow-300 mb-1">{def.name}</div>
          <div className="text-[11px] text-text-secondary font-mono mb-4">{def.desc}</div>
          <button
            onClick={dismissAchievement}
            className="px-5 py-2 rounded border border-yellow-400/30 text-yellow-400/80 text-[11px] font-mono hover:border-yellow-400/50 hover:text-yellow-400 transition-all"
          >
            太棒了！
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Small badge showing total achievements unlocked (for placement in header)
export function AchievementBadge() {
  const unlockedList = useGameStore((s) => s.achievements.unlocked)
  if (unlockedList.length === 0) return null
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded border border-yellow-400/20 bg-yellow-400/10 text-yellow-400/80 text-[10px] font-mono">
      <Trophy size={10} />
      <span>{unlockedList.length}/{ACHIEVEMENT_DEFS.length}</span>
    </div>
  )
}
