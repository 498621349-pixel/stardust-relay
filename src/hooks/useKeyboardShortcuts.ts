import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

/**
 * 游戏键盘快捷键
 * Space   - 扫描信号（idle/emergency 状态）
 * Enter   - 开始调制（arrived/mixing 状态）
 * R       - 重置卡片槽（arrived/mixing 状态）
 * Escape  - 切换休息模式
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // 忽略输入框内的按键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return

      const state = useGameStore.getState()

      switch (e.code) {
        case 'Space': {
          e.preventDefault()
          if (state.phase === 'idle' || state.phase === 'emergency') {
            state.startArrival()
          }
          break
        }
        case 'Enter': {
          e.preventDefault()
          if (state.phase === 'arrived' || state.phase === 'mixing') {
            state.brew()
          }
          break
        }
        case 'KeyR': {
          if (state.phase === 'arrived' || state.phase === 'mixing') {
            state.resetSlots()
          }
          break
        }
        case 'Escape': {
          state.toggleRest()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
