import { motion } from 'framer-motion'
import { Zap, Wind, Hexagon, Bot, Command, RotateCcw, Rocket, Unlock } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { getContentUnlocks } from '../store/gameStore'

interface ResourceBarProps {
  icon: React.ReactNode
  label: string
  value: number
  max: number
  color: string
  unit: string
}

function ResourceBar({ icon, label, value, max, color, unit }: ResourceBarProps) {
  const percentage = (value / max) * 100
  const isLow = percentage < 25

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span style={{ color }}>{icon}</span>
          <span className="text-[11px] text-text-secondary font-mono">{label}</span>
        </div>
        <span className={`text-[11px] font-mono tabular-nums ${isLow ? 'text-alert-orange animate-pulse' : 'text-text-primary'}`}>
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            backgroundColor: isLow ? '#FF8C00' : color,
            boxShadow: `0 0 6px ${isLow ? '#FF8C00' : color}40`,
          }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 flex">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-deep-space/50" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ResourcePanel() {
  const resources = useGameStore((s) => s.resources)
  const mode = useGameStore((s) => s.mode)
  const setMode = useGameStore((s) => s.setMode)
  const autoCollectors = useGameStore((s) => s.autoCollectors)
  const macroUnlocked = useGameStore((s) => s.macroUnlocked)
  const buyAutoCollector = useGameStore((s) => s.buyAutoCollector)
  const unlockMacro = useGameStore((s) => s.unlockMacro)
  const phase = useGameStore((s) => s.phase)
  const score = useGameStore((s) => s.score)
  const servedCount = useGameStore((s) => s.servedCount)
  const day = useGameStore((s) => s.day)
  const prestigeLevel = useGameStore((s) => s.prestigeLevel)
  const totalPrestiges = useGameStore((s) => s.totalPrestiges)
  const unlocks = getContentUnlocks(day, servedCount, totalPrestiges)
  const isEmergency = phase === 'emergency'

  return (
    <div className="bg-panel-bg backdrop-blur-md border border-panel-border rounded-lg p-4 glow-border h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-[12px] tracking-[0.15em] text-cyan-glow/70 uppercase font-mono glow-text">
          资源监控
        </h3>
        <div className="w-2 h-2 rounded-full bg-cyan-glow/50 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <ResourceBar
          icon={<Zap size={14} />}
          label="电力"
          value={resources.energy}
          max={100}
          color="#00F2FF"
          unit="%"
        />
        <ResourceBar
          icon={<Wind size={14} />}
          label="氧气"
          value={resources.oxygen}
          max={100}
          color="#5EC0D8"
          unit="%"
        />
        <ResourceBar
          icon={<Hexagon size={14} />}
          label="纳米基质"
          value={resources.material}
          max={100}
          color="#AA64FF"
          unit="u"
        />

        {/* Score */}
        <div className="mt-2 p-2 rounded border border-cyan-glow/10 bg-cyan-glow/5">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-text-secondary">第 {day} 天</span>
            <span className="text-cyan-glow/80">{score} 分</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono mt-1">
            <span className="text-text-secondary">治愈访客</span>
            <span className="text-cyan-glow/80">{servedCount}</span>
          </div>
        </div>

        {/* Power mode toggle */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[10px] text-text-secondary uppercase tracking-wider font-mono">运行模式</span>
            <div className="flex gap-1">
              {(['eco', 'normal', 'overload', 'pressure'] as const).map((m) => {
                const isLocked = m === 'pressure' && !unlocks.pressureMode
                const isActive = mode === m
                return (
                  <motion.button
                    key={m}
                    onClick={() => !isLocked && setMode(m)}
                    disabled={isEmergency && m !== 'eco' || isLocked}
                    className={`px-2 py-0.5 text-[9px] rounded border transition-all duration-200 font-mono whitespace-nowrap relative ${
                      isActive
                        ? 'border-red-500/50 bg-red-500/15 text-red-400'
                        : isLocked
                          ? 'border-white/5 text-text-dim/20 cursor-not-allowed'
                          : isEmergency && m !== 'eco'
                            ? 'border-white/5 text-text-dim/30 cursor-not-allowed'
                            : 'border-white/10 text-text-secondary hover:border-cyan-glow/30 hover:text-cyan-glow/70'
                    }`}
                    whileHover={!isLocked && (!isEmergency || m === 'eco') ? { scale: 1.05 } : {}}
                    whileTap={!isLocked && (!isEmergency || m === 'eco') ? { scale: 0.95 } : {}}
                    title={isLocked ? '跃迁后解锁' : ''}
                  >
                    {m === 'eco' ? '节能' : m === 'normal' ? '标准' : m === 'overload' ? '超载' : '压力'}
                    {isLocked && <Unlock size={8} className="inline ml-0.5 opacity-40" />}
                  </motion.button>
                )
              })}
            </div>
          </div>
          <div className="text-[9px] text-text-dim font-mono mt-1 text-right">
            {mode === 'eco' ? '-0.08/s' : mode === 'normal' ? '-0.18/s' : mode === 'overload' ? '-0.35/s' : <span className="text-red-400/80">-0.60/s · 积分×1.5 · 天+2</span>}
          </div>
          {mode === 'pressure' && (
            <div className="text-[9px] text-red-400/50 font-mono mt-0.5 text-right">
              容差 −5% · 加速进程 · 跃迁解锁
            </div>
          )}
        </div>

        {/* Automation shop */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider font-mono mb-2">自动化</div>
          <div className="space-y-1.5">
            <motion.button
              onClick={buyAutoCollector}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded border border-white/10 text-[10px] font-mono hover:border-cyan-glow/30 hover:bg-cyan-glow/5 transition-all"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <span className="flex items-center gap-1.5 text-text-secondary">
                <Bot size={11} className="text-cyan-glow/60 flex-shrink-0" />
                物流小球
                {autoCollectors > 0 && <span className="px-1 py-0.5 rounded bg-cyan-glow/10 text-cyan-glow/70 text-[9px]">×{autoCollectors}</span>}
              </span>
              <span className="text-text-primary whitespace-nowrap">{(50 + autoCollectors * 25).toFixed(0)}u</span>
            </motion.button>
            {!macroUnlocked && (
              <motion.button
                onClick={unlockMacro}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded border border-white/10 text-[10px] font-mono hover:border-cyan-glow/30 hover:bg-cyan-glow/5 transition-all"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Command size={11} className="text-cyan-glow/60 flex-shrink-0" />
                  宏指令
                </span>
                <span className="text-text-primary whitespace-nowrap">80u</span>
              </motion.button>
            )}
            {macroUnlocked && (
              <div className="px-2 py-1 text-[10px] text-cyan-glow/60 font-mono bg-cyan-glow/5 rounded border border-cyan-glow/10">
                宏指令已激活
              </div>
            )}
          </div>
        </div>

        {/* v0.5 P1: 跃迁系统 */}
        {(prestigeLevel > 0 || totalPrestiges > 0 || (day >= 30 && servedCount >= 15)) && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="text-[10px] text-text-secondary uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
              <Rocket size={11} className="text-cyan-glow/50" />
              星际跃迁
              {prestigeLevel > 0 && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-glow/10 text-cyan-glow/70">
                  +{prestigeLevel * 5}%
                </span>
              )}
            </div>
            {prestigeLevel > 0 && (
              <div className="flex gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i < prestigeLevel ? 'bg-cyan-glow/50' : 'bg-white/10'}`}
                  />
                ))}
              </div>
            )}
            {day >= 30 && servedCount >= 15 ? (
              <div className="text-[10px] font-mono text-cyan-glow/60 bg-cyan-glow/5 border border-cyan-glow/10 rounded px-2 py-1.5 text-center mb-1.5">
                跃迁协议就绪
              </div>
            ) : totalPrestiges > 0 ? (
              <div className="text-[10px] font-mono text-text-dim/50 px-2 py-1">
                已完成 {totalPrestiges} 次跃迁
              </div>
            ) : (
              <div className="text-[10px] font-mono text-text-dim/50 px-2 py-1">
                第 {day} 天 / {servedCount} 次治愈后可跃迁
              </div>
            )}
</div>
        )}

        {/* v0.5 P2: 渐进内容解锁状态 */}
        {(unlocks.backstoryFull || unlocks.crossRefDialogue || unlocks.relationshipNetwork) && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="text-[10px] text-text-secondary uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
              <Unlock size={11} className="text-yellow-400/50" />
              已解锁内容
            </div>
            <div className="space-y-1">
              {unlocks.backstoryFull && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-yellow-400/60">
                  <span className="text-green-400/50">✓</span> 完整背景故事
                </div>
              )}
              {unlocks.crossRefDialogue && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-yellow-400/60">
                  <span className="text-green-400/50">✓</span> 访客对话引用
                </div>
              )}
              {unlocks.relationshipNetwork && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-yellow-400/60">
                  <span className="text-green-400/50">✓</span> 关系网络
                </div>
              )}
              {unlocks.pressureMode && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-400/60">
                  <span className="text-green-400/50">✓</span> 压力模式
                </div>
              )}
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <button
            onClick={() => {
              if (window.confirm('确定要重置游戏吗？所有进度将被清除，且无法恢复。')) {
                useGameStore.getState().resetGame()
              }
            }}
            className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-mono text-text-dim/40 hover:text-text-dim/70 transition-all rounded hover:bg-white/5 w-full justify-center"
          >
            <RotateCcw size={10} />
            重置游戏
          </button>
        </div>
      </div>
    </div>
  )
}
