import { decodeBmp } from "../src/lib/bmp.ts"
import { extractInk } from "../src/lib/extract-ink.ts"
import { findPlacement, type PageText } from "../src/lib/placement.ts"
import { isAllowedDonationCents, parseDollarsToCents } from "../src/lib/money.ts"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const letter: PageText = {
  width: 612,
  height: 792,
  items: [
    { text: "Please sign", x: 72, y: 140, width: 70, height: 12 },
    { text: "__________", x: 150, y: 138, width: 160, height: 4 },
  ],
}

const placed = findPlacement([letter], 3)
assert(placed.reason === "line", `expected line, got ${placed.reason}`)
assert(placed.pageIndex === 0, "expected page 0")
assert(placed.x >= 140 && placed.x <= 170, `line x was ${placed.x}`)

const designOnly: PageText = {
  width: 612,
  height: 792,
  items: [{ text: "design notes", x: 72, y: 400, width: 80, height: 12 }],
}
const fallback = findPlacement([designOnly, { width: 612, height: 792, items: [] }], 2)
assert(fallback.reason === "fallback", "design must not count as sign")
assert(fallback.pageIndex === 1, "fallback should use the last page")
assert(fallback.x > 300, "fallback should sit toward the right")

const combined = findPlacement(
  [
    {
      width: 612,
      height: 792,
      items: [{ text: "Signature: __________", x: 72, y: 200, width: 220, height: 12 }],
    },
  ],
  3,
)
assert(combined.reason === "line", "underscores inside the label should count")

assert(parseDollarsToCents("10") === 1000, "10 dollars")
assert(parseDollarsToCents("3.5") === 350, "3.50")
assert(parseDollarsToCents("0.50") === 50, "fifty cents parses")
assert(!isAllowedDonationCents(50), "under a dollar is rejected")
assert(isAllowedDonationCents(300), "preset is allowed")
assert(parseDollarsToCents("1.2.3") === null, "bad amount")

const width = 420
const height = 300
const rgba = new Uint8ClampedArray(width * height * 4)
rgba.fill(255)
function dot(x: number, y: number, radius: number, shade = 20) {
  for (let yy = y - radius; yy <= y + radius; yy++) {
    for (let xx = x - radius; xx <= x + radius; xx++) {
      if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue
      const dx = xx - x
      const dy = yy - y
      if (dx * dx + dy * dy > radius * radius) continue
      const i = (yy * width + xx) * 4
      rgba[i] = shade
      rgba[i + 1] = shade
      rgba[i + 2] = shade
      rgba[i + 3] = 255
    }
  }
}
for (let x = 30; x < 390; x++) dot(x, 70, 0, 10)
for (let i = 0; i < 30; i++) dot(20 + (i % 10) * 14, 20 + Math.floor(i / 10) * 12, 1, 30)
for (let t = 0; t <= 40; t++) {
  dot(160 + t * 3, 190 + Math.round(Math.sin(t / 4) * 16), 3, 15)
  dot(180 + t * 2, 210 + Math.round(Math.cos(t / 5) * 10), 3, 15)
}
const crop = extractInk(width, height, rgba)
assert(crop != null, "expected a crop")
if (crop) {
  assert(crop.y > 110, `crop should sit below the rule, y=${crop.y}`)
  assert(crop.x > 80, `crop should not start at the rule, x=${crop.x}`)
  assert(crop.width < 320, `crop should not be the full rule, w=${crop.width}`)
  const ink = crop.mask.reduce((sum, value) => sum + value, 0)
  assert(ink > 40, "crop should keep signature ink")
}

const bmp = new ArrayBuffer(54 + 8)
const view = new DataView(bmp)
view.setUint16(0, 0x4d42, true)
view.setUint32(10, 54, true)
view.setUint32(14, 40, true)
view.setInt32(18, 2, true)
view.setInt32(22, 1, true)
view.setUint16(26, 1, true)
view.setUint16(28, 24, true)
const bytes = new Uint8Array(bmp)
bytes[54] = 0
bytes[55] = 0
bytes[56] = 255
bytes[57] = 0
bytes[58] = 255
bytes[59] = 0
const decoded = decodeBmp(bmp)
assert(decoded?.width === 2 && decoded.height === 1, "bmp size")
assert(decoded?.rgba[0] === 255 && decoded.rgba[1] === 0 && decoded.rgba[2] === 0, "bmp red")

console.log("self-check ok")
