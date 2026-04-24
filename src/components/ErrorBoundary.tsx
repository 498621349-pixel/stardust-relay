import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * React 错误边界组件
 * 捕获子组件渲染期间的 JavaScript 错误，防止整页崩溃
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="w-full h-full flex items-center justify-center bg-deep-space">
          <div className="text-center p-8 max-w-sm">
            <div className="text-[20px] font-mono text-alert-orange/60 mb-4 tracking-wider">
              系统异常
            </div>
            <p className="text-[12px] text-text-secondary font-mono mb-6 leading-relaxed">
              游戏遇到了一个未知错误。请尝试刷新页面恢复。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded border border-cyan-glow/30 text-cyan-glow/70 text-[11px] font-mono hover:border-cyan-glow/50 hover:text-cyan-glow transition-all"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
