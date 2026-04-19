import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { ScrollText } from 'lucide-react'

export function GameLog() {
  const logs = useGameStore((s) => s.logs)

  return (
    <div className="bg-panel-bg backdrop-blur-md border border-panel-border rounded-lg p-4 glow-border h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <ScrollText size={14} className="text-cyan-glow/50" />
        <h3 className="text-[11px] tracking-[0.15em] text-cyan-glow/50 uppercase font-mono">
          系统日志
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        <AnimatePresence initial={false}>
          {logs.slice(0, 6).map((log, i) => (
            <motion.div
              key={`${log.time}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11px] font-mono leading-relaxed"
            >
              <span className="text-text-dim/70">[{log.time}]</span>{' '}
              <span
                className={
                  log.type === 'success'
                    ? 'text-cyan-glow/80'
                    : log.type === 'warning'
                      ? 'text-alert-orange/80'
                      : log.type === 'error'
                        ? 'text-red-400/80'
                        : 'text-text-secondary/70'
                }
              >
                {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
