export type TextRun = {
  text: string
  x: number
  y: number
  width: number
  height: number
}

export type PageText = {
  width: number
  height: number
  items: TextRun[]
}

export type PlacementReason = "line" | "keyword" | "fallback"

export type Placement = {
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
  reason: PlacementReason
}

export function isKeyword(text: string) {
  const value = text.toLowerCase()
  if (value.includes("подпис")) return true
  if (value.includes("signature")) return true
  if (/\bsigned\b/.test(value)) return true
  if (/\bsign\b/.test(value)) return true
  return false
}

function isRuleText(text: string, width: number, height: number) {
  const compact = text.trim()
  if (!compact) return width > 40 && height < 8
  const marks = compact.match(/[_—–−\-]/g)?.length ?? 0
  if (compact.length >= 3 && marks / compact.length >= 0.6) return true
  if (width > 60 && height > 0 && width / height > 15 && compact.length <= 3) {
    return true
  }
  return false
}

function mergeRules(items: TextRun[]) {
  const rules = items.filter((item) =>
    isRuleText(item.text, item.width, item.height),
  )
  const rest = items.filter(
    (item) => !isRuleText(item.text, item.width, item.height),
  )
  rules.sort((a, b) => a.y - b.y || a.x - b.x)
  const merged: TextRun[] = []
  for (const rule of rules) {
    const prev = merged[merged.length - 1]
    if (
      prev &&
      Math.abs(prev.y - rule.y) < 4 &&
      rule.x <= prev.x + prev.width + 10
    ) {
      const right = Math.max(prev.x + prev.width, rule.x + rule.width)
      prev.width = right - prev.x
      prev.text += rule.text
      prev.height = Math.max(prev.height, rule.height)
    } else {
      merged.push({ ...rule })
    }
  }
  return { rules: merged, rest }
}

function underscoreSpan(item: TextRun) {
  const match = item.text.match(/[_—–−\-]{3,}/)
  if (!match || match.index == null || item.text.length === 0) return null
  const charWidth = item.width / item.text.length
  return {
    x: item.x + match.index * charWidth,
    y: item.y,
    width: match[0].length * charWidth,
    height: Math.max(item.height, 1),
  }
}

function nearLine(keyword: TextRun, line: TextRun) {
  const sameBand = Math.abs(keyword.y - line.y) <= 18 && line.x >= keyword.x - 12
  const below =
    keyword.y - line.y >= -2 &&
    keyword.y - line.y <= 52 &&
    line.x < keyword.x + keyword.width + 240 &&
    line.x + line.width > keyword.x - 48
  return sameBand || below
}

function clamp(
  page: PageText,
  box: { x: number; y: number; width: number; height: number },
) {
  const width = Math.min(Math.max(box.width, 48), page.width)
  const height = Math.min(Math.max(box.height, 18), page.height)
  const x = Math.min(Math.max(box.x, 4), Math.max(4, page.width - width - 4))
  const y = Math.min(Math.max(box.y, 4), Math.max(4, page.height - height - 4))
  return { x, y, width, height }
}

export function findPlacement(pages: PageText[], aspect: number): Placement {
  const safeAspect = Number.isFinite(aspect) && aspect > 0.2 ? aspect : 3
  let best: (Placement & { rank: number }) | null = null

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex]
    if (page.width < 20 || page.height < 20) continue
    const { rules, rest } = mergeRules(page.items)
    const keywords = rest.filter((item) => isKeyword(item.text))

    for (const keyword of keywords) {
      const embedded = underscoreSpan(keyword)
      const nearby = rules.filter((line) => nearLine(keyword, line))
      const line =
        embedded ??
        nearby.sort(
          (a, b) =>
            Math.abs(a.y - keyword.y) - Math.abs(b.y - keyword.y) ||
            a.x - b.x,
        )[0]

      if (line) {
        const sigWidth = Math.min(200, Math.max(90, line.width * 0.9))
        const sigHeight = sigWidth / safeAspect
        const box = clamp(page, {
          x: line.x,
          y: line.y + 2,
          width: sigWidth,
          height: sigHeight,
        })
        const rank = pageIndex * 10 + 3
        if (!best || rank > best.rank) {
          best = { pageIndex, ...box, reason: "line", rank }
        }
        continue
      }

      const sigWidth = 150
      const sigHeight = sigWidth / safeAspect
      const box = clamp(page, {
        x: keyword.x + keyword.width + 8,
        y: keyword.y,
        width: sigWidth,
        height: sigHeight,
      })
      const rank = pageIndex * 10 + 2
      if (!best || rank > best.rank) {
        best = { pageIndex, ...box, reason: "keyword", rank }
      }
    }
  }

  if (best) {
    return {
      pageIndex: best.pageIndex,
      x: best.x,
      y: best.y,
      width: best.width,
      height: best.height,
      reason: best.reason,
    }
  }

  const pageIndex = Math.max(0, pages.length - 1)
  const page = pages[pageIndex] ?? { width: 612, height: 792, items: [] }
  const sigWidth = 160
  const sigHeight = sigWidth / safeAspect
  const box = clamp(page, {
    x: page.width - 36 - sigWidth,
    y: 36,
    width: sigWidth,
    height: sigHeight,
  })
  return { pageIndex, ...box, reason: "fallback" }
}

export function clampPlacement(
  page: { width: number; height: number },
  box: { x: number; y: number; width: number; height: number },
) {
  return clamp(
    { width: page.width, height: page.height, items: [] },
    box,
  )
}
