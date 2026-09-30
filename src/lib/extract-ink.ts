export type InkCrop = {
  x: number
  y: number
  width: number
  height: number
  mask: Uint8Array
  score: number
}

type Comp = {
  id: number
  area: number
  x: number
  y: number
  w: number
  h: number
}

function otsu(gray: Uint8Array) {
  const hist = new Uint32Array(256)
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++
  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let wB = 0
  let max = 0
  let threshold = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > max) {
      max = between
      threshold = t
    }
  }
  return threshold
}

function labelComponents(
  bin: Uint8Array,
  width: number,
  height: number,
  labels: Int32Array,
) {
  const comps: Comp[] = []
  const stack: number[] = []
  let next = 1
  const count = width * height
  for (let start = 0; start < count; start++) {
    if (!bin[start] || labels[start]) continue
    const id = next++
    let area = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    labels[start] = id
    stack.push(start)
    while (stack.length) {
      const p = stack.pop() as number
      area++
      const x = p % width
      const y = (p / width) | 0
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const ni = ny * width + nx
          if (!bin[ni] || labels[ni]) continue
          labels[ni] = id
          stack.push(ni)
        }
      }
    }
    comps.push({
      id,
      area,
      x: minX,
      y: minY,
      w: maxX - minX + 1,
      h: maxY - minY + 1,
    })
  }
  return comps
}

function removeHairlineRules(ink: Uint8Array, width: number, height: number) {
  const minRun = Math.max(70, Math.round(width * 0.2))
  for (let y = 0; y < height; y++) {
    let x = 0
    while (x < width) {
      while (x < width && !ink[y * width + x]) x++
      const start = x
      while (x < width && ink[y * width + x]) x++
      const len = x - start
      if (len < minRun) continue
      let neighbors = 0
      const y0 = Math.max(0, y - 2)
      const y1 = Math.min(height - 1, y + 2)
      for (let yy = y0; yy <= y1; yy++) {
        if (yy === y) continue
        for (let xx = start; xx < x; xx++) {
          if (ink[yy * width + xx]) neighbors++
        }
      }
      if (neighbors / (len * 4) < 0.22) {
        for (let xx = start; xx < x; xx++) ink[y * width + xx] = 0
      }
    }
  }

  const minCol = Math.max(70, Math.round(height * 0.2))
  for (let x = 0; x < width; x++) {
    let y = 0
    while (y < height) {
      while (y < height && !ink[y * width + x]) y++
      const start = y
      while (y < height && ink[y * width + x]) y++
      const len = y - start
      if (len < minCol) continue
      let neighbors = 0
      const x0 = Math.max(0, x - 2)
      const x1 = Math.min(width - 1, x + 2)
      for (let xx = x0; xx <= x1; xx++) {
        if (xx === x) continue
        for (let yy = start; yy < y; yy++) {
          if (ink[yy * width + xx]) neighbors++
        }
      }
      if (neighbors / (len * 4) < 0.22) {
        for (let yy = start; yy < y; yy++) ink[yy * width + x] = 0
      }
    }
  }
}

function dilate(bin: Uint8Array, width: number, height: number, radius: number) {
  const out = new Uint8Array(bin.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!bin[y * width + x]) continue
      const y0 = Math.max(0, y - radius)
      const y1 = Math.min(height - 1, y + radius)
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(width - 1, x + radius)
      for (let yy = y0; yy <= y1; yy++) {
        out.fill(1, yy * width + x0, yy * width + x1 + 1)
      }
    }
  }
  return out
}

export function extractInk(
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
): InkCrop | null {
  if (width < 8 || height < 8) return null
  const count = width * height
  const gray = new Uint8Array(count)
  for (let i = 0; i < count; i++) {
    const alpha = rgba[i * 4 + 3]
    if (alpha < 16) {
      gray[i] = 255
      continue
    }
    const r = rgba[i * 4]
    const g = rgba[i * 4 + 1]
    const b = rgba[i * 4 + 2]
    gray[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0
  }

  const otsuCut = otsu(gray)
  let dark = 0
  for (let i = 0; i < count; i++) if (gray[i] < otsuCut) dark++
  const cutoff = dark / count > 0.35 ? Math.min(otsuCut, 115) : otsuCut

  const ink = new Uint8Array(count)
  for (let i = 0; i < count; i++) ink[i] = gray[i] < cutoff ? 1 : 0
  removeHairlineRules(ink, width, height)

  const labels = new Int32Array(count)
  const comps = labelComponents(ink, width, height, labels)
  const speckArea = Math.max(18, Math.round(count * 0.00004))
  for (const comp of comps) {
    const thin =
      Math.max(comp.w, comp.h) / Math.max(1, Math.min(comp.w, comp.h)) > 14 &&
      Math.min(comp.w, comp.h) <= 6
    const speck = comp.area < speckArea || (comp.w <= 5 && comp.h <= 5)
    if (!thin && !speck) continue
    for (let y = comp.y; y < comp.y + comp.h; y++) {
      for (let x = comp.x; x < comp.x + comp.w; x++) {
        const i = y * width + x
        if (labels[i] === comp.id) ink[i] = 0
      }
    }
  }

  const radius = Math.max(4, Math.round(Math.min(width, height) * 0.012))
  const dilated = dilate(ink, width, height, radius)
  const dlabels = new Int32Array(count)
  const clusters = labelComponents(dilated, width, height, dlabels)

  let best: { score: number; id: number; comp: Comp } | null = null
  for (const comp of clusters) {
    let inkCount = 0
    for (let y = comp.y; y < comp.y + comp.h; y++) {
      for (let x = comp.x; x < comp.x + comp.w; x++) {
        const i = y * width + x
        if (dlabels[i] === comp.id && ink[i]) inkCount++
      }
    }
    if (inkCount < Math.max(24, speckArea)) continue
    const aspect = comp.w / Math.max(1, comp.h)
    const density = inkCount / Math.max(1, comp.w * comp.h)
    let score = inkCount * (0.45 + Math.min(density, 0.6))
    if (aspect >= 1.15 && aspect <= 7.5) score *= 1.4
    if (aspect > 11 || aspect < 0.25) score *= 0.2
    const cover = (comp.w * comp.h) / count
    if (cover > 0.7) score *= 0.12
    const cy = (comp.y + comp.h / 2) / height
    if (cy > 0.4) score *= 1.08
    if (!best || score > best.score) best = { score, id: comp.id, comp }
  }

  if (!best) return null

  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let kept = 0
  const comp = best.comp
  for (let y = comp.y; y < comp.y + comp.h; y++) {
    for (let x = comp.x; x < comp.x + comp.w; x++) {
      const i = y * width + x
      if (dlabels[i] === best.id && ink[i]) {
        kept++
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (kept < 20) return null

  const pad = Math.max(6, Math.round(Math.min(width, height) * 0.015))
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  const mask = new Uint8Array(cropW * cropH)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = y * width + x
      if (ink[i] && dlabels[i] === best.id) {
        mask[(y - minY) * cropW + (x - minX)] = 1
      }
    }
  }
  return {
    x: minX,
    y: minY,
    width: cropW,
    height: cropH,
    mask,
    score: best.score,
  }
}
