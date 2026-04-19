import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Brain, Thermometer, CheckCircle, XCircle, Lightbulb, Snowflake, Flame, Radio, User, Palette } from 'lucide-react'
import { useGameStore } from '../store/gameStore'

// NPC 可视化组件
function NPCVisual({ type, color, currentE, currentP, isSuccess }: { type: string; color: string; currentE: number; currentP: number; isSuccess?: boolean }) {
  const successColor = '#00F2FF'
  const currentColor = isSuccess ? successColor : color

  const getIcon = () => {
    if (isSuccess) {
      return <CheckCircle size={40} style={{ color: successColor }} />
    }
    switch (type) {
      case '深空探索AI': return <Snowflake size={40} style={{ color }} />
      case '货运飞船驾驶员': return <Flame size={40} style={{ color }} />
      case '通讯中继站AI': return <Radio size={40} style={{ color }} />
      case '冬眠宇航员': return <User size={40} style={{ color }} />
      case '艺术生成AI': return <Palette size={40} style={{ color }} />
      default: return <Brain size={40} style={{ color }} />
    }
  }

  return (
    <motion.div
      className="relative w-28 h-28 mx-auto mb-4"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: isSuccess ? [1, 1.1, 1] : 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* 成功光芒效果 */}
      {isSuccess && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: `${successColor}20` }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          {/* 庆祝粒子 */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`celeb-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: ['#FFD700', '#00F2FF', '#FF6B9D', '#AA64FF'][i % 4],
                boxShadow: `0 0 6px ${['#FFD700', '#00F2FF', '#FF6B9D', '#AA64FF'][i % 4]}`,
              }}
              animate={{
                // @ts-ignore
                angle: i * 45,
                distance: [20, 40, 20],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </>
      )}

      {/* 外圈 - 根据情绪波动旋转 */}
      <motion.div
        className="absolute inset-0 rounded-full border-2"
        style={{
          borderColor: isSuccess ? `${successColor}60` : `${color}40`,
          borderStyle: isSuccess ? 'solid' : 'dashed'
        }}
        animate={{ rotate: 360, scale: isSuccess ? [1, 1.05, 1] : 1 }}
        transition={{ duration: isSuccess ? 3 : 8, repeat: Infinity, ease: 'linear' }}
      />

      {/* 中圈 - 根据逻辑缺损脉动 */}
      <motion.div
        className="absolute inset-2 rounded-full border"
        style={{
          borderColor: isSuccess ? `${successColor}60` : `${color}60`,
          boxShadow: `0 0 ${isSuccess ? 30 : 20 + currentP * 30}px ${isSuccess ? successColor : color}30`,
        }}
        animate={{ scale: [1, isSuccess ? 1.1 : 1 + currentP * 0.1, 1] }}
        transition={{ duration: isSuccess ? 1 : 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 内圈 - 主图标 */}
      <motion.div
        className="absolute inset-4 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: `${currentColor}15`,
          boxShadow: `0 0 30px ${currentColor}40, inset 0 0 20px ${currentColor}20`,
        }}
        animate={isSuccess ? { y: [0, -5, 0] } : {}}
        transition={{ duration: isSuccess ? 1 : 0, repeat: isSuccess ? Infinity : 0 }}
      >
        {getIcon()}
      </motion.div>

      {/* 扫描线 - 非成功状态 */}
      {!isSuccess && (
        <motion.div
          className="absolute left-0 right-0 h-0.5"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`,
          }}
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* 状态指示器 */}
      <motion.div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-mono"
        style={{
          backgroundColor: `${currentColor}30`,
          color: currentColor,
          border: `1px solid ${currentColor}50`,
        }}
        animate={isSuccess ? { scale: [1, 1.1, 1] } : { opacity: [0.7, 1, 0.7] }}
        transition={{ duration: isSuccess ? 0.8 : 2, repeat: isSuccess ? Infinity : Infinity }}
      >
        {isSuccess ? '已治愈!' : `E: ${(currentE * 100).toFixed(0)}%`}
      </motion.div>

      {/* 粒子效果 - 非成功状态 */}
      {!isSuccess && type === '深空探索AI' && (
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{ backgroundColor: color }}
              animate={{
                // @ts-ignore
                angle: [i * 60, i * 60 + 360],
                distance: [15, 35, 15],
              }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}

      {!isSuccess && type === '货运飞船驾驶员' && (
        <div className="absolute inset-0">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: '#FF8C00' }}
              animate={{
                y: [20, -20],
                opacity: [0.8, 0],
                x: [(i - 1.5) * 8],
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      )}

      {!isSuccess && type === '通讯中继站AI' && (
        <div className="absolute inset-0">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-px rounded-full"
              style={{
                backgroundColor: color,
                left: '50%',
                top: '50%',
                width: 20 + i * 15,
                transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
              }}
              animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      )}

      {!isSuccess && type === '艺术生成AI' && (
        <div className="absolute inset-0">
          {['#FF6B9D', '#00F2FF', '#AA64FF', '#5EC0D8', '#FF8C00'].map((c, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: c,
                boxShadow: `0 0 8px ${c}`,
              }}
              animate={{
                // @ts-ignore
                angle: i * 72,
                distance: 25,
              }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}

      {!isSuccess && type === '冬眠宇航员' && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: `${color}10` }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}

export function NPCScanner() {
  const npc = useGameStore((s) => s.npc)
  const phase = useGameStore((s) => s.phase)
  const resultParams = useGameStore((s) => s.resultParams)

  const hasNPC = npc !== null
  const isSuccess = phase === 'success'
  const isFailed = phase === 'failed'
  const showResult = isSuccess || isFailed

  // Hints based on NPC
  const getHint = () => {
    if (!npc) return ''
    const hints: Record<string, string> = {
      frost: '提示: 需要强化 X 和 Z。尝试连续使用 [循环] 后接 [增强]。',
      ember: '提示: Y 轴需要升高，X 轴需要降低。[分流] 提升 Y，[增强] 提升 Z。',
      echo: '提示: 三轴需要完全相等。先用 [循环] 提升数值，再用 [滤波] 均衡。',
      anchor: '提示: 需要大幅降低 X，大幅提升 Y。多次使用 [分流]。',
      prism: '提示: 三轴趋向 0.75。先用 [循环]+[增强] 提升，再用 [滤波] 拉平。',
    }
    return hints[npc.id] || ''
  }

  return (
    <div className="bg-panel-bg backdrop-blur-md border border-panel-border rounded-lg p-5 glow-border h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[13px] tracking-[0.15em] text-cyan-glow/70 uppercase font-mono glow-text">
          访客扫描仪
        </h3>
        <div className="flex items-center gap-2">
          {hasNPC && !showResult && (
            <>
              <div className="w-2 h-2 rounded-full bg-alert-orange animate-pulse" />
              <span className="text-[11px] text-alert-orange font-mono uppercase tracking-wider">检测中</span>
            </>
          )}
          {showResult && (
            <>
              {isSuccess ? (
                <CheckCircle size={14} className="text-cyan-glow/70" />
              ) : (
                <XCircle size={14} className="text-alert-orange/70" />
              )}
              <span className={`text-[11px] font-mono uppercase tracking-wider ${isSuccess ? 'text-cyan-glow/70' : 'text-alert-orange/70'}`}>
                {isSuccess ? '治愈' : '未治愈'}
              </span>
            </>
          )}
          {!hasNPC && (
            <>
              <div className="w-2 h-2 rounded-full bg-text-dim/30" />
              <span className="text-[11px] text-text-dim/50 font-mono uppercase tracking-wider">无信号</span>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {hasNPC ? (
          <motion.div
            key={npc.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col"
          >
            {/* NPC Avatar */}
            <NPCVisual
              type={npc.type}
              color={npc.avatarColor}
              currentE={npc.currentE}
              currentP={npc.currentP}
              isSuccess={isSuccess}
            />

            {/* NPC Info */}
            <div className="text-center mb-3">
              <div className="text-[14px] font-mono font-medium mb-1 truncate" style={{ color: npc.avatarColor }}>
                {npc.name}
              </div>
              <div className="text-[11px] text-text-secondary font-mono tracking-wider">类型: {npc.type}</div>
              <div className="text-[11px] text-text-secondary font-mono tracking-wider">
                {isSuccess ? '已治愈' : isFailed ? '症状加重' : '逻辑过载/情绪冻结'}
              </div>
            </div>

            {/* Hint */}
            {!showResult && (
              <motion.div
                className="mb-3 p-2.5 rounded-lg border border-cyan-glow/15 bg-cyan-glow/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div className="flex items-start gap-2">
                  <Lightbulb size={12} className="text-cyan-glow/50 flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] text-cyan-glow/60 font-mono leading-relaxed break-words">{getHint()}</span>
                </div>
              </motion.div>
            )}

            {/* Metrics */}
            <div className="space-y-4">
              <MetricRow
                icon={<Activity size={14} />}
                label="情绪波动值 E"
                value={npc.currentE}
                target={0.5}
                color="#00F2FF"
                isSuccess={isSuccess}
              />
              <MetricRow
                icon={<Thermometer size={14} />}
                label="逻辑缺损 P"
                value={npc.currentP}
                target={0.2}
                color="#FF8C00"
                isSuccess={isSuccess}
              />
            </div>

            {/* Target parameters */}
            <div className="mt-auto pt-4">
              <div className="text-[11px] text-text-secondary uppercase tracking-wider font-mono mb-2">
                目标参数 {showResult && <span className="text-text-dim/50 normal-case tracking-normal">(实际值)</span>}
              </div>
              <div className="flex gap-2 min-w-0">
                <ParamLabel label="X" target={npc.targetX} actual={resultParams?.x} color="#00F2FF" />
                <ParamLabel label="Y" target={npc.targetY} actual={resultParams?.y} color="#5EC0D8" />
                <ParamLabel label="Z" target={npc.targetZ} actual={resultParams?.z} color="#AA64FF" />
              </div>
              <div className="text-[9px] text-text-dim/50 font-mono mt-2 truncate">
                容差范围: ±30%
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-text-dim/30"
          >
            <Brain size={48} className="mb-4 opacity-20" />
            <div className="text-[13px] font-mono">暂无访客信号</div>
            <div className="text-[11px] font-mono mt-2">等待深空扫描...</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ParamLabel({ label, target, actual, color }: { label: string; target: number; actual?: number; color: string }) {
  const showActual = actual !== undefined
  const error = showActual ? Math.abs(actual - target) / target : 0
  const isMatch = error <= 0.30

  return (
    <div className="flex-1 min-w-0 px-1 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-center overflow-hidden">
      <div style={{ color }} className="text-[10px] font-medium mb-0.5 truncate">{label}</div>
      <div className="text-[11px] text-text-primary font-mono tabular-nums truncate">{target.toFixed(2)}</div>
      {showActual && (
        <div className={`text-[10px] mt-0.5 font-mono tabular-nums truncate ${isMatch ? 'text-cyan-glow/70' : 'text-alert-orange/70'}`}>
          →{actual.toFixed(2)}
        </div>
      )}
    </div>
  )
}

interface MetricRowProps {
  icon: React.ReactNode
  label: string
  value: number
  target: number
  color: string
  isSuccess?: boolean
}

function MetricRow({ icon, label, value, target, color, isSuccess }: MetricRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span style={{ color }}>{icon}</span>
          <span className="text-[11px] text-text-secondary font-mono">{label}</span>
        </div>
        <span className="text-[11px] font-mono tabular-nums" style={{ color }}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${value * 100}%`,
            backgroundColor: isSuccess ? '#00F2FF' : color,
            boxShadow: `0 0 4px ${isSuccess ? '#00F2FF' : color}60`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-white/50"
          style={{ left: `${target * 100}%` }}
        />
      </div>
    </div>
  )
}
