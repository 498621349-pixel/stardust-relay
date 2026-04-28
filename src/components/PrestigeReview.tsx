import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { Rocket } from 'lucide-react'

export function PrestigeReview() {
  const sessionStats = useGameStore((s) => s.sessionStats)
  const prestigeLevel = useGameStore((s) => s.prestigeLevel)
  const totalPrestiges = useGameStore((s) => s.totalPrestiges)
  const activatePrestige = useGameStore((s) => s.activatePrestige)
  const dismissPrestigeReview = useGameStore((s) => s.dismissPrestigeReview)
  const npcStats = useGameStore((s) => s.npcStats)
  const day = useGameStore((s) => s.day)
  const servedCount = useGameStore((s) => s.servedCount)

  const canPrestige = day >= 30 && servedCount >= 15

  if (!canPrestige && totalPrestiges === 0) return null

  const favoriteName = sessionStats.favoriteVisitor
    ? (npcStats[sessionStats.favoriteVisitor] ? sessionStats.favoriteVisitor : null)
    : null

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
          className="relative w-full max-w-md mx-4 bg-panel-bg/95 border border-cyan-glow/30 rounded-xl p-6 shadow-[0_0_60px_rgba(0,242,255,0.1)]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-glow/30 rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-glow/30 rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-glow/30 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-glow/30 rounded-br-xl" />

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <Rocket size={18} className="text-cyan-glow/70" />
            <div>
              <div className="text-[10px] font-mono text-cyan-glow/50 tracking-wider">星际跃迁协议</div>
              <h2 className="text-[16px] font-mono text-cyan-glow tracking-wide">
                {totalPrestiges === 0 ? '本轮回顾' : `第 ${totalPrestiges} 次跃迁完成`}
              </h2>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2 mb-5">
            <StatRow label="存活天数" value={`第 ${day} 天`} />
            <StatRow label="累计治愈" value={`${servedCount} 位访客`} />
            {sessionStats.totalServed > 0 && (
              <StatRow label="本局治愈" value={`${sessionStats.totalServed} 位访客`} />
            )}
            {favoriteName && sessionStats.favoriteVisitorCount > 0 && (
              <StatRow label="最喜欢你的访客" value={`${favoriteName}（${sessionStats.favoriteVisitorCount} 次）`} />
            )}
            {sessionStats.bestStreak > 0 && (
              <StatRow label="最高连击" value={`${sessionStats.bestStreak} 次`} />
            )}
          </div>

          {/* Prestige bonus display */}
          {canPrestige && (
            <div className="mb-5 p-3 rounded-lg border border-cyan-glow/20 bg-cyan-glow/5">
              <div className="text-[11px] font-mono text-cyan-glow/60 mb-1">当前容差加成</div>
              <div className="flex gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < prestigeLevel ? 'bg-cyan-glow/60' : 'bg-white/10'}`}
                  />
                ))}
              </div>
              <div className="text-[12px] font-mono text-cyan-glow/80">
                {prestigeLevel > 0 ? `已激活 +${prestigeLevel * 5}% 容差加成` : '暂未激活跃迁'}
              </div>
              {prestigeLevel < 5 && (
                <div className="text-[10px] font-mono text-cyan-glow/40 mt-1">
                  跃迁将激活 +5% 容差（最高 +25%）
                </div>
              )}
              {prestigeLevel >= 5 && (
                <div className="text-[10px] font-mono text-yellow-400/60 mt-1">
                  已达最大跃迁层数（+25%）
                </div>
              )}
            </div>
          )}

          {/* Narrative text */}
          <p className="text-[12px] text-text-secondary leading-relaxed mb-5 font-mono">
            {canPrestige
              ? '跃迁协议就绪。你的调度经验已刻入驿站的信号网络——星际间的其他旅人会记住你的名字。'
              : '驿站信号尚未达到跃迁阈值。继续治愈迷途的旅人，当你的经验足够丰富时，星门将为开启。'}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={dismissPrestigeReview}
              className="flex-1 py-2 rounded-lg border border-white/10 text-[11px] font-mono text-text-dim hover:border-cyan-glow/20 hover:text-cyan-glow/60 transition-all"
            >
              {canPrestige ? '下次再说' : '关闭'}
            </button>
            {canPrestige && (
              <motion.button
                onClick={activatePrestige}
                className="flex-1 py-2 rounded-lg border border-cyan-glow/40 bg-cyan-glow/10 text-[11px] font-mono text-cyan-glow hover:bg-cyan-glow/20 transition-all flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Rocket size={13} />
                {prestigeLevel < 5 ? `激活跃迁（+${(prestigeLevel + 1) * 5}%）` : '重新跃迁'}
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px] font-mono">
      <span className="text-text-secondary/60">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  )
}
