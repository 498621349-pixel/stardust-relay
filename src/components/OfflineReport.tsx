import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { Wifi, Zap, Package, Radio } from 'lucide-react'

export function OfflineReport() {
  const offlineReport = useGameStore((s) => s.offlineReport)
  const dismissOfflineReport = useGameStore((s) => s.dismissOfflineReport)

  if (!offlineReport) return null

  const { hours, energyGained, materialGained, driftSignals, conflictCount } = offlineReport

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-50 flex items-center justify-center bg-deep-space/90 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="relative w-full max-w-sm mx-4 bg-panel-bg/95 border border-cyan-glow/20 rounded-xl p-5 shadow-[0_0_40px_rgba(0,242,255,0.08)]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-glow/20 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-glow/20 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-glow/20 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-glow/20 rounded-br-lg" />

          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Radio size={15} className="text-cyan-glow/60" />
            <div className="text-[10px] font-mono text-cyan-glow/50 tracking-wider">驿站离线报告</div>
          </div>

          <div className="text-[11px] font-mono text-text-secondary/60 mb-4">
            离线时长：<span className="text-cyan-glow/80">{hours.toFixed(1)} 小时</span>
          </div>

          {/* Stats */}
          <div className="space-y-2 mb-4">
            {energyGained > 0 && (
              <div className="flex items-center gap-2 text-[12px] font-mono">
                <Zap size={12} className="text-yellow-400/60" />
                <span className="text-text-secondary/60">能源</span>
                <span className="text-yellow-400/80 ml-auto">+{energyGained}</span>
              </div>
            )}
            {materialGained > 0 && (
              <div className="flex items-center gap-2 text-[12px] font-mono">
                <Package size={12} className="text-purple-400/60" />
                <span className="text-text-secondary/60">材料</span>
                <span className="text-purple-400/80 ml-auto">+{materialGained}</span>
              </div>
            )}
            {driftSignals > 0 && (
              <div className="flex items-center gap-2 text-[12px] font-mono">
                <Wifi size={12} className="text-cyan-glow/60" />
                <span className="text-text-secondary/60">漂流信号</span>
                <span className="text-cyan-glow/80 ml-auto">{driftSignals} 个</span>
              </div>
            )}
            {conflictCount > 0 && (
              <div className="flex items-center gap-2 text-[12px] font-mono">
                <span className="text-orange-400/60">⏳</span>
                <span className="text-text-secondary/60">等待访客</span>
                <span className="text-orange-400/80 ml-auto">{conflictCount} 位</span>
              </div>
            )}
          </div>

          {driftSignals > 0 && (
            <p className="text-[11px] font-mono text-text-secondary/50 leading-relaxed mb-4 italic">
              离线期间，驿站的信号塔捕捉到了 {driftSignals} 个漂流信号……它们在等待被解析。
            </p>
          )}

          <button
            onClick={dismissOfflineReport}
            className="w-full py-2 rounded-lg border border-white/10 text-[11px] font-mono text-text-secondary hover:border-cyan-glow/20 hover:text-cyan-glow/60 transition-all"
          >
            确认报告
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
