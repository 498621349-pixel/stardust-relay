import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import { Rocket, AlertTriangle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export function PrestigeReview() {
  const sessionStats = useGameStore((s) => s.sessionStats)
  const prestigeLevel = useGameStore((s) => s.prestigeLevel)
  const showPrestigeConfirm = useGameStore((s) => s.showPrestigeConfirm)
  const dismissPrestigeReview = useGameStore((s) => s.dismissPrestigeReview)
  const npcStats = useGameStore((s) => s.npcStats)
  const day = useGameStore((s) => s.day)
  const servedCount = useGameStore((s) => s.servedCount)
  const prestigeStage = useGameStore((s) => s.prestigeStage)

  const canPrestige = day >= 30 && servedCount >= 15

  // 如果跃迁流程已激活，不显示原有回顾界面
  if (prestigeStage !== 'idle' || !canPrestige) {
    return <PrestigeStageUI />
  }

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
                本轮回顾
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

          {/* Narrative text */}
          <p className="text-[12px] text-text-secondary leading-relaxed mb-5 font-mono">
            跃迁协议就绪。你的调度经验已刻入驿站的信号网络——星际间的其他旅人会记住你的名字。
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={dismissPrestigeReview}
              className="flex-1 py-2 rounded-lg border border-white/10 text-[11px] font-mono text-text-dim hover:border-cyan-glow/20 hover:text-cyan-glow/60 transition-all"
            >
              下次再说
            </button>
            <motion.button
              onClick={showPrestigeConfirm}
              className="flex-1 py-2 rounded-lg border border-cyan-glow/40 bg-cyan-glow/10 text-[11px] font-mono text-cyan-glow hover:bg-cyan-glow/20 transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Rocket size={13} />
              {prestigeLevel < 5 ? `激活跃迁（+${(prestigeLevel + 1) * 5}%）` : '重新跃迁'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// 方案 4A: 跃迁过场系统 UI
function PrestigeStageUI() {
  const prestigeStage = useGameStore((s) => s.prestigeStage)
  const prestigeStats = useGameStore((s) => s.prestigeStats)
  const cancelPrestige = useGameStore((s) => s.cancelPrestige)
  const startPrestigeAnimation = useGameStore((s) => s.startPrestigeAnimation)
  const completePrestigeReset = useGameStore((s) => s.completePrestigeReset)
  const [animationProgress, setAnimationProgress] = useState(0)

  // 动画进度
  useEffect(() => {
    if (prestigeStage === 'animating') {
      const interval = setInterval(() => {
        setAnimationProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 3  // 约 3.3 秒完成
        })
      }, 100)
      return () => clearInterval(interval)
    }
    if (prestigeStage === 'resetting') {
      setAnimationProgress(0)
      // 1 秒后完成重置
      const timer = setTimeout(() => {
        completePrestigeReset()
      }, 1000)
      return () => clearTimeout(timer)
    }
    if (prestigeStage === 'confirm' || prestigeStage === 'idle') {
      setAnimationProgress(0)
    }
  }, [prestigeStage, completePrestigeReset])

  if (prestigeStage === 'idle') return null

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-50 flex items-center justify-center bg-deep-space/95 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {prestigeStage === 'confirm' && prestigeStats && (
          <motion.div
            className="relative w-full max-w-md mx-4 bg-panel-bg/95 border border-amber-500/30 rounded-xl p-6 shadow-[0_0_60px_rgba(255,165,0,0.1)]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* 警告图标 */}
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle size={32} className="text-amber-400/60" />
            </div>

            {/* 标题 */}
            <h2 className="text-[16px] font-mono text-amber-400 tracking-wide text-center mb-4">
              跃迁确认
            </h2>

            {/* 本轮成绩摘要 */}
            <div className="space-y-2 mb-5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <div className="text-[11px] font-mono text-amber-400/60 mb-2">本轮成绩</div>
              <StatRow label="累计治愈" value={`${prestigeStats.totalServed} 位访客`} />
              <StatRow label="已解锁故事" value={`${prestigeStats.unlockedStories} 个`} />
              <StatRow label="最高连击" value={`${prestigeStats.bestStreak} 次`} />
              <StatRow label="已进行跃迁" value={`${prestigeStats.totalPrestiges} 次`} />
            </div>

            {/* 解锁内容 */}
            <div className="mb-5">
              <div className="text-[10px] font-mono text-amber-400/40 mb-1">跃迁后解锁</div>
              <div className="flex flex-wrap gap-1">
                {prestigeStats.unlockedContent.map((content, idx) => (
                  <span key={idx} className="text-[9px] font-mono px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/5 text-amber-400/60">
                    {content}
                  </span>
                ))}
              </div>
            </div>

            {/* 提示文案 */}
            <p className="text-[11px] text-text-secondary/60 leading-relaxed mb-5 font-mono text-center">
              跃迁后，你的调度经验将永久提升 +5% 容差。但本轮所有进度将重置。
            </p>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={cancelPrestige}
                className="flex-1 py-2 rounded-lg border border-white/10 text-[11px] font-mono text-text-dim hover:border-amber-500/20 hover:text-amber-400/60 transition-all flex items-center justify-center gap-2"
              >
                <X size={13} />
                取消
              </button>
              <motion.button
                onClick={startPrestigeAnimation}
                className="flex-1 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-[11px] font-mono text-amber-400 hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Rocket size={13} />
                确认跃迁
              </motion.button>
            </div>
          </motion.div>
        )}

        {prestigeStage === 'animating' && (
          <motion.div
            className="relative w-full max-w-lg mx-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* 驿站休眠动画 */}
            <motion.div
              className="relative w-32 h-32 mx-auto mb-6"
              animate={{
                scale: [1, 1.1, 0.8],
                opacity: [1, 0.8, 0.3],
              }}
              transition={{ duration: 3, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0 rounded-full bg-cyan-glow/20 animate-ping" />
              <div className="absolute inset-4 rounded-full bg-cyan-glow/30" />
              <div className="absolute inset-8 rounded-full bg-cyan-glow/50 flex items-center justify-center">
                <Rocket size={24} className="text-cyan-glow" />
              </div>
            </motion.div>

            {/* 进度条 */}
            <div className="w-full h-1 rounded-full bg-white/10 mb-4 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-glow/50 to-cyan-glow"
                style={{ width: `${animationProgress}%` }}
                animate={{ width: `${animationProgress}%` }}
              />
            </div>

            {/* 叙事文本 */}
            <p className="text-[12px] font-mono text-cyan-glow/80 leading-relaxed">
              驿站的信号穿过星际网络……
            </p>
            <p className="text-[10px] font-mono text-cyan-glow/40 mt-2">
              你的经验在深空中留下了永久的回响。
            </p>
          </motion.div>
        )}

        {prestigeStage === 'resetting' && (
          <motion.div
            className="relative w-full max-w-lg mx-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* 闪烁效果 */}
            <motion.div
              className="w-32 h-32 mx-auto mb-6 rounded-full bg-cyan-glow/10"
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [0.95, 1.05, 0.95],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            />

            {/* 叙事文本 */}
            <p className="text-[14px] font-mono text-cyan-glow tracking-wide mb-2">
              驿站的记忆被重置了
            </p>
            <p className="text-[11px] font-mono text-cyan-glow/60 leading-relaxed">
              档案被封存，信号被清空。<br />
              但也许......他们还会来。
            </p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px] font-mono">
      <span className="text-text-secondary/60">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  )
}