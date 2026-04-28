import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { TUTORIAL_STEPS } from '../data/tutorialData'

const TOTAL_STEPS = TUTORIAL_STEPS.length

interface TutorialSystemProps {
  onComplete: () => void
}

export function TutorialSystem({ onComplete }: TutorialSystemProps) {
  const tutorialStep = useGameStore((s) => (s as any).tutorialStep ?? 0)
  const advanceStep = useGameStore((s) => (s as any).advanceTutorialStep)

  const step = TUTORIAL_STEPS[tutorialStep]
  const isLast = tutorialStep >= TOTAL_STEPS - 1

  function handleNext() {
    if (isLast) {
      onComplete()
    } else {
      advanceStep()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-50 flex items-center justify-center bg-deep-space/85 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Tutorial card */}
        <motion.div
          className="relative w-full max-w-lg mx-4 bg-panel-bg/90 border border-cyan-glow/40 rounded-xl p-6 shadow-[0_0_60px_rgba(0,242,255,0.15)]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-cyan-glow/40 rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-cyan-glow/40 rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-cyan-glow/40 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-cyan-glow/40 rounded-br-xl" />

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-mono text-cyan-glow/60 tracking-wider">
              引导 {tutorialStep + 1}/{TOTAL_STEPS}
            </span>
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-cyan-glow/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((tutorialStep + 1) / TOTAL_STEPS) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Step title */}
          <div className="mb-4">
            <div className="text-[10px] font-mono text-cyan-glow/50 tracking-[0.2em] uppercase mb-1">
              {step.label}
            </div>
            <h2 className="text-[18px] font-mono text-text-primary tracking-wide">
              {step.title}
            </h2>
          </div>

          {/* Step content */}
          <div className="min-h-[80px]">
            {step.content.map((para, i) => (
              <p
                key={i}
                className={`text-[13px] text-text-secondary leading-relaxed mb-2 ${
                  para.highlight ? 'text-cyan-glow/80' : ''
                }`}
              >
                {para.text}
              </p>
            ))}
          </div>

          {/* Highlight boxes (for card/UI demos) */}
          {step.highlights && step.highlights.length > 0 && (
            <div className="mt-4 mb-4 flex flex-wrap gap-2">
              {step.highlights.map((hl, i) => (
                <motion.div
                  key={i}
                  className="px-3 py-2 rounded-lg border text-[11px] font-mono"
                  style={{
                    color: hl.color,
                    borderColor: `${hl.color}50`,
                    backgroundColor: `${hl.color}12`,
                  }}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                >
                  {hl.text}
                </motion.div>
              ))}
            </div>
          )}

          {/* Action hint */}
          {step.actionHint && (
            <div className="mt-3 mb-4 px-3 py-2 rounded border border-cyan-glow/10 bg-cyan-glow/5 text-[11px] font-mono text-cyan-glow/50">
              → {step.actionHint}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={onComplete}
              className="text-[11px] font-mono text-text-dim/40 hover:text-text-dim/60 transition-colors tracking-wider"
            >
              跳过引导
            </button>

            <motion.button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-cyan-glow/40 bg-cyan-glow/10 text-cyan-glow text-[12px] font-mono tracking-wider hover:bg-cyan-glow/20 transition-all"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {isLast ? '开始调度' : '继续'}
              <span className="text-cyan-glow/50 text-[10px]">→</span>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}