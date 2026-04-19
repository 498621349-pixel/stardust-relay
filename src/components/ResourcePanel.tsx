import { motion } from 'framer-motion'
import { Zap, Wind, Hexagon, Bot, Command } from 'lucide-react'
import { useGameStore } from '../store/gameStore'

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
              {(['eco', 'normal', 'overload'] as const).map((m) => (
                <motion.button
                  key={m}
                  onClick={() => setMode(m)}
                  disabled={isEmergency && m !== 'eco'}
                  className={`px-2 py-0.5 text-[9px] rounded border transition-all duration-200 font-mono whitespace-nowrap ${
                    mode === m
                      ? 'border-cyan-glow/50 bg-cyan-glow/15 text-cyan-glow'
                      : isEmergency && m !== 'eco'
                        ? 'border-white/5 text-text-dim/30 cursor-not-allowed'
                        : 'border-white/10 text-text-secondary hover:border-cyan-glow/30 hover:text-cyan-glow/70'
                  }`}
                  whileHover={!isEmergency || m === 'eco' ? { scale: 1.05 } : {}}
                  whileTap={!isEmergency || m === 'eco' ? { scale: 0.95 } : {}}
                >
                  {m === 'eco' ? '节能' : m === 'normal' ? '标准' : '超载'}
                </motion.button>
              ))}
            </div>
          </div>
          <div className="text-[9px] text-text-dim font-mono mt-1 text-right">
            {mode === 'eco' ? '-0.08/s' : mode === 'normal' ? '-0.18/s' : '-0.35/s'}
          </div>
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
      </div>
    </div>
  )
}
