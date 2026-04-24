import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useGameStore, toPersistedData } from './store/gameStore'
import { saveGame } from './store/gamePersist'

// --- 全局异常兜底 ---
window.addEventListener('error', (event) => {
  console.error('[全局] 未捕获错误:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[全局] 未处理的 Promise 拒绝:', event.reason)
})

// 页面离开前保存一次存档（兜底）
window.addEventListener('beforeunload', () => {
  try {
    saveGame(toPersistedData(useGameStore.getState()))
  } catch {
    // 忽略失败，不影响页面离开
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
