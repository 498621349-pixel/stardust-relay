import { motion } from 'framer-motion'
import { RotateCcw, Play, Loader2, ChevronRight } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { LOGIC_CARDS, calculateResult } from '../data/cards'

export function LogicMixer() {
  const slots = useGameStore((s) => s.slots)
  const phase = useGameStore((s) => s.phase)
  const brewProgress = useGameStore((s) => s.brewProgress)
  const npc = useGameStore((s) => s.npc)
  const placeCard = useGameStore((s) => s.placeCard)
  const removeCard = useGameStore((s) => s.removeCard)
  const resetSlots = useGameStore((s) => s.resetSlots)
  const brew = useGameStore((s) => s.brew)
  const dismissResult = useGameStore((s) => s.dismissResult)

  const canInteract = phase === 'arrived' || phase === 'mixing'
  const isBrewing = phase === 'brewing'
  const showResult = phase === 'success' || phase === 'failed'

  // Calculate preview
  const preview = calculateResult(slots)
  const hasCards = slots.some((s) => s !== null)
  const target = npc ? { x: npc.targetX, y: npc.targetY, z: npc.targetZ } : null

  return (
    <div className="bg-panel-bg backdrop-blur-md border border-panel-border rounded-lg p-5 glow-border h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[13px] tracking-[0.15em] text-cyan-glow/70 uppercase font-mono glow-text">
          逻辑调制台
        </h3>
        <div className="flex gap-2">
          {canInteract && (
            <motion.button
              onClick={resetSlots}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded border border-white/10 text-text-secondary hover:border-cyan-glow/30 hover:text-cyan-glow/70 transition-all font-mono"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw size={12} />
              重置
            </motion.button>
          )}
        </div>
      </div>

      {/* Slots and Preview Row */}
      <div className="flex gap-4 flex-shrink-0 mb-3 h-28">
        {/* 3 Logic Slots */}
        <div className="flex-1 flex gap-2 items-center justify-center bg-white/[0.02] rounded-lg border border-white/5 p-2">
          {slots.map((slot, i) => {
            const card = slot ? LOGIC_CARDS.find((c) => c.id === slot) : null
            return (
              <motion.div
                key={i}
                className={`relative w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                  card
                    ? 'border-solid glow-border-strong'
                    : canInteract
                      ? 'border-white/15 hover:border-cyan-glow/40 hover:bg-cyan-glow/5'
                      : 'border-white/5'
                }`}
                style={
                  card
                    ? {
                        borderColor: card.color,
                        backgroundColor: `${card.color}10`,
                      }
                    : {}
                }
                onClick={() => canInteract && removeCard(i)}
                whileHover={canInteract ? { scale: 1.05 } : {}}
                whileTap={canInteract ? { scale: 0.95 } : {}}
              >
                {isBrewing && card ? (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    style={{
                      backgroundColor: `${card.color}20`,
                      boxShadow: `0 0 20px ${card.color}50`,
                    }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                ) : null}
                {card ? (
                  <>
                    <span className="text-[11px] font-mono relative z-10 truncate max-w-[70px]" style={{ color: card.color }}>
                      {card.name}
                    </span>
                    <span className="text-[9px] text-text-secondary font-mono relative z-10">{card.effect}</span>
                  </>
                ) : (
                  <span className={`text-[20px] font-mono ${canInteract ? 'text-white/15' : 'text-white/5'}`}>
                    {i + 1}
                  </span>
                )}
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-deep-space border border-white/20 flex items-center justify-center">
                  <span className="text-[9px] text-text-dim font-mono">{i + 1}</span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Real-time Preview */}
        {target && hasCards && !showResult && (
          <motion.div
            className="flex-1 bg-cyan-glow/5 rounded-lg border border-cyan-glow/15 p-3 flex flex-col justify-center"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-[11px] text-text-secondary uppercase tracking-wider font-mono mb-2 flex justify-between items-center">
              <span>当前调制预览</span>
              <span className="text-[9px] text-text-dim/60 normal-case tracking-normal">目标 vs 实际</span>
            </div>
            <div className="flex gap-4 text-[11px] font-mono">
              <PreviewAxis label="X" target={target.x} actual={preview.x} color="#00F2FF" />
              <PreviewAxis label="Y" target={target.y} actual={preview.y} color="#5EC0D8" />
              <PreviewAxis label="Z" target={target.z} actual={preview.z} color="#AA64FF" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Brewing progress */}
      {isBrewing && (
        <motion.div
          className="mb-3 p-3 rounded-lg border border-cyan-glow/15 bg-cyan-glow/5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-cyan-glow/60 font-mono">调制中...</span>
            <span className="text-[12px] text-text-secondary font-mono">{brewProgress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-cyan-glow/50"
              style={{ boxShadow: '0 0 8px rgba(0, 242, 255, 0.4)' }}
              animate={{ width: `${brewProgress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>
      )}

      {/* Result display */}
      {showResult && (
        <motion.div
          className={`mb-3 p-4 rounded-lg border text-center ${
            phase === 'success'
              ? 'border-cyan-glow/30 bg-cyan-glow/8'
              : 'border-alert-orange/30 bg-alert-orange/8'
          }`}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
        >
          <div className={`text-[16px] font-mono mb-2 ${phase === 'success' ? 'text-cyan-glow' : 'text-alert-orange'}`}>
            {phase === 'success' ? '调制成功' : '调制失败'}
          </div>
          {npc && (
            <div className="flex gap-4 justify-center text-[11px] font-mono mb-3">
              <span className="text-text-secondary">目标参数:</span>
              <span className="text-text-dim">X{npc.targetX.toFixed(2)} Y{npc.targetY.toFixed(2)} Z{npc.targetZ.toFixed(2)}</span>
            </div>
          )}
          <motion.button
            onClick={dismissResult}
            className="flex items-center justify-center gap-1.5 mx-auto px-4 py-2 rounded border border-white/15 text-[12px] text-text-secondary font-mono hover:border-cyan-glow/30 hover:text-cyan-glow/70 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            继续 <ChevronRight size={12} />
          </motion.button>
        </motion.div>
      )}

      {/* Available Cards */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="text-[11px] text-text-secondary uppercase tracking-wider font-mono mb-2 flex-shrink-0">可用逻辑卡片</div>
        <div className="grid grid-cols-4 gap-2 flex-1 content-start">
          {LOGIC_CARDS.map((card) => (
            <motion.button
              key={card.id}
              onClick={() => canInteract && placeCard(card.id)}
              disabled={!canInteract}
              className={`relative p-2.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                canInteract ? 'hover:brightness-110 hover:-translate-y-0.5' : 'opacity-40 cursor-not-allowed'
              }`}
              style={{
                borderColor: `${card.color}40`,
                backgroundColor: `${card.color}08`,
              }}
              whileHover={canInteract ? { scale: 1.03, y: -2 } : {}}
              whileTap={canInteract ? { scale: 0.97 } : {}}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: card.color, boxShadow: `0 0 8px ${card.color}70` }}
              />
              <span className="text-[11px] font-mono" style={{ color: card.color }}>
                {card.name}
              </span>
              <span className="text-[9px] text-text-secondary font-mono">{card.effect}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Brew button */}
      {canInteract && (
        <motion.button
          className="mt-3 w-full py-2.5 rounded-lg border border-cyan-glow/40 bg-cyan-glow/10 text-cyan-glow text-[12px] font-mono tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-cyan-glow/20 hover:border-cyan-glow/50 transition-all flex-shrink-0"
          onClick={brew}
          whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0, 242, 255, 0.2)' }}
          whileTap={{ scale: 0.98 }}
        >
          <Play size={14} />
          开始调制
        </motion.button>
      )}

      {isBrewing && (
        <div className="mt-3 w-full py-2.5 rounded-lg border border-cyan-glow/30 bg-cyan-glow/8 text-cyan-glow/60 text-[12px] font-mono tracking-wider uppercase flex items-center justify-center gap-2 flex-shrink-0">
          <Loader2 size={14} className="animate-spin" />
          调制中...
        </div>
      )}
    </div>
  )
}

function PreviewAxis({ label, target, actual, color }: { label: string; target: number; actual: number; color: string }) {
  const error = Math.abs(actual - target) / target
  const isClose = error <= 0.30
  const isExact = error <= 0.05

  return (
    <div className="flex flex-col items-center flex-1">
      <span style={{ color }} className="text-[12px] font-medium">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-[10px] text-text-dim/60">{target.toFixed(2)}</span>
        <span className="text-[9px] text-text-dim/30">→</span>
        <span
          className={`text-[12px] font-mono tabular-nums ${
            isExact ? 'text-cyan-glow' : isClose ? 'text-cyan-glow/70' : 'text-alert-orange/80'
          }`}
        >
          {actual.toFixed(2)}
        </span>
      </div>
      <span className={`text-[9px] mt-1 px-2 py-0.5 rounded whitespace-nowrap ${
        isExact ? 'text-cyan-glow/60 bg-cyan-glow/10' : isClose ? 'text-cyan-glow/50 bg-cyan-glow/5' : 'text-alert-orange/60 bg-alert-orange/5'
      }`}>
        {isExact ? '完美' : isClose ? '接近' : '偏差'}
      </span>
    </div>
  )
}
