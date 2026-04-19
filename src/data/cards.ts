export interface LogicCard {
  id: string
  name: string
  desc: string
  color: string
  effect: string
  apply: (params: { x: number; y: number; z: number }) => { x: number; y: number; z: number }
}

// 初始参数: {x:0.5, y:0.5, z:0.5}
export const LOGIC_CARDS: LogicCard[] = [
  {
    id: 'loop',
    name: '[循环]',
    desc: 'Loop',
    color: '#00F2FF',
    effect: 'X × 1.5',
    apply: (p) => ({ ...p, x: Math.min(p.x * 1.5, 1.0) }),
  },
  {
    id: 'split',
    name: '[分流]',
    desc: 'Split',
    color: '#5EC0D8',
    effect: 'X ÷ 2, Y + 0.3',
    apply: (p) => ({
      x: p.x / 2,
      y: Math.min(p.y + 0.3, 1.0),
      z: p.z,
    }),
  },
  {
    id: 'boost',
    name: '[增强]',
    desc: 'Boost',
    color: '#FF8C00',
    effect: 'Z × 2.0',
    apply: (p) => ({ ...p, z: Math.min(p.z * 2.0, 1.0) }),
  },
  {
    id: 'filter',
    name: '[滤波]',
    desc: 'Filter',
    color: '#AA64FF',
    effect: '三轴均衡',
    apply: (p) => {
      const avg = (p.x + p.y + p.z) / 3
      return { x: avg, y: avg, z: avg }
    },
  },
]

export function calculateResult(
  slots: (string | null)[]
): { x: number; y: number; z: number } {
  let params = { x: 0.5, y: 0.5, z: 0.5 }

  for (const slot of slots) {
    if (!slot) continue
    const card = LOGIC_CARDS.find((c) => c.id === slot)
    if (card) {
      params = card.apply(params)
    }
  }

  // Clamp to [0, 1]
  return {
    x: Math.max(0, Math.min(1, params.x)),
    y: Math.max(0, Math.min(1, params.y)),
    z: Math.max(0, Math.min(1, params.z)),
  }
}

export function checkSuccess(
  result: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number }
): { success: boolean; errors: { x: number; y: number; z: number } } {
  const errors = {
    x: Math.abs(result.x - target.x) / target.x,
    y: Math.abs(result.y - target.y) / target.y,
    z: Math.abs(result.z - target.z) / target.z,
  }

  const success = errors.x <= 0.30 && errors.y <= 0.30 && errors.z <= 0.30
  return { success, errors }
}
