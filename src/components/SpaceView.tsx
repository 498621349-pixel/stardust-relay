import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { ScanLine, Radio, Snowflake, Flame, Radio as RadioIcon, User, Palette } from 'lucide-react'

// 流星
function ShootingStar({ delay }: { delay: number }) {
  return (
    <motion.div
      className="absolute w-0.5 h-24 origin-top rounded-full"
      style={{
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(0,242,255,0.2), transparent)',
        boxShadow: '0 0 8px rgba(0,242,255,0.6)',
        left: `${Math.random() * 70 + 10}%`,
        top: `${Math.random() * 30}%`,
      }}
      initial={{ opacity: 0, rotate: -30, scaleY: 0 }}
      animate={{
        opacity: [0, 1, 0],
        rotate: -30,
        scaleY: [0, 1, 0.3],
        x: [0, 200],
        y: [0, 120],
      }}
      transition={{
        duration: 0.8,
        delay,
        ease: 'easeOut',
        repeat: Infinity,
        repeatDelay: Math.random() * 12 + 8,
      }}
    />
  )
}

// 多层星云
function NebulaLayer({ color1, color2, x, y, w, h, duration }: { color1: string; color2: string; x: number; y: number; w: number; h: number; duration: number }) {
  return (
    <motion.div
      className="absolute blur-2xl"
      style={{
        width: w,
        height: h,
        left: `${x}%`,
        top: `${y}%`,
        background: `radial-gradient(ellipse at center, ${color1} 0%, ${color2} 60%, transparent 100%)`,
      }}
      animate={{
        x: [0, 40, 0, -30, 0],
        y: [0, -25, 15, 0],
        scale: [1, 1.15, 0.9, 1],
        opacity: [0.12, 0.22, 0.15, 0.12],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

// 行星光晕
function DistantPlanet({ x, y, size, color, ring }: { x: number; y: number; size: number; color: string; ring?: boolean }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    >
      {ring && (
        <motion.div
          className="absolute rounded-full border"
          style={{
            width: size * 2.5,
            height: size * 0.7,
            borderColor: `${color}40`,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) rotateX(70deg)',
            boxShadow: `0 0 20px ${color}20`,
          }}
          animate={{ rotateX: [70, 75, 70] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 35%, ${color}60, ${color}20 50%, rgba(0,0,0,0.8))`,
          boxShadow: `0 0 ${size * 0.8}px ${color}30, inset 0 0 ${size * 0.4}px ${color}20`,
        }}
      />
    </motion.div>
  )
}

// 极光边缘光效
function AuroraBorder() {
  const colors = ['#00F2FF', '#AA64FF', '#5EC0D8', '#00F2FF']
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute h-1 rounded-full blur-sm"
          style={{
            left: 0,
            right: 0,
            bottom: `${8 + i * 6}%`,
            background: `linear-gradient(to right, transparent, ${colors[i]}40, ${colors[(i + 1) % 3]}40, transparent)`,
          }}
          animate={{
            opacity: [0.1, 0.5, 0.1],
            x: ['-5%', '5%', '-5%'],
          }}
          transition={{
            duration: 6 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 1.5,
          }}
        />
      ))}
    </>
  )
}

function Star({ size, x, y, duration, color }: { size: number; x: number; y: number; duration: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        backgroundColor: color,
        boxShadow: `0 0 ${size * 2}px ${color}60, 0 0 ${size * 4}px ${color}20`,
      }}
      animate={{
        opacity: [0.15, 0.9, 0.15],
        scale: [1, 1.3, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

// NPC 在星空视图中的可视化
function SpaceNPCVisual({ type, color, name, isSuccess, isFailed }: { type: string; color: string; name: string; isSuccess?: boolean; isFailed?: boolean }) {
  const getIcon = () => {
    const muted = isFailed ? '#666666' : color
    switch (type) {
      case '深空探索AI': return <Snowflake size={48} style={{ color: isSuccess ? '#00F2FF' : muted }} />
      case '货运飞船驾驶员': return <Flame size={48} style={{ color: isSuccess ? '#FFD700' : muted }} />
      case '通讯中继站AI': return <RadioIcon size={48} style={{ color: isSuccess ? '#AA64FF' : muted }} />
      case '冬眠宇航员': return <User size={48} style={{ color: isSuccess ? '#5EC0D8' : muted }} />
      case '艺术生成AI': return <Palette size={48} style={{ color: isSuccess ? '#FF6B9D' : muted }} />
      default: return <div className="w-12 h-12 rounded-full" style={{ backgroundColor: isSuccess ? '#00F2FF' : muted }} />
    }
  }

  const currentColor = isSuccess ? '#00F2FF' : color
  const isDim = isFailed

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, type: 'spring', stiffness: 150 }}
    >
      {/* 失败暗淡光晕 */}
      {isFailed && (
        <motion.div
          className="absolute w-56 h-56 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(180,30,30,0.3) 0%, transparent 70%)`,
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      )}

      {/* 成功庆祝光芒 */}
      {isSuccess && (
        <>
          <motion.div
            className="absolute w-56 h-56 rounded-full"
            style={{
              background: `radial-gradient(circle, ${currentColor}30 0%, transparent 70%)`,
            }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* 庆祝粒子 */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={`celebration-${i}`}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['#FFD700', '#00F2FF', '#FF6B9D', '#AA64FF', '#5EC0D8'][i % 5],
                boxShadow: `0 0 10px ${['#FFD700', '#00F2FF', '#FF6B9D', '#AA64FF', '#5EC0D8'][i % 5]}`,
              }}
              animate={{
                // @ts-ignore
                angle: i * 30,
                distance: [40, 80, 40],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </>
      )}

      {/* 外圈光环 */}
      <motion.div
        className="absolute w-40 h-40 rounded-full"
        style={{
          border: `2px solid ${currentColor}${isDim ? '20' : '30'}`,
          boxShadow: `0 0 60px ${currentColor}${isDim ? '10' : '20'}, inset 0 0 40px ${currentColor}${isDim ? '05' : '10'}`,
        }}
        animate={isSuccess ? {
          rotate: 360,
          scale: [1, 1.1, 1],
        } : isFailed ? {
          rotate: 360,
          scale: [1, 0.95, 1],
          opacity: [0.5, 0.7, 0.5],
        } : { rotate: 360 }}
        transition={{ duration: isSuccess ? 8 : isFailed ? 20 : 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* 中圈 */}
      <motion.div
        className="absolute w-32 h-32 rounded-full"
        style={{
          border: `1px solid ${currentColor}${isDim ? '25' : '40'}`,
          boxShadow: `0 0 40px ${currentColor}${isDim ? '10' : '30'}`,
        }}
        animate={isSuccess ? { scale: [1, 1.15, 1] } : isFailed ? { scale: [0.95, 1, 0.95] } : { scale: [1, 1.05, 1] }}
        transition={{ duration: isSuccess ? 1 : isFailed ? 4 : 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 主图标 */}
      <motion.div
        className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: `${currentColor}${isDim ? '08' : '15'}`,
          boxShadow: `0 0 50px ${currentColor}${isDim ? '15' : '40'}, inset 0 0 30px ${currentColor}${isDim ? '08' : '20'}`,
        }}
        animate={isSuccess ? {
          y: [0, -20, 0, -10, 0],
          scale: [1, 1.1, 1, 1.05, 1],
        } : isFailed ? {
          y: [0, 5, 0],
          scale: [1, 0.9, 1],
          opacity: [0.6, 0.8, 0.6],
        } : { y: [0, -10, 0] }}
        transition={{ duration: isSuccess ? 1.5 : isFailed ? 3 : 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {getIcon()}
      </motion.div>

      {/* 类型特效 */}
      {!isSuccess && !isFailed && type === '深空探索AI' && (
        <div className="absolute w-48 h-48">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}`,
                left: '50%',
                top: '50%',
              }}
              animate={{
                // @ts-ignore
                angle: i * 45,
                distance: [25, 50, 25],
              }}
              transition={{ duration: 5, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      )}

      {!isSuccess && !isFailed && type === '货运飞船驾驶员' && (
        <div className="absolute w-40 h-40">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: '#FF8C00',
                boxShadow: `0 0 10px #FF8C00`,
                left: '50%',
                top: '50%',
              }}
              animate={{
                y: [0, -60],
                x: [(i - 2.5) * 10],
                opacity: [0.8, 0],
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}

      {!isSuccess && !isFailed && type === '通讯中继站AI' && (
        <div className="absolute w-48 h-48">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{
                borderColor: color,
                left: '50%',
                top: '50%',
                width: 60 + i * 30,
                height: 60 + i * 30,
                transform: 'translate(-50%, -50%)',
              }}
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.1, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>
      )}

      {!isSuccess && !isFailed && type === '艺术生成AI' && (
        <div className="absolute w-48 h-48">
          {['#FF6B9D', '#00F2FF', '#AA64FF', '#5EC0D8', '#FF8C00'].map((c, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                backgroundColor: c,
                boxShadow: `0 0 12px ${c}`,
                left: '50%',
                top: '50%',
              }}
              animate={{
                // @ts-ignore
                angle: i * 72,
                distance: [20, 55],
              }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}

      {!isSuccess && !isFailed && type === '冬眠宇航员' && (
        <motion.div
          className="absolute w-44 h-44 rounded-full"
          style={{ backgroundColor: `${color}10` }}
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      )}

      {/* 名字标签 */}
      <motion.div
        className="absolute mt-32 px-4 py-1.5 rounded-full text-[12px] font-mono whitespace-nowrap"
        style={{
          backgroundColor: `${currentColor}${isFailed ? '15' : '20'}`,
          color: isFailed ? '#888888' : currentColor,
          border: `1px solid ${currentColor}${isFailed ? '25' : '40'}`,
          textShadow: `0 0 10px ${currentColor}${isFailed ? '40' : ''}`,
          boxShadow: `0 0 20px ${currentColor}${isFailed ? '15' : '30'}`,
        }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: isFailed ? 0.7 : 1 }}
        transition={{ delay: 0.5 }}
      >
        {isSuccess ? `${name.split('"')[0]}已治愈!` : isFailed ? `${name.split('"')[0]}未能治愈...` : name}
      </motion.div>
    </motion.div>
  )
}

export function SpaceView() {
  const phase = useGameStore((s) => s.phase)
  const scanProgress = useGameStore((s) => s.scanProgress)
  const startArrival = useGameStore((s) => s.startArrival)
  const npc = useGameStore((s) => s.npc)

  const stars = useMemo(() =>
    Array.from({ length: 80 }, () => {
      const rand = Math.random()
      const color = rand < 0.7
        ? '#ffffff'
        : rand < 0.85
          ? '#a0c4ff'
          : rand < 0.95
            ? '#ffd6a5'
            : '#c0f0ff'
      return {
        size: Math.random() * 2.5 + 0.5,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 5 + 2,
        color,
      }
    }), []
  )

  const shootingStars = useMemo(() =>
    Array.from({ length: 4 }, (_, i) => ({ id: i, delay: i * 3 + Math.random() * 5 })),
    []
  )

  const isScanning = phase === 'scanning'
  const canScan = phase === 'idle' || phase === 'emergency'

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg border border-panel-border glow-border bg-[#020509]">
      {/* 深空背景渐变 */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 20% 80%, rgba(0,30,60,0.6) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(20,0,40,0.4) 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(0,10,25,0.3) 0%, transparent 80%)',
        }}
      />

      {/* 多层星云 */}
      <NebulaLayer color1="rgba(0,242,255,0.25)" color2="rgba(0,100,200,0.05)" x={10} y={20} w={400} h={300} duration={25} />
      <NebulaLayer color1="rgba(170,100,255,0.2)" color2="rgba(60,0,120,0.05)" x={55} y={40} w={350} h={250} duration={30} />
      <NebulaLayer color1="rgba(94,192,216,0.15)" color2="rgba(0,100,150,0.04)" x={75} y={10} w={300} h={200} duration={22} />

      {/* 远处行星 */}
      <DistantPlanet x={2} y={55} size={32} color="#5EC0D8" />
      <DistantPlanet x={85} y={15} size={20} color="#AA64FF" />
      <DistantPlanet x={78} y={70} size={14} color="#FF8C42" ring />

      {/* 极光边缘 */}
      <AuroraBorder />

      {/* 星星 */}
      {stars.map((star, i) => (
        <Star key={i} {...star} />
      ))}

      {/* 流星 */}
      {shootingStars.map((s) => (
        <ShootingStar key={s.id} delay={s.delay} />
      ))}

      {/* Occasional passing ship silhouette */}
      <motion.div
        className="absolute"
        initial={{ x: '-20%', y: '40%', opacity: 0 }}
        animate={{
          x: ['-20%', '120%'],
          y: ['40%', '35%'],
          opacity: [0, 0.6, 0.6, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatDelay: 25,
          ease: 'linear',
        }}
      >
        <svg width="80" height="40" viewBox="0 0 80 40" fill="none">
          <path
            d="M0 20 L30 10 L70 8 L80 20 L70 32 L30 30 Z"
            fill="rgba(0, 242, 255, 0.15)"
            stroke="rgba(0, 242, 255, 0.3)"
            strokeWidth="0.5"
          />
          <circle cx="55" cy="20" r="3" fill="rgba(0, 242, 255, 0.3)" />
        </svg>
      </motion.div>

      {/* NPC arrival effect - 显示在所有访客相关阶段 */}
      {npc && (phase === 'arrived' || phase === 'mixing' || phase === 'brewing' || phase === 'success' || phase === 'failed') && (
        <SpaceNPCVisual
          type={npc.type}
          color={npc.avatarColor}
          name={npc.name}
          isSuccess={phase === 'success'}
          isFailed={phase === 'failed'}
        />
      )}

      {/* 失败暗淡滤镜 */}
      {phase === 'failed' && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-20"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Scanning progress overlay */}
      {isScanning && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center bg-deep-space/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ScanLine size={36} className="text-cyan-glow/60 mb-4 animate-pulse" />
          <div className="text-[14px] text-cyan-glow/70 font-mono mb-3 tracking-wider">正在扫描深空信号...</div>
          <div className="w-56 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-cyan-glow/60"
              style={{ boxShadow: '0 0 10px rgba(0, 242, 255, 0.5)' }}
              animate={{ width: `${scanProgress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <div className="text-[12px] text-text-secondary font-mono mt-2">{scanProgress.toFixed(0)}%</div>
        </motion.div>
      )}

      {/* Scan button */}
      {canScan && (
        <motion.button
          className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-glow/40 bg-cyan-glow/10 text-cyan-glow text-[12px] font-mono tracking-wider uppercase hover:bg-cyan-glow/20 hover:border-cyan-glow/50 transition-all"
          onClick={startArrival}
          whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(0, 242, 255, 0.2)' }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Radio size={14} />
          扫描信号
        </motion.button>
      )}

      {/* Window frame overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-glow/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-glow/50 to-transparent" />
        <div className="absolute top-0 bottom-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-glow/40 to-transparent" />
        <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-glow/40 to-transparent" />
      </div>

      {/* Corner brackets */}
      <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-glow/60" />
      <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-glow/60" />
      <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-glow/60" />
      <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-glow/60" />

      {/* Label */}
      <div className="absolute top-4 left-5 text-[11px] tracking-[0.2em] text-cyan-glow/60 font-mono uppercase">
        OBS. DECK // SECTOR 7G
      </div>
    </div>
  )
}
