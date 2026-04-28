import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { Users, X, CheckCircle } from 'lucide-react'

export function VisitorQueuePicker() {
  const pendingVisitors = useGameStore((s) => s.pendingVisitors)
  const acceptVisitor = useGameStore((s) => s.acceptVisitor)
  const rejectVisitor = useGameStore((s) => s.rejectVisitor)
  const phase = useGameStore((s) => s.phase)

  if (pendingVisitors.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-40 flex items-end justify-center bg-deep-space/80 backdrop-blur-sm pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="w-full max-w-lg mx-4 mb-4 pointer-events-auto">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-orange-400/60" />
            <span className="text-[11px] font-mono text-orange-400/60 tracking-wider">
              等待队列 · {pendingVisitors.length} 位访客
            </span>
          </div>

          {/* Queue list */}
          <div className="space-y-2">
            <AnimatePresence>
              {pendingVisitors.map((visitor) => (
                <motion.div
                  key={visitor.npcId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-panel-bg/90 backdrop-blur-md border border-orange-400/20 rounded-lg p-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar dot */}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: visitor.avatarColor, boxShadow: `0 0 8px ${visitor.avatarColor}60` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-mono font-medium" style={{ color: visitor.avatarColor }}>
                          {visitor.name}
                        </span>
                        <span className="text-[10px] text-text-dim/40 font-mono">{visitor.type}</span>
                      </div>
                      {visitor.leftMessage && (
                        <p className="text-[11px] font-mono text-text-secondary/60 italic leading-relaxed mb-2">
                          「{visitor.leftMessage}」
                        </p>
                      )}
                      {/* Actions */}
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => acceptVisitor(visitor.npcId)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded border border-cyan-glow/30 bg-cyan-glow/10 text-[10px] font-mono text-cyan-glow hover:bg-cyan-glow/20 transition-all"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <CheckCircle size={11} />
                          接待
                        </motion.button>
                        <motion.button
                          onClick={() => rejectVisitor(visitor.npcId)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded border border-white/10 text-[10px] font-mono text-text-dim/60 hover:border-white/20 hover:text-text-dim/80 transition-all"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <X size={11} />
                          稍后再来
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
