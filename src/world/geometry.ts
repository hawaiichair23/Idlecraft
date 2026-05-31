// Shared geometry helpers for world generation and the scene layer. Pure
// functions, no engine or state dependencies, so both gen.ts (pure worldgen)
// and the scenes can import from here without coupling.

// Shortest distance from point (px, py) to the line segment (x1,y1)→(x2,y2).
export function pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq < 0.0001) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1))
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq))
  const projX = x1 + t * dx
  const projY = y1 + t * dy
  return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY))
}

// Shortest distance from point (px, py) to a polyline (sequence of waypoints) —
// the minimum over each consecutive segment. Returns Infinity for <2 points.
export function pointToPolylineDist(px: number, py: number, pts: { x: number; y: number }[]): number {
  let min = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const d = pointToSegmentDist(px, py, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y)
    if (d < min) min = d
  }
  return min
}
