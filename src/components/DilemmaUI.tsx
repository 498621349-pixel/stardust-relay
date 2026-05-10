import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { AlertTriangle, X } from 'lucide-react'

export function DilemmaUI() {
  const currentDilemma = useGameStore((s) => s.currentDilemma)
  const resolveDilemma = useGameStore((s) => s.resolveDilemma)
  const dismissDilemma = useGameStore((s) => s.dismissDilemma)

  if (!currentDilemma) return null

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-[55] flex items-center justify-center bg-deep-space/95 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="relative w-[90%] max-w-md bg-gradient-to-b from-deep-space via-deep-space/95 to-[#1a0a2e]/50 rounded-lg border border-amber-500/30 p-4 sm:p-6 shadow-[0_0_60px_rgba(255,165,0,0.15)]"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-[12px] sm:text-[13px] font-mono text-amber-400 tracking-wider">道德困境</span>
            </div>
            <button
              onClick={() => dismissDilemma()}
              className="p-1 rounded hover:bg-white/10 text-text-dim/40 hover:text-text-dim/60 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* 困境描述 */}
          <div className="mb-5">
            <p className="text-[11px] sm:text-[12px] text-text-secondary/80 font-mono leading-relaxed">
              {currentDilemma.description}
            </p>
          </div>

          {/* 访客信息 */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="text-center">
              <div className="text-[10px] sm:text-[11px] text-text-dim/60 mb-1">访客 A</div>
              <div className="text-[13px] sm:text-[14px] font-mono text-[#00F2FF]">
                {currentDilemma.visitorA.toUpperCase()}
              </div>
            </div>
            <div className="text-[18px] text-text-dim/30">⚔</div>
            <div className="text-center">
              <div className="text-[10px] sm:text-[11px] text-text-dim/60 mb-1">访客 B</div>
              <div className="text-[13px] sm:text-[14px] font-mono text-[#5EC0D8]">
                {currentDilemma.visitorB.toUpperCase()}
              </div>
            </div>
          </div>

          {/* 选择按钮 */}
          <div className="flex flex-col gap-2">
            {currentDilemma.choices.map((choice, idx) => (
              <motion.button
                key={choice.id}
                onClick={() => resolveDilemma(choice.id)}
                className="w-full px-4 py-3 rounded border border-amber-500/20 bg-amber-500/5 text-[11px] sm:text-[12px] font-mono text-text-secondary/80 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-text-secondary transition-all cursor-pointer text-left"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-amber-400/60 mr-2">{String.fromCharCode(65 + idx)}.</span>
                {choice.text}
                <span className="ml-2 text-[10px] text-text-dim/50">
                  ({choice.effect.energy > 0 ? '+' : ''}{choice.effect.energy} ⚡)
                </span>
              </motion.button>
            ))}
          </div>

          {/* 底部提示 */}
          <div className="mt-4 text-center text-[9px] sm:text-[10px] text-text-dim/40 font-mono">
            每个选择都有独特的叙事，都是值得体验的路径。
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}