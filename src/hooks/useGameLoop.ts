import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'

export function useGameLoop() {
  const tick = useGameStore((s) => s.tick)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      tick()
    }, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [tick])
}
