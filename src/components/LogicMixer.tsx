import { motion } from 'framer-motion'
import { RotateCcw, Play, Loader2, ChevronRight, Save, Trash2, Zap, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useGameStore } from '../store/gameStore'
import { LOGIC_CARDS, calculateResult } from '../data/cards'
import { useSound } from '../hooks/useSound'
import { getAffectionTier } from '../store/gamePersist'
import { useEffect, useRef, useState } from 'react'
import type { GamePhase } from '../store/gameStore'
import type { MacroData } from '../store/gamePersist'

export function LogicMixer() {
  const slots = useGameStore((s) => s.slots)
  const phase = useGameStore((s) => s.phase)
  const brewProgress = useGameStore((s) => s.brewProgress)
  const npc = useGameStore((s) => s.npc)
  const placeCard = useGameStore((s) => s.placeCard)
  const removeCard = useGameStore((s) => s.removeCard)
  const resetSlots = useGameStore((s) => s.resetSlots)
  const brewAction = useGameStore((s) => s.brew)
  const dismissResult = useGameStore((s) => s.dismissResult)
  const soundEnabled = useGameStore((s) => s.soundEnabled)
  const macroUnlocked = useGameStore((s) => s.macroUnlocked)
  const macros = useGameStore((s) => s.macros)
  const saveMacro = useGameStore((s) => s.saveMacro)
  const deleteMacro = useGameStore((s) => s.deleteMacro)
  const applyMacro = useGameStore((s) => s.applyMacro)
  const npcStats = useGameStore((s) => s.npcStats)
  const { play, setEnabled } = useSound()

  const [macroExpanded, setMacroExpanded] = useState(true)
  const [saveName, setSaveName] = useState('')

  const currentStats = npc ? (npcStats[npc.id] ?? { successCount: 0, failCount: 0 }) : null
  const currentTier = currentStats ? getAffectionTier(currentStats.successCount) : '陌生'
  const tierColors: Record<string, string> = { '陌生': '#666', '相识': '#5EC0D8', '熟悉': '#AA64FF', '信任': '#FFD700' }
  const tierColor = tierColors[currentTier]

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

  // 同步音效开关状态（避免渲染时调用 setState）
  useEffect(() => {
    setEnabled(soundEnabled)
  }, [soundEnabled, setEnabled])

  const handleBrew = () => {
    play('brewStart')
    brewAction()
  }

  // 检测 phase 跳转，触发成功/失败音效
  const prevPhaseRef = useRef<GamePhase>(phase)
  useEffect(() => {
    if (phase !== prevPhaseRef.current) {
      if (phase === 'success') play('success')
      else if (phase === 'failed') play('fail')
      prevPhaseRef.current = phase
    }
  }, [phase, play])

  const canInteract = phase === 'arrived' || phase === 'mixing'
  const isBrewing = phase === 'brewing'
  const showResult = phase === 'success' || phase === 'failed'
  const hasCards = slots.some((s) => s !== null)

  // Calculate preview
  const preview = calculateResult(slots)
  const target = npc ? { x: npc.targetX, y: npc.targetY, z: npc.targetZ } : null

  const handleSaveMacro = () => {
    if (!hasCards) return
    saveMacro(saveName.trim() || `配方 ${macros.length + 1}`)
    setSaveName('')
  }

  return (
    <div className="bg-panel-bg backdrop-blur-md border border-panel-border rounded-lg p-3 sm:p-5 glow-border h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 sm:mb-5">
        <h3 className="text-[11px] sm:text-[13px] tracking-[0.15em] text-cyan-glow/70 uppercase font-mono glow-text">
          逻辑调制台
        </h3>
        <div className="flex gap-2">
          {canInteract && (
            <motion.button
              onClick={resetSlots}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] rounded border border-white/10 text-text-secondary hover:border-cyan-glow/30 hover:text-cyan-glow/70 transition-all font-mono"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">重置</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Mobile: Inline visitor info panel */}
      {npc && !showResult && (
        <motion.div
          className="mb-2 sm:mb-3 p-2 sm:p-3 rounded-lg border border-cyan-glow/15 bg-cyan-glow/5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[12px] sm:text-[14px] font-mono font-medium" style={{ color: npc.avatarColor }}>
                {npc.name}
              </span>
              {currentTier !== '陌生' && (
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-full border" style={{ color: tierColor, borderColor: `${tierColor}50`, backgroundColor: `${tierColor}12` }}>
                  {currentTier}
                </span>
              )}
            </div>
            <div className="text-[9px] sm:text-[10px] text-text-secondary font-mono">{npc.type}</div>
          </div>
          <div className="flex items-start gap-1.5">
            <Lightbulb size={12} className="text-cyan-glow/50 flex-shrink-0 mt-0.5" />
            <span className="text-[9px] sm:text-[10px] text-cyan-glow/60 font-mono leading-relaxed">{getHint()}</span>
          </div>
          <div className="flex gap-3 mt-2">
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-text-dim font-mono mb-0.5">情绪 E</div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-cyan-glow/50" style={{ width: `${npc.currentE * 100}%` }} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-text-dim font-mono mb-0.5">逻辑缺损 P</div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-orange-400/50" style={{ width: `${npc.currentP * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <ParamMini label="X" value={npc.targetX} color="#00F2FF" />
            <ParamMini label="Y" value={npc.targetY} color="#5EC0D8" />
            <ParamMini label="Z" value={npc.targetZ} color="#AA64FF" />
          </div>
        </motion.div>
      )}

      {/* Slots and Preview Row */}
      <div className="flex gap-2 sm:gap-4 flex-shrink-0 mb-2 sm:mb-3 h-20 sm:h-28">
        {/* 3 Logic Slots */}
        <div className="flex-1 flex gap-1 sm:gap-2 items-center justify-center bg-white/[0.02] rounded-lg border border-white/5 p-1 sm:p-2">
          {slots.map((slot, i) => {
            const card = slot ? LOGIC_CARDS.find((c) => c.id === slot) : null
            return (
              <motion.div
                key={i}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
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
                onClick={() => canInteract && (play('cardPlace'), removeCard(i))}
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
                    <span className="text-[9px] sm:text-[11px] font-mono relative z-10 truncate max-w-[60px] sm:max-w-[70px]" style={{ color: card.color }}>
                      {card.name}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-text-secondary font-mono relative z-10 hidden sm:block">{card.effect}</span>
                  </>
                ) : (
                  <span className={`text-[16px] sm:text-[20px] font-mono ${canInteract ? 'text-white/15' : 'text-white/5'}`}>
                    {i + 1}
                  </span>
                )}
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-deep-space border border-white/20 flex items-center justify-center">
                  <span className="text-[8px] sm:text-[9px] text-text-dim font-mono">{i + 1}</span>
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
        <div className="text-[10px] sm:text-[11px] text-text-secondary uppercase tracking-wider font-mono mb-2 flex-shrink-0">可用逻辑卡片</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 flex-1 content-start">
          {LOGIC_CARDS.map((card) => (
            <motion.button
              key={card.id}
              onClick={() => canInteract && (play('cardPlace'), placeCard(card.id))}
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

      {/* 宏指令面板 */}
      {macroUnlocked && (
        <div className="mt-3 pt-3 border-t border-white/5 flex-shrink-0">
          <button
            className="flex items-center justify-between w-full text-[10px] text-text-secondary uppercase tracking-wider font-mono mb-2 hover:text-cyan-glow/60 transition-colors"
            onClick={() => setMacroExpanded((v) => !v)}
          >
            <span className="flex items-center gap-1.5">
              <Zap size={11} className="text-cyan-glow/60" />
              宏指令 {macros.length > 0 && <span className="text-text-dim/60">({macros.length})</span>}
            </span>
            {macroExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {macroExpanded && (
            <div className="space-y-2">
              {/* 保存配方 */}
              <div className="flex gap-1.5">
                <input
                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-text-primary placeholder:text-text-dim/40 focus:outline-none focus:border-cyan-glow/40 transition-colors"
                  placeholder={`配方 ${macros.length + 1}`}
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveMacro()}
                  disabled={!hasCards}
                />
                <motion.button
                  onClick={handleSaveMacro}
                  disabled={!hasCards}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded border text-[11px] font-mono transition-all ${
                    hasCards
                      ? 'border-cyan-glow/30 text-cyan-glow/80 hover:border-cyan-glow/50 hover:bg-cyan-glow/10'
                      : 'border-white/5 text-text-dim/30 cursor-not-allowed'
                  }`}
                  whileHover={hasCards ? { scale: 1.02 } : {}}
                  whileTap={hasCards ? { scale: 0.98 } : {}}
                >
                  <Save size={10} />
                  保存
                </motion.button>
              </div>

              {/* 已保存的宏指令列表 */}
              {macros.length === 0 ? (
                <div className="text-[10px] text-text-dim/40 font-mono text-center py-1">
                  暂无保存的配方
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {macros.map((macro) => (
                    <MacroButton key={macro.id} macro={macro} canInteract={canInteract} onApply={applyMacro} onDelete={deleteMacro} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Brew button */}
      {canInteract && (
        <motion.button
          className="mt-3 w-full py-2.5 rounded-lg border border-cyan-glow/40 bg-cyan-glow/10 text-cyan-glow text-[12px] font-mono tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-cyan-glow/20 hover:border-cyan-glow/50 transition-all flex-shrink-0"
          onClick={handleBrew}
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

// 单个宏指令按钮
function MacroButton({
  macro,
  canInteract,
  onApply,
  onDelete,
}: {
  macro: MacroData
  canInteract: boolean
  onApply: (id: string, autoBrew?: boolean) => void
  onDelete: (id: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const cardColors: Record<string, string> = {
    loop: '#00F2FF',
    split: '#5EC0D8',
    boost: '#FF8C00',
    filter: '#AA64FF',
    phase: '#0AC8B9',
    quake: '#D4A017',
  }

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        onClick={() => {
          if (!canInteract) return
          onApply(macro.id)
        }}
        disabled={!canInteract}
        className={`relative group flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono transition-all ${
          canInteract
            ? 'border-cyan-glow/30 bg-cyan-glow/8 text-cyan-glow/80 hover:border-cyan-glow/50 hover:bg-cyan-glow/15'
            : 'border-white/5 bg-white/3 text-text-dim/40 cursor-not-allowed'
        }`}
        whileHover={canInteract ? { scale: 1.04 } : {}}
        whileTap={canInteract ? { scale: 0.96 } : {}}
      >
        {/* 小圆点表示卡片 */}
        <div className="flex gap-0.5">
          {macro.slots.map((s, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: s ? cardColors[s] ?? '#fff' : 'rgba(255,255,255,0.15)' }}
            />
          ))}
        </div>
        <span className="truncate max-w-[52px]">{macro.name}</span>

        {/* 删除按钮（hover 显示） */}
        <button
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-deep-space border border-red-400/50 text-red-400/70 hidden group-hover:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(macro.id)
          }}
        >
          <Trash2 size={8} />
        </button>
      </motion.button>
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

function ParamMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 min-w-0 px-1 py-1 rounded border border-white/5 bg-white/[0.02] text-center overflow-hidden">
      <div style={{ color }} className="text-[9px] sm:text-[10px] font-medium mb-0.5 truncate">{label}</div>
      <div className="text-[9px] sm:text-[10px] text-text-primary font-mono tabular-nums truncate">{value.toFixed(2)}</div>
    </div>
  )
}