import { motion } from 'framer-motion'
import { type ReactNode } from 'react'

interface HolographicPanelProps {
  children: ReactNode
  className?: string
  delay?: number
  intensity?: 'low' | 'medium' | 'high'
}

export function HolographicPanel({
  children,
  className = '',
  delay = 0,
  intensity = 'medium',
}: HolographicPanelProps) {
  const floatRange = intensity === 'high' ? 6 : intensity === 'medium' ? 4 : 2
  const duration = intensity === 'high' ? 5 : intensity === 'medium' ? 6 : 8

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      className={className}
    >
      <motion.div
        animate={{
          y: [0, -floatRange, 0, floatRange, 0],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: delay + 0.5,
        }}
        className="relative w-full h-full"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-glow/5 to-transparent opacity-30 pointer-events-none" />
        <div className="scanline-overlay relative w-full h-full">
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}
